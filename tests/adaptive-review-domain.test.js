const assert = require('node:assert/strict');
const test = require('node:test');

const reviewDomain = require('../assets/adaptive-review-domain');

test('adaptive review queue prefers recent missed question refs without copied content', () => {
  const queue = reviewDomain.buildReviewQueue({
    now: '2030-04-29T12:00:00.000Z',
    maxItems: 4,
    sessions: [{
      id: 'session-1',
      completedAt: '2030-04-28T12:00:00.000Z',
      attempts: [{
        questionId: 'grammar-sentence-types-q0001',
        questionVersion: 1,
        questionHash: 'sha256:abc',
        sourceSet: 'grammar-sentence-types',
        sequence: 1,
        correct: false,
        skillIds: ['grammar.sentence-analysis'],
        question: 'do not copy',
        choices: ['A', 'B'],
        explanation: { correct: 'nope' }
      }]
    }],
    mastery: { skills: {} },
    manifest: {
      sets: [{ id: 'grammar-sentence-types', domain: 'grammar' }]
    }
  });

  assert.equal(queue.queueId, 'adaptive-review-2030-04-29');
  assert.equal(queue.items.length, 1);
  assert.deepEqual(queue.items[0], {
    id: 'review-grammar-sentence-types-q0001',
    questionRef: {
      id: 'grammar-sentence-types-q0001',
      sourceSet: 'grammar-sentence-types',
      version: 1,
      contentHash: 'sha256:abc',
      sequence: 1
    },
    setId: 'grammar-sentence-types',
    skillIds: ['grammar.sentence-analysis'],
    reason: 'missed_recently',
    priority: 100,
    dueAt: '2030-04-29T12:00:00.000Z',
    status: 'queued',
    seenAt: '',
    masteredAt: ''
  });
  assert.equal(JSON.stringify(queue).includes('do not copy'), false);
  assert.equal(JSON.stringify(queue).includes('choices'), false);
});

test('adaptive review queue backfills weak skills from manifest refs', () => {
  const queue = reviewDomain.buildReviewQueue({
    now: '2030-04-29T12:00:00.000Z',
    maxItems: 3,
    sessions: [],
    mastery: {
      skills: {
        'grammar.usage': {
          correct: 1,
          total: 5,
          lastPracticed: '2030-03-01',
          questionRefs: []
        }
      }
    },
    manifest: {
      sets: [{
        id: 'grammar-pronouns',
        questions: [{
          id: 'grammar-pronouns-q0001',
          version: 1,
          contentHash: 'sha256:def',
          metadata: {
            sourceSet: 'grammar-pronouns',
            sequence: 1,
            skillIds: ['grammar.usage']
          },
          question: 'do not copy'
        }]
      }]
    }
  });

  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].reason, 'weak_skill');
  assert.equal(queue.items[0].priority, 80);
  assert.equal(queue.items[0].questionRef.id, 'grammar-pronouns-q0001');
  assert.equal(JSON.stringify(queue).includes('do not copy'), false);
});

test('adaptive review queue normalizes persisted item status transitions', () => {
  const queue = reviewDomain.normalizeReviewQueue({
    queueId: 'adaptive-review-2030-04-29',
    items: [{
      questionRef: { id: 'q1', sourceSet: 'set-1', version: 1, contentHash: 'sha256:a', sequence: 1 },
      skillIds: ['skill.one'],
      reason: 'missed_recently',
      priority: 99,
      status: 'queued'
    }]
  });
  const seen = reviewDomain.markReviewItemSeen(queue, 'q1', '2030-04-29T12:01:00.000Z');
  const mastered = reviewDomain.markReviewItemMastered(seen, 'q1', '2030-04-29T12:02:00.000Z');

  assert.equal(seen.items[0].status, 'seen');
  assert.equal(seen.items[0].seenAt, '2030-04-29T12:01:00.000Z');
  assert.equal(mastered.items[0].status, 'mastered');
  assert.equal(mastered.items[0].masteredAt, '2030-04-29T12:02:00.000Z');
});
