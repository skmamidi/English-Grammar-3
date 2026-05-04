const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const copy = require('../assets/ui-copy-policy');
const {
  DEFAULT_SUBSCRIPTION_UX_POLICY,
  REQUIRED_SUBSCRIPTION_COPY_CATEGORIES,
  validateSubscriptionUxPolicy,
  validateSubscriptionUxSurface
} = require('../assets/subscription-ux-policy');

const repoRoot = path.resolve(__dirname, '..');

test('subscription UX policy defines ethical provider-neutral launch standards', () => {
  const result = validateSubscriptionUxPolicy(DEFAULT_SUBSCRIPTION_UX_POLICY);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.policy.requiredCopyCategories, REQUIRED_SUBSCRIPTION_COPY_CATEGORIES);
  assert.equal(result.policy.providerNeutral, true);
  assert.equal(result.policy.nativeReady, true);
});

test('subscription UX rejects unclear renewal consent cancellation and pricing patterns', () => {
  const result = validateSubscriptionUxSurface({
    surface: 'subscription',
    purchaseType: 'recurring_subscription',
    pricingDisplay: { amountVisible: false, currencyVisible: true, intervalVisible: false },
    renewalDisclosure: { text: 'Membership continues.', beforeBillingInfo: false },
    autoRenewConsent: { expressConsent: false, checkboxDefault: true },
    cancellation: { availableBeforePurchase: false, method: 'phone_only', stepsComparedToSignup: 'harder' },
    taxFeeDisclosure: { visibleBeforeCheckout: false },
    copyTone: { shaming: true, text: 'Only irresponsible parents cancel.' },
    ruleVerification: { status: 'stale', checkedAt: '', sources: [] }
  });

  assert.ok(result.errors.includes('amount_must_be_visible_before_checkout'));
  assert.ok(result.errors.includes('interval_must_be_visible_for_recurring_subscription'));
  assert.ok(result.errors.includes('renewal_terms_required_before_billing_info'));
  assert.ok(result.errors.includes('express_auto_renew_consent_required'));
  assert.ok(result.errors.includes('paid_options_must_not_be_prechecked'));
  assert.ok(result.errors.includes('cancellation_must_be_available_before_purchase'));
  assert.ok(result.errors.includes('cancellation_must_not_be_harder_than_signup'));
  assert.ok(result.errors.includes('tax_and_fee_disclosure_required'));
  assert.ok(result.errors.includes('shaming_copy_forbidden'));
  assert.ok(result.errors.includes('current_rule_verification_required_for_launch'));
});

test('one-time access copy is distinct from recurring subscription language', () => {
  const result = validateSubscriptionUxSurface({
    surface: 'one-time-access',
    purchaseType: 'one_time_access',
    pricingDisplay: { amountVisible: true, currencyVisible: true, intervalVisible: false },
    oneTimeAccess: { accessWindowVisible: false, text: 'Renews every month for continued access.' },
    autoRenewConsent: { expressConsent: false, checkboxDefault: false },
    cancellation: { availableBeforePurchase: true, method: 'self_service', stepsComparedToSignup: 'same_or_easier' },
    taxFeeDisclosure: { visibleBeforeCheckout: true },
    copyTone: { shaming: false, text: '90 days of access.' },
    ruleVerification: { status: 'verified_for_design', checkedAt: '2026-05-03', sources: ['docs/subscription-ux-standards.md'] }
  });

  assert.ok(result.errors.includes('one_time_access_window_required'));
  assert.ok(result.errors.includes('one_time_access_must_not_use_renewal_language'));
});

test('subscription billing copy categories are localization-ready and safe', () => {
  const policy = copy.validateUiCopyPolicy(copy.DEFAULT_UI_COPY_POLICY);

  REQUIRED_SUBSCRIPTION_COPY_CATEGORIES.forEach(category => {
    assert.ok(copy.REQUIRED_COPY_CATEGORIES.includes(category), `${category} copy category should be registered`);
  });
  assert.deepEqual(policy.errors, []);
  REQUIRED_SUBSCRIPTION_COPY_CATEGORIES.forEach(category => {
    assert.ok(policy.policy.entries.some(entry => entry.category === category), `${category} should have representative copy`);
  });
});

test('subscription UX docs cite current-rule verification without hard-coding legal advice', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'subscription-ux-standards.md'), 'utf8');
  const compliance = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'material terms',
    'express consent',
    'cancellation',
    'one-time access',
    'tax/fee disclosure',
    'no prechecked paid options',
    'no shaming copy',
    'current-rule verification',
    'FTC',
    'California Automatic Renewal Law',
    'Apple App Store',
    'Google Play',
    'not legal advice'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(compliance, /subscription-ux-standards\.md/);
  assert.match(pkg.scripts['test:unit'], /tests\/subscription-ux-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
