const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_COMMERCE_CATALOG
} = require('../assets/commerce-catalog-domain');
const {
  DEFAULT_CHECKOUT_LAUNCH_AVAILABILITY_POLICY,
  CHECKOUT_UNAVAILABLE_REASONS,
  buildCheckoutLaunchAvailability,
  validateCheckoutLaunchAvailabilityPolicy,
  validateCheckoutLaunchResponse
} = require('../assets/checkout-launch-availability-policy');

const repoRoot = path.resolve(__dirname, '..');

test('checkout launch policy represents required payment methods and fallback reasons', () => {
  assert.deepEqual(DEFAULT_CHECKOUT_LAUNCH_AVAILABILITY_POLICY.requiredPaymentMethods, [
    'major_cards',
    'apple_pay',
    'paypal',
    'venmo'
  ]);
  assert.deepEqual(CHECKOUT_UNAVAILABLE_REASONS, [
    'unsupported_plan',
    'unsupported_browser',
    'unsupported_device',
    'unsupported_region',
    'unsupported_recurrence_type',
    'provider_outage',
    'checkout_readiness_failed'
  ]);

  const result = validateCheckoutLaunchAvailabilityPolicy(DEFAULT_CHECKOUT_LAUNCH_AVAILABILITY_POLICY);

  assert.deepEqual(result.errors, []);
  assert.equal(DEFAULT_CHECKOUT_LAUNCH_AVAILABILITY_POLICY.serverOwnedCheckoutLaunch, true);
  assert.equal(DEFAULT_CHECKOUT_LAUNCH_AVAILABILITY_POLICY.freePracticeAvailable, true);
});

test('availability keeps selected plan and offers supported fallbacks when wallets are unavailable', () => {
  const availability = buildCheckoutLaunchAvailability({
    catalog: DEFAULT_COMMERCE_CATALOG,
    selectedPlanId: 'premium_monthly',
    requestedPaymentMethod: 'apple_pay',
    checkoutReadiness: 'ready',
    providerAvailable: true,
    browser: { supportsApplePay: false, supportsWalletButtons: true },
    device: { supportsApplePay: true, supportsVenmo: true },
    region: { code: 'US', supportedPaymentMethods: ['major_cards', 'apple_pay', 'paypal', 'venmo'] },
    methodRecurrenceSupport: {
      major_cards: ['month', 'year', 'one_time'],
      apple_pay: ['month', 'year', 'one_time'],
      paypal: ['month', 'year', 'one_time'],
      venmo: ['one_time']
    }
  });

  assert.equal(availability.selectedPlanId, 'premium_monthly');
  assert.equal(availability.selectedPlanPreserved, true);
  assert.equal(availability.freePracticeAvailable, true);

  const applePay = availability.methods.find(method => method.method === 'apple_pay');
  assert.equal(applePay.status, 'unavailable');
  assert.equal(applePay.reason, 'unsupported_browser');
  assert.match(applePay.parentMessage, /Apple Pay is not available in this browser/i);
  assert.deepEqual(applePay.fallbackPaymentMethods, ['major_cards', 'paypal']);

  const venmo = availability.methods.find(method => method.method === 'venmo');
  assert.equal(venmo.status, 'fallback_only');
  assert.equal(venmo.reason, 'unsupported_recurrence_type');
  assert.match(venmo.parentMessage, /Venmo is not available for monthly renewal/i);
  assert.deepEqual(venmo.fallbackPaymentMethods, ['major_cards', 'paypal']);
});

