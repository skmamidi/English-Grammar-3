(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingObservabilityPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_BILLING_OBSERVABILITY_SIGNALS = Object.freeze([
    'checkout_start_success',
    'checkout_completion_webhook_latency',
    'entitlement_update_latency',
    'renewal_success',
    'provider_api_error_rate',
    'billing_page_render_health',
    'webhook_failure_rate',
    'refund_dispute_queue_age',
    'provider_fee_budget',
    'failed_payment_recovery_cost'
  ]);

  const DEFAULT_BILLING_OBSERVABILITY_POLICY = Object.freeze({
    schemaVersion: 1,
    signals: Object.freeze([
      signal('checkout_start_success', 'billing_platform', 'billing-oncall', 'slo'),
      signal('checkout_completion_webhook_latency', 'billing_platform', 'billing-oncall', 'slo'),
      signal('entitlement_update_latency', 'billing_platform', 'billing-oncall', 'slo'),
      signal('renewal_success', 'billing_policy_owner', 'billing-oncall', 'slo'),
      signal('provider_api_error_rate', 'billing_platform', 'billing-oncall', 'slo'),
      signal('billing_page_render_health', 'platform', 'billing-oncall', 'slo'),
      signal('webhook_failure_rate', 'billing_platform', 'billing-oncall', 'slo'),
      signal('refund_dispute_queue_age', 'billing_policy_owner', 'billing-support-oncall', 'slo'),
      signal('provider_fee_budget', 'finance_owner', 'finance-review', 'cost'),
      signal('failed_payment_recovery_cost', 'billing_policy_owner', 'billing-support-oncall', 'cost')
    ])
  });

  function signal(id, owner, alertPath, type) {
    return Object.freeze({
      id,
      owner,
      alertPath,
      type,
      privacySafe: true,
      launchBlocking: true
    });
  }

  function validateBillingObservabilityPolicy(policy = DEFAULT_BILLING_OBSERVABILITY_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const signals = (Array.isArray(input.signals) ? input.signals : []).map(normalizeSignal);
    const errors = [];
    const ids = new Set(signals.map(item => item.id));

    REQUIRED_BILLING_OBSERVABILITY_SIGNALS.forEach(id => {
      if (!ids.has(id)) errors.push(`${id} billing observability signal is required`);
    });
    signals.forEach(item => {
      if (!item.id) errors.push('signal id is required');
      if (!item.owner) errors.push(`${item.id} owner is required`);
      if (!item.alertPath) errors.push(`${item.id} alertPath is required`);
      if (!['slo', 'cost'].includes(item.type)) errors.push(`${item.id} type is invalid`);
      if (item.privacySafe !== true) errors.push(`${item.id} must be privacy safe`);
      if (item.launchBlocking !== true) errors.push(`${item.id} must be launch blocking`);
    });

    return {
      valid: errors.length === 0,
      errors,
      policy: { schemaVersion: 1, signals }
    };
  }

  function normalizeSignal(input) {
    const value = input && typeof input === 'object' ? input : {};
    return {
      id: safeString(value.id),
      owner: safeString(value.owner),
      alertPath: safeString(value.alertPath),
      type: safeString(value.type),
      privacySafe: value.privacySafe === true,
      launchBlocking: value.launchBlocking === true
    };
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_BILLING_OBSERVABILITY_POLICY,
    REQUIRED_BILLING_OBSERVABILITY_SIGNALS,
    validateBillingObservabilityPolicy
  };
});
