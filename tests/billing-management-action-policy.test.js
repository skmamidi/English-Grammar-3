const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BILLING_MANAGEMENT_ACTION_TYPES,
  DEFAULT_BILLING_MANAGEMENT_ACTION_POLICY,
  buildBillingManagementActionRequest,
  validateBillingManagementActionPolicy,
  validateBillingManagementActionRequest
} = require('../assets/billing-management-action-policy');

const repoRoot = path.resolve(__dirname, '..');

test('billing management policy defines explicit server-mediated action contracts', () => {
  assert.deepEqual(BILLING_MANAGEMENT_ACTION_TYPES, [
    'payment_method_update',
    'cancel_at_period_end',
    'reactivate_subscription',
    'renew_one_time_access',
    'convert_one_time_to_recurring'
  ]);

  const result = validateBillingManagementActionPolicy(DEFAULT_BILLING_MANAGEMENT_ACTION_POLICY);

  assert.deepEqual(result.errors, []);
  assert.equal(DEFAULT_BILLING_MANAGEMENT_ACTION_POLICY.serverMediatedRequired, true);
  assert.equal(DEFAULT_BILLING_MANAGEMENT_ACTION_POLICY.browserCannotMutateEntitlement, true);
  assert.equal(DEFAULT_BILLING_MANAGEMENT_ACTION_POLICY.browserCannotMutateProviderRecord, true);
});

test('payment method cancellation reactivation and one-time renewal requests carry confirmation audit and copy keys', () => {
  const requests = [
    buildBillingManagementActionRequest({
      actionType: 'payment_method_update',
      billingAccountId: 'billing-account-1',
      planId: 'premium_monthly',
      confirmationAccepted: true
    }),
    buildBillingManagementActionRequest({
      actionType: 'cancel_at_period_end',
      billingAccountId: 'billing-account-1',
      planId: 'premium_monthly',
      confirmationAccepted: true
    }),
    buildBillingManagementActionRequest({
      actionType: 'reactivate_subscription',
      billingAccountId: 'billing-account-1',
      planId: 'premium_monthly',
      confirmationAccepted: true
    }),
    buildBillingManagementActionRequest({
      actionType: 'renew_one_time_access',
      billingAccountId: 'billing-account-1',
      planId: 'premium_one_time_90_day',
      confirmationAccepted: true
    })
  ];

  requests.forEach(request => {
    assert.equal(request.serverMediated, true);
    assert.equal(request.browserCanMutateProviderRecord, false);
    assert.equal(request.browserCanMutateEntitlement, false);
    assert.match(request.confirmationCopyKey, /^billing_management_/);
    assert.match(request.auditAction, /^billing_management:/);
    assert.match(request.recoveryCopyKey, /^billing_management_/);
    assert.match(request.disabledStateCopyKey, /^billing_management_/);
    assert.deepEqual(validateBillingManagementActionRequest(request).errors, []);
  });

  const oneTimeRenewal = requests.find(request => request.actionType === 'renew_one_time_access');
  assert.equal(oneTimeRenewal.autoRenewAfterAction, false);
  assert.equal(oneTimeRenewal.checkoutIntent, 'one_time_non_renewing');
});

test('converting one-time access to recurring requires explicit auto-renew confirmation', () => {
  const request = buildBillingManagementActionRequest({
    actionType: 'convert_one_time_to_recurring',
    billingAccountId: 'billing-account-1',
    planId: 'premium_annual',
    previousPlanId: 'premium_one_time_90_day',
    confirmationAccepted: true,
    recurringConfirmationAccepted: true
  });

  assert.equal(request.requiresRecurringConfirmation, true);
  assert.equal(request.autoRenewAfterAction, true);
  assert.equal(request.checkoutIntent, 'recurring_subscription');
  assert.deepEqual(validateBillingManagementActionRequest(request).errors, []);

  const unsafe = validateBillingManagementActionRequest({
    ...request,
    recurringConfirmationAccepted: false
  });
  assert.ok(unsafe.errors.includes('converting one-time access to auto-renew requires explicit confirmation'));
});

test('management action validation rejects browser mutations provider fields and silent renewal', () => {
  const result = validateBillingManagementActionRequest({
    actionType: 'renew_one_time_access',
    billingAccountId: 'billing-account-1',
    planId: 'premium_one_time_90_day',
    confirmationAccepted: true,
    serverMediated: false,
    browserCanMutateProviderRecord: true,
    browserCanMutateEntitlement: true,
    autoRenewAfterAction: true,
    providerSubscriptionId: 'provider-subscription-placeholder',
    rawProviderPayload: { nested: true },
    paymentCredential: 'credential-placeholder'
  });

  assert.ok(result.errors.includes('billing management action must be server-mediated'));
  assert.ok(result.errors.includes('browser action must not mutate provider records'));
  assert.ok(result.errors.includes('browser action must not mutate entitlement'));
  assert.ok(result.errors.includes('one-time renewal must not silently enable auto-renew'));
  assert.ok(result.errors.includes('billing management action must not include provider payload or payment credentials'));
});

test('billing management docs subscription route and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-management-actions.md'), 'utf8');
  const checkoutDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'checkout-method-policy.md'), 'utf8');
  const uxDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'subscription-ux-standards.md'), 'utf8');
  const subscription = fs.readFileSync(path.join(repoRoot, 'subscription.html'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'payment method update',
    'cancel at period end',
    'reactivate subscription',
    'one-time renewal',
    'convert one-time access to auto-renew',
    'server-mediated',
    'browser actions are requests',
    'explicit confirmation',
    'sandbox and staging payment rehearsals'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(docs, /billing-payment-rehearsals\.md/);
  assert.match(checkoutDocs, /billing-management-actions\.md/);
  assert.match(uxDocs, /one-time access to auto-renew/i);
  assert.match(subscription, /Billing Management/i);
  assert.match(subscription, /Cancel at period end/i);
  assert.match(subscription, /Renew one-time access/i);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-management-action-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
