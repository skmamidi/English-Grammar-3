const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_REVIEWER_WORKLOAD_SLA_FIXTURE,
  REVIEWER_WORKLOAD_SLA_THRESHOLDS,
  buildReviewerWorkloadSlaReport,
  validateReviewerWorkloadSlaReport
} = require('../assets/reviewer-workload-sla-report');

const repoRoot = path.resolve(__dirname, '..');

test('reviewer workload SLA report aggregates issue type owner severity status and blocking state', () => {
  const report = buildReviewerWorkloadSlaReport(DEFAULT_REVIEWER_WORKLOAD_SLA_FIXTURE);

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.summary.total, 6);
  assert.equal(report.summary.byIssueType.publication_blocker, 1);
  assert.equal(report.summary.byIssueType.source_finding, 2);
  assert.equal(report.summary.byOwner.content_reviewer, 2);
  assert.equal(report.summary.bySeverity.critical, 2);
  assert.equal(report.summary.byStatus.fixed, 1);
  assert.equal(report.summary.byStatus.deferred, 1);
  assert.equal(report.summary.byPublicationBlocking.blocking, 4);
  assert.equal(report.summary.byPublicationBlocking.non_blocking, 2);
});

test('reviewer workload SLA report buckets open fixed deferred overdue blocked and recently resolved work', () => {
  const report = buildReviewerWorkloadSlaReport(DEFAULT_REVIEWER_WORKLOAD_SLA_FIXTURE);

  assert.equal(REVIEWER_WORKLOAD_SLA_THRESHOLDS.criticalHours, 24);
  assert.equal(report.summary.bySlaBucket.overdue, 2);
  assert.equal(report.summary.bySlaBucket.due_soon, 1);
  assert.equal(report.summary.bySlaBucket.within_sla, 1);
  assert.equal(report.summary.bySlaBucket.resolved_recently, 1);
  assert.equal(report.summary.bySlaBucket.deferred_active, 1);

  const overdue = report.rows.find(row => row.issueId === 'source-overdue');
  assert.equal(overdue.slaBucket, 'overdue');
  assert.equal(overdue.escalation.owner, 'content_ops_lead');
  assert.equal(overdue.escalation.reason, 'sla_overdue');
  assert.match(overdue.dueAt, /^2030-05-02T/);
});

test('reviewer workload SLA report validates escalation fields and redaction rules', () => {
  const report = buildReviewerWorkloadSlaReport(DEFAULT_REVIEWER_WORKLOAD_SLA_FIXTURE);

  assert.deepEqual(validateReviewerWorkloadSlaReport(report).errors, []);
  assert.doesNotMatch(JSON.stringify(report), /answerKey|correctAnswer|learner-|student-|rawAiDraft|source excerpt|staff ranking|performance score/i);

  const unsafe = {
    rows: [{
      issueId: 'unsafe',
      issueType: 'weak_explanation',
      owner: 'reviewer-1',
      severity: 'high',
      status: 'needs_review',
      ageHours: 30,
      publicationBlockingState: 'blocking',
      slaBucket: 'overdue',
      escalation: {},
      answerKey: 'A'
    }]
  };

  const errors = validateReviewerWorkloadSlaReport(unsafe).errors.map(error => error.code);
  assert.ok(errors.includes('missing_escalation_owner'));
  assert.ok(errors.includes('unsafe_workload_payload'));
});

test('reviewer workload SLA report docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'reviewer-workload-sla-reports.md'), 'utf8');
  const queueDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'curriculum-review-queue-dashboard.md'), 'utf8');
  const authoring = fs.readFileSync(path.join(repoRoot, 'docs', 'question-authoring.md'), 'utf8');
  const roadmap = fs.readFileSync(path.join(repoRoot, 'docs', 'milestone-roadmap.md'), 'utf8');
  const ciContract = fs.readFileSync(path.join(repoRoot, 'tests', 'ci-contract.test.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'SLA thresholds',
    'owners',
    'escalation paths',
    'redaction rules',
    'publication-blocking',
    'not staff performance scoring'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(queueDocs, /reviewer-workload-sla-reports\.md/);
  assert.match(authoring, /reviewer-workload-sla-reports\.md/);
  assert.match(roadmap, /✅.*19\.6.*reviewer-workload-sla-report\.js/);
  assert.match(ciContract, /reviewer-workload-sla-report/);
  assert.match(pkg.scripts['test:unit'], /tests\/reviewer-workload-sla-report\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
