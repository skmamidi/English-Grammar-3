const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  APP_STORE_COMMERCE_DECISION_QUESTIONS,
  CROSS_PLATFORM_PURCHASE_CHANNELS,
  DEFAULT_CROSS_PLATFORM_COMMERCE_POLICY,
  buildCrossPlatformEntitlementView,
  buildPurchaseChannelDecisionMatrix,
  sanitizeCrossPlatformCommerceRecord,
  validateCrossPlatformCommercePolicy,
  validateCrossPlatformCommerceRecord
} = require('../assets/cross-platform-commerce-policy');

const repoRoot = path.resolve(__dirname, '..');

test('cross-platform commerce policy separates entitlement purchase channel and receipt source', () => {
  assert.deepEqual(CROSS_PLATFORM_PURCHASE_CHANNELS, [
    'web_checkout',
    'ios_iap',
    'ios_external_link',
    'support_adjustment',
    'app_store_refund',
    'provider_outage_grace'
  ]);

  const result = validateCrossPlatformCommercePolicy(DEFAULT_CROSS_PLATFORM_COMMERCE_POLICY);
  assert.deepEqual(result.errors, []);
  assert.equal(result.policy.entitlementSourceOfTruth, 'app_owned_entitlement_projection');
  assert.equal(result.policy.entitlementMutationBoundary, 'server_verified_ledger_or_receipt');
  assert.equal(result.policy.learnerProgressIndependent, true);
  assert.equal(result.policy.rawReceiptsForbiddenInClients, true);
  assert.equal(result.policy.supportVisibility, 'billing_summary_only');
});

test('purchase channel matrix records App Store and external billing decisions before native work', () => {
  assert.deepEqual(APP_STORE_COMMERCE_DECISION_QUESTIONS, [
    'iap_required_for_digital_access',
    'web_purchase_access_in_native',
    'external_billing_link_allowed',
    'receipt_validation_boundary',
    'refund_source_of_truth',
    'cancellation_owner',
    'account_linking_allowed',
    'entitlement_parity_evidence'
  ]);

  const matrix = buildPurchaseChannelDecisionMatrix(DEFAULT_CROSS_PLATFORM_COMMERCE_POLICY);
  const iosIap = matrix.channels.ios_iap;
  const webCheckout = matrix.channels.web_checkout;

  assert.equal(iosIap.platform, 'ios_ipados');
  assert.equal(iosIap.receiptSource, 'app_store_receipt_ref');
  assert.equal(iosIap.receiptValidation, 'server_only');
  assert.equal(iosIap.entitlementMutation, 'server_verified_receipt_ledger');
  assert.equal(iosIap.decisionStatus, 'deferred_until_native_implementation');
  assert.equal(webCheckout.receiptValidation, 'server_webhook_only');
  assert.equal(webCheckout.entitlementMutation, 'verified_billing_ledger');
  assert.ok(matrix.decisionQuestions.includes('external_billing_link_allowed'));
});

test('cross-platform entitlement view is parent safe and channel aware without billing internals', () => {
  const view = buildCrossPlatformEntitlementView({
    platform: 'ios_ipados',
    purchaseChannel: 'ios_iap',
    receiptSource: 'app_store_receipt_ref',
    accountLinking: {
      parentAccountRef: 'parent:guardian-1',
      learnerAccountRef: 'learner:learner-1',
      linkingState: 'linked'
    },
    entitlementProjection: {
      schemaVersion: 1,
      billingAccountId: 'billing-account-1',
      activePlanId: 'premium_monthly',
      accessLevel: 'premium',
      accessState: 'premium',
      featureEntitlements: ['core_practice', 'local_progress', 'premium_practice'],
      source: 'verified_billing_ledger',
      sourceLedgerEventId: 'ledger-1',
      evaluatedAt: '2030-05-04T00:00:00.000Z',
      freePracticeAvailable: true,
      providerPayload: { nested: true },
      rawReceipt: 'receipt-live-value',
      learnerId: 'learner-unsafe'
    }
  });

  assert.deepEqual(view, {
    schemaVersion: 1,
    platform: 'ios_ipados',
    purchaseChannel: 'ios_iap',
    receiptSource: 'app_store_receipt_ref',
    accountLinkingState: 'linked',
    parentAccountRef: 'parent:guardian-1',
    entitlement: {
      activePlanId: 'premium_monthly',
      accessLevel: 'premium',
      accessState: 'premium',
      featureEntitlements: ['core_practice', 'local_progress', 'premium_practice'],
      freePracticeAvailable: true,
      evaluatedAt: '2030-05-04T00:00:00.000Z'
    },
    supportVisibility: 'billing_summary_only'
  });
  assert.deepEqual(validateCrossPlatformCommerceRecord(view).errors, []);
});

test('cross-platform commerce validation rejects client mutation receipts provider payloads and learner data', () => {
  const unsafe = sanitizeCrossPlatformCommerceRecord({
    platform: 'ios_ipados',
    purchaseChannel: 'ios_iap',
    receiptSource: 'app_store_receipt_ref',
    entitlementMutation: 'client_side',
    rawReceipt: 'receipt-live-value',
    providerPayload: { nested: true },
    providerCustomerId: 'provider-customer',
    paymentCredential: 'card-value',
    learnerId: 'learner-1',
    token: 'unsafe-token'
  });

  assert.equal(unsafe.rawReceipt, '[REDACTED]');
  assert.equal(unsafe.providerPayload, '[REDACTED]');
  assert.equal(unsafe.paymentCredential, '[REDACTED]');
  assert.equal(unsafe.learnerId, '[REDACTED]');

  const result = validateCrossPlatformCommerceRecord({
    platform: 'ios_ipados',
    purchaseChannel: 'ios_iap',
    receiptSource: 'raw_receipt',
    entitlementMutation: 'client_side',
    rawReceipt: 'receipt-live-value',
    providerPayload: { nested: true },
    learnerId: 'learner-1'
  });

  assert.ok(result.errors.includes('entitlement mutation must be server owned'));
  assert.ok(result.errors.includes('raw receipts must not appear in client projections'));
  assert.ok(result.errors.includes('commerce projection must not include learner identity'));
  assert.ok(result.errors.includes('commerce projection must not include provider payloads credentials tokens or secrets'));
});

test('cross-platform commerce docs ADR and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'cross-platform-commerce-policy.md'), 'utf8');
  const adr = fs.readFileSync(path.join(repoRoot, 'docs', 'adr', 'ADR-015-cross-platform-commerce-entitlement-policy.md'), 'utf8');
  const adrIndex = fs.readFileSync(path.join(repoRoot, 'docs', 'adr', 'README.md'), 'utf8');
  const entitlementDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-entitlement-projection.md'), 'utf8');
  const supportDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-support-workflows.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'entitlement parity',
    'purchase channel',
    'App Store',
    'external billing',
    'account linking',
    'receipt source',
    'support visibility',
    'refund',
    'cancellation'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(adr, /cross-platform commerce entitlement policy/i);
  assert.match(adr, /server-owned receipt validation/i);
  assert.match(adrIndex, /ADR-015/);
  assert.match(entitlementDocs, /cross-platform-commerce-policy\.md/);
  assert.match(supportDocs, /cross-platform-commerce-policy\.md/);
  assert.match(pkg.scripts['test:unit'], /tests\/cross-platform-commerce-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
