(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingPaymentRehearsalPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_BILLING_PAYMENT_REHEARSAL_SCENARIOS = Object.freeze([
    'monthly_subscription_card_success',
    'annual_subscription_card_success',
    'one_time_card_success',
    'apple_pay_wallet_success',
    'paypal_wallet_success',
    'venmo_wallet_success',
    'failed_card',
    'canceled_checkout',
    'refund',
    'dispute',
    'subscription_renewal',
    'duplicate_webhook',
    'stale_webhook',
    'cancel_at_period_end',
    'reactivation',
    'provider_outage'
  ]);

  const SENSITIVE_FIELD_PATTERN = /(^|_|\b)(learnerId|studentId|providerCustomerId|providerSubscriptionId|providerPaymentMethodId|rawProviderPayload|paymentCredential|cardNumber|walletToken|apiKey|authToken|sessionToken|secret|password|token)(\b|_|$)/i;
  const SENSITIVE_VALUE_PATTERN = /(customer_live_|subscription_live_|payment_method_live_|sk_live_|pk_live_|bearer\s+|password=|secret=|token=|learner-[a-z0-9-]+)/i;

  const DEFAULT_BILLING_PAYMENT_REHEARSAL_POLICY = Object.freeze({
    environments: Object.freeze(['sandbox', 'staging']),
    requiresDeploymentAttestation: true,
    requiresEnvironmentParity: true,
    evidenceRetention: 'redacted launch-readiness evidence only',
    scenarios: Object.freeze([
      scenario('monthly_subscription_card_success', 'Monthly subscription card success', 'major_cards', 'monthly_subscription', 'checkout_success', 'billing_platform'),
      scenario('annual_subscription_card_success', 'Annual subscription card success', 'major_cards', 'annual_subscription', 'checkout_success', 'billing_platform'),
      scenario('one_time_card_success', 'One-time card success', 'major_cards', 'one_time_access', 'checkout_success', 'billing_platform'),
      scenario('apple_pay_wallet_success', 'Apple Pay wallet success where available', 'apple_pay', 'wallet_supported_plan', 'wallet_checkout_success', 'billing_platform'),
      scenario('paypal_wallet_success', 'PayPal checkout success', 'paypal', 'supported_plan', 'wallet_checkout_success', 'billing_platform'),
      scenario('venmo_wallet_success', 'Venmo checkout success where available', 'venmo', 'one_time_access', 'wallet_checkout_success', 'billing_platform'),
      scenario('failed_card', 'Failed card checkout', 'major_cards', 'supported_plan', 'payment_failure', 'billing_policy_owner'),
      scenario('canceled_checkout', 'Canceled checkout return', 'major_cards', 'supported_plan', 'checkout_canceled', 'billing_policy_owner'),
      scenario('refund', 'Refund lifecycle', 'major_cards', 'paid_access', 'refund', 'billing_policy_owner'),
      scenario('dispute', 'Dispute lifecycle', 'major_cards', 'paid_access', 'dispute', 'billing_policy_owner'),
      scenario('subscription_renewal', 'Subscription renewal', 'major_cards', 'recurring_subscription', 'renewal', 'billing_platform'),
      scenario('duplicate_webhook', 'Duplicate webhook replay', 'provider_webhook', 'all_supported_plans', 'duplicate_webhook', 'billing_platform'),
      scenario('stale_webhook', 'Stale webhook rejection', 'provider_webhook', 'all_supported_plans', 'stale_webhook', 'billing_platform'),
      scenario('cancel_at_period_end', 'Cancel at period end', 'major_cards', 'recurring_subscription', 'management_action', 'billing_policy_owner'),
      scenario('reactivation', 'Subscription reactivation', 'major_cards', 'recurring_subscription', 'management_action', 'billing_policy_owner'),
      scenario('provider_outage', 'Provider outage fallback', 'provider_outage', 'all_supported_plans', 'degraded_provider', 'operations_owner')
    ])
  });

  function scenario(id, label, paymentMethod, planShape, flowType, owner) {
    return Object.freeze({
      id,
      label,
      owner,
      environments: Object.freeze(['sandbox', 'staging']),
      paymentMethod,
      planShape,
      flowType,
      testModeOnly: true,
      productionModeAllowed: false,
      createsRealCharge: false,
      capturesRawProviderPayload: false,
      deploymentAttestationRequired: true,
      environmentParityRequired: true,
      testModeProof: Object.freeze([
        'provider dashboard or fixture marks test mode',
        'app evidence stores redacted test-mode reference only'
      ]),
      expectedEvidence: Object.freeze([
        'redacted checkout or management action result',
        'verified billing ledger projection',
        'parent-safe billing status or support outcome'
      ]),
      rollbackNotes: 'Disable checkout launch, keep free practice available, and preserve the previous entitlement projection until verified test-mode evidence is reviewed.',
      verificationCommand: 'node --test tests/billing-payment-rehearsal-policy.test.js',
      evidenceLinks: Object.freeze([
        'docs/billing-payment-rehearsals.md',
        'docs/operations/deployment-attestation.md',
        'docs/checkout-launch-availability-policy.md'
      ])
    });
  }

  function validateBillingPaymentRehearsalPolicy(policy = DEFAULT_BILLING_PAYMENT_REHEARSAL_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const scenarios = Array.isArray(input.scenarios) ? input.scenarios.map(normalizeScenario) : [];
    const errors = [];
    const ids = new Set(scenarios.map(item => item.id));

    REQUIRED_BILLING_PAYMENT_REHEARSAL_SCENARIOS.forEach(id => {
      if (!ids.has(id)) errors.push(`${id} payment rehearsal scenario is required`);
    });

    scenarios.forEach(item => {
      const id = item.id || 'payment_rehearsal';
      if (!item.owner) errors.push(`${id} owner is required`);
      if (!item.environments.includes('sandbox') || !item.environments.includes('staging')) errors.push(`${id} must cover sandbox and staging`);
      if (item.testModeOnly !== true) errors.push(`${id} must be test-mode only`);
      if (item.productionModeAllowed !== false) errors.push(`${id} must forbid production mode`);
      if (item.createsRealCharge !== false) errors.push(`${id} must not create real charges`);
      if (item.capturesRawProviderPayload !== false) errors.push(`${id} must not capture raw provider payloads`);
      if (item.deploymentAttestationRequired !== true) errors.push(`${id} requires deployment attestation`);
      if (item.environmentParityRequired !== true) errors.push(`${id} requires environment parity`);
      if (item.testModeProof.length < 2) errors.push(`${id} requires test-mode proof`);
      if (!item.rollbackNotes) errors.push(`${id} requires rollback notes`);
      if (!/^(npm run [\w:.-]+|node --test .+)/.test(item.verificationCommand)) {
        errors.push(`${id} verification command must use npm run or node --test`);
      }
      if (containsSensitiveBillingEvidence(item)) errors.push(`${id} contains sensitive billing evidence`);
    });

    return {
      valid: errors.length === 0,
      errors,
      policy: Object.freeze({
        environments: Object.freeze(normalizeStringArray(input.environments || ['sandbox', 'staging'])),
        requiresDeploymentAttestation: input.requiresDeploymentAttestation !== false,
        requiresEnvironmentParity: input.requiresEnvironmentParity !== false,
        evidenceRetention: safeString(input.evidenceRetention || 'redacted launch-readiness evidence only'),
        scenarios: Object.freeze(scenarios.map(item => Object.freeze(item)))
      })
    };
  }

  function buildBillingPaymentRehearsalEvidence(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    return Object.freeze({
      scenarioId: safeString(source.scenarioId),
      environment: normalizeEnvironment(source.environment),
      status: ['passed', 'blocked', 'failed'].includes(safeString(source.status)) ? safeString(source.status) : 'blocked',
      attestationHash: safeHash(source.attestationHash),
      environmentParityEvidence: safeString(source.environmentParityEvidence),
      rollbackEvidence: safeString(source.rollbackEvidence),
      testModeProof: Object.freeze(normalizeStringArray(source.testModeProof).slice(0, 6)),
      productionMode: false,
      realCharge: false,
      capturedFields: Object.freeze(['scenarioId', 'environment', 'status', 'attestationHash', 'environmentParityEvidence', 'rollbackEvidence', 'testModeProof'])
    });
  }

  function validateBillingPaymentRehearsalEvidence(evidence = {}, policy = DEFAULT_BILLING_PAYMENT_REHEARSAL_POLICY) {
    const input = evidence && typeof evidence === 'object' ? evidence : {};
    const validation = validateBillingPaymentRehearsalPolicy(policy);
    const scenarioIds = new Set(validation.policy.scenarios.map(item => item.id));
    const errors = validation.errors.slice();
    const scenarioId = safeString(input.scenarioId);

    if (!scenarioIds.has(scenarioId)) errors.push('scenarioId must reference a required payment rehearsal');
    if (!['sandbox', 'staging'].includes(safeString(input.environment))) errors.push('environment must be sandbox or staging');
    if (!['passed', 'blocked', 'failed'].includes(safeString(input.status))) errors.push('status must be passed blocked or failed');
    if (!/^sha256:[a-f0-9]{8,}$/i.test(safeString(input.attestationHash))) errors.push('attestationHash is required');
    if (!safeString(input.environmentParityEvidence)) errors.push('environmentParityEvidence is required');
    if (!safeString(input.rollbackEvidence)) errors.push('rollbackEvidence is required');
    if (!Array.isArray(input.testModeProof) || input.testModeProof.length === 0) errors.push('testModeProof is required');
    if (input.productionMode !== false) errors.push('productionMode must be false');
    if (input.realCharge !== false) errors.push('realCharge must be false');
    if (containsSensitiveBillingEvidence(input)) errors.push('payment rehearsal evidence contains sensitive billing material');

    return { valid: errors.length === 0, errors };
  }

  function normalizeScenario(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      id: safeString(input.id),
      label: safeString(input.label),
      owner: safeString(input.owner),
      environments: Object.freeze(normalizeStringArray(input.environments)),
      paymentMethod: safeString(input.paymentMethod),
      planShape: safeString(input.planShape),
      flowType: safeString(input.flowType),
      testModeOnly: input.testModeOnly === true,
      productionModeAllowed: input.productionModeAllowed === true,
      createsRealCharge: input.createsRealCharge === true,
      capturesRawProviderPayload: input.capturesRawProviderPayload === true,
      deploymentAttestationRequired: input.deploymentAttestationRequired === true,
      environmentParityRequired: input.environmentParityRequired === true,
      testModeProof: Object.freeze(normalizeStringArray(input.testModeProof)),
      expectedEvidence: Object.freeze(normalizeStringArray(input.expectedEvidence)),
      rollbackNotes: safeString(input.rollbackNotes),
      verificationCommand: safeString(input.verificationCommand),
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

  function normalizeEnvironment(value) {
    const environment = safeString(value);
    return ['sandbox', 'staging'].includes(environment) ? environment : 'sandbox';
  }

  function safeHash(value) {
    const hash = safeString(value);
    return /^sha256:[a-f0-9]{8,}$/i.test(hash) ? hash : '';
  }

  function normalizeStringArray(value) {
    return Array.isArray(value) ? value.map(safeString).filter(Boolean) : [];
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_BILLING_PAYMENT_REHEARSAL_POLICY,
    REQUIRED_BILLING_PAYMENT_REHEARSAL_SCENARIOS,
    buildBillingPaymentRehearsalEvidence,
    validateBillingPaymentRehearsalEvidence,
    validateBillingPaymentRehearsalPolicy
  };
});
