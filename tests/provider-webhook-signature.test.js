const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const {
  applyBillingLedgerEvent,
  verifyProviderWebhookEnvelope
} = require('../server/billing-webhook-ledger-policy');
const {
  buildStripeWebhookEnvelope,
  buildStripeWebhookSignatureHeader,
  verifyStripeWebhookSignature
} = require('../server/provider-adapters/stripe-payment-provider-adapter');

test('stripe webhook signatures use timestamped hmac payloads and reject tampering', () => {
  const secret = 'whsec_redacted_test_secret';
  const payload = JSON.stringify(stripeEvent());
  const timestamp = 1903996800;
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const header = `t=${timestamp},v1=${signature}`;

  const verified = verifyStripeWebhookSignature({
    payload,
    signatureHeader: header,
    webhookSecret: secret,
    receivedAt: '2030-05-03T00:00:00.000Z'
  });

  assert.equal(verified.valid, true);
  assert.equal(verified.timestamp, timestamp);
  assert.match(verified.payloadDigest, /^sha256:[a-f0-9]{12,}$/);

  assert.equal(verifyStripeWebhookSignature({
    payload: `${payload} `,
    signatureHeader: header,
    webhookSecret: secret,
    receivedAt: '2030-05-03T00:00:00.000Z'
  }).valid, false);
});

test('stripe webhook verification rejects stale timestamps and replayed signatures', () => {
  const secret = 'whsec_redacted_test_secret';
  const payload = JSON.stringify(stripeEvent());
  const replayCache = new Set();
  const current = buildStripeWebhookSignatureHeader({
    payload,
    webhookSecret: secret,
    timestamp: 1903996800
  });

  const first = verifyStripeWebhookSignature({
    payload,
    signatureHeader: current,
    webhookSecret: secret,
    receivedAt: '2030-05-03T00:00:00.000Z',
    replayCache
  });
  const replayed = verifyStripeWebhookSignature({
    payload,
    signatureHeader: current,
    webhookSecret: secret,
    receivedAt: '2030-05-03T00:00:00.000Z',
    replayCache
  });
  const stale = verifyStripeWebhookSignature({
    payload,
    signatureHeader: buildStripeWebhookSignatureHeader({ payload, webhookSecret: secret, timestamp: 1903990000 }),
    webhookSecret: secret,
    receivedAt: '2030-05-03T00:00:00.000Z'
  });

  assert.equal(first.valid, true);
  assert.equal(replayed.valid, false);
  assert.ok(replayed.errors.includes('webhook signature replay detected'));
  assert.equal(stale.valid, false);
  assert.ok(stale.errors.includes('webhook timestamp outside tolerance'));
});

test('verified stripe events become sanitized provider-neutral billing envelopes', () => {
  const secret = 'whsec_redacted_test_secret';
  const event = stripeEvent();
  const payload = JSON.stringify(event);
  const signatureHeader = buildStripeWebhookSignatureHeader({
    payload,
    webhookSecret: secret,
    timestamp: 1903996800
  });
  const envelope = buildStripeWebhookEnvelope({
    payload,
    signatureHeader,
    webhookSecret: secret,
    receivedAt: '2030-05-03T00:00:00.000Z'
  });

  assert.equal(envelope.signatureStatus, 'verified');
  assert.equal(envelope.provider, 'stripe');
  assert.equal(envelope.providerEventRef, 'evt-redacted-invoice-paid');
  assert.equal(envelope.eventType, 'renewal_succeeded');
  assert.equal(envelope.idempotencyKey, 'stripe:evt-redacted-invoice-paid');
  assert.equal(envelope.sanitizedFields.billingAccountId, 'billing-account-1');
  assert.equal(envelope.sanitizedFields.planId, 'premium_monthly');
  assert.equal(Object.hasOwn(envelope, 'rawProviderPayload'), false);
  assert.deepEqual(verifyProviderWebhookEnvelope(envelope).errors, []);

  const ledger = applyBillingLedgerEvent({ envelope, existingEvents: [] });
  assert.equal(ledger.outcome, 'ledger_event_recorded');
  assert.equal(ledger.ledgerEvent.eventType, 'renewal_succeeded');
});

test('stripe webhook envelope builder reports invalid signatures without leaking payload data', () => {
  const result = buildStripeWebhookEnvelope({
    payload: JSON.stringify(stripeEvent({ id: 'evt-redacted-bad' })),
    signatureHeader: 't=1903982400,v1=bad',
    webhookSecret: 'whsec_redacted_test_secret',
    receivedAt: '2030-05-03T00:00:00.000Z'
  });

  assert.equal(result.signatureStatus, 'invalid');
  assert.equal(result.eventType, 'signature_verification_failed');
  assert.match(result.payloadDigest, /^sha256:/);
  assert.equal(JSON.stringify(result).includes('customer'), false);
  assert.equal(JSON.stringify(result).includes('rawProviderPayload'), false);
});

function stripeEvent(overrides = {}) {
  return {
    id: 'evt-redacted-invoice-paid',
    type: 'invoice.payment_succeeded',
    created: 1903982400,
    data: {
      object: {
        id: 'in_redacted',
        metadata: {
          billingAccountId: 'billing-account-1',
          planId: 'premium_monthly'
        },
        amount_paid: 999,
        currency: 'usd',
        period_start: 1903809600,
        period_end: 1906488000
      }
    },
    ...overrides
  };
}
