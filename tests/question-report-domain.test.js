const assert = require('node:assert/strict');
const test = require('node:test');

const reports = require('../assets/question-report-domain');

const actor = { id: 'reviewer-1', role: 'teacher', capabilities: ['question-report:triage', 'question-report:assign', 'question-report:resolve'] };
const now = '2030-04-29T12:00:00.000Z';

test('question report domain normalizes legacy reports without conflating identities', () => {
  const report = reports.normalizeQuestionReport({
    id: 'report-1',
    questionId: 'grammar-q0001',
    questionVersion: 2,
    questionHash: 'sha256:abc',
    sourceSet: 'grammar-sentence-types',
    sequence: 1,
    reporter: { role: 'parent_guardian', linkedLearnerId: 'learner-1' },
    question: 'raw prompt'
  }, { now });

  assert.equal(report.id, 'report-1');
  assert.deepEqual(report.questionIdentity, {
    questionId: 'grammar-q0001',
    version: 2,
    contentHash: 'sha256:abc',
    sourceSet: 'grammar-sentence-types',
    sequence: 1
  });
  assert.equal(report.status, 'open');
  assert.equal(JSON.stringify(report).includes('raw prompt'), false);
});

test('question report domain applies valid triage transitions and rejects invalid ones', () => {
  const open = reports.normalizeQuestionReport({ id: 'report-1', questionId: 'grammar-q0001' }, { now });
  const assigned = reports.assignQuestionReport(open, { assignedTo: 'reviewer-2', actor, now });
  assert.equal(assigned.status, 'assigned');
  assert.equal(assigned.triage.assignedTo, 'reviewer-2');

  const resolved = reports.resolveQuestionReport(assigned, { resolution: 'fixed_in_source', actor, now });
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.triage.resolution, 'fixed_in_source');

  assert.throws(() => reports.resolveQuestionReport(open, { resolution: 'too soon', actor, now }), /invalid_report_transition/);
});

test('question report domain supports duplicate defer and reopen transitions', () => {
  const open = reports.normalizeQuestionReport({ id: 'report-2', questionId: 'grammar-q0002' }, { now });
  const duplicate = reports.markDuplicateQuestionReport(open, { duplicateOf: 'report-1', actor, now });
  assert.equal(duplicate.status, 'duplicate');
  assert.equal(duplicate.triage.duplicateOf, 'report-1');

  const deferred = reports.deferQuestionReport(open, { resolution: 'needs source review', actor, now });
  assert.equal(deferred.status, 'deferred');
  assert.equal(reports.reopenQuestionReport(deferred, { actor, now }).status, 'needs_review');
});

test('weak-explanation reports link to explanation review signals by question identity', () => {
  const report = reports.normalizeQuestionReport({
    id: 'report-weak-explanation',
    questionId: 'grammar-q0001',
    questionVersion: 1,
    questionHash: 'sha256:abc',
    category: 'weak_explanation'
  }, { now });

  const reviewItem = reports.createExplanationReviewSignalFromReport(report, { now });

  assert.equal(reviewItem.questionIdentity.questionId, 'grammar-q0001');
  assert.equal(reviewItem.signals[0].type, 'human_weak_explanation_report');
  assert.equal(reviewItem.signals[0].source, 'question-report');
});
