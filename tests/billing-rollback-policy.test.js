const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_BILLING_ROLLBACK_POLICY,
  REQUIRED_BILLING_ROLLBACK_FLAGS,
  buildBillingRollbackDecision,
  validateBillingRollbackDecision,
  validateBillingRollbackPolicy
} = require('../assets/billing-rollback-policy');

const repoRoot = path.resolve(__dirname, '..');

test('billing rollback policy defines separate server-owned billing flags', () => {
  assert.deepEqual(REQUIRED_BILLING_ROLLBACK_FLAGS, [
    'pricing_display',
    'checkout_start',
    'webhook_processing',
    'entitlement_granting',
    'renewals',
    'one_time_access',
    'provider_portal_links',
    'billing_telemetry'
  ]);

  const result = validateBillingRollbackPolicy(DEFAULT_BILLING_ROLLBACK_POLICY);
  const ids = new Set(result.policy.flags.map(flag => flag.id));

  assert.deepEqual(result.errors, []);
  REQUIRED_BILLING_ROLLBACK_FLAGS.forEach(id => assert.ok(ids.has(id), `missing billing flag ${id}`));
  result.policy.flags.forEach(flag => {
    assert.equal(flag.serverOwned, true, `${flag.id} is server-owned`);
    assert.equal(flag.browserCanMutateProviderRecord, false, `${flag.id} cannot mutate provider records`);
    assert.equal(flag.browserSafeProjection, true, `${flag.id} exposes browser-safe projection`);
    assert.ok(flag.owner, `${flag.id} owner is required`);
    assert.ok(flag.rollbackEffect, `${flag.id} rollback effect is required`);
  });
});

test('stop-new-charges rollback preserves verified access and audit history', () => {
  const decision = buildBillingRollbackDecision({
    mode: 'stop_new_charges',
    reason: 'provider health degraded'
  });

  assert.equal(decision.mode, 'stop_new_charges');
  assert.equal(decision.preventsNewCharges, true);
  assert.equal(decision.preservesExistingPaidAccess, true);
  assert.equal(decision.freePracticeAvailable, true);
  assert.equal(decision.parentAccountAccessAvailable, true);
  assert.equal(decision.auditHistoryPreserved, true);
  assert.equal(decision.browserCanMutateProviderRecords, false);
  assert.equal(decision.controls.checkout_start.enabled, false);
  assert.equal(decision.controls.renewals.enabled, false);
  assert.equal(decision.controls.one_time_access.enabled, false);
  assert.equal(decision.controls.provider_portal_links.enabled, false);
  assert.equal(decision.controls.webhook_processing.enabled, true);
  assert.equal(decision.controls.entitlement_granting.enabled, true);
  assert.deepEqual(validateBillingRollbackDecision(decision).errors, []);
});

test('billing rollback validation rejects unsafe browser mutation and sensitive evidence', () => {
  const invalidPolicy = validateBillingRollbackPolicy({
    flags: [{
      id: 'checkout_start',
      owner: '',
      serverOwned: false,
      browserCanMutateProviderRecord: true,
      browserSafeProjection: false,
      defaultEnabled: true,
      rollbackEffect: '',
      evidenceLinks: ['docs/billing-rollback-policy.md'],
      rawProviderPayload: { token: 'secret' }
    }]
  });

  [
    'missing required billing rollback flag pricing_display',
    'checkout_start owner is required',
    'checkout_start must be server-owned',
    'checkout_start browser must not mutate provider records',
    'checkout_start must expose only browser-safe projection',
    'checkout_start rollback effect is required',
    'checkout_start contains sensitive billing rollback evidence'
  ].forEach(error => assert.ok(invalidPolicy.errors.includes(error), `missing ${error}`));

  const unsafeDecision = validateBillingRollbackDecision({
    mode: 'stop_new_charges',
    preventsNewCharges: false,
    preservesExistingPaidAccess: false,
    freePracticeAvailable: false,
    parentAccountAccessAvailable: false,
    auditHistoryPreserved: false,
    browserCanMutateProviderRecords: true,
    controls: {},
    learnerId: 'learner-one',
    paymentCredential: 'credential',
    rawProviderPayload: { secret: true }
  });

  assert.ok(unsafeDecision.errors.includes('rollback must prevent new charges'));
  assert.ok(unsafeDecision.errors.includes('rollback must preserve existing paid access'));
  assert.ok(unsafeDecision.errors.includes('rollback must keep free practice available'));
  assert.ok(unsafeDecision.errors.includes('rollback must preserve parent account access'));
  assert.ok(unsafeDecision.errors.includes('rollback must preserve audit history'));
  assert.ok(unsafeDecision.errors.includes('rollback must not allow browser provider mutation'));
  assert.ok(unsafeDecision.errors.includes('rollback decision contains sensitive billing evidence'));
});

test('billing rollback docs entitlement webhook launch operations and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-rollback-policy.md'), 'utf8');
  const featureFlags = fs.readFileSync(path.join(repoRoot, 'docs', 'feature-flags.md'), 'utf8');
  const entitlement = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-entitlement-projection.md'), 'utf8');
  const webhook = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-webhook-ledger-policy.md'), 'utf8');
  const readiness = fs.readFileSync(path.join(repoRoot, 'docs', 'commerce-readiness-launch-gate.md'), 'utf8');
  const runbook = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'runbook-billing-rollback.md'), 'utf8');
  const operationsIndex = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'README.md'), 'utf8');
  const ciContract = fs.readFileSync(path.join(repoRoot, 'tests', 'ci-contract.test.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  REQUIRED_BILLING_ROLLBACK_FLAGS.forEach(flag => {
    assert.match(docs, new RegExp(escapeRegex(flag), 'i'), `missing docs for ${flag}`);
  });
  [
    'stop new charges',
    'preserve existing paid access',
    'free practice',
    'audit history',
    'browser-safe projection'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(featureFlags, /billing-rollback-policy\.md/);
  assert.match(entitlement, /billing-rollback-policy\.md/);
  assert.match(webhook, /billing-rollback-policy\.md/);
  assert.match(readiness, /billing-rollback-policy\.md/);
  assert.match(runbook, /Runbook: Billing Rollback/i);
  assert.match(operationsIndex, /runbook-billing-rollback\.md/);
  assert.match(ciContract, /tests\\\/billing-rollback-policy\\\.test\\\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-rollback-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
