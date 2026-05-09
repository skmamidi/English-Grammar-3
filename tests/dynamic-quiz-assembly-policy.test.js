const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  assembleDynamicQuizPlan,
  buildCandidatePool,
  buildDeterministicFallbackPlan,
  validateAssemblyPlan
} = require('../server/dynamic-quiz-assembly-policy');

const repoRoot = path.resolve(__dirname, '..');

test('dynamic quiz assembly builds reproducible balanced ref-only plans with explanations', () => {
  const request = assemblyRequest({
    count: 6,
    seed: 'learner-scope-a:assignment-1'
  });
  const featureSnapshot = freshFeatureSnapshot();
  const candidatePool = buildCandidatePool(candidateRecords());

  const first = assembleDynamicQuizPlan({ request, candidatePool, featureSnapshot });
  const second = assembleDynamicQuizPlan({ request, candidatePool, featureSnapshot });

  assert.deepEqual(first.questionRefs, second.questionRefs);
  assert.equal(first.schemaVersion, 1);
  assert.equal(first.policyVersion, 'dynamic-quiz-assembly/v1');
  assert.equal(first.mode, 'personalized');
  assert.equal(first.questionRefs.length, 6);
  assert.deepEqual(first.questionSnapshots, []);
  assert.ok(first.diagnostics.personalizationApplied);
  assert.deepEqual(validateAssemblyPlan(first).errors, []);

  const skillCounts = countBy(first.questionRefs.flatMap(ref => ref.skillIds));
  assert.ok(skillCounts['grammar.fragments'] <= 3, 'weak skill cap should prevent repeated drilling');
  assert.ok(skillCounts['grammar.capitalization'] >= 1, 'secure/adjacent skills should remain represented');
  assert.ok(first.questionRefs.every(ref => ref.gradeLevels.includes(4)));
  assert.ok(first.questionRefs.every(ref => ref.difficultyBand !== 'hard'));
  assert.ok(first.questionRefs.every(ref => ref.sourceSet.startsWith('grammar-')));
  assert.ok(first.explanations.some(item => item.reasonCodes.includes('weak_skill_review_due')));
  assert.ok(first.explanations.some(item => item.reasonCodes.includes('standard_constraint')));
  assertNoUnsafePayload(first);
});

test('assembly respects assignment standards and prerequisite gaps before personalization score', () => {
  const plan = assembleDynamicQuizPlan({
    request: assemblyRequest({
      count: 4,
      seed: 'assignment-standard-constraint',
      assignment: {
        assignmentRef: 'assignment:fragments',
        requiredStandardIds: ['L.4.1'],
        requiredSkillIds: ['grammar.fragments']
      }
    }),
    candidatePool: buildCandidatePool(candidateRecords().concat(candidate({
      questionId: 'grammar-stretch-q0001',
      sourceSet: 'grammar-stretch',
      sequence: 1,
      difficulty: 'hard',
      skillIds: ['grammar.advanced-clauses'],
      standardIds: ['L.6.1'],
      gradeLevels: [6]
    }), candidate({
      questionId: 'grammar-fragments-q0009',
      sourceSet: 'grammar-fragments-extra',
      sequence: 9,
      difficulty: 'medium',
      skillIds: ['grammar.fragments'],
      standardIds: ['L.4.1'],
      gradeLevels: [4]
    }))),
    featureSnapshot: freshFeatureSnapshot({
      learnerSkillSignals: [
        { skillId: 'grammar.advanced-clauses', masteryBand: 'needs_practice', accuracy: 0.2, evidenceWeight: 10, reasonCodes: ['needs_practice'] },
        { skillId: 'grammar.fragments', masteryBand: 'developing', accuracy: 0.64, evidenceWeight: 7, reasonCodes: ['assignment_context'] }
      ]
    })
  });

  assert.equal(plan.questionRefs.length, 4);
  assert.ok(plan.questionRefs.every(ref => ref.standardIds.includes('L.4.1')));
  assert.equal(plan.questionRefs.some(ref => ref.skillIds.includes('grammar.advanced-clauses')), false);
  assert.ok(plan.diagnostics.capsApplied.includes('over_stretch_blocked'));
  assert.ok(plan.explanations.every(item => item.reasonCodes.includes('assignment_constraint')));
});

