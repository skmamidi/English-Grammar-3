const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  validateBrowserBillingContract,
  validatePaymentProviderModulePlacement
} = require('../server/payment-provider-adapter-boundary');
const {
  createStripePaymentProviderAdapter,
  normalizeStripePaymentProviderConfig,
  sanitizeStripeCheckoutResult,
  validateStripeCheckoutRequest
} = require('../server/provider-adapters/stripe-payment-provider-adapter');

const repoRoot = path.resolve(__dirname, '..');

test('stripe payment provider adapter is disabled unless sandbox or production is explicitly configured', async () => {
  const config = normalizeStripePaymentProviderConfig({});
  const adapter = createStripePaymentProviderAdapter({ config });
  const result = await adapter.createCheckoutSession({
    billingAccountId: 'billing-account-1',
    planId: 'premium_monthly',
    successUrl: 'https://app.example.test/billing/success',
    cancelUrl: 'https://app.example.test/billing/cancel'
  });

  assert.equal(config.enabled, false);
  assert.equal(config.mode, 'disabled');
  assert.equal(result.status, 'disabled');
  assert.equal(result.reason, 'payment_provider_disabled');
  assert.deepEqual(validateBrowserBillingContract(result.browserContract).errors, []);
});

test('checkout session launch returns only hosted urls client refs and redacted billing summaries', async () => {
  const calls = [];
  const adapter = createStripePaymentProviderAdapter({
    config: normalizeStripePaymentProviderConfig({
      GRAMMARQUEST_PAYMENT_PROVIDER: 'stripe',
      STRIPE_PAYMENT_MODE: 'sandbox',
      STRIPE_PUBLISHABLE_KEY: 'pk_test_redacted_placeholder',
      STRIPE_SECRET_KEY_REF: 'secret-manager:stripe/sandbox/api-key'
    }),
    client: {
      async createCheckoutSession(request, options) {
        calls.push({ request, options });
        return {
          id: 'cs_test_redacted_123',
          url: 'https://checkout.stripe.com/c/pay/cs_test_redacted_123',
          client_secret: 'unsafe-client-secret',
          customer: 'cus_redacted',
          subscription: 'sub_redacted',
          payment_intent: 'pi_redacted',
          rawProviderPayload: { unsafe: true }
        };
      }
    }
  });

  const result = await adapter.createCheckoutSession({
    billingAccountId: 'billing-account-1',
    billingOwnerRef: 'guardian:guardian-1',
    planId: 'premium_monthly',
    priceRef: 'price:premium-monthly-usd',
    successUrl: 'https://app.example.test/billing/success',
    cancelUrl: 'https://app.example.test/billing/cancel',
    idempotencyKey: 'checkout-key-1'
  });

  assert.equal(result.status, 'ready');
  assert.equal(result.provider, 'stripe');
  assert.equal(result.browserContract.hostedCheckoutUrl, 'https://checkout.stripe.com/c/pay/cs_test_redacted_123');
  assert.equal(result.browserContract.clientSafeSessionRef, 'checkout-session:cs-test-redacted-123');
  assert.equal(result.browserContract.providerElementConfigRef, 'stripe-elements:sandbox');
  assert.equal(result.browserContract.redactedBillingSummary.accessState, 'checkout_pending');
  assert.deepEqual(validateBrowserBillingContract(result.browserContract).errors, []);
  assert.equal(JSON.stringify(result).includes('unsafe-client-secret'), false);
  assert.equal(JSON.stringify(result).includes('cus_redacted'), false);
  assert.equal(JSON.stringify(result).includes('rawProviderPayload'), false);
  assert.equal(calls[0].request.mode, 'subscription');
  assert.equal(calls[0].options.idempotencyKey, 'checkout-key-1');
});

test('stripe checkout request rejects browser-owned credentials provider ids and unsafe redirects', () => {
  const result = validateStripeCheckoutRequest({
    billingAccountId: 'billing-account-1',
    planId: 'premium_monthly',
    successUrl: 'http://app.example.test/billing/success',
    cancelUrl: 'https://app.example.test/billing/cancel',
    paymentCredential: 'card-value',
    providerCustomerId: 'cus_unsafe',
    rawProviderPayload: { unsafe: true }
  });

  assert.ok(result.errors.includes('successUrl must be https'));
  assert.ok(result.errors.includes('checkout request must not include browser-owned payment credentials or provider ids'));
});

test('stripe checkout sanitizer strips provider ids secrets and raw provider payloads', () => {
  const sanitized = sanitizeStripeCheckoutResult({
    id: 'cs_test_redacted_123',
    url: 'https://checkout.stripe.com/c/pay/cs_test_redacted_123',
    client_secret: 'unsafe-client-secret',
    providerCustomerId: 'cus_unsafe',
    providerPaymentIntentId: 'pi_unsafe',
    rawProviderPayload: { nested: true }
  }, { mode: 'sandbox', publishableKey: 'pk_test_redacted_placeholder' });

  assert.deepEqual(validateBrowserBillingContract(sanitized.browserContract).errors, []);
  assert.equal(JSON.stringify(sanitized).includes('unsafe-client-secret'), false);
  assert.equal(JSON.stringify(sanitized).includes('cus_unsafe'), false);
  assert.equal(JSON.stringify(sanitized).includes('pi_unsafe'), false);
  assert.equal(JSON.stringify(sanitized).includes('rawProviderPayload'), false);
});

test('production payment provider docs and server boundary wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'payment-provider-production-integration.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.deepEqual(validatePaymentProviderModulePlacement('server/provider-adapters/stripe-payment-provider-adapter.js').errors, []);
  [
    'Stripe',
    'server-only',
    'hosted checkout',
    'provider element',
    'webhook signature',
    'native receipt',
    'reconciliation',
    'stop new charges'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));
  assert.match(pkg.scripts['test:unit'], /tests\/provider-payment-adapter-contract\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
