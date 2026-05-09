const assert = require('node:assert/strict');
const test = require('node:test');

const dashboard = require('../assets/learning-dashboard-domain');

const now = '2030-04-29T12:00:00.000Z';

test('learning dashboard projection summarizes parent support signals without question payloads', () => {
  const projection = dashboard.buildLearningDashboardProjection({
    learner: { id: 'learner-1', displayLabel: 'Learner 1' },
    sessions: [{
      id: 'session-1',
      completedAt: '2030-04-28T12:00:00.000Z',
      attempts: [
        { questionId: 'grammar-q0001', correct: false, skillIds: ['grammar.subject-verb'], question: 'raw prompt' },
        { questionId: 'grammar-q0002', correct: true, skillIds: ['grammar.subject-verb'], answer: 'raw answer' }
      ]
    }],
    assignments: [{ id: 'assignment-1', title: 'Verb Tune-Up', status: 'active', scope: { skillIds: ['grammar.subject-verb'] } }],
    reviewQueue: { queueId: 'review-1', items: [{ questionRef: { id: 'grammar-q0001' }, skillIds: ['grammar.subject-verb'], dueAt: now, status: 'queued' }] },
    questionReports: [{ id: 'report-1', questionId: 'grammar-q0001', status: 'open' }],
    taxonomy: { skills: { 'grammar.subject-verb': { label: 'Subject-verb agreement' } } },
    roleView: 'parent_guardian',
    now
  });

  assert.equal(projection.learnerId, 'learner-1');
  assert.equal(projection.roleView, 'parent_guardian');
  assert.deepEqual(projection.summary, {
    recentPracticeCount: 1,
    accuracy: 0.5,
    activeAssignmentCount: 1,
    lateAssignmentCount: 0,
    assignmentCompletionRate: 0,
    dueReviewCount: 1,
    openQuestionReportCount: 1
  });
  assert.equal(projection.skillHighlights[0].skillId, 'grammar.subject-verb');
  assert.equal(projection.skillHighlights[0].message, 'Practice at home: Subject-verb agreement needs gentle review.');
  assert.equal(JSON.stringify(projection).includes('raw prompt'), false);
  assert.equal(JSON.stringify(projection).includes('raw answer'), false);
});

test('learning dashboard projection uses teacher intervention language', () => {
  const projection = dashboard.buildLearningDashboardProjection({
    learner: { id: 'learner-2' },
    sessions: [{
      attempts: [
        { questionId: 'vocab-q0001', correct: false, skillIds: ['vocabulary.context'] },
        { questionId: 'vocab-q0002', correct: false, skillIds: ['vocabulary.context'] },
        { questionId: 'vocab-q0003', correct: true, skillIds: ['vocabulary.context'] }
      ]
    }],
    assignments: [],
    reviewQueue: { items: [] },
    questionReports: [],
    taxonomy: { skills: { 'vocabulary.context': { label: 'Context clues' } } },
    roleView: 'teacher',
    now
  });

  assert.equal(projection.skillHighlights[0].message, 'Intervention priority: Context clues is below target accuracy.');
});

test('learning dashboard projection includes class assignment aggregates without learner pii', () => {
  const projection = dashboard.buildLearningDashboardProjection({
    learner: { id: 'class-a' },
    roleView: 'teacher',
    assignments: [
      { id: 'a1', title: 'One', status: 'completed', scope: { skillIds: ['grammar.subject-verb'] } },
      { id: 'a2', title: 'Two', status: 'active', dueAt: '2030-04-28T12:00:00.000Z', learnerName: 'Hidden Name' },
      { id: 'a3', title: 'Three', status: 'in_progress', dueAt: '2030-05-01T12:00:00.000Z' }
    ],
    now
  });

  assert.equal(projection.summary.activeAssignmentCount, 2);
  assert.equal(projection.summary.lateAssignmentCount, 1);
  assert.equal(projection.summary.assignmentCompletionRate, 0.33);
  assert.equal(JSON.stringify(projection).includes('Hidden Name'), false);
});

test('learning dashboard projection can carry institutional report summaries without drilldown', () => {
  const projection = dashboard.buildLearningDashboardProjection({
    learner: { id: 'class-a' },
    roleView: 'teacher',
    institutionalReportProjection: {
      reportId: 'report-school-a-class-a',
      tenantId: 'school-a',
      classId: 'class-a',
      evidence: { verifiedAttemptCount: 3, learnerCountBucket: '2-4' },
      classroomSkillSummaries: [{ skillId: 'grammar.usage', accuracy: 0.75 }],
      interventionQueue: [{ skillId: 'grammar.sentence-analysis', learnerIds: ['hidden'] }]
    },
    now
  });

  assert.deepEqual(projection.institutionalReportSummary, {
    reportId: 'report-school-a-class-a',
    tenantId: 'school-a',
    classId: 'class-a',
    verifiedAttemptCount: 3,
    learnerCountBucket: '2-4',
    skillSummaryCount: 1,
    interventionCount: 1
  });
  assert.equal(JSON.stringify(projection.institutionalReportSummary).includes('hidden'), false);
});

