const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BILLING_PRESENTATION_STATES,
  buildBillingPresentationState,
  validateBillingPresentationState
} = require('../assets/billing-state-presentation-policy');

const repoRoot = path.resolve(__dirname, '..');

test('billing presentation policy covers parent-friendly billing states', () => {
  assert.deepEqual(BILLING_PRESENTATION_STATES, [
    'no_subscription',
    'checkout_pending',
    'payment_processing',
    'payment_failed',
    'provider_unavailable',
    'webhook_delayed',
    'renewal_failed',
    'expired',
    'refunded',
    'disputed',
    'canceled_at_period_end'
  ]);

  BILLING_PRESENTATION_STATES.forEach(state => {
    const view = buildBillingPresentationState({ state });
    assert.equal(view.state, state);
    assert.match(view.title, /\S/);
    assert.match(view.message, /\S/);
    assert.equal(view.freePracticeAvailable, true);
    assert.equal(view.parentDashboardAvailable, true);
    assert.equal(view.recoveryMediation, 'server_mediated');
    assert.deepEqual(validateBillingPresentationState(view).errors, []);
  });
});

test('delayed and unavailable billing states avoid overpromising access', () => {
  ['checkout_pending', 'payment_processing', 'provider_unavailable', 'webhook_delayed'].forEach(state => {
    const view = buildBillingPresentationState({ state });
    assert.equal(view.paidAccessPromise, 'not_overpromised');
    assert.ok(view.recoveryActionKeys.includes('check_again') || view.recoveryActionKeys.includes('contact_support'));
    assert.doesNotMatch(view.message, /guaranteed|definitely|provider payload|blame|fault/i);
  });
});

test('failed expired refunded disputed and canceled states have explicit recovery actions', () => {
  const expectations = {
    payment_failed: ['update_payment_method_server_mediated', 'contact_support'],
    renewal_failed: ['update_payment_method_server_mediated', 'contact_support'],
    expired: ['renew_access'],
    refunded: ['contact_support'],
    disputed: ['contact_support'],
    canceled_at_period_end: ['reactivate_subscription']
  };

  Object.entries(expectations).forEach(([state, actions]) => {
    const view = buildBillingPresentationState({ state });
    actions.forEach(action => assert.ok(view.recoveryActionKeys.includes(action), `${state} missing ${action}`));
    assert.equal(view.recoveryMediation, 'server_mediated');
  });
});

test('billing presentation validation rejects unsafe copy and sensitive fields', () => {
  const result = validateBillingPresentationState({
    state: 'payment_failed',
    title: 'Your fault',
    message: 'Provider payload says blame parent and guarantee premium.',
    severity: 'error',
    recoveryActionKeys: ['update_payment_method_server_mediated'],
    recoveryMediation: 'browser_direct',
    paidAccessPromise: 'guaranteed',
    freePracticeAvailable: false,
    parentDashboardAvailable: true,
    providerCustomerId: 'provider-customer-placeholder',
    rawProviderPayload: { nested: true },
    learnerId: 'learner-1'
  });

  assert.ok(result.errors.includes('billing state copy must avoid blame pressure and overpromise'));
  assert.ok(result.errors.includes('recovery actions must be server-mediated'));
  assert.ok(result.errors.includes('free practice must remain available'));
  assert.ok(result.errors.includes('billing state must not include learner identity'));
  assert.ok(result.errors.includes('billing state must not include provider payload or payment details'));
});

test('billing state docs subscription route and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-state-presentation.md'), 'utf8');
  const subscription = fs.readFileSync(path.join(repoRoot, 'subscription.html'), 'utf8');
  const entitlementDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-entitlement-projection.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'no subscription',
    'checkout pending',
    'payment processing',
    'payment failed',
    'provider unavailable',
    'webhook delayed',
    'renewal failed',
    'expired',
    'refunded',
    'canceled at period end',
    'free practice remains available'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(subscription, /Billing Recovery States/i);
  assert.match(entitlementDocs, /billing-state-presentation\.md/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-state-presentation-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