test('missing or stale personalization falls back to deterministic non-personalized assembly', () => {
  const candidatePool = buildCandidatePool(candidateRecords());
  const request = assemblyRequest({ count: 5, seed: 'fallback-seed' });
  const staleSnapshot = freshFeatureSnapshot({
    freshness: {
      fresh: false,
      fallbackReasons: ['stale_verified_evidence']
    }
  });

  const stalePlan = assembleDynamicQuizPlan({ request, candidatePool, featureSnapshot: staleSnapshot });
  const missingPlan = assembleDynamicQuizPlan({ request, candidatePool });
  const explicitFallback = buildDeterministicFallbackPlan({ request, candidatePool, fallbackReasons: ['test_fallback'] });

  assert.equal(stalePlan.mode, 'non_personalized_fallback');
  assert.ok(stalePlan.fallbackReasons.includes('stale_verified_evidence'));
  assert.equal(missingPlan.mode, 'non_personalized_fallback');
  assert.ok(missingPlan.fallbackReasons.includes('missing_personalization_snapshot'));
  assert.deepEqual(missingPlan.questionRefs.map(ref => ref.id), assembleDynamicQuizPlan({ request, candidatePool }).questionRefs.map(ref => ref.id));
  assert.equal(explicitFallback.fallbackReasons.includes('test_fallback'), true);
  assertNoUnsafePayload(stalePlan);
});

test('repository failure fallback uses supplied refs without payload leakage', () => {
  const plan = assembleDynamicQuizPlan({
    request: assemblyRequest({
      count: 3,
      seed: 'repository-failure',
      fallbackQuestionRefs: candidateRecords().slice(0, 4).map(refFromRecord)
    }),
    repositoryError: new Error('repository unavailable'),
    featureSnapshot: freshFeatureSnapshot()
  });

  assert.equal(plan.mode, 'non_personalized_fallback');
  assert.deepEqual(plan.questionRefs.map(ref => ref.id), [
    'grammar-fragments-q0001',
    'grammar-capitalization-q0002',
    'grammar-usage-q0003'
  ]);
  assert.ok(plan.fallbackReasons.includes('sparse_repository_unavailable'));
  assert.deepEqual(plan.questionSnapshots, []);
  assertNoUnsafePayload(plan);
});

test('assembly policy docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'dynamic-quiz-assembly-policy.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'QuizAssemblyRequest',
    'CandidatePool',
    'AssemblyPolicy',
    'AssemblyPlan',
    'AssemblyExplanation',
    'ref-only',
    'deterministic non-personalized fallback'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));
  assert.match(pkg.scripts['test:unit'], /tests\/dynamic-quiz-assembly-policy\.test\.js/);
});

function assemblyRequest(overrides = {}) {
  return Object.assign({
      domain: 'grammar',
      setIds: ['grammar-fragments', 'grammar-capitalization', 'grammar-usage', 'grammar-fragments-extra'],
    grade: 4,
    difficulty: 'medium',
    count: 6,
    seed: 'default-seed',
    assignment: {
      assignmentRef: 'assignment:mixed-grammar',
      requiredStandardIds: ['L.4.1'],
      requiredSkillIds: []
    },
    policy: {
      maxWeakSkillShare: 0.5,
      maxDifficultyStretch: 1,
      maxPerSourceSet: 3,
      payloadBudgetBytes: 8192
    }
  }, overrides);
}

function freshFeatureSnapshot(overrides = {}) {
  return Object.assign({
    schemaVersion: 1,
    featureVersion: 'personalization-feature-store/v1',
    snapshotRef: 'feature-snapshot:test',
    learnerScopeRef: 'scope:abc123',
    generatedAt: '2030-05-04T12:00:00.000Z',
    sourceOfTruth: 'verified_learning_evidence_refs',
    freshness: { fresh: true, fallbackReasons: [] },
    learnerSkillSignals: [
      {
        skillId: 'grammar.fragments',
        masteryBand: 'needs_practice',
        accuracy: 0.48,
        evidenceWeight: 9,
        dueReviewCount: 2,
        overdueReviewCount: 1,
        assignmentUrgency: 'due_soon',
        reasonCodes: ['needs_practice', 'overdue_review', 'assignment_context'],
        evidenceRefs: ['verified-attempt-projection:test']
      },
      {
        skillId: 'grammar.capitalization',
        masteryBand: 'secure',
        accuracy: 0.91,
        evidenceWeight: 8,
        reasonCodes: ['secure'],
        evidenceRefs: ['verified-attempt-projection:test']
      }
    ],
    contentCandidateSignals: [],
    evidenceRefs: ['verified-attempt-projection:test'],
    fallbackReasons: [],
    explainability: { reasonCodes: ['needs_practice'], skillCount: 2, candidateCount: 0 }
  }, overrides);
}

