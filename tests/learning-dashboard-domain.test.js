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