test('learning dashboard projection can include safe weak-skill recommendation cards', () => {
  const projection = dashboard.buildLearningDashboardProjection({
    learner: { id: 'learner-3' },
    sessions: [],
    recommendations: [{
      id: 'weak-skill-grammar.subject-verb',
      skillId: 'grammar.subject-verb',
      reasonCode: 'low_recent_accuracy',
      reasonLabel: 'Recent accuracy is below target.',
      target: { type: 'subtopic', setIds: ['grammar-subject-verb-agreement'] },
      question: 'raw prompt'
    }],
    roleView: 'teacher',
    now
  });

  assert.deepEqual(projection.recommendationHighlights, [{
    id: 'weak-skill-grammar.subject-verb',
    skillId: 'grammar.subject-verb',
    reasonCode: 'low_recent_accuracy',
    reasonLabel: 'Recent accuracy is below target.',
    target: { type: 'subtopic', setIds: ['grammar-subject-verb-agreement'] }
  }]);
  assert.equal(JSON.stringify(projection).includes('raw prompt'), false);
});

test('learning dashboard projection includes aggregate goal cards without private payloads', () => {
  const projection = dashboard.buildLearningDashboardProjection({
    learner: { id: 'learner-4' },
    goals: {
      dailyQuestionTarget: 2,
      weeklySessionTarget: 1,
      reviewStreakTargetDays: 1,
      assignmentCompletionTargetPercent: 50,
      question: 'raw prompt'
    },
    sessions: [{
      id: 'session-1',
      completedAt: '2030-04-29T08:00:00.000Z',
      attempts: [{ questionId: 'q1' }, { questionId: 'q2' }]
    }],
    assignments: [
      { id: 'assignment-1', status: 'completed', learnerPrivateNote: 'hidden' },
      { id: 'assignment-2', status: 'active' }
    ],
    roleView: 'teacher',
    now
  });

  assert.deepEqual(projection.goalHighlights.map(item => item.id), [
    'daily-questions',
    'weekly-sessions',
    'review-streak',
    'assignment-completion'
  ]);
  assert.equal(projection.goalHighlights[0].current, 2);
  assert.equal(projection.goalHighlights[0].met, true);
  assert.equal(projection.summary.goalMetCount, 4);
  assert.equal(JSON.stringify(projection).includes('raw prompt'), false);
  assert.equal(JSON.stringify(projection).includes('hidden'), false);
});

test('learning dashboard projection includes goal projection copy and reminder candidates', () => {
  const projection = dashboard.buildLearningDashboardProjection({
    learner: { id: 'learner-5', displayName: 'Hidden Learner' },
    goals: {
      dailyQuestionTarget: 4,
      weeklySessionTarget: 2,
      reviewStreakTargetDays: 2,
      assignmentCompletionTargetPercent: 50
    },
    sessions: [{
      id: 'session-1',
      completedAt: '2030-04-29T08:00:00.000Z',
      attempts: [{ questionId: 'q1' }]
    }],
    assignments: [{ id: 'assignment-1', title: 'Private Assignment', status: 'active' }],
    reviewQueue: {
      items: [{
        questionRef: { id: 'private-q1' },
        status: 'queued',
        dueAt: '2030-04-29T09:00:00.000Z',
        question: 'raw prompt'
      }]
    },
    roleView: 'parent_guardian',
    now
  });

  assert.equal(projection.goalProjection.summaryBand, 'review_due');
  assert.equal(projection.nextGoalAction.type, 'review_due');
  assert.ok(projection.goalNotificationCandidates.some(item => item.type === 'review_due'));
  assert.ok(projection.goalHighlights.every(item => item.band && item.message));
  const goalJson = JSON.stringify({
    goalProjection: projection.goalProjection,
    nextGoalAction: projection.nextGoalAction,
    goalNotificationCandidates: projection.goalNotificationCandidates,
    goalHighlights: projection.goalHighlights
  });
  assert.equal(goalJson.includes('Hidden Learner'), false);
  assert.equal(goalJson.includes('raw prompt'), false);
  assert.equal(goalJson.includes('private-q1'), false);
});

