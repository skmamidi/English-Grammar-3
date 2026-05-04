const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const matrixPath = path.join(repoRoot, 'docs', 'billing-provider-capability-matrix.json');
const adrPath = path.join(repoRoot, 'docs', 'adr', 'ADR-014-billing-architecture-provider-capability-matrix.md');

const REQUIRED_CAPABILITIES = [
  'monthly_recurring',
  'annual_recurring',
  'one_time_non_renewing',
  'auto_renew_opt_in',
  'cancel_at_period_end',
  'refunds',
  'disputes',
  'payment_history',
  'receipts',
  'apple_pay',
  'paypal',
  'venmo',
  'major_cards',
  'webhook_events',
  'customer_portal',
  'payment_method_management',
  'sandbox_mode',
  'staged_rollout'
];

const REQUIRED_COLUMNS = [
  'capability',
  'requirement',
  'supportStatus',
  'limitations',
  'evidenceLink',
  'implementationOwner',
  'nativeIosImplications',
  'fallbackOption',
  'launchRisk'
];

test('billing provider capability matrix covers required payment and operating capabilities', () => {
  const matrix = readMatrix();
  const capabilities = new Set(matrix.capabilities.map(row => row.capability));

  REQUIRED_CAPABILITIES.forEach(capability => {
    assert.ok(capabilities.has(capability), `missing billing capability ${capability}`);
  });

  matrix.capabilities.forEach(row => {
    REQUIRED_COLUMNS.forEach(column => assert.ok(String(row[column] || '').trim(), `${row.capability} missing ${column}`));
    assert.ok(['supported', 'partial', 'deferred', 'blocked'].includes(row.supportStatus), `${row.capability} supportStatus is invalid`);
    assert.ok(['low', 'medium', 'high', 'critical'].includes(row.launchRisk), `${row.capability} launchRisk is invalid`);
    assert.ok(fs.existsSync(path.join(repoRoot, row.evidenceLink)), `${row.capability} evidence link should exist`);
  });
});

test('provider matrix documents provider-neutral decision boundaries and fallback justification', () => {
  const matrix = readMatrix();

  assert.equal(matrix.schemaVersion, 1);
  assert.equal(matrix.providerSelectionStatus, 'deferred');
  assert.equal(matrix.providerNeutralBoundary, true);
  assert.equal(matrix.implementationChoiceLocked, false);
  assert.match(matrix.justificationRequiredWhenIncomplete, /provider cannot satisfy/i);
  assert.ok(matrix.capabilities.some(row => /provider-hosted|provider elements/i.test(row.fallbackOption)));
  assert.ok(matrix.capabilities.some(row => /native|iOS|App Store/i.test(row.nativeIosImplications)));
  assert.ok(matrix.capabilities.some(row => row.supportStatus === 'partial' || row.supportStatus === 'deferred'));
});

test('billing ADR links matrix commerce readiness subscription UX and operations milestones', () => {
  const adr = fs.readFileSync(adrPath, 'utf8');
  const index = fs.readFileSync(path.join(repoRoot, 'docs', 'adr', 'README.md'), 'utf8');

  [
    'provider-neutral billing domain',
    'provider capability matrix',
    'monthly recurring',
    'annual recurring',
    'one-time non-renewing access',
    'Apple Pay',
    'PayPal',
    'Venmo',
    'major cards',
    'webhook events',
    'customer portal',
    'sandbox mode',
    'staged rollout',
    'commerce-readiness launch gate',
    'subscription UX',
    'billing operations'
  ].forEach(required => assert.match(adr, new RegExp(escapeRegex(required), 'i')));

  assert.match(index, /ADR-014/);
  assert.match(index, /billing architecture and provider capability matrix/i);
});

test('billing provider matrix avoids provider secrets account ids and learner identifiers', () => {
  const combined = [
    fs.readFileSync(matrixPath, 'utf8'),
    fs.readFileSync(adrPath, 'utf8')
  ].join('\n');

  assert.doesNotMatch(combined, /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/i);
  assert.doesNotMatch(combined, /\b(sk-[0-9A-Za-z]{20,}|pk_live_[0-9A-Za-z]{20,}|whsec_[0-9A-Za-z]{20,})\b/);
  assert.doesNotMatch(combined, /\b(customer|subscription|payment_intent|order)_[A-Za-z0-9]{8,}\b/i);
  assert.doesNotMatch(combined, /\b(learnerId|studentId|email|password)\s*=/i);
});

test('billing provider matrix and ADR are wired into unit and compliance gates', () => {
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(checklist, /billing-provider-capability-matrix\.json/);
  assert.match(checklist, /billing-provider-capability-matrix\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-provider-capability-matrix\.test\.js/);
});

function readMatrix() {
  return JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
