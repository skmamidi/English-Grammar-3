const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BILLING_LEDGER_EVENT_TYPES,
  DEFAULT_BILLING_WEBHOOK_LEDGER_POLICY,
  applyBillingLedgerEvent,
  isEntitlementWriteAllowed,
  sanitizeWebhookDiagnostics,
  validateBillingWebhookLedgerPolicy,
  verifyProviderWebhookEnvelope
} = require('../server/billing-webhook-ledger-policy');
const { validateBillingRecord } = require('../assets/billing-domain-contracts');

const repoRoot = path.resolve(__dirname, '..');

function verifiedEnvelope(overrides = {}) {
  return {
    envelopeId: 'webhook-envelope-1',
    provider: 'provider-neutral-sandbox',
    signatureStatus: 'verified',
    receivedAt: '2030-05-03T00:00:00.000Z',
    eventCreatedAt: '2030-05-03T00:00:00.000Z',
    providerEventRef: 'provider-event-ref-1',
    idempotencyKey: 'ledger-key-1',
    eventType: 'renewal_succeeded',
    sequence: 20,
    payloadDigest: 'sha256:62f07055f2f3b8ad',
    sanitizedFields: {
      billingAccountId: 'billing-account-1',
      planId: 'premium_monthly',
      accessLevel: 'premium',
      currentPeriodStart: '2030-05-01T00:00:00.000Z',
      currentPeriodEnd: '2030-06-01T00:00:00.000Z',
      currency: 'USD',
      amountMinor: 999
    },
    ...overrides
  };
}

test('billing webhook ledger policy requires signed replay-protected idempotent webhooks', () => {
  assert.deepEqual(BILLING_LEDGER_EVENT_TYPES, [
    'subscription_created',
    'payment_method_updated',
    'renewal_succeeded',
    'renewal_failed',
    'subscription_canceled',
    'one_time_payment_succeeded',
    'refund_issued',
    'dispute_opened',
    'duplicate_webhook_ignored',
    'stale_webhook_rejected',
    'provider_outage_fallback'
  ]);

  assert.equal(DEFAULT_BILLING_WEBHOOK_LEDGER_POLICY.signedWebhookRequired, true);
  assert.equal(DEFAULT_BILLING_WEBHOOK_LEDGER_POLICY.replayProtectionRequired, true);
  assert.equal(DEFAULT_BILLING_WEBHOOK_LEDGER_POLICY.idempotentLedgerWritesRequired, true);
  assert.equal(DEFAULT_BILLING_WEBHOOK_LEDGER_POLICY.monotonicEventOrderingRequired, true);
  assert.equal(DEFAULT_BILLING_WEBHOOK_LEDGER_POLICY.checkoutRedirectsInformationalOnly, true);
  assert.equal(DEFAULT_BILLING_WEBHOOK_LEDGER_POLICY.rawProviderPayloadForbidden, true);

  assert.deepEqual(validateBillingWebhookLedgerPolicy(DEFAULT_BILLING_WEBHOOK_LEDGER_POLICY).errors, []);
});

test('provider-neutral webhook envelopes must be signed and audit safe', () => {
  const accepted = verifyProviderWebhookEnvelope(verifiedEnvelope());

  assert.equal(accepted.valid, true);
  assert.deepEqual(accepted.errors, []);
  assert.equal(accepted.envelope.eventType, 'renewal_succeeded');
  assert.equal(accepted.envelope.sanitizedFields.billingAccountId, 'billing-account-1');

  [
    ['signatureStatus', 'missing'],
    ['idempotencyKey', ''],
    ['payloadDigest', ''],
    ['eventType', 'plan_changed']
  ].forEach(([field, value]) => {
    const result = verifyProviderWebhookEnvelope(verifiedEnvelope({ [field]: value }));
    assert.equal(result.valid, false, `${field} should be rejected`);
  });

  [
    { rawProviderPayload: { amount: 999 } },
    { sanitizedFields: { billingAccountId: 'billing-account-1', providerCustomerId: 'customer-ref' } },
    { sanitizedFields: { billingAccountId: 'billing-account-1', learnerId: 'learner-1' } },
    { sanitizedFields: { billingAccountId: 'billing-account-1', paymentCredential: 'browser-collected-value' } },
    { webhookSecret: 'configured elsewhere' }
  ].forEach(payload => {
    const result = verifyProviderWebhookEnvelope(verifiedEnvelope(payload));
    assert.equal(result.valid, false, 'unsafe payload shape should be rejected');
    assert.match(result.errors.join('\n'), /audit safe|server-only|raw provider/i);
  });
});

