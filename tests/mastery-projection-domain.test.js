const assert = require('node:assert/strict');
const test = require('node:test');

const mastery = require('../assets/mastery-projection-domain');

test('mastery projection aggregates skill evidence without learner or question payloads', () => {
  const projection = mastery.projectMasteryBySkill({
    now: '2030-04-29T12:00:00.000Z',
    sessions: [{
      learnerId: 'learner-hidden',
      completedAt: '2030-04-28T12:00:00.000Z',
      attempts: [
        { questionId: 'grammar-q1', correct: false, skillIds: ['grammar.subject-verb'], difficulty: 'hard', gradeLevel: 5, question: 'raw prompt' },
        { questionId: 'grammar-q2', correct: true, skillIds: ['grammar.subject-verb'], difficulty: 'medium', gradeLevel: 5, answer: 'raw answer' },
        { questionId: 'vocab-q1', correct: true, skillIds: ['vocabulary.context'], difficulty: 'easy', gradeLevel: 4 }
      ]
    }],
    reviewSchedules: [{ ref: { id: 'grammar-q1' }, skillIds: ['grammar.subject-verb'], dueAt: '2030-04-29T11:00:00.000Z' }],
    assignments: [{ id: 'assignment-1', status: 'active', accuracy: 0.5, scope: { skillIds: ['grammar.subject-verb'] } }]
  });

  assert.deepEqual(projection.map(item => item.skillId), ['grammar.subject-verb', 'vocabulary.context']);
  assert.deepEqual(projection[0], {
    skillId: 'grammar.subject-verb',
    attempts: 2,
    recentAccuracy: 0.5,
    weightedAccuracy: 0.57,
    lastPracticedAt: '2030-04-28T12:00:00.000Z',
    evidenceLevel: 'sparse',
    masteryBand: 'insufficient_evidence',
    gradeLevels: [5],
    difficultyExposure: { easy: 0, medium: 1, hard: 1 },
    overdueReviewCount: 1,
    assignmentStruggleCount: 1
  });
  assert.equal(JSON.stringify(projection).includes('learner-hidden'), false);
  assert.equal(JSON.stringify(projection).includes('raw prompt'), false);
  assert.equal(JSON.stringify(projection).includes('raw answer'), false);
});

test('mastery projection marks recent recovery as secure enough to avoid weak labels', () => {
  const projection = mastery.projectMasteryBySkill({
    now: '2030-04-29T12:00:00.000Z',
    sessions: [{
      completedAt: '2030-04-21T12:00:00.000Z',
      attempts: [
        { questionId: 'grammar-old-1', correct: false, skillIds: ['grammar.fragments'], difficulty: 'medium' },
        { questionId: 'grammar-old-2', correct: false, skillIds: ['grammar.fragments'], difficulty: 'medium' }
      ]
    }, {
      completedAt: '2030-04-29T12:00:00.000Z',
      attempts: [
        { questionId: 'grammar-new-1', correct: true, skillIds: ['grammar.fragments'], difficulty: 'medium' },
        { questionId: 'grammar-new-2', correct: true, skillIds: ['grammar.fragments'], difficulty: 'medium' },
        { questionId: 'grammar-new-3', correct: true, skillIds: ['grammar.fragments'], difficulty: 'hard' }
      ]
    }]
  });

  assert.equal(projection[0].skillId, 'grammar.fragments');
  assert.equal(projection[0].attempts, 5);
  assert.equal(projection[0].recentAccuracy, 1);
  assert.equal(projection[0].masteryBand, 'secure');
});
