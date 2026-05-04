const assert = require('node:assert/strict');
const test = require('node:test');

const {
  classifyReviewIssue,
  isReviewClassificationStale,
  validateReviewClassification
} = require('../assets/content-review-policy');
const {
  getAuthoringFixture
} = require('../assets/authoring-fixture-library');

test('review classifications require stable identity reviewer and rationale', () => {
  const classification = classifyReviewIssue({
    questionId: 'grammar-q0001',
    sourceSet: 'grammar-set',
    ruleId: 'duplicate-prompt',
    contentHash: 'sha256:abc',
    reviewer: 'reviewer-1',
    rationale: 'Intentional spiral review.',
    status: 'allowed'
  });

  assert.deepEqual(validateReviewClassification(classification), []);
  assert.equal(isReviewClassificationStale(classification, { contentHash: 'sha256:def' }), true);
});

test('review classifications reject missing rationale and unknown status', () => {
  const errors = validateReviewClassification({ questionId: 'q1', ruleId: 'duplicate', status: 'ignored' });

  assert.ok(errors.includes('reviewer is required'));
  assert.ok(errors.includes('rationale is required'));
  assert.ok(errors.includes('status is invalid'));
});

test('duplicate prompt fixture feeds review classification without prompt text', () => {
  const fixture = getAuthoringFixture('duplicated_prompt');
  const classification = classifyReviewIssue({
    questionId: fixture.metadata.questionId,
    sourceSet: fixture.sourceSet,
    ruleId: fixture.expectedSignals[0],
    contentHash: fixture.metadata.contentHash,
    reviewer: 'reviewer-1',
    rationale: 'Representative duplicate prompt fixture.',
    status: 'deferred'
  });

  assert.deepEqual(validateReviewClassification(classification), []);
  assert.doesNotMatch(JSON.stringify(fixture), /questionText|choices|answerKey|correctAnswer/i);
});
