const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_CHECKOUT_METHOD_POLICY,
  REQUIRED_PAYMENT_METHODS,
  validateCheckoutInitiationRequest,
  validateCheckoutMethodPolicy,
  validatePaymentMethodSurface
} = require('../assets/checkout-method-policy');
const {
  validateCommerceRouteSecurity,
  validatePaymentCredentialFields
} = require('../assets/commerce-security-policy');
const {
  DEFAULT_BILLING_MARKET_READINESS_MATRIX,
  getWalletAvailabilityForMarket
} = require('../assets/billing-market-readiness-matrix');

const repoRoot = path.resolve(__dirname, '..');

test('checkout method policy requires hosted element or approved wallet surfaces for every method', () => {
  assert.deepEqual(REQUIRED_PAYMENT_METHODS, [
    'major_cards',
    'apple_pay',
    'paypal',
    'venmo'
  ]);

  const result = validateCheckoutMethodPolicy(DEFAULT_CHECKOUT_METHOD_POLICY);

  assert.deepEqual(result.errors, []);
  REQUIRED_PAYMENT_METHODS.forEach(method => {
    const row = DEFAULT_CHECKOUT_METHOD_POLICY.paymentMethods.find(item => item.method === method);
    assert.ok(['provider_hosted_checkout', 'provider_elements', 'approved_wallet_button'].includes(row.requiredSurface));
  });
});

test('raw card wallet PayPal Venmo and provider credential fields remain forbidden', () => {
  const result = validatePaymentCredentialFields([
    'cardNumber',
    'cvv',
    'walletCredential',
    'paypalCredential',
    'venmoCredential',
    'providerCustomerId',
    'providerPaymentMethodId',
    'rawProviderPayload'
  ]);

  [
    'cardNumber',
    'cvv',
    'walletCredential',
    'paypalCredential',
    'venmoCredential',
    'providerCustomerId',
    'providerPaymentMethodId',
    'rawProviderPayload'
  ].forEach(field => assert.ok(result.errors.includes(`forbidden payment credential field: ${field}`)));
});

test('checkout initiation is server-owned and browser-safe', () => {
  const request = {
    billingAccountId: 'billing-account-1',
    planId: 'premium_monthly',
    checkoutRouteId: 'billing_checkout',
    requestedPaymentMethods: ['major_cards', 'apple_pay'],
    successReturnRoute: '/subscription.html',
    cancelReturnRoute: '/subscription.html',
    responseContract: {
      hostedCheckoutUrl: 'https://checkout.example.test/session',
      clientSafeSessionRef: 'checkout-session-ref',
      providerElementConfigRef: 'element-config-ref',
      redactedSessionStatus: 'pending'
    }
  };

  assert.deepEqual(validateCheckoutInitiationRequest(request).errors, []);
  assert.ok(validateCheckoutInitiationRequest({
    ...request,
    providerCustomerId: 'provider-customer-placeholder'
  }).errors.includes('checkout initiation must not include server-only provider field: providerCustomerId'));
  assert.ok(validateCheckoutInitiationRequest({
    ...request,
    requestedPaymentMethods: ['bank_transfer']
  }).errors.includes('unsupported checkout payment method: bank_transfer'));
});

test('checkout method availability is market-reviewed before payment launch', () => {
  const us = getWalletAvailabilityForMarket(DEFAULT_BILLING_MARKET_READINESS_MATRIX, 'US');
  const ca = getWalletAvailabilityForMarket(DEFAULT_BILLING_MARKET_READINESS_MATRIX, 'CA');

  REQUIRED_PAYMENT_METHODS.forEach(method => {
    assert.ok(us[method], `${method} must have US market availability`);
    assert.ok(ca[method], `${method} must have CA market availability`);
    assert.ok(['preview_ready', 'requires_evidence', 'not_available'].includes(us[method].status));
  });
  assert.equal(ca.venmo.status, 'not_available');
  assert.ok(ca.venmo.fallbackCopyKey);
});

test('payment method surfaces reject custom app-owned credential forms', () => {
  assert.deepEqual(validatePaymentMethodSurface({
    method: 'major_cards',
    surface: 'provider_elements',
    routeClass: 'checkout',
    capturesRawCredentials: false
  }).errors, []);

  const result = validatePaymentMethodSurface({
    method: 'major_cards',
    surface: 'app_owned_form',
    routeClass: 'checkout',
    capturesRawCredentials: true
  });

  assert.ok(result.errors.includes('payment method must use hosted checkout provider elements or approved wallet button'));
  assert.ok(result.errors.includes('payment method must not capture raw credentials'));
});

test('non-checkout pages cannot enable payment or mount provider scripts', () => {
  const result = validateCommerceRouteSecurity({
    routeId: 'pricing',
    routeClass: 'marketing',
    paymentPermission: 'route_scoped',
    permittedScriptOrigins: ['self', 'provider_hosted_payment_origin']
  });

  assert.ok(result.errors.includes('payment permission must stay denied outside checkout routes'));
  assert.ok(result.errors.includes('third-party scripts must be isolated to audited checkout routes'));
});

test('checkout method docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'checkout-method-policy.md'), 'utf8');
  const securityDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'commerce-security-policy.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'provider-hosted checkout',
    'provider elements',
    'approved wallet buttons',
    'major cards',
    'Apple Pay',
    'PayPal',
    'Venmo',
    'no custom raw card forms',
    'server-owned checkout initiation',
    'fallback'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(securityDocs, /checkout-method-policy\.md/);
  assert.match(pkg.scripts['test:unit'], /tests\/checkout-method-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
