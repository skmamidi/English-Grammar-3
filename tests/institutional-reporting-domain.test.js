const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const reports = require('../assets/institutional-reporting-domain');
const verifiedAttempts = require('./fixtures/institutional-reporting/verified-attempts.json');

const repoRoot = path.resolve(__dirname, '..');

test('institutional report projections derive skill and standard summaries from verified evidence only', () => {
  const projection = reports.buildInstitutionalReportProjection({
    tenantId: 'school-a',
    tenantType: 'school',
    classId: 'class-a',
    roleScope: 'teacher',
    timeWindow: { startsAt: '2026-05-01T00:00:00.000Z', endsAt: '2026-05-31T23:59:59.000Z' },
    verifiedAttempts,
    minCohortSize: 2
  });

  assert.equal(projection.source, 'verified_learning_evidence');
  assert.equal(projection.evidence.verifiedAttemptCount, 3);
  assert.equal(projection.evidence.pendingLocalCount, 1);
  assert.equal(projection.evidence.learnerCount, 2);
  assert.equal(projection.suppressed, false);
  assert.equal(projection.classroomSkillSummaries.find(item => item.skillId === 'grammar.usage').accuracy, 0.75);
  assert.equal(projection.standardsCoverageSummaries.find(item => item.standardId === 'L.3-6.1').coverageBand, 'developing');
  assert.equal(projection.interventionQueue[0].reasonCode, 'low_accuracy');
  assert.deepEqual(reports.validateInstitutionalReportProjection(projection).errors, []);
  assertNoUnsafeReportPayload(projection);
});

test('small cohorts are suppressed and export redaction removes learner-level material', () => {
  const projection = reports.buildInstitutionalReportProjection({
    tenantId: 'school-a',
    tenantType: 'school',
    classId: 'class-small',
    roleScope: 'teacher',
    verifiedAttempts,
    minCohortSize: 2
  });
  const exportView = reports.redactInstitutionalReportForExport(projection);

  assert.equal(projection.suppressed, true);
  assert.equal(projection.suppressionReason, 'small_cohort');
  assert.deepEqual(projection.classroomSkillSummaries, []);
  assert.deepEqual(projection.interventionQueue, []);
  assert.equal(exportView.evidence.learnerCount, undefined);
  assert.equal(exportView.evidence.learnerCountBucket, 'suppressed');
  assertNoUnsafeReportPayload(exportView);
});

test('report visibility enforces tenant class role and support boundaries', () => {
  const policy = reports.buildReportVisibilityPolicy({
    tenantId: 'school-a',
    tenantType: 'school',
    classId: 'class-a',
    minCohortSize: 2
  });
  const teacher = { role: 'teacher', tenantMemberships: [{ tenantId: 'school-a', tenantType: 'school', role: 'teacher', status: 'active', classIds: ['class-a'] }] };
  const crossTenantTeacher = { role: 'teacher', tenantMemberships: [{ tenantId: 'school-b', tenantType: 'school', role: 'teacher', status: 'active', classIds: ['class-a'] }] };
  const guardian = { role: 'parent_guardian', linkedLearnerIds: ['learner-a'], tenantMemberships: [{ tenantId: 'family-a', tenantType: 'family', role: 'guardian', status: 'active', learnerIds: ['learner-a'] }] };
  const support = { role: 'support_operator', tenantMemberships: [{ tenantId: 'school-a', tenantType: 'school', role: 'support_operator', status: 'active' }] };

  assert.deepEqual(reports.evaluateReportVisibility({ actor: teacher, policy }), { allow: true, visibility: 'full', reason: 'allowed' });
  assert.equal(reports.evaluateReportVisibility({ actor: crossTenantTeacher, policy }).allow, false);
  assert.equal(reports.evaluateReportVisibility({ actor: guardian, policy }).reason, 'institutional_report_role_denied');
  assert.deepEqual(reports.evaluateReportVisibility({ actor: support, policy }), { allow: true, visibility: 'metadata_only', reason: 'allowed' });
});

test('institutional reporting docs and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'institutional-reporting-projections.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /InstitutionalReportProjection/);
  assert.match(docs, /small-cohort/i);
  assert.match(docs, /interpretation limits/i);
  assert.match(docs, /raw prompts/i);
  assert.match(pkg.scripts['test:unit'], /tests\/institutional-reporting-domain\.test\.js/);
});

function assertNoUnsafeReportPayload(value) {
  const text = JSON.stringify(value);
  ['learner-a', 'learner-b', 'raw prompt', 'answerKey', 'correctAnswer', 'studentName', 'billing'].forEach(token => {
    assert.equal(text.includes(token), false, `report should not include ${token}`);
  });
}
