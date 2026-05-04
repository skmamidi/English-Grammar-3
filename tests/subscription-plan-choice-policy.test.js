const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_SUBSCRIPTION_PLAN_CHOICE_POLICY,
  buildSubscriptionPlanChoices,
  validateSubscriptionPlanChoice,
  validateSubscriptionPlanChoicePolicy
} = require('../assets/subscription-plan-choice-policy');
const { DEFAULT_COMMERCE_CATALOG } = require('../assets/commerce-catalog-domain');

const repoRoot = path.resolve(__dirname, '..');

test('plan choice policy requires monthly annual and one-time material terms', () => {
  assert.deepEqual(DEFAULT_SUBSCRIPTION_PLAN_CHOICE_POLICY.requiredPlanIds, [
    'premium_monthly',
    'premium_annual',
    'premium_one_time_90_day'
  ]);
  assert.equal(DEFAULT_SUBSCRIPTION_PLAN_CHOICE_POLICY.checkoutEnabled, false);
  assert.equal(DEFAULT_SUBSCRIPTION_PLAN_CHOICE_POLICY.freePracticeAvailable, true);
  assert.deepEqual(validateSubscriptionPlanChoicePolicy(DEFAULT_SUBSCRIPTION_PLAN_CHOICE_POLICY).errors, []);
});

test('catalog-derived plan choices disclose required terms before checkout', () => {
  const choices = buildSubscriptionPlanChoices(DEFAULT_COMMERCE_CATALOG);

  assert.deepEqual(choices.map(choice => choice.planId), [
    'premium_monthly',
    'premium_annual',
    'premium_one_time_90_day'
  ]);

  choices.forEach(choice => {
    assert.equal(choice.checkoutEnabled, false);
    assert.equal(choice.freePracticeAvailable, true);
    assert.ok(choice.priceDisplay);
    assert.ok(choice.billingIntervalLabel);
    assert.ok(choice.renewalBehavior);
    assert.ok(choice.cancellationTiming);
    assert.ok(choice.includedAccess.length >= 1);
    assert.ok(choice.taxFeeDisclosure);
    assert.ok(choice.refundPolicyLink);
    assert.deepEqual(validateSubscriptionPlanChoice(choice).errors, [], choice.planId);
  });
});

test('annual recurrence and one-time expiration are explicit and not misleading', () => {
  const choices = buildSubscriptionPlanChoices(DEFAULT_COMMERCE_CATALOG);
  const annual = choices.find(choice => choice.planId === 'premium_annual');
  const oneTime = choices.find(choice => choice.planId === 'premium_one_time_90_day');

  assert.match(annual.billingIntervalLabel, /year/i);
  assert.match(annual.renewalBehavior, /renews annually until canceled/i);
  assert.equal(annual.autoRenew, true);
  assert.equal(annual.expiresAfterDays, 0);

  assert.match(oneTime.billingIntervalLabel, /one-time/i);
  assert.match(oneTime.renewalBehavior, /does not renew/i);
  assert.equal(oneTime.autoRenew, false);
  assert.equal(oneTime.expiresAfterDays, 90);
  assert.doesNotMatch(oneTime.copySummary, /monthly|annual|subscription|renews every/i);
});

test('plan choice validation rejects missing disclosures and dark-pattern copy', () => {
  const result = validateSubscriptionPlanChoice({
    planId: 'premium_monthly',
    purchaseType: 'recurring_subscription',
    priceDisplay: '',
    billingIntervalLabel: '',
    renewalBehavior: '',
    cancellationTiming: '',
    includedAccess: [],
    taxFeeDisclosure: '',
    refundPolicyLink: '',
    autoRenew: true,
    checkoutEnabled: true,
    copySummary: 'Only a bad parent would skip this offer.'
  });

  assert.ok(result.errors.includes('price display is required'));
  assert.ok(result.errors.includes('billing interval label is required'));
  assert.ok(result.errors.includes('renewal behavior is required'));
  assert.ok(result.errors.includes('cancellation timing is required'));
  assert.ok(result.errors.includes('included access is required'));
  assert.ok(result.errors.includes('tax and fee disclosure is required'));
  assert.ok(result.errors.includes('refund policy link is required'));
  assert.ok(result.errors.includes('checkout must remain disabled'));
  assert.ok(result.errors.includes('shaming or urgency copy is forbidden'));
});

test('subscription plan choice docs route and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'subscription-plan-choices.md'), 'utf8');
  const route = fs.readFileSync(path.join(repoRoot, 'subscription.html'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /monthly/i);
  assert.match(docs, /annual/i);
  assert.match(docs, /one-time/i);
  assert.match(docs, /tax\/fee/i);
  assert.match(docs, /refund/i);
  assert.match(route, /id="subscription-plan-choices"/);
  assert.match(route, /Monthly/i);
  assert.match(route, /Annual/i);
  assert.match(route, /One-time/i);
  assert.match(pkg.scripts['test:unit'], /tests\/subscription-plan-choice-policy\.test\.js/);
});