test('availability explains unsupported plan region provider outage and readiness failures', () => {
  const unsupportedPlan = buildCheckoutLaunchAvailability({
    catalog: DEFAULT_COMMERCE_CATALOG,
    selectedPlanId: 'legacy_founder_annual',
    requestedPaymentMethod: 'major_cards'
  });
  assert.ok(unsupportedPlan.methods.every(method => method.reason === 'unsupported_plan'));
  assert.ok(unsupportedPlan.methods.every(method => method.status === 'unavailable'));

  const regionBlocked = buildCheckoutLaunchAvailability({
    catalog: DEFAULT_COMMERCE_CATALOG,
    selectedPlanId: 'premium_one_time_90_day',
    requestedPaymentMethod: 'paypal',
    checkoutReadiness: 'ready',
    providerAvailable: true,
    region: { code: 'CA', supportedPaymentMethods: ['major_cards'] }
  });
  assert.equal(regionBlocked.methods.find(method => method.method === 'paypal').reason, 'unsupported_region');

  const outage = buildCheckoutLaunchAvailability({
    catalog: DEFAULT_COMMERCE_CATALOG,
    selectedPlanId: 'premium_annual',
    requestedPaymentMethod: 'major_cards',
    checkoutReadiness: 'ready',
    providerAvailable: false
  });
  assert.ok(outage.methods.every(method => method.reason === 'provider_outage'));

  const notReady = buildCheckoutLaunchAvailability({
    catalog: DEFAULT_COMMERCE_CATALOG,
    selectedPlanId: 'premium_annual',
    requestedPaymentMethod: 'major_cards',
    checkoutReadiness: 'blocked',
    providerAvailable: true
  });
  assert.ok(notReady.methods.every(method => method.reason === 'checkout_readiness_failed'));
});

test('checkout launch response exposes only browser-safe hosted or provider-element references', () => {
  const safeResponse = {
    selectedPlanId: 'premium_monthly',
    selectedPaymentMethod: 'major_cards',
    hostedCheckoutUrl: 'https://checkout.example.test/session',
    clientSafeSessionRef: 'checkout-session-ref',
    providerElementConfigRef: 'provider-element-config-ref',
    redactedSessionStatus: 'pending',
    methodAvailability: [
      { method: 'major_cards', status: 'available' },
      { method: 'apple_pay', status: 'unavailable', reason: 'unsupported_browser' }
    ],
    fallbackPaymentMethods: ['paypal'],
    freePracticeAvailable: true
  };

  assert.deepEqual(validateCheckoutLaunchResponse(safeResponse).errors, []);

  const unsafeResponse = validateCheckoutLaunchResponse({
    ...safeResponse,
    hostedCheckoutUrl: 'http://checkout.example.test/session',
    providerCustomerId: 'provider-customer-placeholder',
    rawProviderPayload: { secret: true },
    providerPaymentMethodId: 'payment-method-placeholder'
  });

  assert.ok(unsafeResponse.errors.includes('hosted checkout url must be https'));
  assert.ok(unsafeResponse.errors.includes('checkout launch response includes unsafe field: providerCustomerId'));
  assert.ok(unsafeResponse.errors.includes('checkout launch response includes unsafe field: rawProviderPayload'));
  assert.ok(unsafeResponse.errors.includes('checkout launch response includes unsafe field: providerPaymentMethodId'));
});

test('checkout launch docs subscription route and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'checkout-launch-availability-policy.md'), 'utf8');
  const checkoutDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'checkout-method-policy.md'), 'utf8');
  const subscription = fs.readFileSync(path.join(repoRoot, 'subscription.html'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'unsupported plan',
    'unsupported browser',
    'unsupported device',
    'unsupported region',
    'unsupported recurrence type',
    'provider outage',
    'checkout readiness failure',
    'sandbox and staging payment rehearsals',
    'preserve the selected plan',
    'free practice remains available'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(checkoutDocs, /checkout-launch-availability-policy\.md/);
  assert.match(docs, /billing-payment-rehearsals\.md/);
  assert.match(subscription, /Payment Method Availability/i);
  assert.match(subscription, /Major cards/i);
  assert.match(subscription, /Apple Pay/i);
  assert.match(subscription, /PayPal/i);
  assert.match(subscription, /Venmo/i);
  assert.match(pkg.scripts['test:unit'], /tests\/checkout-launch-availability-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
