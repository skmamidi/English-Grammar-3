const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildLearnerGoalProgress,
  normalizeLearnerGoals
} = require('../assets/learner-goals-domain');

const now = '2030-04-29T12:00:00.000Z';

test('goal normalization clamps invalid values to conservative defaults', () => {
  const goals = normalizeLearnerGoals({
    dailyQuestionTarget: 500,
    weeklySessionTarget: -3,
    reviewStreakTargetDays: 90,
    assignmentCompletionTargetPercent: 140,
    activeDays: [1, 1, 8, '3', -1],
    updatedAt: 'not a date',
    question: 'raw prompt'
  });

  assert.deepEqual(goals, {
    schemaVersion: 1,
    enabled: true,
    dailyQuestionTarget: 25,
    weeklySessionTarget: 1,
    reviewStreakTargetDays: 30,
    assignmentCompletionTargetPercent: 100,
    activeDays: [1, 2, 3, 4, 5],
    updatedAt: '',
    updatedBy: ''
  });
  assert.equal(JSON.stringify(goals).includes('raw prompt'), false);
});

test('missing goals produce safe local-first defaults', () => {
  const goals = normalizeLearnerGoals();

  assert.equal(goals.enabled, true);
  assert.equal(goals.dailyQuestionTarget, 10);
  assert.equal(goals.weeklySessionTarget, 4);
  assert.equal(goals.reviewStreakTargetDays, 3);
  assert.equal(goals.assignmentCompletionTargetPercent, 75);
  assert.deepEqual(goals.activeDays, [1, 2, 3, 4, 5]);
});

test('goal progress counts daily questions, weekly sessions, assignments, and review activity', () => {
  const progress = buildLearnerGoalProgress({
    now,
    goals: {
      dailyQuestionTarget: 5,
      weeklySessionTarget: 2,
      reviewStreakTargetDays: 2,
      assignmentCompletionTargetPercent: 50,
      activeDays: [1, 2, 3, 4, 5]
    },
    sessions: [
      {
        id: 'today',
        completedAt: '2030-04-29T09:00:00.000Z',
        attempts: [{ questionId: 'q1' }, { questionId: 'q2' }, { questionId: 'q3' }]
      },
      {
        id: 'same-week',
        completedAt: '2030-04-29T10:00:00.000Z',
        attempts: [{ questionId: 'q4' }]
      },
      {
        id: 'old',
        completedAt: '2030-04-21T09:00:00.000Z',
        attempts: [{ questionId: 'q5' }]
      }
    ],
    assignments: [
      { id: 'a1', status: 'completed' },
      { id: 'a2', status: 'active' }
    ],
    reviewQueue: {
      items: [
        { questionRef: { id: 'q1' }, status: 'mastered', masteredAt: '2030-04-29T10:00:00.000Z' },
        { questionRef: { id: 'q2' }, status: 'queued', dueAt: '2030-04-29T12:00:00.000Z' }
      ]
    },
    reviewSchedules: [
      { ref: { id: 'q3' }, lastReviewedAt: '2030-04-28T10:00:00.000Z', streak: 2 },
      { ref: { id: 'q4' }, lastReviewedAt: '2030-04-20T10:00:00.000Z', streak: 8 }
    ]
  });

  assert.equal(progress.dailyQuestions.current, 4);
  assert.equal(progress.dailyQuestions.target, 5);
  assert.equal(progress.dailyQuestions.met, false);
  assert.equal(progress.weeklySessions.current, 2);
  assert.equal(progress.weeklySessions.met, true);
  assert.equal(progress.assignments.completionRate, 0.5);
  assert.equal(progress.assignments.met, true);
  assert.equal(progress.review.currentStreakDays, 2);
  assert.equal(progress.review.dueCount, 1);
  assert.equal(progress.overall.metCount, 3);
});

test('streak projection handles missed active days deterministically', () => {
  const progress = buildLearnerGoalProgress({
    now: '2030-05-01T12:00:00.000Z',
    goals: { reviewStreakTargetDays: 3, activeDays: [1, 2, 3, 4, 5] },
    sessions: [
      { id: 'monday', completedAt: '2030-04-29T09:00:00.000Z', attempts: [{ questionId: 'q1' }] },
      { id: 'friday-before', completedAt: '2030-04-26T09:00:00.000Z', attempts: [{ questionId: 'q2' }] }
    ]
  });

  assert.equal(progress.review.currentStreakDays, 0);
  assert.equal(progress.review.missedActiveDayCount, 2);
  assert.equal(progress.review.met, false);
});
