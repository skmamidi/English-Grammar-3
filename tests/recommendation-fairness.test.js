const assert = require('node:assert/strict');
const test = require('node:test');

const recommendations = require('../assets/weak-skill-recommendation-domain');

const now = '2030-04-29T12:00:00.000Z';

test('fairness smoke keeps equal evidence ordered deterministically by skill id, not domain priority', () => {
  const result = recommendations.generateWeakSkillRecommendations({
    now,
    recentSessions: [{
      attempts: [
        attempt('vocabulary.context', false, 'medium', 4, 'v1'),
        attempt('vocabulary.context', false, 'medium', 4, 'v2'),
        attempt('vocabulary.context', true, 'medium', 4, 'v3'),
        attempt('grammar.fragments', false, 'medium', 4, 'g1'),
        attempt('grammar.fragments', false, 'medium', 4, 'g2'),
        attempt('grammar.fragments', true, 'medium', 4, 'g3')
      ]
    }]
  });

  assert.deepEqual(result.recommendations.map(item => item.skillId), ['grammar.fragments', 'vocabulary.context']);
});

test('fairness smoke does not over-label sparse histories as weak', () => {
  const result = recommendations.generateWeakSkillRecommendations({
    now,
    recentSessions: [{ attempts: [attempt('grammar.fragments', false, 'easy', 3, 'g1')] }]
  });

  assert.deepEqual(result.recommendations, []);
});

test('fairness smoke does not penalize hard misses more than easy misses', () => {
  const result = recommendations.generateWeakSkillRecommendations({
    now,
    recentSessions: [{
      attempts: [
        attempt('grammar.easy-skill', false, 'easy', 4, 'e1'),
        attempt('grammar.easy-skill', false, 'easy', 4, 'e2'),
        attempt('grammar.easy-skill', true, 'easy', 4, 'e3'),
        attempt('grammar.hard-skill', false, 'hard', 4, 'h1'),
        attempt('grammar.hard-skill', false, 'hard', 4, 'h2'),
        attempt('grammar.hard-skill', true, 'hard', 4, 'h3')
      ]
    }]
  });

  const easy = result.recommendations.find(item => item.skillId === 'grammar.easy-skill');
  const hard = result.recommendations.find(item => item.skillId === 'grammar.hard-skill');

  assert.ok(easy);
  assert.ok(hard);
  assert.ok(hard.evidence.weightedAccuracy >= easy.evidence.weightedAccuracy);
  assert.ok(hard.priority <= easy.priority);
});

test('fairness smoke uses grade level as evidence, not accidental ordering', () => {
  const grade3 = buildGradeScenario(3);
  const grade6 = buildGradeScenario(6);

  assert.deepEqual(grade3.recommendations.map(item => item.reasonCode), grade6.recommendations.map(item => item.reasonCode));
});

test('fairness smoke lets lower-volume domains appear when the cap is raised', () => {
  const result = recommendations.generateWeakSkillRecommendations({
    now,
    policy: { maxRecommendations: 4 },
    recentSessions: [{
      attempts: [
        attempt('grammar.fragments', false, 'medium', 5, 'g1'),
        attempt('grammar.fragments', false, 'medium', 5, 'g2'),
        attempt('grammar.fragments', true, 'medium', 5, 'g3'),
        attempt('punctuation.commas', false, 'medium', 5, 'p1'),
        attempt('punctuation.commas', false, 'medium', 5, 'p2'),
        attempt('punctuation.commas', true, 'medium', 5, 'p3'),
        attempt('vocabulary.context', false, 'medium', 5, 'v1'),
        attempt('vocabulary.context', false, 'medium', 5, 'v2'),
        attempt('vocabulary.context', true, 'medium', 5, 'v3'),
        attempt('reading.inference', false, 'medium', 5, 'r1'),
        attempt('reading.inference', false, 'medium', 5, 'r2'),
        attempt('reading.inference', true, 'medium', 5, 'r3')
      ]
    }]
  });

  assert.deepEqual(result.recommendations.map(item => item.skillId), [
    'grammar.fragments',
    'punctuation.commas',
    'reading.inference',
    'vocabulary.context'
  ]);
});

function buildGradeScenario(gradeLevel) {
  return recommendations.generateWeakSkillRecommendations({
    now,
    recentSessions: [{
      attempts: [
        attempt('grammar.fragments', false, 'medium', gradeLevel, `${gradeLevel}-1`),
        attempt('grammar.fragments', false, 'medium', gradeLevel, `${gradeLevel}-2`),
        attempt('grammar.fragments', true, 'medium', gradeLevel, `${gradeLevel}-3`)
      ]
    }]
  });
}

function attempt(skillId, correct, difficulty, gradeLevel, id) {
  return { questionId: `${skillId}-${id}`, correct, skillIds: [skillId], difficulty, gradeLevel };
}
