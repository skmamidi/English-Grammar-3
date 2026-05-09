const assert = require('node:assert/strict');
const test = require('node:test');

const recommendations = require('../assets/weak-skill-recommendation-domain');

test('weak skill recommendation engine ranks overdue review before low accuracy and strips payloads', () => {
  const result = recommendations.generateWeakSkillRecommendations({
    recentSessions: [{
      attempts: [
        { questionId: 'grammar-q0001', correct: false, skillIds: ['grammar.subject-verb'], question: 'raw prompt' },
        { questionId: 'grammar-q0002', correct: false, skillIds: ['grammar.subject-verb'], answer: 'raw answer' },
        { questionId: 'grammar-q0003', correct: true, skillIds: ['grammar.subject-verb'] },
        { questionId: 'vocab-q0001', correct: false, skillIds: ['vocabulary.context'] },
        { questionId: 'vocab-q0002', correct: false, skillIds: ['vocabulary.context'] },
        { questionId: 'vocab-q0003', correct: false, skillIds: ['vocabulary.context'] }
      ]
    }],
    reviewSchedule: [{ ref: { id: 'grammar-q0001' }, skillIds: ['grammar.subject-verb'], dueAt: '2030-04-28T12:00:00.000Z' }],
    taxonomy: {
      skills: {
        'grammar.subject-verb': { label: 'Subject-verb agreement', standards: ['L.3.1f'] },
        'vocabulary.context': { label: 'Context clues' }
      }
    },
    now: '2030-04-29T12:00:00.000Z'
  });

  assert.equal(result.generatedAt, '2030-04-29T12:00:00.000Z');
  assert.equal(result.recommendations[0].skillId, 'grammar.subject-verb');
  assert.equal(result.recommendations[0].reasonCode, 'overdue_review');
  assert.equal(result.recommendations[0].target.type, 'review');
  assert.equal(result.recommendations[1].reasonCode, 'low_recent_accuracy');
  assert.equal(JSON.stringify(result).includes('raw prompt'), false);
  assert.equal(JSON.stringify(result).includes('raw answer'), false);
});

test('weak skill recommendation engine does not overclaim sparse evidence', () => {
  const result = recommendations.generateWeakSkillRecommendations({
    recentSessions: [{ attempts: [{ questionId: 'grammar-q0001', correct: false, skillIds: ['grammar.subject-verb'] }] }],
    reviewSchedule: [],
    taxonomy: { skills: { 'grammar.subject-verb': { label: 'Subject-verb agreement' } } },
    now: '2030-04-29T12:00:00.000Z'
  });

  assert.deepEqual(result.recommendations, []);
});

test('weak skill recommendation output is safe mission-composition evidence', () => {
  const result = recommendations.generateWeakSkillRecommendations({
    recentSessions: [{
      attempts: [
        { questionId: 'grammar-q0001', correct: false, skillIds: ['grammar.sentence-analysis'], difficulty: 'medium', question: 'raw prompt' },
        { questionId: 'grammar-q0002', correct: false, skillIds: ['grammar.sentence-analysis'], difficulty: 'medium', answer: 'raw answer' },
        { questionId: 'grammar-q0003', correct: true, skillIds: ['grammar.sentence-analysis'], difficulty: 'medium' }
      ]
    }],
    taxonomy: {
      skills: {
        'grammar.sentence-analysis': { label: 'Sentence analysis', standards: ['L.3-6.1'] }
      }
    },
    manifest: {
      sets: [{
        id: 'grammar-sentence-types',
        domain: 'grammar',
        skillCoverage: [{ skillId: 'grammar.sentence-analysis' }]
      }]
    },
    now: '2030-04-29T12:00:00.000Z'
  });

  assert.equal(result.recommendations[0].skillId, 'grammar.sentence-analysis');
  assert.equal(result.recommendations[0].target.type, 'subtopic');
  assert.deepEqual(result.recommendations[0].target.setIds, ['grammar-sentence-types']);
  assert.equal(JSON.stringify(result).includes('raw prompt'), false);
  assert.equal(JSON.stringify(result).includes('raw answer'), false);
});
