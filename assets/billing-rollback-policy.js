(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingRollbackPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_BILLING_ROLLBACK_FLAGS = Object.freeze([
    'pricing_display',
    'checkout_start',
    'webhook_processing',
    'entitlement_granting',
    'renewals',
    'one_time_access',
    'provider_portal_links',
    'billing_telemetry'
  ]);

  const SENSITIVE_FIELD_PATTERN = /(^|_|\b)(learnerId|studentId|providerCustomerId|providerSubscriptionId|providerPaymentMethodId|rawProviderPayload|paymentCredential|walletToken|apiKey|authToken|sessionToken|secret|password|token)(\b|_|$)/i;
  const SENSITIVE_VALUE_PATTERN = /(customer_live_|subscription_live_|payment_method_live_|sk_live_|pk_live_|bearer\s+|password=|secret=|token=|learner-[a-z0-9-]+)/i;

  const DEFAULT_BILLING_ROLLBACK_POLICY = Object.freeze({
    rollbackModes: Object.freeze(['stop_new_charges', 'hide_billing_surfaces', 'webhook_only']),
    flags: Object.freeze([
      flag('pricing_display', 'billing_policy_owner', false, 'Hide paid pricing and keep parent copy on free practice or unavailable billing.'),
      flag('checkout_start', 'billing_platform', false, 'Stop all new hosted checkout sessions and provider element setup.'),
      flag('webhook_processing', 'billing_platform', true, 'Keep verified webhook processing online for refunds, disputes, renewals, and audit history.'),
      flag('entitlement_granting', 'billing_policy_owner', true, 'Continue verified billing ledger entitlement projection while blocking browser-origin grants.'),
      flag('renewals', 'billing_policy_owner', false, 'Block renewal collection starts controlled by the app while preserving verified existing access.'),
      flag('one_time_access', 'billing_policy_owner', false, 'Block new one-time purchase starts and preserve existing one-time access windows.'),
      flag('provider_portal_links', 'commerce_support', false, 'Hide provider portal links when provider access is degraded or unreviewed.'),
      flag('billing_telemetry', 'privacy_owner', true, 'Keep aggregate billing health telemetry without provider payloads or learner identity.')
    ])
  });

  function flag(id, owner, defaultEnabled, rollbackEffect) {
    return Object.freeze({
      id,
      owner,
      defaultEnabled,
      serverOwned: true,
      browserCanMutateProviderRecord: false,
      browserSafeProjection: true,
      rollbackEffect,
      evidenceLinks: Object.freeze([
        'docs/billing-rollback-policy.md',
        'docs/operations/runbook-billing-rollback.md'
      ])
    });
  }

  function validateBillingRollbackPolicy(policy = DEFAULT_BILLING_ROLLBACK_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const rawFlags = Array.isArray(input.flags) ? input.flags : [];
    const flags = rawFlags.map(normalizeFlag);
    const errors = [];
    const ids = new Set(flags.map(item => item.id));

    REQUIRED_BILLING_ROLLBACK_FLAGS.forEach(id => {
      if (!ids.has(id)) errors.push(`missing required billing rollback flag ${id}`);
    });

    flags.forEach((item, index) => {
      const id = item.id || 'billing_rollback_flag';
      if (!item.owner) errors.push(`${id} owner is required`);
      if (item.serverOwned !== true) errors.push(`${id} must be server-owned`);
      if (item.browserCanMutateProviderRecord !== false) errors.push(`${id} browser must not mutate provider records`);
      if (item.browserSafeProjection !== true) errors.push(`${id} must expose only browser-safe projection`);
      if (!item.rollbackEffect) errors.push(`${id} rollback effect is required`);
      if (containsSensitiveBillingEvidence(item) || containsSensitiveBillingEvidence(rawFlags[index])) {
        errors.push(`${id} contains sensitive billing rollback evidence`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      policy: Object.freeze({
        rollbackModes: Object.freeze(normalizeStringArray(input.rollbackModes || ['stop_new_charges'])),
        flags: Object.freeze(flags.map(item => Object.freeze(item)))
      })
    };
  }

  function buildBillingRollbackDecision(input = {}, policy = DEFAULT_BILLING_ROLLBACK_POLICY) {
    const source = input && typeof input === 'object' ? input : {};
    const validation = validateBillingRollbackPolicy(policy);
    const mode = safeString(source.mode || 'stop_new_charges');
    const controls = {};

    validation.policy.flags.forEach(item => {
      controls[item.id] = {
        enabled: rollbackEnabled(item, mode),
        owner: item.owner,
        rollbackEffect: item.rollbackEffect
      };
    });

    return Object.freeze({
      mode,
      reason: safeString(source.reason),
      preventsNewCharges: true,
      preservesExistingPaidAccess: true,
      freePracticeAvailable: true,
      parentAccountAccessAvailable: true,
      auditHistoryPreserved: true,
      browserCanMutateProviderRecords: false,
      controls: Object.freeze(controls),
      evidenceLinks: Object.freeze([
        'docs/billing-rollback-policy.md',
        'docs/operations/runbook-billing-rollback.md'
      ])
    });
  }

  function rollbackEnabled(flag, mode) {
    if (mode === 'webhook_only') return ['webhook_processing', 'billing_telemetry'].includes(flag.id);
    if (mode === 'hide_billing_surfaces') return ['webhook_processing', 'entitlement_granting', 'billing_telemetry'].includes(flag.id);
    if (mode === 'stop_new_charges') return ['webhook_processing', 'entitlement_granting', 'billing_telemetry'].includes(flag.id);
    return flag.defaultEnabled === true;
  }

  function validateBillingRollbackDecision(decision = {}) {
    const input = decision && typeof decision === 'object' ? decision : {};
    const errors = [];
    if (input.preventsNewCharges !== true) errors.push('rollback must prevent new charges');
    if (input.preservesExistingPaidAccess !== true) errors.push('rollback must preserve existing paid access');
    if (input.freePracticeAvailable !== true) errors.push('rollback must keep free practice available');
    if (input.parentAccountAccessAvailable !== true) errors.push('rollback must preserve parent account access');
    if (input.auditHistoryPreserved !== true) errors.push('rollback must preserve audit history');
    if (input.browserCanMutateProviderRecords !== false) errors.push('rollback must not allow browser provider mutation');
    if (containsSensitiveBillingEvidence(input)) errors.push('rollback decision contains sensitive billing evidence');
    return { valid: errors.length === 0, errors };
  }

  function normalizeFlag(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      id: safeString(input.id),
      owner: safeString(input.owner),
      defaultEnabled: input.defaultEnabled === true,
      serverOwned: input.serverOwned === true,
      browserCanMutateProviderRecord: input.browserCanMutateProviderRecord === true,
      browserSafeProjection: input.browserSafeProjection === true,
      rollbackEffect: safeString(input.rollbackEffect),
      evidenceLinks: Object.freeze(normalizeStringArray(input.evidenceLinks))
    };
  }

  function containsSensitiveBillingEvidence(value) {
    return findSensitivePath(value) || SENSITIVE_VALUE_PATTERN.test(JSON.stringify(value || {}));
  }

  function findSensitivePath(value, trail = []) {
    if (!value || typeof value !== 'object') return '';
    return Object.keys(value).map(key => {
      const nextTrail = trail.concat(key);
      if (SENSITIVE_FIELD_PATTERN.test(key)) return nextTrail.join('.');
      return findSensitivePath(value[key], nextTrail);
    }).find(Boolean) || '';
  }

  function normalizeStringArray(value) {
    return Array.from(new Set((Array.isArray(value) ? value : []).map(safeString).filter(Boolean)));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_BILLING_ROLLBACK_POLICY,
    REQUIRED_BILLING_ROLLBACK_FLAGS,
    buildBillingRollbackDecision,
    validateBillingRollbackDecision,
    validateBillingRollbackPolicy
  };
});
