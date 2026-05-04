(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingEntitlementProjection = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const BILLING_ENTITLEMENT_ACCESS_STATES = Object.freeze([
    'free',
    'premium',
    'past_due',
    'grace',
    'canceled_at_period_end',
    'expired',
    'refunded',
    'disputed',
    'billing_unavailable'
  ]);

  const DEFAULT_BILLING_ENTITLEMENT_PROJECTION_POLICY = Object.freeze({
    sourceRequired: 'verified_billing_ledger',
    freePracticeAvailableByDefault: true,
    learnerProgressIndependent: true,
    providerPayloadForbidden: true,
    ledgerDetailsForbidden: true
  });

  const REDACTED = '[REDACTED]';
  const learnerIdentityPattern = /learnerId|studentId|studentName|learnerEmail|learnerProgress|sessions|reports|activeQuiz/i;
  const providerOrLedgerPattern = /provider|rawProvider|providerPayload|webhookPayload|paymentCredential|walletCredential|cardNumber|cvv|cvc|secret|token|ledgerEvents|records|payloadDigest|idempotencyKey|providerEventRef/i;

  function validateBillingEntitlementProjectionPolicy(policy = DEFAULT_BILLING_ENTITLEMENT_PROJECTION_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const errors = [];
    if (input.sourceRequired !== 'verified_billing_ledger') errors.push('sourceRequired must be verified_billing_ledger');
    if (input.freePracticeAvailableByDefault !== true) errors.push('freePracticeAvailableByDefault must be true');
    if (input.learnerProgressIndependent !== true) errors.push('learnerProgressIndependent must be true');
    if (input.providerPayloadForbidden !== true) errors.push('providerPayloadForbidden must be true');
    if (input.ledgerDetailsForbidden !== true) errors.push('ledgerDetailsForbidden must be true');
    return { valid: errors.length === 0, errors };
  }

  function deriveBillingEntitlementProjection(options = {}) {
    const input = options && typeof options === 'object' ? options : {};
    const billingAccountId = safeString(input.billingAccountId);
    const now = safeIso(input.now) || new Date(0).toISOString();
    const verifiedEvents = (Array.isArray(input.ledgerEvents) ? input.ledgerEvents : [])
      .filter(event => event && event.status === 'verified')
      .filter(event => !safeString(event.source) || safeString(event.source) === 'verified_billing_ledger')
      .filter(event => safeString(event.billingAccountId) === billingAccountId)
      .sort(compareLedgerEvents);
    const latest = verifiedEvents[verifiedEvents.length - 1];

    if (!latest) {
      return normalizeProjection({
        billingAccountId,
        activePlanId: 'free_practice',
        accessLevel: 'free',
        accessState: 'free',
        featureEntitlements: freeFeatures(),
        source: 'static_default',
        evaluatedAt: now,
        freePracticeAvailable: true
      });
    }

    const records = Array.isArray(latest.records) ? latest.records : [];
    const primary = records.find(record => safeString(record.billingAccountId) === billingAccountId) || {};
    const sourceLedgerEventId = safeString(latest.ledgerEventId || primary.sourceLedgerEventId);
    const base = {
      billingAccountId,
      activePlanId: safeString(primary.planId || 'free_practice'),
      source: 'verified_billing_ledger',
      sourceLedgerEventId,
      evaluatedAt: now,
      freePracticeAvailable: true
    };

    switch (safeString(latest.eventType)) {
      case 'subscription_created':
      case 'renewal_succeeded':
        return normalizeProjection({
          ...base,
          accessLevel: 'premium',
          accessState: 'premium',
          featureEntitlements: premiumFeatures(),
          currentPeriodEnd: safeIso(primary.currentPeriod && primary.currentPeriod.endsAt),
          autoRenew: primary.autoRenew === true,
          daysUntilRenewalOrExpiration: daysUntil(now, safeIso(primary.currentPeriod && primary.currentPeriod.endsAt))
        });
      case 'one_time_payment_succeeded':
        return normalizeProjection({
          ...base,
          accessLevel: 'premium',
          accessState: 'premium',
          featureEntitlements: premiumFeatures(),
          currentPeriodEnd: safeIso(primary.accessEndsAt),
          autoRenew: false,
          daysUntilRenewalOrExpiration: daysUntil(now, safeIso(primary.accessEndsAt)),
          oneTimeAccessWindow: {
            startsAt: safeIso(primary.accessStartsAt),
            endsAt: safeIso(primary.accessEndsAt)
          }
        });
      case 'subscription_canceled':
        return normalizeProjection({
          ...base,
          accessLevel: 'premium',
          accessState: 'canceled_at_period_end',
          featureEntitlements: premiumFeatures(),
          currentPeriodEnd: safeIso(primary.effectiveAt),
          autoRenew: false,
          daysUntilRenewalOrExpiration: daysUntil(now, safeIso(primary.effectiveAt)),
          cancellation: {
            effectiveAt: safeIso(primary.effectiveAt),
            reasonCode: safeString(primary.reasonCode || 'not_specified')
          }
        });
      case 'renewal_failed':
        return normalizeProjection({
          ...base,
          accessLevel: 'premium',
          accessState: 'past_due',
          featureEntitlements: premiumFeatures(),
          currentPeriodEnd: safeIso(primary.retryEndsAt),
          autoRenew: true,
          daysUntilRenewalOrExpiration: daysUntil(now, safeIso(primary.retryEndsAt)),
          pastDue: {
            startedAt: safeIso(primary.startedAt),
            retryEndsAt: safeIso(primary.retryEndsAt)
          }
        });
      case 'provider_outage_fallback':
        return normalizeProjection({
          ...base,
          accessLevel: 'premium',
          accessState: 'billing_unavailable',
          featureEntitlements: premiumFeatures(),
          currentPeriodEnd: safeIso(primary.endsAt),
          autoRenew: false,
          billingUnavailable: true,
          daysUntilRenewalOrExpiration: daysUntil(now, safeIso(primary.endsAt)),
          gracePeriod: {
            startsAt: safeIso(primary.startsAt),
            endsAt: safeIso(primary.endsAt)
          }
        });
      case 'refund_issued':
        return normalizeProjection({
          ...base,
          accessLevel: 'free',
          accessState: 'refunded',
          featureEntitlements: freeFeatures(),
          autoRenew: false
        });
      case 'dispute_opened':
        return normalizeProjection({
          ...base,
          accessLevel: 'free',
          accessState: 'disputed',
          featureEntitlements: freeFeatures(),
          autoRenew: false
        });
      default:
        return normalizeProjection({
          ...base,
          accessLevel: 'free',
          accessState: 'free',
          featureEntitlements: freeFeatures()
        });
    }
  }

  function validateBillingEntitlementProjection(projection = {}) {
    const input = projection && typeof projection === 'object' ? projection : {};
    const errors = [];
    if (input.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    if (!safeString(input.billingAccountId)) errors.push('billingAccountId is required');
    if (!BILLING_ENTITLEMENT_ACCESS_STATES.includes(safeString(input.accessState))) errors.push('accessState is invalid');
    if (!['free', 'premium'].includes(safeString(input.accessLevel))) errors.push('accessLevel is invalid');
    if (!Array.isArray(input.featureEntitlements)) errors.push('featureEntitlements are required');
    if (!safeString(input.source)) errors.push('source is required');
    if (safeString(input.source) === 'verified_billing_ledger' && !safeString(input.sourceLedgerEventId)) {
      errors.push('sourceLedgerEventId is required for verified billing ledger projections');
    }
    if (!safeIso(input.evaluatedAt)) errors.push('evaluatedAt is required');
    if (input.freePracticeAvailable !== true) errors.push('freePracticeAvailable must be true');
    if (containsKey(input, learnerIdentityPattern)) errors.push('entitlement projection must not include learner identity');
    if (containsKey(input, providerOrLedgerPattern)) errors.push('entitlement projection must not include provider payload or ledger details');
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function sanitizeEntitlementProjection(value) {
    if (Array.isArray(value)) return value.map(item => sanitizeEntitlementProjection(item));
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((sanitized, key) => {
      sanitized[key] = isSensitiveKey(key) ? REDACTED : sanitizeEntitlementProjection(value[key]);
      return sanitized;
    }, {});
  }

  function normalizeProjection(projection) {
    const input = projection && typeof projection === 'object' ? projection : {};
    return {
      schemaVersion: 1,
      billingAccountId: safeString(input.billingAccountId),
      activePlanId: safeString(input.activePlanId || 'free_practice'),
      accessLevel: safeString(input.accessLevel || 'free'),
      accessState: BILLING_ENTITLEMENT_ACCESS_STATES.includes(safeString(input.accessState)) ? safeString(input.accessState) : 'free',
      featureEntitlements: normalizeStringArray(input.featureEntitlements),
      currentPeriodEnd: safeIso(input.currentPeriodEnd),
      autoRenew: input.autoRenew === true,
      daysUntilRenewalOrExpiration: Number.isInteger(input.daysUntilRenewalOrExpiration) ? input.daysUntilRenewalOrExpiration : 0,
      oneTimeAccessWindow: normalizeWindow(input.oneTimeAccessWindow, 'startsAt', 'endsAt'),
      pastDue: normalizeWindow(input.pastDue, 'startedAt', 'retryEndsAt'),
      gracePeriod: normalizeWindow(input.gracePeriod, 'startsAt', 'endsAt'),
      cancellation: normalizeCancellation(input.cancellation),
      billingUnavailable: input.billingUnavailable === true,
      source: safeString(input.source || 'static_default'),
      sourceLedgerEventId: safeString(input.sourceLedgerEventId),
      evaluatedAt: safeIso(input.evaluatedAt),
      freePracticeAvailable: true
    };
  }

  function normalizeWindow(value, startKey, endKey) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      [startKey]: safeIso(input[startKey]),
      [endKey]: safeIso(input[endKey])
    };
  }

  function normalizeCancellation(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      effectiveAt: safeIso(input.effectiveAt),
      reasonCode: safeString(input.reasonCode)
    };
  }

  function compareLedgerEvents(a, b) {
    const aTime = new Date(safeIso(a && a.occurredAt) || 0).getTime();
    const bTime = new Date(safeIso(b && b.occurredAt) || 0).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return safeString(a && a.ledgerEventId).localeCompare(safeString(b && b.ledgerEventId));
  }

  function daysUntil(now, target) {
    if (!safeIso(target)) return 0;
    return Math.max(0, Math.ceil((new Date(target).getTime() - new Date(now).getTime()) / 86400000));
  }

  function containsKey(value, pattern) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => pattern.test(key) || containsKey(value[key], pattern));
  }

  function isSensitiveKey(key) {
    return learnerIdentityPattern.test(key) || providerOrLedgerPattern.test(key);
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function premiumFeatures() {
    return ['core_practice', 'local_progress', 'premium_practice'];
  }

  function freeFeatures() {
    return ['core_practice', 'local_progress'];
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    BILLING_ENTITLEMENT_ACCESS_STATES,
    DEFAULT_BILLING_ENTITLEMENT_PROJECTION_POLICY,
    deriveBillingEntitlementProjection,
    sanitizeEntitlementProjection,
    validateBillingEntitlementProjection,
    validateBillingEntitlementProjectionPolicy
  };
});
