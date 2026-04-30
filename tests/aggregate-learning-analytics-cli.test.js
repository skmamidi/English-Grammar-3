const assert = require('node:assert/strict');
const test = require('node:test');

const {
  summarizeLearningEvents
} = require('../scripts/analytics/summarize-learning-events');

test('learning analytics CLI summary normalizes safe telemetry exports', () => {
  const summary = summarizeLearningEvents({
    minCohortSize: 2,
    events: [
      { type: 'assignment_completed', cohortId: 'class-a', learnerId: 'learner-hidden' },
      { type: 'assignment_started', cohortId: 'class-a' },
      { type: 'review_due', cohortId: 'class-a' },
      { type: 'review_completed', cohortId: 'class-a' },
      { type: 'recommendation_shown', cohortId: 'class-a', reasonCode: 'overdue_review', question: 'raw prompt' },
      { type: 'quiz_completed', cohortId: 'class-a', domain: 'grammar' },
      { type: 'feature_flag_fallback', cohortId: 'class-a', featureFlag: 'serverSelection' }
    ]
  });

  assert.equal(summary.status, 'ok');
  assert.equal(summary.reports.length, 1);
  assert.equal(summary.reports[0].assignment.completionCount, 1);
  assert.equal(summary.reports[0].recommendationReasonCounts.overdue_review, 1);
  assert.equal(JSON.stringify(summary).includes('learner-hidden'), false);
  assert.equal(JSON.stringify(summary).includes('raw prompt'), false);
});
