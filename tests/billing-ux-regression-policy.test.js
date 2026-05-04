const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { createComponentHarness } = require('./helpers/component-harness');
const {
  BILLING_UX_FORBIDDEN_FIELDS,
  DEFAULT_BILLING_UX_REGRESSION_MATRIX,
  REQUIRED_BILLING_UX_SCENARIOS,
  assertBillingUxProjectionPrivacy,
  buildBillingUxStateFixture,
  validateBillingUxRegressionMatrix
} = require('../assets/billing-ux-regression-policy');
const {
  DEFAULT_VISUAL_STATE_MATRIX,
  validateVisualStateMatrix
} = require('../assets/visual-state-matrix');

const repoRoot = path.resolve(__dirname, '..');

test('billing UX regression matrix covers parent-safe route states and accessibility preferences', () => {
  const result = validateBillingUxRegressionMatrix(DEFAULT_BILLING_UX_REGRESSION_MATRIX);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.matrix.requiredScenarios, REQUIRED_BILLING_UX_SCENARIOS);

  const scenarios = new Map(result.matrix.scenarios.map(scenario => [scenario.id, scenario]));
  [
    'mobile-long-localized-price',
    'billing-loading',
    'billing-empty',
    'billing-error-recovery',
    'checkout-method-fallbacks'
  ].forEach(id => assert.ok(scenarios.has(id), `missing billing UX scenario ${id}`));

  const longPrice = scenarios.get('mobile-long-localized-price');
  assert.deepEqual(longPrice.viewports, ['mobile', 'tablet', 'desktop']);
  assert.ok(longPrice.expectations.includes('no_text_overflow'));
  assert.ok(longPrice.expectations.includes('parent_safe_copy'));

  const recovery = scenarios.get('billing-error-recovery');
  assert.ok(recovery.states.includes('provider_unavailable'));
  assert.ok(recovery.states.includes('payment_failed'));
  assert.ok(recovery.states.includes('webhook_delayed'));
  assert.ok(recovery.expectations.includes('non_destructive_recovery'));

  const preferences = new Set(result.matrix.coverage.accessibilityPreferences);
  assert.ok(preferences.has('reduced_motion'));
  assert.ok(preferences.has('forced_colors'));
  assert.ok(result.matrix.coverage.visualStateMatrixIds.includes('subscription-billing-loading'));
  assert.ok(result.matrix.coverage.routeComposition.includes('subscription.html'));
  assert.ok(result.matrix.coverage.telemetryPrivacy.includes('billing_ux_state_viewed'));
});

test('billing UX fixtures withstand long localized strings without exposing unsafe billing data', () => {
  const fixture = buildBillingUxStateFixture({
    scenarioId: 'mobile-long-localized-price',
    locale: 'de-DE',
    priceLabel: '123.456,78 Euro pro Jahr inklusive geschatzter Steuern und lokal anfallender Gebuhren',
    renewalLabel: 'Automatische Verlangerung am 31. Dezember 2030 nach der lokalen Rechnungsprufung',
    recoveryAction: 'Zahlungsmethode sicher aktualisieren',
    providerCustomerId: 'cus_unsafe',
    learnerId: 'learner-unsafe',
    studentName: 'Maya Unsafe'
  });

  const harness = createComponentHarness();
  harness.render(fixture.html);

  assert.equal(fixture.state, 'localized_price');
  assert.equal(fixture.privacySafe, true);
  assert.match(fixture.html, /123\.456,78 Euro/);
  assert.doesNotMatch(fixture.html, /cus_unsafe|learner-unsafe|Maya Unsafe/);
  assert.doesNotThrow(() => assertBillingUxProjectionPrivacy(fixture.projection));
  harness.getByRole('button', { name: 'Zahlungsmethode sicher aktualisieren' });
  harness.assertTouchTarget('button', 44);
  harness.assertFocusVisible('button');
  harness.assertNoOverflowText({ maxWordLength: 36 });
  harness.assertNoUnsafeCopy();
});

test('billing UX projection privacy rejects provider payloads credentials learners and student names', () => {
  BILLING_UX_FORBIDDEN_FIELDS.forEach(field => {
    assert.throws(
      () => assertBillingUxProjectionPrivacy({ state: 'active', [field]: 'unsafe' }),
      /unsafe_billing_ux_field/
    );
  });

  assert.doesNotThrow(() => assertBillingUxProjectionPrivacy({
    state: 'active',
    planFamily: 'premium',
    billingState: 'renewing',
    priceDisplay: '$12.99 per month',
    renewalDisplay: 'Renews June 1, 2030',
    fallbackPaymentMethods: ['major_cards', 'paypal'],
    recoveryActions: [{ action: 'update_payment_method', label: 'Update payment method' }]
  }));
});

test('billing UX regression coverage is wired into route docs visual matrix telemetry and CI', () => {
  const billingDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-ux-regression-matrix.md'), 'utf8');
  const routeDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'subscription-route.md'), 'utf8');
  const telemetryDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'telemetry-contract.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(billingDocs, /Billing UX Regression Matrix/);
  assert.match(billingDocs, /mobile layouts/i);
  assert.match(billingDocs, /long localized price/i);
  assert.match(billingDocs, /loading, empty, error, and recovery/i);
  assert.match(billingDocs, /checkout method fallbacks/i);
  assert.match(routeDocs, /billing UX regression matrix/i);
  assert.match(telemetryDocs, /billing_ux_state_viewed/);
  assert.match(telemetryDocs, /must not include provider payloads, payment credentials, learner IDs, or student names/i);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-ux-regression-policy\.test\.js/);

  const visual = validateVisualStateMatrix(DEFAULT_VISUAL_STATE_MATRIX, { baselineNames: listBaselineNames() });
  const subscriptionEntries = visual.matrix.entries.filter(entry => entry.flow === 'subscription');
  assert.deepEqual(visual.errors, []);
  assert.ok(subscriptionEntries.some(entry => entry.id === 'subscription-billing-loading'));
  assert.ok(subscriptionEntries.some(entry => entry.id === 'subscription-billing-error-recovery'));
});

function listBaselineNames() {
  return fs.readdirSync(path.join(__dirname, 'visual-baselines'))
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace(/\.json$/, ''));
}
