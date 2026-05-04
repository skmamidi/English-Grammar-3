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
