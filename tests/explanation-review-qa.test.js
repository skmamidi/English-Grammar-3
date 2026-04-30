const assert = require('node:assert/strict');
const test = require('node:test');

const qa = require('../scripts/qa/explanation-review-qa');

test('explanation review QA flags stale fixed items and dismissed items without reason', () => {
  const result = qa.validateExplanationReviewItems([{
    id: 'review-1',
    status: 'fixed_pending_generation',
    questionIdentity: { questionId: 'grammar-q0001', contentHash: 'sha256:old' },
    sourceLocation: { file: 'assets/question-bank-source/grammar.json', jsonPointer: '/sets/0/questions/0/explanation' },
    resolution: 'edited source'
  }, {
    id: 'review-2',
    status: 'dismissed',
    questionIdentity: { questionId: 'grammar-q0002', contentHash: 'sha256:new' },
    resolution: ''
  }], {
    currentIdentities: {
      'grammar-q0001': { contentHash: 'sha256:new' },
      'grammar-q0002': { contentHash: 'sha256:new' }
    }
  });

  assert.deepEqual(result.errors.map(error => error.code), ['stale_generated_artifact', 'dismissal_reason_required']);
});