function candidateRecords() {
  return [
    candidate({ questionId: 'grammar-fragments-q0001', sourceSet: 'grammar-fragments', sequence: 1, skillIds: ['grammar.fragments'], standardIds: ['L.4.1'], difficulty: 'medium' }),
    candidate({ questionId: 'grammar-capitalization-q0002', sourceSet: 'grammar-capitalization', sequence: 2, skillIds: ['grammar.capitalization'], standardIds: ['L.4.1'], difficulty: 'easy' }),
    candidate({ questionId: 'grammar-usage-q0003', sourceSet: 'grammar-usage', sequence: 3, skillIds: ['grammar.usage'], standardIds: ['L.4.1'], difficulty: 'medium' }),
    candidate({ questionId: 'grammar-fragments-q0004', sourceSet: 'grammar-fragments', sequence: 4, skillIds: ['grammar.fragments'], standardIds: ['L.4.1'], difficulty: 'easy' }),
    candidate({ questionId: 'grammar-capitalization-q0005', sourceSet: 'grammar-capitalization', sequence: 5, skillIds: ['grammar.capitalization'], standardIds: ['L.4.2'], difficulty: 'medium' }),
    candidate({ questionId: 'grammar-fragments-q0006', sourceSet: 'grammar-fragments', sequence: 6, skillIds: ['grammar.fragments'], standardIds: ['L.4.1'], difficulty: 'medium' }),
    candidate({ questionId: 'grammar-usage-q0007', sourceSet: 'grammar-usage', sequence: 7, skillIds: ['grammar.usage'], standardIds: ['L.4.2'], difficulty: 'medium' }),
    candidate({ questionId: 'grammar-fragments-q0008', sourceSet: 'grammar-fragments', sequence: 8, skillIds: ['grammar.fragments'], standardIds: ['L.4.1'], difficulty: 'hard' })
  ];
}

function candidate(overrides = {}) {
  const record = Object.assign({
    schemaVersion: 1,
    questionId: 'grammar-test-q0001',
    sourceSet: 'grammar-test',
    domain: 'grammar',
    version: 1,
    contentHash: `sha256:${'a'.repeat(64)}`,
    sequence: 1,
    skillIds: ['grammar.fragments'],
    standardIds: ['L.4.1'],
    skills: ['fragments'],
    gradeLevels: [4],
    difficultyByGrade: { 4: 'medium' },
    difficulty: 'medium',
    publicationState: 'published',
    set: { id: 'grammar-test', title: 'Grammar Test', topic: 'grammar' },
    content: {
      question: 'This prompt must never leave the repository boundary.',
      choices: ['A', 'B'],
      correct: 0,
      explanation: 'Unsafe explanation'
    }
  }, overrides);
  record.difficultyByGrade = Object.assign({}, record.difficultyByGrade, { [String(record.gradeLevels[0] || 4)]: record.difficulty });
  return record;
}

function refFromRecord(record) {
  return {
    id: record.questionId,
    sourceSet: record.sourceSet,
    version: record.version,
    contentHash: record.contentHash,
    sequence: record.sequence,
    skillIds: record.skillIds,
    standardIds: record.standardIds,
    gradeLevels: record.gradeLevels,
    difficultyBand: record.difficulty
  };
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function assertNoUnsafePayload(value) {
  const text = JSON.stringify(value);
  ['prompt', 'choices', 'answerKey', 'correct', 'Unsafe explanation', 'learner-unsafe', 'provider'].forEach(token => {
    assert.equal(text.includes(token), false, `${token} should not leak from assembly plan`);
  });
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
