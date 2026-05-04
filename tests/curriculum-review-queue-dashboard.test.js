const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_CURRICULUM_REVIEW_QUEUE_FIXTURES,
  REQUIRED_CURRICULUM_REVIEW_ISSUE_TYPES,
  buildCurriculumReviewQueueProjection,
  filterCurriculumReviewQueueRows,
  validateCurriculumReviewQueueProjection
} = require('../assets/curriculum-review-queue-dashboard');
const {
  buildReviewerWorkloadSlaReport
} = require('../assets/reviewer-workload-sla-report');

const repoRoot = path.resolve(__dirname, '..');

test('curriculum review queue defines the required content operations issue types', () => {
  assert.deepEqual(REQUIRED_CURRICULUM_REVIEW_ISSUE_TYPES, [
    'publication_blocker',
    'duplicate_prompt',
    'weak_explanation',
    'source_finding',
    'standards_gap'
  ]);

  const projection = buildCurriculumReviewQueueProjection(DEFAULT_CURRICULUM_REVIEW_QUEUE_FIXTURES);
  const issueTypes = new Set(projection.rows.map(row => row.issueType));

  REQUIRED_CURRICULUM_REVIEW_ISSUE_TYPES.forEach(type => {
    assert.ok(issueTypes.has(type), `missing issue type ${type}`);
  });
  assert.deepEqual(validateCurriculumReviewQueueProjection(projection).errors, []);
});

test('review queue rows expose owner age severity status source and publication blocking reason', () => {
  const projection = buildCurriculumReviewQueueProjection(DEFAULT_CURRICULUM_REVIEW_QUEUE_FIXTURES);

  assert.equal(projection.summary.total, projection.rows.length);
  assert.equal(projection.summary.bySeverity.critical, 2);
  assert.equal(projection.summary.byStatus.needs_review, 4);
  assert.equal(projection.summary.byDomain.grammar, 3);
  assert.equal(projection.summary.byOwner.content_reviewer, 2);

  projection.rows.forEach(row => {
    assert.ok(row.issueId, 'row issue id is required');
    assert.ok(row.owner, `${row.issueId} owner is required`);
    assert.ok(row.ageDays >= 0, `${row.issueId} age is required`);
    assert.ok(row.severity, `${row.issueId} severity is required`);
    assert.ok(row.status, `${row.issueId} status is required`);
    assert.ok(row.domain, `${row.issueId} domain is required`);
    assert.ok(row.sourceRef, `${row.issueId} source ref is required`);
    assert.ok(row.publicationBlockingReason, `${row.issueId} publication blocking reason is required`);
  });
});

test('review queue filters by severity domain source status and owner', () => {
  const projection = buildCurriculumReviewQueueProjection(DEFAULT_CURRICULUM_REVIEW_QUEUE_FIXTURES);

  assert.deepEqual(filterCurriculumReviewQueueRows(projection, { severity: 'critical' }).map(row => row.issueType), [
    'publication_blocker',
    'source_finding'
  ]);
  assert.deepEqual(filterCurriculumReviewQueueRows(projection, { domain: 'vocabulary' }).map(row => row.issueType), [
    'weak_explanation',
    'standards_gap'
  ]);
  assert.deepEqual(filterCurriculumReviewQueueRows(projection, { status: 'deferred' }).map(row => row.issueType), [
    'duplicate_prompt'
  ]);
  assert.deepEqual(filterCurriculumReviewQueueRows(projection, { owner: 'standards_owner', sourceRef: 'vocabulary-set' }).map(row => row.issueType), [
    'standards_gap'
  ]);
});

test('review queue projection redacts learner data hidden answers raw drafts and source details', () => {
  const projection = buildCurriculumReviewQueueProjection({
    now: '2030-05-10T00:00:00.000Z',
    publicationBlockers: [{
      id: 'pub-unsafe',
      domain: 'grammar',
      sourceSet: 'grammar-set',
      severity: 'critical',
      status: 'needs_review',
      owner: 'content_reviewer',
      createdAt: '2030-05-09T00:00:00.000Z',
      blocker: 'content_qa_failed',
      questionText: 'Do not leak prompt',
      answerKey: 'A',
      learnerId: 'learner-one',
      rawAiDraft: 'draft answer',
      sourceExcerpt: 'copyrighted source detail'
    }]
  });

  assert.equal(projection.rows.length, 1);
  assert.doesNotMatch(JSON.stringify(projection), /Do not leak|answerKey|learner-one|rawAiDraft|copyrighted source detail|studentId|correctAnswer/i);

  const invalid = validateCurriculumReviewQueueProjection({
    rows: [{
      issueId: 'unsafe',
      issueType: 'publication_blocker',
      severity: 'critical',
      status: 'needs_review',
      owner: '',
      domain: '',
      sourceRef: '',
      ageDays: -1,
      publicationBlockingReason: '',
      learnerId: 'learner-one'
    }]
  });

  assert.ok(invalid.errors.includes('unsafe owner is required'));
  assert.ok(invalid.errors.includes('unsafe domain is required'));
  assert.ok(invalid.errors.includes('unsafe sourceRef is required'));
  assert.ok(invalid.errors.includes('unsafe ageDays must be non-negative'));
  assert.ok(invalid.errors.includes('unsafe publicationBlockingReason is required'));
  assert.ok(invalid.errors.includes('unsafe contains sensitive review queue data'));
});

test('curriculum review queue docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'curriculum-review-queue-dashboard.md'), 'utf8');
  const authoring = fs.readFileSync(path.join(repoRoot, 'docs', 'question-authoring.md'), 'utf8');
  const roadmap = fs.readFileSync(path.join(repoRoot, 'docs', 'milestone-roadmap.md'), 'utf8');
  const ciContract = fs.readFileSync(path.join(repoRoot, 'tests', 'ci-contract.test.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'publication blockers',
    'duplicate prompts',
    'weak explanations',
    'source findings',
    'standards gaps',
    'learner data',
    'hidden answer keys'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(authoring, /curriculum-review-queue-dashboard\.md/);
  assert.match(roadmap, /curriculum-review-queue-dashboard\.js/);
  assert.match(ciContract, /tests\\\/curriculum-review-queue-dashboard\\\.test\\\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/curriculum-review-queue-dashboard\.test\.js/);
});

test('curriculum review queue rows feed workload SLA reports without expanding content payloads', () => {
  const projection = buildCurriculumReviewQueueProjection(DEFAULT_CURRICULUM_REVIEW_QUEUE_FIXTURES);
  const report = buildReviewerWorkloadSlaReport({
    now: '2030-05-10T00:00:00.000Z',
    reviewQueue: projection
  });

  assert.equal(report.summary.total, projection.rows.length);
  assert.equal(report.summary.byOwner.content_reviewer, 2);
  assert.equal(Object.hasOwn(report.rows[0], 'questionText'), false);
  assert.equal(Object.hasOwn(report.rows[0], 'answerKey'), false);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
