const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildLearnerGoalProjection,
  buildGuardianGoalSummary,
  buildTeacherGoalAggregate
} = require('../assets/learner-goal-projection-domain');

const now = '2030-04-29T12:00:00.000Z';

test('learner goal projection uses injected time and prioritizes due review safely', () => {
  const projection = buildLearnerGoalProjection({
    now,
    learner: { id: 'learner-1', displayName: 'Hidden Learner' },
    goals: {
      dailyQuestionTarget: 5,
      weeklySessionTarget: 2,
      reviewStreakTargetDays: 3,
      assignmentCompletionTargetPercent: 50
    },
    sessions: [{
      id: 'today',
      completedAt: '2030-04-29T09:00:00.000Z',
      attempts: [{ questionId: 'q1' }, { questionId: 'q2' }, { questionId: 'q3' }]
    }],
    assignments: [
      { id: 'assignment-1', title: 'Verb Tune-Up', status: 'active', dueAt: '2030-04-30T12:00:00.000Z' },
      { id: 'assignment-2', status: 'completed' }
    ],
    reviewQueue: {
      items: [{
        questionRef: { id: 'raw-question-ref' },
        status: 'queued',
        dueAt: '2030-04-29T10:00:00.000Z',
        question: 'Raw prompt must not leak'
      }]
    }
  });

  assert.equal(projection.generatedAt, now);
  assert.equal(projection.todayProgress.current, 3);
  assert.equal(projection.todayProgress.remaining, 2);
  assert.equal(projection.weeklyProgress.current, 1);
  assert.equal(projection.reviewStatus.dueCount, 1);
  assert.equal(projection.nextSuggestedAction.type, 'review_due');
  assert.equal(projection.nextSuggestedAction.priority, 1);
  assert.equal(projection.summaryBand, 'review_due');
  assert.ok(projection.notificationCandidates.some(item => item.type === 'review_due'));
  assert.equal(JSON.stringify(projection).includes('Raw prompt'), false);
  assert.equal(JSON.stringify(projection).includes('Hidden Learner'), false);
  assert.equal(JSON.stringify(projection).includes('raw-question-ref'), false);
});

test('sparse or behind-target goal history uses encouraging non-punitive copy', () => {
  const projection = buildLearnerGoalProjection({
    now: '2030-05-01T12:00:00.000Z',
    goals: {
      dailyQuestionTarget: 8,
      weeklySessionTarget: 4,
      reviewStreakTargetDays: 3,
      activeDays: [1, 2, 3, 4, 5]
    },
    sessions: [],
    assignments: [],
    reviewQueue: { items: [] }
  });
  const copy = [
    projection.summary,
    projection.nextSuggestedAction.reason,
    ...projection.dashboardCards.map(card => card.message),
    ...projection.notificationCandidates.flatMap(item => [item.title, item.body])
  ].join(' ').toLowerCase();

  assert.equal(projection.summaryBand, 'behind_target');
  assert.equal(projection.todayProgress.remaining, 8);
  assert.equal(projection.nextSuggestedAction.type, 'practice_today');
  assert.ok(projection.notificationCandidates.some(item => item.type === 'practice_today'));
  assert.doesNotMatch(copy, /failed|missed goal|behind|punish|lost your streak|disappoint/);
});

test('guardian summary aggregates linked learner goal bands without learner payloads', () => {
  const summary = buildGuardianGoalSummary({
    now,
    learnerSources: [
      {
        learner: { id: 'learner-1', displayName: 'Learner One' },
        goals: { dailyQuestionTarget: 2, weeklySessionTarget: 1, reviewStreakTargetDays: 1 },
        sessions: [{ completedAt: '2030-04-29T09:00:00.000Z', attempts: [{ questionId: 'q1' }, { questionId: 'q2' }] }],
        reviewQueue: { items: [] },
        privateNotes: 'do not expose'
      },
      {
        learner: { id: 'learner-2', displayName: 'Learner Two' },
        goals: { dailyQuestionTarget: 5, weeklySessionTarget: 2 },
        sessions: [],
        reviewQueue: { items: [] }
      }
    ]
  });

  assert.equal(summary.roleView, 'parent_guardian');
  assert.equal(summary.learnerCount, 2);
  assert.equal(summary.bandCounts.on_track, 1);
  assert.equal(summary.bandCounts.behind_target, 1);
  assert.equal(summary.cards.length, 2);
  assert.equal(JSON.stringify(summary).includes('Learner One'), false);
  assert.equal(JSON.stringify(summary).includes('do not expose'), false);
});

test('teacher aggregate only includes assigned learners and stays aggregate-only', () => {
  const aggregate = buildTeacherGoalAggregate({
    now,
    assignedLearnerIds: ['learner-1'],
    learnerSources: [
      {
        learner: { id: 'learner-1', displayName: 'Assigned Learner' },
        goals: { dailyQuestionTarget: 2, weeklySessionTarget: 1, reviewStreakTargetDays: 1 },
        sessions: [{ completedAt: '2030-04-29T09:00:00.000Z', attempts: [{ questionId: 'q1' }, { questionId: 'q2' }] }],
        assignments: [{ id: 'a1', status: 'completed' }]
      },
      {
        learner: { id: 'learner-2', displayName: 'Unassigned Learner' },
        goals: { dailyQuestionTarget: 10 },
        sessions: [],
        assignments: [{ id: 'a2', status: 'active' }]
      }
    ]
  });

  assert.equal(aggregate.roleView, 'teacher');
  assert.equal(aggregate.learnerCount, 1);
  assert.equal(aggregate.bandCounts.on_track, 1);
  assert.equal(aggregate.bandCounts.behind_target || 0, 0);
  assert.equal(JSON.stringify(aggregate).includes('Assigned Learner'), false);
  assert.equal(JSON.stringify(aggregate).includes('Unassigned Learner'), false);
  assert.equal(JSON.stringify(aggregate).includes('q1'), false);
});
