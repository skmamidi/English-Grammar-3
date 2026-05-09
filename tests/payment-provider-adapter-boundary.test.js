const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  MODULE_BOUNDARY_POLICY,
  auditModuleBoundaries
} = require('../scripts/qa/module-boundary-audit');
const {
  ALLOWED_BROWSER_BILLING_FIELDS,
  SERVER_ONLY_PAYMENT_PROVIDER_FIELDS,
  validateBrowserBillingContract,
  validatePaymentProviderAdapterBoundary,
  validatePaymentProviderModulePlacement
} = require('../server/payment-provider-adapter-boundary');

const repoRoot = path.resolve(__dirname, '..');

test('payment provider adapter boundary names server-only responsibilities and browser-safe fields', () => {
  assert.deepEqual(SERVER_ONLY_PAYMENT_PROVIDER_FIELDS, [
    'apiKey',
    'webhookSecret',
    'idempotencyKey',
    'providerCustomerId',
    'providerSubscriptionId',
    'providerPaymentIntentId',
    'providerOrderId',
    'providerPaymentMethodId',
    'webhookSignatureHeader',
    'receiptValidationSecretRef',
    'nativeReceiptValidationSecretRef',
    'rawProviderPayload',
    'reconciliationCursor'
  ]);
  assert.deepEqual(ALLOWED_BROWSER_BILLING_FIELDS, [
    'publishableConfig',
    'hostedCheckoutUrl',
    'clientSafeSessionRef',
    'providerElementConfigRef',
    'redactedBillingSummary'
  ]);

  assert.deepEqual(validatePaymentProviderAdapterBoundary().errors, []);
});

test('browser billing contracts expose only publishable config checkout urls client refs and redacted summaries', () => {
  assert.deepEqual(validateBrowserBillingContract({
    publishableConfig: { mode: 'test', provider: 'deferred' },
    hostedCheckoutUrl: 'https://checkout.example.test/session',
    clientSafeSessionRef: 'checkout-session-ref',
    providerElementConfigRef: 'element-config-ref',
    redactedBillingSummary: { accessState: 'free', renewal: 'not_applicable' }
  }).errors, []);

  const result = validateBrowserBillingContract({
    hostedCheckoutUrl: 'https://checkout.example.test/session',
    apiKey: 'secret-placeholder',
    providerCustomerId: 'provider-customer-placeholder',
    providerSubscriptionId: 'provider-subscription-placeholder',
    webhookSignatureHeader: 't=timestamp,v1=signature',
    rawProviderPayload: { type: 'checkout.session.created' }
  });

  assert.ok(result.errors.includes('browser billing contract includes server-only field: apiKey'));
  assert.ok(result.errors.includes('browser billing contract includes server-only field: providerCustomerId'));
  assert.ok(result.errors.includes('browser billing contract includes server-only field: providerSubscriptionId'));
  assert.ok(result.errors.includes('browser billing contract includes server-only field: webhookSignatureHeader'));
  assert.ok(result.errors.includes('browser billing contract includes server-only field: rawProviderPayload'));
});

test('payment provider modules are restricted to server or provider-adapter layers', () => {
  assert.deepEqual(validatePaymentProviderModulePlacement('server/billing/payment-provider-adapter.js').errors, []);
  assert.deepEqual(validatePaymentProviderModulePlacement('providers/payment/fake-provider-adapter.js').errors, []);
  assert.deepEqual(validatePaymentProviderModulePlacement('server/provider-adapters/stripe-payment-provider-adapter.js').errors, []);
  assert.deepEqual(validatePaymentProviderModulePlacement('server/provider-adapters/native-receipt-validation-adapter.js').errors, []);

  assert.ok(validatePaymentProviderModulePlacement('assets/billing-provider-adapter.js').errors.includes('payment provider adapter must be server-only'));
  assert.ok(validatePaymentProviderModulePlacement('assets/subscription-ui.js').errors.includes('payment provider adapter must be server-only'));
});

test('module boundary audit rejects payment provider SDK imports in browser assets', () => {
  const fixtureRoot = makeFixture({
    'index.html': '<script src="assets/subscription-ui.js"></script>',
    'assets/subscription-ui.js': "import paypal from '@paypal/paypal-js'; console.log(paypal);",
    'docs/frontend-architecture.md': 'Owned production globals: QUIZ_SET_ID'
  });

  const report = auditModuleBoundaries({ root: fixtureRoot });

  assert.equal(report.ok, false);
  assert.ok(report.violations.some(violation => violation.code === 'provider_sdk_in_browser_domain'));
  assert.ok(MODULE_BOUNDARY_POLICY.providerSdkPrefixes.includes('@paypal/'));
  assert.ok(MODULE_BOUNDARY_POLICY.providerSdkPrefixes.includes('@braintree/'));
});

test('payment provider boundary docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'payment-provider-adapter-boundary.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'server-only',
    'API keys',
    'webhook secrets',
    'idempotency keys',
    'provider SDKs',
    'hosted checkout URLs',
    'client-safe session references',
    'redacted billing summaries',
    'raw provider payload'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(pkg.scripts['test:unit'], /tests\/payment-provider-adapter-boundary\.test\.js/);
});

function makeFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'payment-provider-boundary-'));
  Object.entries(files).forEach(([file, source]) => {
    const fullPath = path.join(root, file);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, source);
  });
  return root;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
