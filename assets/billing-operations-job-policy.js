(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingOperationsJobPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_BILLING_OPERATIONS_JOBS = Object.freeze([
    'reconciliation',
    'missed_webhook_detection',
    'dunning',
    'retry_classification',
    'provider_health'
  ]);

  const BILLING_OPERATIONS_FORBIDDEN_PATTERN = /"?(providerCustomerId|providerPaymentMethodId|rawProviderPayload|paymentCredential|walletCredential|learnerId|studentId|studentName|authToken|providerToken|token|secret|entitlementMutation)"?\s*:|provider_live_[A-Za-z0-9_-]+|customer_live_[A-Za-z0-9_-]+|subscription_live_[A-Za-z0-9_-]+/i;

  const DEFAULT_BILLING_OPERATIONS_JOB_POLICY = Object.freeze({
    schemaVersion: 1,
    jobs: Object.freeze([
      job('reconciliation', 'billing_platform', 'hourly', 'Compare app ledger records with provider-confirmed redacted references and queue review actions.'),
      job('missed_webhook_detection', 'billing_platform', 'every_15_minutes', 'Detect provider-confirmed records missing verified ledger evidence and queue webhook review.'),
      job('dunning', 'billing_policy_owner', 'daily', 'Project failed-renewal recovery notices without direct entitlement churn.'),
      job('retry_classification', 'billing_platform', 'per_failure', 'Classify transient, permanent, and exhausted provider failures with idempotent retry plans.'),
      job('provider_health', 'operations_owner', 'every_5_minutes', 'Summarize aggregate provider success rate and webhook lag without provider payloads.')
    ])
  });

  function job(id, owner, cadence, purpose) {
    return Object.freeze({
      id,
      owner,
      cadence,
      purpose,
      serverOwned: true,
      entitlementMutationAllowed: false,
      privacySafeSummaryOnly: true,
      requiresIdempotency: true
    });
  }

  function validateBillingOperationsJobPolicy(policy = DEFAULT_BILLING_OPERATIONS_JOB_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const jobs = (Array.isArray(input.jobs) ? input.jobs : []).map(normalizeJob);
    const errors = [];
    const ids = new Set(jobs.map(item => item.id));

    REQUIRED_BILLING_OPERATIONS_JOBS.forEach(id => {
      if (!ids.has(id)) errors.push(`${id} billing operations job is required`);
    });
    jobs.forEach(item => {
      if (!item.id) errors.push('job id is required');
      if (!item.owner) errors.push(`${item.id} owner is required`);
      if (!item.cadence) errors.push(`${item.id} cadence is required`);
      if (item.serverOwned !== true) errors.push(`${item.id} must be server owned`);
      if (item.entitlementMutationAllowed !== false) errors.push(`${item.id} must not mutate entitlements directly`);
      if (item.privacySafeSummaryOnly !== true) errors.push(`${item.id} must emit privacy-safe summaries only`);
    });

    return {
      valid: errors.length === 0,
      errors,
      policy: {
        schemaVersion: 1,
        jobs
      }
    };
  }

  function buildBillingOperationsJobMap(policy = DEFAULT_BILLING_OPERATIONS_JOB_POLICY) {
    return validateBillingOperationsJobPolicy(policy).policy.jobs.reduce((result, item) => {
      result[item.id] = item;
      return result;
    }, {});
  }

  function buildReconciliationResult(input = {}) {
    const appLedger = Array.isArray(input.appLedger) ? input.appLedger.map(normalizeLedgerRow) : [];
    const providerConfirmed = Array.isArray(input.providerConfirmed) ? input.providerConfirmed.map(normalizeProviderRow) : [];
    const ledgerByRef = new Map(appLedger.map(row => [row.redactedReference, row]));
    const providerByRef = new Map(providerConfirmed.map(row => [row.redactedReference, row]));
    const actions = [];
    let matched = 0;
    let mismatched = 0;
    let missingLedgerEvents = 0;

    providerConfirmed.forEach(providerRow => {
      const ledgerRow = ledgerByRef.get(providerRow.redactedReference);
      if (!ledgerRow) {
        missingLedgerEvents += 1;
        actions.push({
          type: 'queue_missed_webhook_review',
          redactedReference: providerRow.redactedReference,
          requiresLedgerEvidence: true
        });
      } else if (ledgerRow.status !== providerRow.status) {
        mismatched += 1;
      } else {
        matched += 1;
      }
    });

    appLedger.forEach(ledgerRow => {
      const providerRow = providerByRef.get(ledgerRow.redactedReference);
      if (providerRow && providerRow.status !== ledgerRow.status) {
        actions.push({
          type: 'queue_reconciliation_review',
          redactedReference: ledgerRow.redactedReference,
          fromStatus: ledgerRow.status,
          providerStatus: providerRow.status,
          requiresLedgerEvidence: true
        });
      }
    });

    const result = {
      jobId: 'reconciliation',
      summary: {
        matched,
        mismatched,
        missingLedgerEvents,
        requiresLedgerEvidence: true,
        entitlementMutationAllowed: false
      },
      actions
    };
    assertBillingOperationsPrivacy(result);
    return result;
  }

  function buildDunningProjection(input = {}) {
    const state = safeString(input.billingState || 'current');
    const failureCount = Math.max(0, Math.round(Number(input.renewalFailureCount) || 0));
    const projection = {
      jobId: 'dunning',
      billingState: state,
      noticeType: state === 'past_due' || failureCount > 0 ? 'failed_payment_recovery' : 'none',
      renewalFailureCount: failureCount,
      nextAction: safeString(input.nextAction || 'none'),
      freePracticeAvailable: input.freePracticeAvailable !== false,
      entitlementMutationAllowed: false
    };
    assertBillingOperationsPrivacy(projection);
    return projection;
  }

  function classifyBillingRetry(input = {}) {
    const category = safeString(input.errorCategory || 'unknown');
    const attempt = Math.max(1, Math.round(Number(input.attempt) || 1));
    if (attempt >= 5) {
      return {
        retryClass: 'exhausted',
        shouldRetry: false,
        idempotencyRequired: true,
        nextDelayMinutes: 0
      };
    }
    if (/invalid|validation|permission|unsupported/i.test(category)) {
      return {
        retryClass: 'permanent',
        shouldRetry: false,
        idempotencyRequired: true,
        nextDelayMinutes: 0
      };
    }
    return {
      retryClass: 'transient',
      shouldRetry: true,
      idempotencyRequired: true,
      nextDelayMinutes: Math.min(60, attempt * 15)
    };
  }

  function buildProviderHealthSummary(input = {}) {
    const attempts = Math.max(0, Math.round(Number(input.attempts) || 0));
    const successes = Math.max(0, Math.min(attempts, Math.round(Number(input.successes) || 0)));
    const successRate = attempts ? round(successes / attempts) : null;
    const webhookLagP95Minutes = Math.max(0, Math.round(Number(input.webhookLagP95Minutes) || 0));
    const status = successRate === null
      ? 'unknown'
      : successRate >= 0.98 && webhookLagP95Minutes <= 5
        ? 'healthy'
        : successRate >= 0.9
          ? 'degraded'
          : 'unhealthy';
    const summary = {
      jobId: 'provider_health',
      status,
      windowMinutes: Math.max(1, Math.round(Number(input.windowMinutes) || 15)),
      attempts,
      successes,
      failures: attempts - successes,
      successRate,
      webhookLagP95Minutes,
      entitlementMutationAllowed: false
    };
    assertBillingOperationsPrivacy(summary);
    return summary;
  }

  function assertBillingOperationsPrivacy(output) {
    const serialized = JSON.stringify(output || {});
    if (BILLING_OPERATIONS_FORBIDDEN_PATTERN.test(serialized)) {
      throw new Error('unsafe_billing_operations_output');
    }
    return true;
  }

  function normalizeJob(input) {
    const value = input && typeof input === 'object' ? input : {};
    return {
      id: safeString(value.id),
      owner: safeString(value.owner),
      cadence: safeString(value.cadence),
      purpose: safeString(value.purpose),
      serverOwned: value.serverOwned === true,
      entitlementMutationAllowed: value.entitlementMutationAllowed === true,
      privacySafeSummaryOnly: value.privacySafeSummaryOnly === true,
      requiresIdempotency: value.requiresIdempotency === true
    };
  }

  function normalizeLedgerRow(input) {
    const row = input && typeof input === 'object' ? input : {};
    return {
      redactedReference: safeString(row.redactedReference),
      status: safeString(row.status),
      ledgerEventId: safeString(row.ledgerEventId)
    };
  }

  function normalizeProviderRow(input) {
    const row = input && typeof input === 'object' ? input : {};
    return {
      redactedReference: safeString(row.redactedReference),
      status: safeString(row.status),
      providerEventDigest: safeString(row.providerEventDigest)
    };
  }

  function round(value) {
    return Math.round(value * 10000) / 10000;
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    BILLING_OPERATIONS_FORBIDDEN_PATTERN,
    DEFAULT_BILLING_OPERATIONS_JOB_POLICY,
    REQUIRED_BILLING_OPERATIONS_JOBS,
    assertBillingOperationsPrivacy,
    buildBillingOperationsJobMap,
    buildDunningProjection,
    buildProviderHealthSummary,
    buildReconciliationResult,
    classifyBillingRetry,
    validateBillingOperationsJobPolicy
  };
});
