const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  FAKE_PROVIDER_BILLING_SCENARIOS,
  buildFakeProviderWebhookEnvelope,
  runFakeProviderBillingFixtureScenario,
  validateFakeProviderBillingFixtures
} = require('../server/fake-provider-billing-fixtures');
const { validateBillingRecord } = require('../assets/billing-domain-contracts');
const { validateBillingEntitlementProjection } = require('../assets/billing-entitlement-projection');
const { verifyProviderWebhookEnvelope } = require('../server/billing-webhook-ledger-policy');

const repoRoot = path.resolve(__dirname, '..');

test('fake provider billing scenarios cover the full provider-neutral lifecycle', () => {
  assert.deepEqual(FAKE_PROVIDER_BILLING_SCENARIOS.map(scenario => scenario.id), [
    'subscription_created',
    'invoice_paid',
    'renewal_succeeded',
    'renewal_failed',
    'payment_method_updated',
    'subscription_canceled_at_period_end',
    'one_time_payment_succeeded',
    'refund_issued',
    'dispute_opened',
    'duplicate_webhook_ignored',
    'stale_webhook_rejected',
    'provider_outage_fallback'
  ]);

  assert.deepEqual(validateFakeProviderBillingFixtures().errors, []);
});

test('fake provider envelopes are signed sanitized and provider neutral', () => {
  FAKE_PROVIDER_BILLING_SCENARIOS.forEach(scenario => {
    const envelope = buildFakeProviderWebhookEnvelope(scenario.id);
    const verification = verifyProviderWebhookEnvelope(envelope);

    assert.equal(envelope.provider, 'fake_provider');
    assert.equal(envelope.signatureStatus, 'verified');
    assert.match(envelope.payloadDigest, /^sha256:/);
    assert.equal(Object.hasOwn(envelope, 'rawProviderPayload'), false);
    assert.equal(Object.hasOwn(envelope.sanitizedFields, 'providerCustomerId'), false);
    assert.equal(Object.hasOwn(envelope.sanitizedFields, 'learnerId'), false);
    assert.equal(Object.hasOwn(envelope.sanitizedFields, 'paymentCredential'), false);
    assert.equal(verification.valid, true, `${scenario.id} should verify: ${verification.errors.join(', ')}`);
  });
});

test('fake provider scenarios normalize into billing records and entitlement projections', () => {
  const recordProducingScenarios = FAKE_PROVIDER_BILLING_SCENARIOS
    .filter(scenario => !['duplicate_webhook_ignored', 'stale_webhook_rejected'].includes(scenario.id));

  recordProducingScenarios.forEach(scenario => {
    const result = runFakeProviderBillingFixtureScenario(scenario.id, {
      now: '2030-05-20T00:00:00.000Z'
    });

    assert.equal(result.ledgerResult.outcome, 'ledger_event_recorded', `${scenario.id} should record a ledger event`);
    assert.ok(result.billingRecords.length >= 1, `${scenario.id} should create billing records`);
    result.billingRecords.forEach(record => assert.deepEqual(validateBillingRecord(record).errors, [], scenario.id));
    assert.deepEqual(validateBillingEntitlementProjection(result.entitlementProjection).errors, [], scenario.id);
    assert.equal(result.entitlementProjection.freePracticeAvailable, true);
    assert.equal(JSON.stringify(result).includes('rawProviderPayload'), false);
    assert.equal(JSON.stringify(result).includes('providerCustomerId'), false);
    assert.equal(JSON.stringify(result).includes('learnerId'), false);
  });
});

test('fake provider duplicate stale and payment-method scenarios are deterministic', () => {
  const duplicate = runFakeProviderBillingFixtureScenario('duplicate_webhook_ignored');
  const stale = runFakeProviderBillingFixtureScenario('stale_webhook_rejected');
  const paymentMethod = runFakeProviderBillingFixtureScenario('payment_method_updated');

  assert.equal(duplicate.ledgerResult.outcome, 'duplicate_webhook_ignored');
  assert.equal(duplicate.ledgerResult.ledgerEvent, null);
  assert.equal(duplicate.entitlementProjection.accessState, 'premium');

  assert.equal(stale.ledgerResult.outcome, 'stale_webhook_rejected');
  assert.equal(stale.ledgerResult.ledgerEvent, null);
  assert.equal(stale.entitlementProjection.accessState, 'premium');

  assert.equal(paymentMethod.ledgerResult.outcome, 'ledger_event_recorded');
  assert.equal(paymentMethod.ledgerResult.ledgerEvent.eventType, 'payment_method_updated');
  assert.equal(paymentMethod.entitlementProjection.accessState, 'premium');
  assert.equal(paymentMethod.entitlementProjection.sourceLedgerEventId.includes('payment_method_updated'), false);
});

test('fake provider fixture docs and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'fake-provider-billing-fixtures.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /fake-provider/i);
  assert.match(docs, /subscription created/i);
  assert.match(docs, /payment method updated/i);
  assert.match(docs, /duplicate webhook ignored/i);
  assert.match(docs, /stale webhook rejected/i);
  assert.match(docs, /provider outage fallback/i);
  assert.match(docs, /raw provider payloads/i);
  assert.match(pkg.scripts['test:unit'], /tests\/fake-provider-billing-fixtures\.test\.js/);
});
