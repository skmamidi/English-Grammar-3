const assert = require('node:assert/strict');
const test = require('node:test');

const analytics = require('../assets/learning-analytics-domain');

test('learning analytics aggregates mastery, assignments, reviews, and recommendation reasons without identifiers', () => {
  const summary = analytics.buildAggregateLearningAnalytics({
    masteryProjection: [
      { skillId: 'grammar.fragments', masteryBand: 'needs_practice' },
      { skillId: 'grammar.fragments', masteryBand: 'developing' },
      { skillId: 'vocabulary.context', masteryBand: 'secure' }
    ],
    assignments: [
      { id: 'assignment-1', status: 'completed', learnerId: 'learner-hidden', learnerName: 'Hidden Name' },
      { id: 'assignment-2', status: 'active' }
    ],
    reviewSchedules: [
      { ref: { id: 'q1' }, dueAt: '2030-04-28T12:00:00.000Z', lastReviewedAt: '2030-04-27T12:00:00.000Z' },
      { ref: { id: 'q2' }, dueAt: '2030-05-01T12:00:00.000Z' }
    ],
    recommendations: [
      { reasonCode: 'low_recent_accuracy', skillId: 'grammar.fragments', question: 'raw prompt' },
      { reasonCode: 'overdue_review', skillId: 'grammar.fragments', answer: 'raw answer' }
    ],
    now: '2030-04-29T12:00:00.000Z'
  });

  assert.deepEqual(summary, {
    masteryBandCountsBySkill: {
      'grammar.fragments': { needs_practice: 1, developing: 1 },
      'vocabulary.context': { secure: 1 }
    },
    assignmentCompletionRate: 0.5,
    reviewCounts: { due: 1, completed: 1 },
    recommendationReasonCounts: {
      low_recent_accuracy: 1,
      overdue_review: 1
    }
  });
  assert.equal(JSON.stringify(summary).includes('learner-hidden'), false);
  assert.equal(JSON.stringify(summary).includes('Hidden Name'), false);
  assert.equal(JSON.stringify(summary).includes('raw prompt'), false);
  assert.equal(JSON.stringify(summary).includes('raw answer'), false);
});
