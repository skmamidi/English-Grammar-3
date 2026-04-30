const assert = require('node:assert/strict');
const test = require('node:test');

const {
  classifyReviewIssue,
  isReviewClassificationStale,
  validateReviewClassification
} = require('../assets/content-review-policy');

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
