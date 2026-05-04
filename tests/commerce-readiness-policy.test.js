const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  COMMERCE_READINESS_REQUIRED_DOMAINS,
  DEFAULT_COMMERCE_READINESS_POLICY,
  buildCommerceLaunchGate,
  validateCommerceReadinessPolicy
} = require('../assets/commerce-readiness-policy');

const repoRoot = path.resolve(__dirname, '..');

test('commerce readiness policy covers every prerequisite before checkout code', () => {
  assert.deepEqual(COMMERCE_READINESS_REQUIRED_DOMAINS, [
    'account_identity',
    'product_catalog',
    'pricing',
    'legal_terms',
    'refund_cancellation',
    'support_ownership',
    'pci_scope',
    'provider_capability_matrix',
    'native_app_store_policy',
    'billing_rollback'
  ]);

  const result = validateCommerceReadinessPolicy(DEFAULT_COMMERCE_READINESS_POLICY, {
    now: '2026-05-03T00:00:00.000Z'
  });

  assert.equal(result.valid, false);
  assert.equal(result.canCollectRealPayments, false);
  assert.ok(result.blockers.includes('real_payments_blocked_until_commerce_readiness_passes'));
  assert.ok(result.blockers.includes('account_identity evidence status must be approved'));
  assert.ok(result.blockers.includes('product_catalog evidence status must be approved'));
  assert.ok(result.blockers.includes('pci_scope evidence status must be approved'));
});

test('real payment collection is allowed only when all release-blocking evidence is approved', () => {
  const approvedPolicy = {
    ...DEFAULT_COMMERCE_READINESS_POLICY,
    items: DEFAULT_COMMERCE_READINESS_POLICY.items.map(item => ({
      ...item,
      status: 'approved',
      evidenceLink: 'docs/commerce-readiness-launch-gate.md',
      owner: item.owner,
      reviewDate: '2026-09-30',
      releaseBlocker: true
    }))
  };

  const result = buildCommerceLaunchGate(approvedPolicy, {
    now: '2026-05-03T00:00:00.000Z',
    requestedMode: 'real_payment_collection'
  });

  assert.equal(result.canCollectRealPayments, true);
  assert.equal(result.providerNeutral, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.summary.requiredDomains, COMMERCE_READINESS_REQUIRED_DOMAINS.length);
  assert.equal(result.summary.approvedReleaseBlockers, COMMERCE_READINESS_REQUIRED_DOMAINS.length);
});

test('commerce readiness validation rejects missing owners stale review dates and provider-specific shortcuts', () => {
  const result = validateCommerceReadinessPolicy({
    items: [
      {
        domain: 'account_identity',
        owner: '',
        status: 'approved',
        requiredStatus: 'approved',
        evidenceLink: 'docs/missing-commerce.md',
        reviewDate: '2026-01-01',
        releaseBlocker: true,
        providerDecision: 'stripe_only'
      }
    ]
  }, {
    now: '2026-05-03T00:00:00.000Z'
  });

  assert.ok(result.blockers.includes('missing domain product_catalog'));
  assert.ok(result.blockers.includes('account_identity owner is required'));
  assert.ok(result.blockers.includes('account_identity evidence link does not exist: docs/missing-commerce.md'));
  assert.ok(result.blockers.includes('account_identity reviewDate must be in the future'));
  assert.ok(result.blockers.includes('account_identity provider decision must remain provider-neutral'));
});

test('commerce readiness docs and ADR wire launch gate into release evidence', () => {
  const adrIndex = fs.readFileSync(path.join(repoRoot, 'docs', 'adr', 'README.md'), 'utf8');
  const adr = fs.readFileSync(path.join(repoRoot, 'docs', 'adr', 'ADR-013-commerce-readiness-launch-gate.md'), 'utf8');
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'commerce-readiness-launch-gate.md'), 'utf8');
  const releaseChecklist = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'no real payments',
    'account identity',
    'product catalog',
    'pricing',
    'legal terms',
    'refund/cancellation',
    'support ownership',
    'PCI scope',
    'provider capability matrix',
    'native/App Store policy',
    'billing rollback',
    'billing-rollback-policy.md',
    'Milestone 27',
    'Milestone 28',
    'Milestone 29'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(adrIndex, /ADR-013/);
  assert.match(adr, /commerce-readiness launch gate/i);
  assert.match(adr, /no real payments/i);
  assert.match(releaseChecklist, /commerce-readiness-launch-gate\.md/);
  assert.match(pkg.scripts['test:unit'], /tests\/commerce-readiness-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
