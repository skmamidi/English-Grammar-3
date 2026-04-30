const assert = require('node:assert/strict');
const test = require('node:test');

const analytics = require('../assets/aggregate-learning-analytics-domain');

test('aggregate analytics suppress small cohorts and exclude identifiers', () => {
  const report = analytics.buildAggregateLearningAnalyticsReport({
    minCohortSize: 3,
    cohort: { id: 'classroom-a', learnerIds: ['learner-1', 'learner-2'] },
    assignments: [
      { learnerId: 'learner-1', learnerName: 'Hidden Learner', status: 'completed' },
      { learnerId: 'learner-2', status: 'active' }
    ],
    quizSessions: [
      { learnerId: 'learner-1', domain: 'grammar', completed: true, answer: 'raw answer' }
    ]
  });

  assert.equal(report.suppressed, true);
  assert.equal(report.reason, 'small_cohort');
  assert.deepEqual(report.rows, []);
  assert.equal(JSON.stringify(report).includes('learner-1'), false);
  assert.equal(JSON.stringify(report).includes('Hidden Learner'), false);
  assert.equal(JSON.stringify(report).includes('raw answer'), false);
});

test('aggregate analytics reports safe rates counts and buckets for eligible cohorts', () => {
  const report = analytics.buildAggregateLearningAnalyticsReport({
    minCohortSize: 3,
    bucketSize: 5,
    cohort: { id: 'classroom-a', learnerCount: 6 },
    assignments: [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'active' },
      { status: 'completed' },
      { status: 'active' },
      { status: 'completed' }
    ],
    reviewSchedules: [
      { dueAt: '2030-04-29T12:00:00.000Z', lastReviewedAt: '2030-04-29T12:10:00.000Z' },
      { dueAt: '2030-04-28T12:00:00.000Z' }
    ],
    recommendations: [
      { reasonCode: 'low_recent_accuracy' },
      { reasonCode: 'low_recent_accuracy' },
      { reasonCode: 'overdue_review' }
    ],
    masteryProjection: [
      { skillId: 'grammar.fragments', masteryBand: 'needs_practice' },
      { skillId: 'grammar.fragments', masteryBand: 'secure' },
      { skillId: 'grammar.fragments', masteryBand: 'secure' }
    ],
    quizSessions: [
      { domain: 'grammar', completed: true },
      { domain: 'grammar', completed: false },
      { domain: 'vocabulary', completed: true }
    ],
    featureFlagEvents: [
      { featureFlag: 'serverSelection', status: 'fallback' },
      { featureFlag: 'serverSelection', status: 'success' },
      { featureFlag: 'serverSelection', status: 'error' }
    ],
    now: '2030-04-30T12:00:00.000Z'
  });

  assert.equal(report.suppressed, false);
  assert.equal(report.cohortSizeBucket, '5-9');
  assert.equal(report.assignment.completionCount, 4);
  assert.equal(report.assignment.completionRate, 0.67);
  assert.deepEqual(report.review, { dueCount: 2, completedCount: 1 });
  assert.deepEqual(report.recommendationReasonCounts, { low_recent_accuracy: 2, overdue_review: 1 });
  assert.deepEqual(report.quizCompletionCountsByDomain, { grammar: { completed: 1, started: 2 }, vocabulary: { completed: 1, started: 1 } });
  assert.deepEqual(report.featureFlagHealth.serverSelection, { eventCount: 3, fallbackRate: 0.33, errorRate: 0.33 });
});
