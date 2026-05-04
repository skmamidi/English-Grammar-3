const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_COMPLIANCE_RELEASE_CHECKLIST,
  REQUIRED_COMPLIANCE_DOMAINS,
  validateComplianceReleaseChecklist,
  validateComplianceReviewException
} = require('../assets/compliance-release-checklist');

const repoRoot = path.resolve(__dirname, '..');

test('compliance release checklist defines required evidence domains', () => {
  assert.deepEqual(REQUIRED_COMPLIANCE_DOMAINS, [
    'privacy',
    'security',
    'accessibility',
    'content_licensing',
    'data_lifecycle',
    'institutional_policy',
    'operations',
    'native_readiness',
    'billing_prerequisites'
  ]);

  const result = validateComplianceReleaseChecklist(DEFAULT_COMPLIANCE_RELEASE_CHECKLIST);
  assert.deepEqual(result.errors, []);
});

test('each compliance evidence row has owner command risk release type cadence and links', () => {
  DEFAULT_COMPLIANCE_RELEASE_CHECKLIST.items.forEach(item => {
    assert.ok(item.domain, 'domain is required');
    assert.ok(item.owner, `${item.domain} owner is required`);
    assert.ok(item.command, `${item.domain} command is required`);
    assert.ok(['low', 'medium', 'high', 'critical'].includes(item.riskTier), `${item.domain} risk tier is valid`);
    assert.ok(Array.isArray(item.releaseTypes) && item.releaseTypes.length > 0, `${item.domain} release types are required`);
    assert.ok(item.reviewCadence, `${item.domain} review cadence is required`);
    assert.ok(Array.isArray(item.evidenceLinks) && item.evidenceLinks.length > 0, `${item.domain} evidence links are required`);
  });
});

test('validation rejects missing domains stale links and unsafe commands', () => {
  const result = validateComplianceReleaseChecklist({
    items: [
      {
        domain: 'privacy',
        owner: '',
        command: 'curl https://example.test/private?token=secret',
        riskTier: 'severe',
        releaseTypes: [],
        reviewCadence: '',
        evidenceLinks: ['docs/missing.md']
      }
    ]
  });

  assert.ok(result.errors.includes('missing domain security'));
  assert.ok(result.errors.includes('privacy owner is required'));
  assert.ok(result.errors.includes('privacy command must use npm run or node --test'));
  assert.ok(result.errors.includes('privacy riskTier is invalid'));
  assert.ok(result.errors.includes('privacy releaseTypes are required'));
  assert.ok(result.errors.includes('privacy reviewCadence is required'));
  assert.ok(result.errors.includes('privacy evidence link does not exist: docs/missing.md'));
});

test('exceptions require owner rationale expiry and follow-up evidence', () => {
  assert.deepEqual(validateComplianceReviewException({
    domain: 'accessibility',
    owner: 'accessibility-owner',
    rationale: 'Vendor-independent false positive tracked for one release.',
    expiresAt: '2030-05-01T00:00:00.000Z',
    followUpEvidence: 'docs/compliance-release-checklist.md'
  }).errors, []);

  assert.deepEqual(validateComplianceReviewException({}).errors, [
    'domain is required',
    'owner is required',
    'rationale is required',
    'expiresAt is required',
    'followUpEvidence is required'
  ]);
});

test('compliance docs cover required sections and link release evidence', () => {
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');
  const template = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-review-exception-template.md'), 'utf8');
  const release = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'Privacy',
    'Security',
    'Accessibility',
    'Content licensing',
    'Data lifecycle',
    'Institutional policy',
    'Operations',
    'Native readiness',
    'Billing prerequisites',
    'commerce-readiness-launch-gate.md',
    'subscription-ux-standards.md',
    'transactional-communications.md',
    'commerce-security-policy.md',
    'commerce-security-policy.test.js',
    'commerce-support-policy.md',
    'commerce-support-policy.test.js',
    'billing-provider-capability-matrix.json',
    'billing-provider-capability-matrix.test.js',
    'billing-domain-contracts.md',
    'billing-domain-contracts.test.js',
    'payment-provider-adapter-boundary.md',
    'payment-provider-adapter-boundary.test.js',
    'checkout-method-policy.md',
    'checkout-method-policy.test.js',
    'billing-webhook-ledger-policy.md',
    'billing-webhook-ledger-policy.test.js',
    'billing-entitlement-projection.md',
    'billing-entitlement-projection.test.js',
    'fake-provider-billing-fixtures.md',
    'fake-provider-billing-fixtures.test.js',
    'billing-market-readiness-matrix.md',
    'billing-market-readiness-matrix.test.js',
    'records-of-processing.md',
    'analytics-release-policy.md',
    'source-license-qa',
    'test:a11y',
    'security:scan'
  ].forEach(required => assert.match(checklist, new RegExp(escapeRegex(required), 'i')));

  [
    'Owner',
    'Rationale',
    'Expires at',
    'Follow-up evidence',
    'Synthetic impact summary'
  ].forEach(required => assert.match(template, new RegExp(escapeRegex(required), 'i')));

  assert.match(release, /compliance-release-checklist\.md/);
  assert.match(release, /compliance-review-exception-template\.md/);
  assert.match(pkg.scripts['test:unit'], /tests\/compliance-release-checklist\.test\.js/);
});

test('compliance docs avoid sensitive examples', () => {
  const combined = [
    fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8'),
    fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-review-exception-template.md'), 'utf8')
  ].join('\n');

  assert.doesNotMatch(combined, /learnerId\s*=|studentId\s*=|token\s*=|secret\s*=|password\s*=|customer_[A-Za-z0-9]+|subscription_[A-Za-z0-9]+|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