test('learning dashboard projection includes mixed quiz sessions in parent analysis', () => {
  const projection = dashboard.buildLearningDashboardProjection({
    learner: { id: 'learner-mixed' },
    progress: {
      reports: {
        sessions: [{
          id: 'mixed-session-1',
          mode: 'mixed',
          completedAt: '2030-04-29T08:00:00.000Z',
          attempts: [
            { questionId: 'grammar-sentence-types-q0001', correct: false, skillIds: ['grammar.sentence-analysis'] },
            { questionId: 'grammar-nouns-q0001', correct: true, skillIds: ['grammar.nouns'] },
            { questionId: 'grammar-mixed-q0001', correct: false }
          ]
        }]
      }
    },
    taxonomy: {
      skills: {
        'grammar.sentence-analysis': { label: 'Sentence analysis' },
        'grammar.nouns': { label: 'Nouns' },
        'practice.mixed': { label: 'Mixed practice' }
      }
    },
    roleView: 'parent_guardian',
    now
  });

  assert.equal(projection.summary.recentPracticeCount, 1);
  assert.equal(projection.summary.accuracy, 0.33);
  assert.deepEqual(projection.skillHighlights.map(item => item.skillId), [
    'grammar.sentence-analysis',
    'practice.mixed',
    'grammar.nouns'
  ]);
  assert.deepEqual(projection.reviewHighlights.map(item => item.questionRef.id), [
    'grammar-sentence-types-q0001',
    'grammar-mixed-q0001'
  ]);
});

test('learning dashboard projection includes privacy-safe guardian XP trends', () => {
  const projection = dashboard.buildLearningDashboardProjection({
    learner: { id: 'learner-xp', displayName: 'Hidden Learner' },
    progress: {
      xp: {
        projection: {
          totalXp: 430,
          currentWeeklyXp: 85,
          currentMonthlyXp: 210,
          weeklyTrend: [
            { periodId: 'weekly_2030_W17', xp: 40, awardedAt: '2030-04-22T12:00:00.000Z', learnerId: 'learner-xp' },
            { periodId: 'weekly_2030_W18', xp: 85, answer: 'raw answer should stay hidden' }
          ],
          recentAwards: [
            {
              awardEventId: 'award-1',
              awardedXp: 33,
              awardedAt: '2030-04-29T10:00:00.000Z',
              source: 'quiz_completion',
              question: 'raw prompt should stay hidden',
              correctAnswer: 'hidden key'
            },
            {
              awardEventId: 'award-2',
              awardedXp: 10,
              awardedAt: '2030-04-27T10:00:00.000Z',
              source: 'question_preview'
            }
          ]
        },
        offlineQueue: [
          { status: 'provisional', provisionalXp: 20, queuedAt: '2030-04-29T11:00:00.000Z', attemptEvidence: { selectedAnswers: [{ questionId: 'q1', selectedIndex: 0 }] } },
          { status: 'awarded', syncedXp: 12, syncedAt: '2030-04-29T11:05:00.000Z' }
        ]
      }
    },
    roleView: 'parent_guardian',
    now
  });

  assert.equal(projection.summary.totalXp, 430);
  assert.equal(projection.summary.weeklyXp, 85);
  assert.equal(projection.xpSummary.trend.direction, 'up');
  assert.equal(projection.xpSummary.trend.deltaXp, 45);
  assert.deepEqual(projection.xpSummary.recentAwards.map(item => item.awardedXp), [33, 10]);
  assert.equal(projection.xpSummary.reconciliation.pendingCount, 1);
  assert.equal(projection.xpSummary.reconciliation.status, 'provisional');
  assert.match(projection.xpSummary.guardianCopy, /trend/i);
  const serialized = JSON.stringify(projection.xpSummary);
  assert.equal(serialized.includes('raw prompt'), false);
  assert.equal(serialized.includes('raw answer'), false);
  assert.equal(serialized.includes('hidden key'), false);
  assert.equal(serialized.includes('learner-xp'), false);
  assert.equal(serialized.includes('q1'), false);
});

test('learning dashboard projection includes mission dashboard summaries', () => {
  const projection = dashboard.buildLearningDashboardProjection({
    learner: { id: 'learner-mission', displayName: 'Hidden Learner' },
    roleView: 'parent_guardian',
    now,
    missions: [{
      missionId: 'mission-sentence-detectives',
      title: 'Sentence Detectives',
      completionPolicy: { requiredStepIds: ['lesson-step', 'practice-step'] },
      stepSummaries: [
        { stepId: 'lesson-step', type: 'lesson', title: 'Lesson', required: true },
        { stepId: 'practice-step', type: 'practice', title: 'Practice', required: true }
      ]
    }],
    missionProgress: [{
      missionId: 'mission-sentence-detectives',
      completedStepIds: ['lesson-step'],
      question: 'raw prompt'
    }],
    assignments: [{
      id: 'mission-assignment-1',
      assignmentType: 'guided_mission',
      status: 'active',
      dueAt: '2030-04-28T12:00:00.000Z',
      scope: { missionRefs: [{ missionId: 'mission-sentence-detectives' }] },
      learnerName: 'Hidden Learner'
    }]
  });

  assert.equal(projection.summary.activeMissionCount, 1);
  assert.equal(projection.summary.overdueMissionCount, 1);
  assert.equal(projection.missionDashboard.cards[0].state, 'overdue');
  assert.equal(projection.missionHighlights[0].missionId, 'mission-sentence-detectives');
  assert.equal(JSON.stringify(projection.missionDashboard).includes('Hidden Learner'), false);
  assert.equal(JSON.stringify(projection.missionDashboard).includes('raw prompt'), false);
});
