const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const slo = require('../assets/institutional-provisioning-slo-policy');

const repoRoot = path.resolve(__dirname, '..');

test('institutional provisioning SLO policy defines tenant onboarding objectives', () => {
  const result = slo.validateInstitutionalProvisioningSloPolicy(slo.DEFAULT_INSTITUTIONAL_PROVISIONING_SLO_POLICY);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.policy.objectives.map(objective => objective.id), [
    'institutional_login_success',
    'roster_sync_freshness',
    'assignment_provisioning_success',
    'verified_report_projection_freshness',
    'institutional_export_request_success',
    'institutional_rollback_rehearsal_success'
  ]);
});

test('tenant health summary classifies aggregate SLO observations without learner payloads', () => {
  const summary = slo.buildTenantHealthSummary(slo.DEFAULT_INSTITUTIONAL_PROVISIONING_SLO_POLICY, {
    tenantId: 'school-a',
    environment: 'staging',
    generatedAt: '2030-05-05T12:00:00.000Z',
    observations: {
      institutional_login_success: { totalEvents: 1000, successfulEvents: 998 },
      roster_sync_freshness: { totalEvents: 100, successfulEvents: 96 },
      assignment_provisioning_success: { totalEvents: 100, successfulEvents: 90 }
    }
  });

  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.tenantId, 'school-a');
  assert.equal(summary.status, 'degraded');
  assert.equal(summary.objectives.find(item => item.id === 'institutional_login_success').status, 'healthy');
  assert.equal(summary.objectives.find(item => item.id === 'roster_sync_freshness').status, 'burning');
  assert.equal(summary.objectives.find(item => item.id === 'assignment_provisioning_success').status, 'exhausted');
  assert.doesNotMatch(JSON.stringify(summary), /learnerId|studentId|question|answer|prompt|token|providerPayload/);
});

test('roster drift signals block launch when staged roster evidence diverges too far', () => {
  assert.deepEqual(slo.buildRosterDriftSignal({
    tenantId: 'school-a',
    environment: 'staging',
    expectedActiveMemberships: 100,
    stagedActiveMemberships: 97,
    droppedMemberships: 1,
    guardianConflicts: 0,
    teacherTransfers: 1,
    duplicateStudentMatches: 0,
    generatedAt: '2030-05-05T12:00:00.000Z'
  }).status, 'healthy');

  const blocking = slo.buildRosterDriftSignal({
    tenantId: 'school-a',
    environment: 'staging',
    expectedActiveMemberships: 100,
    stagedActiveMemberships: 88,
    droppedMemberships: 12,
    guardianConflicts: 2,
    teacherTransfers: 4,
    duplicateStudentMatches: 1,
    generatedAt: '2030-05-05T12:00:00.000Z'
  });

  assert.equal(blocking.status, 'blocking');
  assert.deepEqual(blocking.reasons, [
    'active_membership_drift_exceeds_threshold',
    'dropped_memberships_exceed_threshold',
    'guardian_conflicts_present',
    'duplicate_student_matches_present'
  ]);
});

test('institutional provisioning SLO docs stay privacy-safe and linked', () => {
  const docs = [
    fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'production-slos.md'), 'utf8'),
    fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'synthetic-monitors.md'), 'utf8'),
    fs.readFileSync(path.join(repoRoot, 'docs', 'institutional-rollout-and-provisioning.md'), 'utf8')
  ].join('\n');

  [
    'institutional_login_success',
    'roster_sync_freshness',
    'assignment_provisioning_success',
    'verified_report_projection_freshness',
    'institutional_export_request_success',
    'institutional_rollback_rehearsal_success'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));
  assert.doesNotMatch(docs, /learnerId\s*=|studentId\s*=|token\s*=|secret\s*=|password\s*=|providerPayload|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i);
});

test('ci contract wires institutional provisioning SLO policy into the unit gate', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['test:unit'], /tests\/institutional-provisioning-slo-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
