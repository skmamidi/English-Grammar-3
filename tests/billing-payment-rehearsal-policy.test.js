const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_BILLING_PAYMENT_REHEARSAL_POLICY,
  REQUIRED_BILLING_PAYMENT_REHEARSAL_SCENARIOS,
  buildBillingPaymentRehearsalEvidence,
  validateBillingPaymentRehearsalEvidence,
  validateBillingPaymentRehearsalPolicy
} = require('../assets/billing-payment-rehearsal-policy');

const repoRoot = path.resolve(__dirname, '..');

test('billing payment rehearsal policy defines every sandbox and staging scenario', () => {
  assert.deepEqual(REQUIRED_BILLING_PAYMENT_REHEARSAL_SCENARIOS, [
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

  const result = validateBillingPaymentRehearsalPolicy(DEFAULT_BILLING_PAYMENT_REHEARSAL_POLICY);
  const ids = new Set(result.policy.scenarios.map(scenario => scenario.id));

  assert.deepEqual(result.errors, []);
  REQUIRED_BILLING_PAYMENT_REHEARSAL_SCENARIOS.forEach(id => {
    assert.ok(ids.has(id), `missing rehearsal scenario ${id}`);
  });
});

test('each payment rehearsal is test-mode owned rollbackable and environment-gated', () => {
  const result = validateBillingPaymentRehearsalPolicy(DEFAULT_BILLING_PAYMENT_REHEARSAL_POLICY);

  result.policy.scenarios.forEach(scenario => {
    assert.ok(scenario.owner, `${scenario.id} owner is required`);
    assert.deepEqual(scenario.environments, ['sandbox', 'staging'], `${scenario.id} runs in sandbox and staging`);
    assert.equal(scenario.testModeOnly, true, `${scenario.id} must be test-mode only`);
    assert.equal(scenario.productionModeAllowed, false, `${scenario.id} must not use production mode`);
    assert.equal(scenario.createsRealCharge, false, `${scenario.id} must not create real charges`);
    assert.equal(scenario.capturesRawProviderPayload, false, `${scenario.id} must not capture raw provider payloads`);
    assert.ok(scenario.testModeProof.length >= 2, `${scenario.id} needs test-mode proof`);
    assert.ok(scenario.deploymentAttestationRequired, `${scenario.id} needs deployment attestation`);
    assert.ok(scenario.environmentParityRequired, `${scenario.id} needs environment parity`);
    assert.ok(scenario.rollbackNotes, `${scenario.id} needs rollback notes`);
    assert.match(scenario.verificationCommand, /^node --test|^npm run /);
  });
});

test('payment rehearsal evidence is sanitized and ties to attestation parity and rollback', () => {
  const evidence = buildBillingPaymentRehearsalEvidence({
    scenarioId: 'monthly_subscription_card_success',
    environment: 'staging',
    status: 'passed',
    attestationHash: `sha256:${'a'.repeat(64)}`,
    environmentParityEvidence: 'environment-parity:staging-billing',
    rollbackEvidence: 'billing-checkout-disabled',
    testModeProof: ['provider dashboard shows test mode', 'test clock id redacted'],
    providerCustomerId: 'customer_live_123',
    rawProviderPayload: { paymentCredential: 'secret' },
    learnerId: 'learner-one',
    token: 'unsafe'
  });

  assert.deepEqual(validateBillingPaymentRehearsalEvidence(evidence).errors, []);
  assert.equal(evidence.scenarioId, 'monthly_subscription_card_success');
  assert.equal(evidence.environment, 'staging');
  assert.equal(evidence.productionMode, false);
  assert.equal(evidence.realCharge, false);
  assert.doesNotMatch(JSON.stringify(evidence), /customer_live_123|rawProviderPayload|paymentCredential|learner-one|token|secret/);
});

test('payment rehearsal validation rejects production mode real charges and unsafe evidence', () => {
  const unsafe = validateBillingPaymentRehearsalPolicy({
    scenarios: [{
      id: 'monthly_subscription_card_success',
      owner: '',
      environments: ['production'],
      paymentMethod: 'major_cards',
      flowType: 'checkout_success',
      testModeOnly: false,
      productionModeAllowed: true,
      createsRealCharge: true,
      capturesRawProviderPayload: true,
      deploymentAttestationRequired: false,
      environmentParityRequired: false,
      testModeProof: [],
      rollbackNotes: '',
      verificationCommand: 'curl https://provider.example.test?token=secret',
      providerCustomerId: 'customer_live_123'
    }]
  });

  [
    'monthly_subscription_card_success owner is required',
    'monthly_subscription_card_success must cover sandbox and staging',
    'monthly_subscription_card_success must be test-mode only',
    'monthly_subscription_card_success must forbid production mode',
    'monthly_subscription_card_success must not create real charges',
    'monthly_subscription_card_success must not capture raw provider payloads',
    'monthly_subscription_card_success requires deployment attestation',
    'monthly_subscription_card_success requires environment parity',
    'monthly_subscription_card_success requires test-mode proof',
    'monthly_subscription_card_success requires rollback notes',
    'monthly_subscription_card_success verification command must use npm run or node --test',
    'monthly_subscription_card_success contains sensitive billing evidence'
  ].forEach(error => assert.ok(unsafe.errors.includes(error), `missing ${error}`));
});

test('billing payment rehearsal docs compliance deployment and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-payment-rehearsals.md'), 'utf8');
  const checkout = fs.readFileSync(path.join(repoRoot, 'docs', 'checkout-launch-availability-policy.md'), 'utf8');
  const management = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-management-actions.md'), 'utf8');
  const deployment = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'deployment-attestation.md'), 'utf8');
  const compliance = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');
  const ciContract = fs.readFileSync(path.join(repoRoot, 'tests', 'ci-contract.test.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  REQUIRED_BILLING_PAYMENT_REHEARSAL_SCENARIOS.forEach(scenario => {
    assert.match(docs, new RegExp(escapeRegex(scenario), 'i'));
  });
  [
    'non-production credentials',
    'non-real charges',
    'deployment attestation',
    'environment parity',
    'rollback'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(checkout, /billing-payment-rehearsals\.md/);
  assert.match(management, /billing-payment-rehearsals\.md/);
  assert.match(deployment, /billing-payment-rehearsals\.md/);
  assert.match(compliance, /billing-payment-rehearsal-policy\.test\.js/);
  assert.match(ciContract, /tests\\\/billing-payment-rehearsal-policy\\\.test\\\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-payment-rehearsal-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
