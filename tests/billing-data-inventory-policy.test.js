const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BILLING_DATA_FORBIDDEN_EXAMPLE_PATTERN,
  DEFAULT_BILLING_DATA_INVENTORY,
  REQUIRED_BILLING_DATA_CATEGORIES,
  buildBillingDataInventoryMap,
  validateBillingDataInventory,
  validateBillingDataInventoryEntry
} = require('../assets/billing-data-inventory-policy');

const repoRoot = path.resolve(__dirname, '..');

test('billing data inventory classifies required financial metadata categories', () => {
  assert.deepEqual(REQUIRED_BILLING_DATA_CATEGORIES, [
    'provider_customer_reference',
    'subscription_reference',
    'invoice_reference',
    'payment_status',
    'masked_payment_method_label',
    'refund_record',
    'dispute_record',
    'billing_audit_event',
    'entitlement_record'
  ]);

  const result = validateBillingDataInventory(DEFAULT_BILLING_DATA_INVENTORY);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(Object.keys(buildBillingDataInventoryMap(DEFAULT_BILLING_DATA_INVENTORY)), REQUIRED_BILLING_DATA_CATEGORIES);
});

test('billing data categories carry retention deletion export subprocessor and ownership policy', () => {
  DEFAULT_BILLING_DATA_INVENTORY.forEach(entry => {
    assert.equal(entry.owner, 'billing_policy_owner', `${entry.id} has billing owner`);
    assert.ok(entry.retention, `${entry.id} retention is required`);
    assert.ok(entry.deletionBehavior, `${entry.id} deletion behavior is required`);
    assert.ok(entry.exportBehavior, `${entry.id} export behavior is required`);
    assert.ok(entry.subprocessorBoundary, `${entry.id} subprocessor boundary is required`);
    assert.ok(entry.taxOwnership, `${entry.id} tax ownership is required`);
    assert.ok(entry.refundPolicyOwnership, `${entry.id} refund policy ownership is required`);
    assert.ok(Array.isArray(entry.policyLinks) && entry.policyLinks.length >= 2, `${entry.id} links policy evidence`);
    assert.doesNotMatch(JSON.stringify(entry), BILLING_DATA_FORBIDDEN_EXAMPLE_PATTERN);
  });

  const map = buildBillingDataInventoryMap(DEFAULT_BILLING_DATA_INVENTORY);
  assert.match(map.provider_customer_reference.exportBehavior, /redacted/i);
  assert.match(map.masked_payment_method_label.exportBehavior, /masked/i);
  assert.match(map.entitlement_record.deletionBehavior, /access/i);
  assert.match(map.refund_record.retention, /refund/i);
  assert.match(map.dispute_record.retention, /dispute/i);
});

test('billing data validation rejects unsafe provider payloads credentials learners and live identifiers', () => {
  const invalid = validateBillingDataInventoryEntry({
    id: 'provider_customer_reference',
    label: 'Provider customer reference',
    retention: '',
    deletionBehavior: '',
    exportBehavior: '',
    subprocessorBoundary: '',
    owner: 'billing_policy_owner',
    taxOwnership: '',
    refundPolicyOwnership: '',
    policyLinks: ['docs/security/billing-data-inventory.md'],
    examples: [
      'rawProviderPayload={"secret":true}',
      'paymentCredential=card',
      'cardNumber=full-card-number',
      'walletCredential=wallet',
      'learnerId=learner-one',
      'studentName=Maya',
      'customer_live_unsafe'
    ]
  });

  assert.ok(invalid.errors.includes('provider_customer_reference retention is required'));
  assert.ok(invalid.errors.includes('provider_customer_reference deletionBehavior is required'));
  assert.ok(invalid.errors.includes('provider_customer_reference exportBehavior is required'));
  assert.ok(invalid.errors.includes('provider_customer_reference subprocessorBoundary is required'));
  assert.ok(invalid.errors.includes('provider_customer_reference taxOwnership is required'));
  assert.ok(invalid.errors.includes('provider_customer_reference refundPolicyOwnership is required'));
  assert.ok(invalid.errors.includes('provider_customer_reference examples contain sensitive billing material'));
});

test('billing inventory docs cover retention subprocessors privacy terms tax and refunds safely', () => {
  const billingDoc = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'billing-data-inventory.md'), 'utf8');
  const dataInventory = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'data-inventory.md'), 'utf8');
  const processing = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'records-of-processing.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');

  REQUIRED_BILLING_DATA_CATEGORIES.forEach(category => {
    assert.match(billingDoc, new RegExp('\\| `' + escapeRegex(category) + '` \\|', 'i'), `missing billing doc row for ${category}`);
  });

  [
    'retention',
    'deletion and export',
    'subprocessor',
    'terms and privacy policy updates',
    'tax ownership',
    'refund policy ownership',
    'redacted provider references',
    'masked payment method labels'
  ].forEach(required => assert.match(billingDoc, new RegExp(escapeRegex(required), 'i')));

  assert.match(dataInventory, /billing-data-inventory\.md/);
  assert.match(processing, /billing-data-inventory\.md/);
  assert.match(processing, /Future payment provider/);
  assert.match(checklist, /billing-data-inventory\.md/);
  assert.match(checklist, /billing-data-inventory-policy\.test\.js/);

  [billingDoc, dataInventory, processing, checklist].forEach(doc => {
    assert.doesNotMatch(doc, BILLING_DATA_FORBIDDEN_EXAMPLE_PATTERN);
  });
});

test('billing data inventory test is wired into unit and compliance gates', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const ciContract = fs.readFileSync(path.join(repoRoot, 'tests', 'ci-contract.test.js'), 'utf8');

  assert.match(pkg.scripts['test:unit'], /tests\/billing-data-inventory-policy\.test\.js/);
  assert.match(ciContract, /tests\\\/billing-data-inventory-policy\\\.test\\\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