test('verified webhook envelopes create idempotent ordered ledger events and billing records', () => {
  const first = applyBillingLedgerEvent({
    envelope: verifiedEnvelope(),
    existingEvents: []
  });

  assert.equal(first.outcome, 'ledger_event_recorded');
  assert.equal(first.ledgerEvent.eventType, 'renewal_succeeded');
  assert.equal(first.ledgerEvent.sourceEnvelopeId, 'webhook-envelope-1');
  assert.equal(first.ledgerEvent.sourceProviderEventRef, 'provider-event-ref-1');
  assert.equal(first.ledgerEvent.idempotencyKey, 'ledger-key-1');
  assert.equal(first.ledgerEvent.status, 'verified');
  assert.ok(first.ledgerEvent.records.length >= 2);
  first.ledgerEvent.records.forEach(record => assert.deepEqual(validateBillingRecord(record).errors, []));

  const duplicate = applyBillingLedgerEvent({
    envelope: verifiedEnvelope({ envelopeId: 'webhook-envelope-duplicate' }),
    existingEvents: [first.ledgerEvent]
  });

  assert.equal(duplicate.outcome, 'duplicate_webhook_ignored');
  assert.equal(duplicate.duplicate, true);
  assert.equal(duplicate.ledgerEvent, null);
  assert.equal(duplicate.diagnostics.idempotencyKey, '[REDACTED]');

  const stale = applyBillingLedgerEvent({
    envelope: verifiedEnvelope({
      envelopeId: 'webhook-envelope-stale',
      idempotencyKey: 'ledger-key-stale',
      eventCreatedAt: '2030-05-02T23:00:00.000Z',
      sequence: 19
    }),
    existingEvents: [first.ledgerEvent]
  });

  assert.equal(stale.outcome, 'stale_webhook_rejected');
  assert.equal(stale.ledgerEvent, null);
});

test('ledger normalizes subscription lifecycle payments refunds disputes and outages', () => {
  const cases = [
    ['subscription_created', 'subscription'],
    ['renewal_failed', 'past_due_state'],
    ['subscription_canceled', 'cancellation'],
    ['one_time_payment_succeeded', 'one_time_purchase'],
    ['refund_issued', 'refund'],
    ['dispute_opened', 'dispute'],
    ['provider_outage_fallback', 'grace_period']
  ];

  cases.forEach(([eventType, expectedRecordType], index) => {
    const result = applyBillingLedgerEvent({
      envelope: verifiedEnvelope({
        envelopeId: `webhook-envelope-${eventType}`,
        idempotencyKey: `ledger-key-${eventType}`,
        providerEventRef: `provider-event-ref-${eventType}`,
        eventType,
        sequence: index + 30
      }),
      existingEvents: []
    });
    const recordTypes = result.ledgerEvent.records.map(record => record.recordType);

    assert.equal(result.outcome, 'ledger_event_recorded');
    assert.ok(recordTypes.includes(expectedRecordType), `${eventType} should include ${expectedRecordType}`);
    result.ledgerEvent.records.forEach(record => assert.deepEqual(validateBillingRecord(record).errors, []));
  });
});

test('entitlement writes can only come from verified ledger events and diagnostics stay redacted', () => {
  assert.equal(isEntitlementWriteAllowed({ source: 'verified_billing_ledger', sourceLedgerEventId: 'ledger-event-1' }), true);
  assert.equal(isEntitlementWriteAllowed({ source: 'browser_redirect', sourceLedgerEventId: 'ledger-event-1' }), false);
  assert.equal(isEntitlementWriteAllowed({ source: 'checkout_success_redirect', sourceLedgerEventId: 'ledger-event-1' }), false);
  assert.equal(isEntitlementWriteAllowed({ source: 'verified_billing_ledger' }), false);

  const diagnostics = sanitizeWebhookDiagnostics({
    envelopeId: 'webhook-envelope-1',
    providerEventRef: 'provider-event-ref-1',
    idempotencyKey: 'ledger-key-1',
    learnerId: 'learner-1',
    paymentCredential: 'browser-collected-value',
    rawProviderPayload: { nested: true },
    nested: { webhookSecret: 'configured elsewhere' }
  });

  assert.equal(diagnostics.envelopeId, 'webhook-envelope-1');
  assert.equal(diagnostics.providerEventRef, '[REDACTED]');
  assert.equal(diagnostics.idempotencyKey, '[REDACTED]');
  assert.equal(diagnostics.learnerId, '[REDACTED]');
  assert.equal(diagnostics.paymentCredential, '[REDACTED]');
  assert.equal(diagnostics.rawProviderPayload, '[REDACTED]');
  assert.equal(diagnostics.nested.webhookSecret, '[REDACTED]');
});

test('billing webhook ledger docs and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-webhook-ledger-policy.md'), 'utf8');
  const billingDomainDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-domain-contracts.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /signed webhook/i);
  assert.match(docs, /idempotent ledger/i);
  assert.match(docs, /duplicate webhook ignored/i);
  assert.match(docs, /stale webhook rejected/i);
  assert.match(docs, /provider outage fallback/i);
  assert.match(docs, /checkout success redirects are informational/i);
  assert.match(docs, /billing-rollback-policy\.md/);
  assert.match(docs, /verified webhook processing/i);
  assert.match(billingDomainDocs, /verified billing ledger/i);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-webhook-ledger-policy\.test\.js/);
});
