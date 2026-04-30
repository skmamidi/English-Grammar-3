const assert = require('node:assert/strict');
const test = require('node:test');

const reviewSelection = require('../assets/adaptive-review-selection');

test('adaptive review selection hydrates refs and drops stale hashes with telemetry', async () => {
  const telemetry = [];
  const result = await reviewSelection.selectReviewQuestions({
    queue: {
      items: [{
        questionRef: { id: 'q1', sourceSet: 'set-1', version: 1, contentHash: 'sha256:old', sequence: 1 },
        skillIds: ['skill.one'],
        reason: 'missed_recently'
      }]
    },
    loader: {
      hydrateQuestionRefs() {
        return Promise.resolve([{ id: 'q1', version: 1, contentHash: 'sha256:new', metadata: { sourceSet: 'set-1', sequence: 1 } }]);
      }
    },
    telemetry: event => telemetry.push(event)
  });

  assert.deepEqual(result.questions, []);
  assert.equal(telemetry.length, 1);
  assert.equal(telemetry[0].event, 'review_item_stale_ref');
  assert.equal(telemetry[0].questionId, 'q1');
  assert.equal(JSON.stringify(telemetry).includes('Prompt text'), false);
});

test('adaptive review selection backfills from same skill when a ref is missing', async () => {
  const result = await reviewSelection.selectReviewQuestions({
    count: 2,
    queue: {
      items: [{
        questionRef: { id: 'missing', sourceSet: 'set-1', version: 1, contentHash: 'sha256:missing', sequence: 1 },
        skillIds: ['skill.one'],
        reason: 'missed_recently'
      }]
    },
    loader: {
      hydrateQuestionRefs() {
        return Promise.resolve([null]);
      },
      loadSet(setId) {
        assert.equal(setId, 'set-1');
        return Promise.resolve({
          questions: [{
            id: 'q2',
            version: 1,
            contentHash: 'sha256:q2',
            metadata: { sourceSet: 'set-1', sequence: 2, skillIds: ['skill.one'] }
          }]
        });
      }
    }
  });

  assert.equal(result.questions.length, 1);
  assert.equal(result.questions[0].id, 'q2');
  assert.deepEqual(result.questionRefs, [{
    id: 'q2',
    sourceSet: 'set-1',
    version: 1,
    contentHash: 'sha256:q2',
    sequence: 2
  }]);
});
