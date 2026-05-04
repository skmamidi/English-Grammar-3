(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingDomainContracts = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const BILLING_RECORD_TYPES = Object.freeze([
    'billing_account',
    'subscription',
    'renewal_period',
    'one_time_purchase',
    'invoice',
    'payment',
    'refund',
    'dispute',
    'cancellation',
    'reactivation',
    'past_due_state',
    'grace_period',
    'entitlement_projection'
  ]);
  const REDACTED = '[REDACTED]';
  const learnerIdentityPattern = /learnerId|studentId|studentName|learnerEmail/i;
  const providerPayloadPattern = /provider|rawProvider|providerPayload|webhookPayload|paymentCredential|walletCredential|cardNumber|cvv|cvc|secret|token/i;

  const DEFAULT_BILLING_DOMAIN_FIXTURES = Object.freeze({
    records: Object.freeze([
      normalizeBillingRecord({
        recordType: 'billing_account',
        billingAccountId: 'billing-account-1',
        billingOwnerId: 'guardian-1',
        actorRole: 'parent_guardian',
        verifiedContact: true,
        country: 'US',
        currency: 'USD',
        status: 'active',
        createdAt: '2030-05-03T00:00:00.000Z'
      }),
      normalizeBillingRecord({
        recordType: 'subscription',
        billingAccountId: 'billing-account-1',
        planId: 'premium_monthly',
        status: 'active',
        currentPeriod: { startsAt: '2030-05-01T00:00:00.000Z', endsAt: '2030-06-01T00:00:00.000Z' },
        autoRenew: true,
        cancelAtPeriodEnd: false,
        sourceLedgerEventId: 'ledger-subscription-created'
      }),
      projectBillingEntitlement({
        billingAccountId: 'billing-account-1',
        planId: 'premium_monthly',
        accessLevel: 'premium',
        status: 'active',
        currentPeriodEnd: '2030-06-01T00:00:00.000Z',
        autoRenew: true,
        sourceLedgerEventId: 'ledger-subscription-created'
      }, { now: () => '2030-05-20T00:00:00.000Z' })
    ])
  });

  function normalizeBillingRecord(record = {}) {
    const input = record && typeof record === 'object' ? record : {};
    return sanitizeBillingRecord({
      schemaVersion: 1,
      ...input,
      recordType: safeString(input.recordType),
      billingAccountId: safeString(input.billingAccountId),
      sourceLedgerEventId: safeString(input.sourceLedgerEventId)
    });
  }

  function validateBillingDomainFixtures(fixtures = DEFAULT_BILLING_DOMAIN_FIXTURES) {
    const records = Array.isArray(fixtures && fixtures.records) ? fixtures.records : [];
    const errors = [];
    records.forEach((record, index) => {
      validateBillingRecord(record).errors.forEach(error => errors.push(`record_${index}_${error}`));
    });
    if (!records.some(record => record.recordType === 'billing_account')) errors.push('billing_account_fixture_required');
    if (!records.some(record => record.recordType === 'subscription')) errors.push('subscription_fixture_required');
    if (!records.some(record => record.recordType === 'entitlement_projection')) errors.push('entitlement_projection_fixture_required');
    return { valid: errors.length === 0, errors };
  }

  function validateBillingRecord(record = {}) {
    const input = record && typeof record === 'object' ? record : {};
    const errors = [];
    if (input.schemaVersion !== 1) errors.push('billing record schemaVersion must be 1');
    if (!BILLING_RECORD_TYPES.includes(safeString(input.recordType))) errors.push('billing recordType is required');
    if (!safeString(input.billingAccountId)) errors.push('billingAccountId is required');
    if (containsKey(input, learnerIdentityPattern)) errors.push('billing record must not include learner identity');
    if (containsKey(input, providerPayloadPattern)) errors.push('billing record must not include provider payload');

    switch (safeString(input.recordType)) {
      case 'billing_account':
        requireFields(input, errors, ['billingOwnerId', 'actorRole', 'country', 'currency', 'status', 'createdAt']);
        if (input.actorRole !== 'parent_guardian') errors.push('billing account actorRole must be parent_guardian');
        if (input.verifiedContact !== true) errors.push('billing account verified contact is required');
        break;
      case 'subscription':
        requireFields(input, errors, ['planId', 'status', 'sourceLedgerEventId']);
        if (!input.currentPeriod || !safeIso(input.currentPeriod.startsAt) || !safeIso(input.currentPeriod.endsAt)) {
          errors.push('subscription currentPeriod is required');
        }
        if (typeof input.autoRenew !== 'boolean') errors.push('subscription autoRenew is required');
        if (typeof input.cancelAtPeriodEnd !== 'boolean') errors.push('subscription cancelAtPeriodEnd is required');
        break;
      case 'renewal_period':
        requireFields(input, errors, ['planId', 'periodStart', 'periodEnd', 'renewalStatus', 'sourceLedgerEventId']);
        break;
      case 'one_time_purchase':
        requireFields(input, errors, ['planId', 'accessStartsAt', 'accessEndsAt', 'status', 'sourceLedgerEventId']);
        break;
      case 'invoice':
        requireFields(input, errors, ['invoiceId', 'invoiceStatus', 'currency', 'issuedAt', 'sourceLedgerEventId']);
        requireMoney(input, errors, 'amountDueMinor');
        break;
      case 'payment':
        requireFields(input, errors, ['paymentId', 'currency', 'status', 'sourceLedgerEventId']);
        requireMoney(input, errors, 'amountMinor');
        break;
      case 'refund':
        requireFields(input, errors, ['refundId', 'currency', 'status', 'reasonCode', 'sourceLedgerEventId']);
        requireMoney(input, errors, 'amountMinor');
        break;
      case 'dispute':
        requireFields(input, errors, ['disputeId', 'status', 'openedAt', 'sourceLedgerEventId']);
        break;
      case 'cancellation':
        requireFields(input, errors, ['effectiveAt', 'status', 'reasonCode', 'sourceLedgerEventId']);
        break;
      case 'reactivation':
        requireFields(input, errors, ['reactivatedAt', 'status', 'sourceLedgerEventId']);
        break;
      case 'past_due_state':
        requireFields(input, errors, ['status', 'startedAt', 'retryEndsAt', 'sourceLedgerEventId']);
        break;
      case 'grace_period':
        requireFields(input, errors, ['status', 'startsAt', 'endsAt', 'sourceLedgerEventId']);
        break;
      case 'entitlement_projection':
        requireFields(input, errors, ['accessState', 'source', 'evaluatedAt']);
        if (!Array.isArray(input.featureEntitlements)) errors.push('entitlement featureEntitlements are required');
        if (input.freePracticeAvailable !== true) errors.push('free practice fallback must be available');
        break;
    }
    return { valid: errors.length === 0, errors };
  }

  function projectBillingEntitlement(subscription = {}, options = {}) {
    const input = subscription && typeof subscription === 'object' ? subscription : {};
    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
    const evaluatedAt = safeIso(now()) || new Date(0).toISOString();
    const isActive = safeString(input.status) === 'active';
    const currentPeriodEnd = safeIso(input.currentPeriodEnd || input.accessEndsAt);
    const accessState = isActive && safeString(input.accessLevel) === 'premium' ? 'premium' : 'free';
    const daysUntilRenewalOrExpiration = currentPeriodEnd
      ? Math.max(0, Math.ceil((new Date(currentPeriodEnd).getTime() - new Date(evaluatedAt).getTime()) / 86400000))
      : 0;
    return normalizeBillingRecord({
      recordType: 'entitlement_projection',
      billingAccountId: safeString(input.billingAccountId),
      planId: safeString(input.planId || 'free_practice'),
      accessState,
      accessLevel: accessState,
      featureEntitlements: accessState === 'premium'
        ? ['core_practice', 'local_progress', 'premium_practice']
        : ['core_practice', 'local_progress'],
      source: safeString(input.sourceLedgerEventId) ? 'verified_billing_ledger' : 'static_default',
      sourceLedgerEventId: safeString(input.sourceLedgerEventId),
      evaluatedAt,
      currentPeriodEnd,
      autoRenew: input.autoRenew === true,
      daysUntilRenewalOrExpiration,
      freePracticeAvailable: true,
      billingUnavailable: safeString(input.status) === 'billing_unavailable'
    });
  }

  function sanitizeBillingRecord(record) {
    if (Array.isArray(record)) return record.map(item => sanitizeBillingRecord(item));
    if (!record || typeof record !== 'object') return record;
    return Object.keys(record).reduce((sanitized, key) => {
      sanitized[key] = isSensitiveKey(key) ? REDACTED : sanitizeBillingRecord(record[key]);
      return sanitized;
    }, {});
  }

  function requireFields(input, errors, fields) {
    fields.forEach(field => {
      if (!safeString(input[field])) errors.push(`${field} is required`);
    });
  }

  function requireMoney(input, errors, field) {
    if (!Number.isInteger(input[field]) || input[field] < 0) errors.push(`${field} must be a non-negative integer`);
  }

  function containsKey(value, pattern) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => pattern.test(key) || containsKey(value[key], pattern));
  }

  function isSensitiveKey(key) {
    return learnerIdentityPattern.test(key) || providerPayloadPattern.test(key);
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
    BILLING_RECORD_TYPES,
    DEFAULT_BILLING_DOMAIN_FIXTURES,
    normalizeBillingRecord,
    projectBillingEntitlement,
    sanitizeBillingRecord,
    validateBillingDomainFixtures,
    validateBillingRecord
  };
});
