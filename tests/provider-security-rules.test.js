const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BACKEND_STORAGE_PATHS,
  evaluateBackendStoragePolicy
} = require('../server/backend-policy-rules');
const {
  FIRESTORE_SECURITY_RULE_SCENARIOS,
  buildFirestoreSecurityRuleFixture,
  evaluateFirestoreSecurityRule,
  runFirestoreRuleParity
} = require('../server/provider-security/firestore-rule-harness');

const repoRoot = path.resolve(__dirname, '..');
const actors = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'backend-security', 'actors.json'), 'utf8'));

test('firestore rule scenarios cover provider-neutral backend policy boundaries', () => {
  const ids = FIRESTORE_SECURITY_RULE_SCENARIOS.map(scenario => scenario.id);

  assert.ok(ids.includes('deny-unknown-path'));
  assert.ok(ids.includes('deny-unauthenticated-learner-read'));
  assert.ok(ids.includes('deny-parent-preview'));
  assert.ok(ids.includes('allow-linked-guardian-read'));
  assert.ok(ids.includes('deny-unlinked-guardian-read'));
  assert.ok(ids.includes('allow-teacher-class-assignment-write'));
  assert.ok(ids.includes('deny-unassigned-teacher-class-read'));
  assert.ok(ids.includes('allow-system-admin-feature-flag-write'));
  assert.ok(ids.includes('deny-system-admin-learner-state-read'));
  assert.ok(ids.includes('allow-content-reviewer-publication-write'));
  assert.ok(ids.includes('allow-audit-create'));
  assert.ok(ids.includes('deny-audit-update'));
  assert.ok(ids.includes('deny-secret-field-write'));
  assert.ok(ids.includes('deny-secret-path-read'));
});

test('firestore fake-emulator outcomes match backend storage policy scenarios', () => {
  const fixture = buildFirestoreSecurityRuleFixture({ actors });
  const report = runFirestoreRuleParity({ actors, fixture });

  assert.equal(report.provider, 'firestore');
  assert.equal(report.emulator, 'fake-firestore-rules');
  assert.equal(report.total, FIRESTORE_SECURITY_RULE_SCENARIOS.length);
  assert.deepEqual(report.mismatches, []);
  assert.equal(report.summary.allowed > 0, true);
  assert.equal(report.summary.denied > 0, true);
});

test('firestore rule evaluator denies secrets, unauthenticated access, and unsafe writes', () => {
  const secretWrite = evaluateFirestoreSecurityRule({
    auth: { uid: actors.systemAdmin.id, token: actors.systemAdmin },
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.featureFlag('server-selection'),
    document: { enabled: true, privateKeyRef: 'projects/app/secrets/signing-key' }
  });
  const unauthenticatedRead = evaluateFirestoreSecurityRule({
    auth: null,
    operation: 'read',
    path: BACKEND_STORAGE_PATHS.learnerState('learner-a')
  });

  assert.equal(secretWrite.allow, false);
  assert.equal(secretWrite.reason, 'backend_document_secret_field');
  assert.equal(unauthenticatedRead.allow, false);
  assert.equal(unauthenticatedRead.reason, 'read_denied');
});

test('backend storage policy composes role authorization with readable document safety', () => {
  const allowed = evaluateBackendStoragePolicy({
    actor: actors.systemAdmin,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.featureFlag('server-selection'),
    document: { enabled: true, rolloutPercent: 10 }
  });
  const denied = evaluateBackendStoragePolicy({
    actor: actors.systemAdmin,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.featureFlag('server-selection'),
    document: { enabled: true, authToken: 'unsafe-token' }
  });

  assert.equal(allowed.allow, true);
  assert.equal(denied.allow, false);
  assert.equal(denied.reason, 'backend_document_secret_field');
});

test('provider security rule docs and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'provider-security-rules.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /Firestore fake-emulator/i);
  assert.match(docs, /server\/backend-policy-rules\.js/i);
  assert.match(docs, /deny-by-default/i);
  assert.match(docs, /secret-field/i);
  assert.match(docs, /no live provider credentials/i);
  assert.equal(pkg.scripts['test:rules'], 'node --test tests/backend-policy-rules.test.js tests/provider-security-rules.test.js');
  assert.match(pkg.scripts['test:unit'], /tests\/provider-security-rules\.test\.js/);
});
