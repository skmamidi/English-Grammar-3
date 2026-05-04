const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BILLING_LAUNCH_FORBIDDEN_PATTERN,
  DEFAULT_BILLING_LAUNCH_CHECKLIST,
  REQUIRED_BILLING_LAUNCH_EVIDENCE,
  buildBillingLaunchChecklistMap,
  validateBillingLaunchChecklist,
  validateBillingLaunchChecklistItem
} = require('../assets/billing-launch-checklist-policy');

const repoRoot = path.resolve(__dirname, '..');

test('billing launch checklist covers PCI wallet SCA provider approval and market evidence', () => {
  assert.deepEqual(REQUIRED_BILLING_LAUNCH_EVIDENCE, [
    'pci_scope',
    'hosted_checkout_or_provider_elements',
    'major_cards',
    'apple_pay_display_rules',
    'paypal_display_rules',
    'venmo_display_rules',
    'sca_3ds',
    'provider_account_approval',
    'education_acceptable_use',
    'target_markets',
    'evidence_ownership'
  ]);

  const result = validateBillingLaunchChecklist(DEFAULT_BILLING_LAUNCH_CHECKLIST);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(Object.keys(buildBillingLaunchChecklistMap(DEFAULT_BILLING_LAUNCH_CHECKLIST)), REQUIRED_BILLING_LAUNCH_EVIDENCE);

  const pci = buildBillingLaunchChecklistMap(DEFAULT_BILLING_LAUNCH_CHECKLIST).pci_scope;
  assert.equal(pci.certificationClaim, false);
  assert.match(pci.requirement, /lowest feasible PCI scope/i);
});

test('each billing launch evidence row has owner blocking status commands and safe evidence links', () => {
  DEFAULT_BILLING_LAUNCH_CHECKLIST.forEach(item => {
    assert.equal(item.launchBlocking, true, `${item.id} is launch blocking`);
    assert.ok(item.owner, `${item.id} owner is required`);
    assert.ok(item.reviewCommand, `${item.id} review command is required`);
    assert.ok(Array.isArray(item.evidenceLinks) && item.evidenceLinks.length >= 2, `${item.id} evidence links are required`);
    assert.ok(['billing_policy_owner', 'billing_platform', 'security_owner', 'finance_owner'].includes(item.owner), `${item.id} owner is recognized`);
    assert.doesNotMatch(JSON.stringify(item), BILLING_LAUNCH_FORBIDDEN_PATTERN);
  });

  const map = buildBillingLaunchChecklistMap(DEFAULT_BILLING_LAUNCH_CHECKLIST);
  assert.match(map.hosted_checkout_or_provider_elements.requirement, /provider-hosted|provider elements/i);
  assert.match(map.apple_pay_display_rules.requirement, /Apple Pay/i);
  assert.match(map.paypal_display_rules.requirement, /PayPal/i);
  assert.match(map.venmo_display_rules.requirement, /Venmo/i);
  assert.match(map.sca_3ds.requirement, /SCA|3DS/i);
  assert.match(map.education_acceptable_use.requirement, /education acceptable use/i);
});

test('billing launch checklist validation rejects certification claims and sensitive examples', () => {
  const result = validateBillingLaunchChecklistItem({
    id: 'pci_scope',
    owner: '',
    requirement: '',
    launchBlocking: false,
    certificationClaim: true,
    reviewCommand: 'curl https://provider.example.test',
    evidenceLinks: ['docs/billing-launch-checklist.md'],
    examples: [
      'providerCredential=unsafe',
      'paymentCredential=unsafe',
      'rawProviderPayload={}',
      'learnerId=learner-one',
      'studentName=Maya',
      'provider_live_unsafe'
    ]
  });

  assert.ok(result.errors.includes('pci_scope owner is required'));
  assert.ok(result.errors.includes('pci_scope requirement is required'));
  assert.ok(result.errors.includes('pci_scope must be launch blocking'));
  assert.ok(result.errors.includes('pci_scope must not claim PCI certification'));
  assert.ok(result.errors.includes('pci_scope reviewCommand must use npm run or node --test'));
  assert.ok(result.errors.includes('pci_scope evidenceLinks must include at least two links'));
  assert.ok(result.errors.includes('pci_scope examples contain sensitive launch material'));
});

test('billing launch checklist docs and provider matrix expose required evidence safely', () => {
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-launch-checklist.md'), 'utf8');
  const security = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'commerce-security-policy.md'), 'utf8');
  const checkout = fs.readFileSync(path.join(repoRoot, 'docs', 'checkout-method-policy.md'), 'utf8');
  const compliance = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');
  const matrix = JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs', 'billing-provider-capability-matrix.json'), 'utf8'));

  REQUIRED_BILLING_LAUNCH_EVIDENCE.forEach(id => {
    assert.match(checklist, new RegExp('\\| `' + escapeRegex(id) + '` \\|', 'i'), `missing launch checklist row ${id}`);
  });

  ['sca_3ds', 'provider_account_approval', 'education_acceptable_use', 'target_markets'].forEach(capability => {
    assert.ok(matrix.capabilities.some(row => row.capability === capability), `missing provider matrix capability ${capability}`);
  });

  assert.match(security, /billing-launch-checklist\.md/);
  assert.match(checkout, /billing-launch-checklist\.md/);
  assert.match(compliance, /billing-launch-checklist\.md/);
  assert.match(compliance, /billing-launch-checklist-policy\.test\.js/);
  assert.doesNotMatch(checklist + security + checkout + compliance + JSON.stringify(matrix), BILLING_LAUNCH_FORBIDDEN_PATTERN);
});

test('billing launch checklist is wired into package and CI contracts', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const ciContract = fs.readFileSync(path.join(repoRoot, 'tests', 'ci-contract.test.js'), 'utf8');

  assert.match(pkg.scripts['test:unit'], /tests\/billing-launch-checklist-policy\.test\.js/);
  assert.match(ciContract, /tests\\\/billing-launch-checklist-policy\\\.test\\\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
