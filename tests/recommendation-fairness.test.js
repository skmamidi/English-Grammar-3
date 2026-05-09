const assert = require('node:assert/strict');
const test = require('node:test');

const recommendations = require('../assets/weak-skill-recommendation-domain');
const { assembleDynamicQuizPlan, buildCandidatePool } = require('../server/dynamic-quiz-assembly-policy');
const { evaluatePersonalizationRun } = require('../assets/personalization-evaluation-policy');

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

test('dynamic assembly fairness does not trap learners in only weak skills', () => {
  const plan = assembleDynamicQuizPlan({
    request: {
      domain: 'grammar',
      setIds: ['fairness-fragments', 'fairness-usage'],
      grade: 4,
      difficulty: 'medium',
      count: 6,
      seed: 'fairness-cap',
      policy: { maxWeakSkillShare: 0.5, maxPerSourceSet: 4 }
    },
    featureSnapshot: {
      schemaVersion: 1,
      featureVersion: 'personalization-feature-store/v1',
      snapshotRef: 'feature-snapshot:fairness',
      learnerScopeRef: 'scope:fairness',
      generatedAt: now,
      freshness: { fresh: true, fallbackReasons: [] },
      learnerSkillSignals: [{
        skillId: 'grammar.fragments',
        masteryBand: 'needs_practice',
        accuracy: 0.2,
        evidenceWeight: 20,
        dueReviewCount: 6,
        reasonCodes: ['needs_practice', 'overdue_review']
      }],
      contentCandidateSignals: [],
      evidenceRefs: ['verified-attempt-projection:fairness']
    },
    candidatePool: buildCandidatePool(Array.from({ length: 8 }, (_, index) => ({
      questionId: `fairness-fragments-q${index + 1}`,
      sourceSet: 'fairness-fragments',
      domain: 'grammar',
      version: 1,
      contentHash: `sha256:${String(index).padStart(64, '0')}`,
      sequence: index + 1,
      skillIds: ['grammar.fragments'],
      standardIds: ['L.4.1'],
      gradeLevels: [4],
      difficulty: 'medium',
      difficultyByGrade: { 4: 'medium' },
      content: { question: 'hidden', choices: ['A'], correct: 0 }
    })).concat(Array.from({ length: 4 }, (_, index) => ({
      questionId: `fairness-usage-q${index + 1}`,
      sourceSet: 'fairness-usage',
      domain: 'grammar',
      version: 1,
      contentHash: `sha256:${String(index + 20).padStart(64, '0')}`,
      sequence: index + 1,
      skillIds: ['grammar.usage'],
      standardIds: ['L.4.1'],
      gradeLevels: [4],
      difficulty: 'medium',
      difficultyByGrade: { 4: 'medium' },
      content: { question: 'hidden', choices: ['A'], correct: 0 }
    }))))
  });

  const weakSelections = plan.questionRefs.filter(ref => ref.skillIds.includes('grammar.fragments'));
  assert.ok(weakSelections.length <= 3);
  assert.ok(plan.questionRefs.some(ref => ref.skillIds.includes('grammar.usage')));
  assert.ok(plan.diagnostics.capsApplied.includes('weak_skill_concentration_capped'));
});

test('personalization evaluation blocks launch when assembled plans starve lower-volume skills', () => {
  const report = evaluatePersonalizationRun({
    runId: 'personalization-eval:starvation',
    owner: 'learning-platform',
    reviewedAt: now,
    rollbackCriteria: ['disable dynamicQuizAssemblyPilot'],
    expected: {
      grades: ['4'],
      domains: ['grammar'],
      skills: ['grammar.fragments', 'grammar.usage'],
      standards: ['L.4.1']
    },
    outcomes: [{
      planRef: 'assembly:starved',
      grade: '4',
      domain: 'grammar',
      selectedRefs: Array.from({ length: 6 }, (_, index) => ({
        id: `fragments-${index}`,
        sourceSet: 'grammar-fragments',
        gradeLevel: 4,
        difficultyBand: 'medium',
        skillIds: ['grammar.fragments'],
        standardIds: ['L.4.1'],
        reasonCodes: ['weak_skill_review_due']
      }))
    }]
  });

  assert.equal(report.gate.status, 'blocked');
  assert.ok(report.gate.blockers.includes('skill_starvation'));
  assert.ok(report.gate.blockers.includes('over_remediation'));
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
