const assert = require('node:assert/strict');
const test = require('node:test');

const review = require('../assets/explanation-review-domain');

const actor = { id: 'reviewer-1', role: 'system_admin', capabilities: ['explanation-review:triage', 'explanation-review:verify'] };
const now = '2030-04-29T12:00:00.000Z';

test('explanation review domain normalizes candidates with source location refs only', () => {
  const item = review.normalizeExplanationReviewItem({
    id: 'explanation-review-1',
    questionIdentity: { questionId: 'grammar-q0001', version: 1, contentHash: 'sha256:abc', sourceSet: 'grammar', sequence: 1 },
    sourceLocation: { file: '/Users/me/repo/assets/question-bank-source/grammar.json', jsonPointer: '/sets/0/questions/0/explanation' },
    signals: [{ type: 'weak-explanation-rationale', severity: 'warning', message: 'Too short', source: 'content-qa' }],
    explanation: 'raw explanation'
  }, { now });

  assert.equal(item.status, 'candidate');
  assert.equal(item.sourceLocation.file, 'assets/question-bank-source/grammar.json');
  assert.equal(JSON.stringify(item).includes('raw explanation'), false);
});

test('explanation review domain validates status transitions and dismissal rationale', () => {
  const item = review.normalizeExplanationReviewItem({ id: 'review-1', questionIdentity: { questionId: 'grammar-q0001' } }, { now });
  const inProgress = review.startExplanationReview(item, { assignedTo: 'reviewer-1', actor, now });
  assert.equal(inProgress.status, 'in_progress');
  const fixed = review.markExplanationFixedPendingGeneration(inProgress, { resolution: 'edited canonical JSON', actor, now });
  assert.equal(fixed.status, 'fixed_pending_generation');
  assert.equal(review.verifyExplanationReview(fixed, { actor, now }).status, 'verified');
  assert.throws(() => review.dismissExplanationReview(item, { actor, now }), /dismissal_reason_required/);
  assert.equal(review.dismissExplanationReview(item, { reason: 'false positive', actor, now }).status, 'dismissed');
});

