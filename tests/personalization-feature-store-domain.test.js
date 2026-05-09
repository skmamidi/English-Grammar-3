const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildPersonalizationFeatureSnapshot,
  createFakePersonalizationFeatureStoreAdapter,
  evaluateFeatureFreshnessPolicy,
  normalizeContentCandidateSignal,
  normalizeLearnerSkillSignal,
  validatePersonalizationFeatureSnapshot
} = require('../assets/personalization-feature-store-domain');

const repoRoot = path.resolve(__dirname, '..');

test('personalization feature snapshots are versioned explainable and ref-only', () => {
  const snapshot = buildPersonalizationFeatureSnapshot({
    learnerScopeRef: 'learner:learner-unsafe',
    generatedAt: '2030-05-04T12:00:00.000Z',
    verifiedAttemptProjection: {
      projectionRef: 'verified-attempt-projection:learner-1:v3',
      updatedAt: '2030-05-04T11:50:00.000Z',
      mastery: [
        { skillId: 'grammar.fragments', masteryBand: 'needs_practice', accuracy: 0.52, attempts: 8 },
        { skillId: 'grammar.capitalization', masteryBand: 'secure', accuracy: 0.91, attempts: 12 }
      ],
      learnerId: 'learner-unsafe'
    },
    lessonProgress: [{ lessonRef: 'lesson:grammar-sentence-types', status: 'completed', completedAt: '2030-05-01T00:00:00.000Z' }],
    reviewSchedule: [{ skillId: 'grammar.fragments', dueCount: 3, overdueCount: 1, nextDueAt: '2030-05-05T00:00:00.000Z' }],
    goals: [{ goalRef: 'goal:weekly-fragments', skillIds: ['grammar.fragments'], targetCount: 5 }],
    assignments: [{ assignmentRef: 'assignment:fragments-1', skillIds: ['grammar.fragments'], dueAt: '2030-05-06T00:00:00.000Z' }],
    entitlementProjection: { accessState: 'premium', featureEntitlements: ['core_practice', 'premium_practice'] },
    contentCandidates: [
      { contentRef: 'question-set:grammar-fragments', skillIds: ['grammar.fragments'], difficultyBand: 'developing', estimatedMinutes: 8 }
    ]
  });

  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.featureVersion, 'personalization-feature-store/v1');
  assert.match(snapshot.snapshotRef, /^feature-snapshot:/);
  assert.equal(snapshot.learnerScopeRef.includes('learner-unsafe'), false);
  assert.deepEqual(snapshot.learnerSkillSignals.map(signal => signal.skillId), ['grammar.fragments', 'grammar.capitalization']);
  assert.equal(snapshot.learnerSkillSignals[0].reasonCodes.includes('needs_practice'), true);
  assert.deepEqual(snapshot.contentCandidateSignals[0].contentRef, 'question-set:grammar-fragments');
  assert.equal(snapshot.evidenceRefs.includes('verified-attempt-projection:learner-1:v3'), true);
  assert.deepEqual(validatePersonalizationFeatureSnapshot(snapshot).errors, []);
  assert.equal(JSON.stringify(snapshot).includes('raw prompt'), false);
  assert.equal(JSON.stringify(snapshot).includes('learner-unsafe'), false);
});

test('freshness policy reports missing and stale verified evidence explicitly', () => {
  const missing = evaluateFeatureFreshnessPolicy({
    generatedAt: '2030-05-04T12:00:00.000Z',
    evidence: []
  });
  const stale = evaluateFeatureFreshnessPolicy({
    generatedAt: '2030-05-04T12:00:00.000Z',
    evidence: [{ ref: 'verified-attempt-projection:old', updatedAt: '2030-04-01T00:00:00.000Z', required: true }]
  });

  assert.equal(missing.fresh, false);
  assert.ok(missing.fallbackReasons.includes('missing_verified_evidence'));
  assert.equal(stale.fresh, false);
  assert.ok(stale.fallbackReasons.includes('stale_verified_evidence'));
});

test('feature signal normalization rejects copied content learner ids and provider payloads', () => {
  const skillSignal = normalizeLearnerSkillSignal({
    skillId: 'grammar.fragments',
    masteryBand: 'needs_practice',
    learnerId: 'learner-unsafe',
    questionText: 'raw prompt',
    answerKey: 'choice-a',
    providerPayload: { unsafe: true }
  });
  const candidateSignal = normalizeContentCandidateSignal({
    contentRef: 'question-set:grammar-fragments',
    skillIds: ['grammar.fragments'],
    prompt: 'raw prompt',
    providerVectorId: 'vector-unsafe',
    paymentCredential: 'unsafe'
  });

  assert.equal(JSON.stringify(skillSignal).includes('learner-unsafe'), false);
  assert.equal(JSON.stringify(skillSignal).includes('raw prompt'), false);
  assert.equal(JSON.stringify(candidateSignal).includes('vector-unsafe'), false);
  assert.deepEqual(validatePersonalizationFeatureSnapshot({
    schemaVersion: 1,
    featureVersion: 'personalization-feature-store/v1',
    snapshotRef: 'feature-snapshot:test',
    learnerScopeRef: 'learner-unsafe',
    generatedAt: '2030-05-04T12:00:00.000Z',
    freshness: { fresh: true, fallbackReasons: [] },
    learnerSkillSignals: [skillSignal],
    contentCandidateSignals: [candidateSignal],
    evidenceRefs: []
  }).errors, ['personalization snapshot must not include learner identity']);
});

test('fake personalization feature store adapter is provider-neutral and read-only', async () => {
  const adapter = createFakePersonalizationFeatureStoreAdapter();
  const snapshot = buildPersonalizationFeatureSnapshot({
    learnerScopeRef: 'learner:learner-1',
    generatedAt: '2030-05-04T12:00:00.000Z',
    verifiedAttemptProjection: {
      projectionRef: 'verified-attempt-projection:learner-1:v3',
      updatedAt: '2030-05-04T11:50:00.000Z',
      mastery: [{ skillId: 'grammar.fragments', masteryBand: 'needs_practice', accuracy: 0.52, attempts: 8 }]
    }
  });

  await adapter.writeSnapshot(snapshot);
  const found = await adapter.readSnapshot(snapshot.snapshotRef);

  assert.equal(adapter.provider, 'fake');
  assert.equal(found.snapshotRef, snapshot.snapshotRef);
  assert.equal(found.sourceOfTruth, 'verified_learning_evidence_refs');
  await assert.rejects(() => adapter.mutateLearnerState({ learnerId: 'learner-1' }), /feature_store_is_read_only/);
});

test('personalization feature-store docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'personalization-feature-store.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'LearnerSkillSignal',
    'ContentCandidateSignal',
    'PersonalizationFeatureSnapshot',
    'FeatureFreshnessPolicy',
    'verified learning evidence',
    'provider-neutral',
    'not the learner-state source of truth'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));
  assert.match(pkg.scripts['test:unit'], /tests\/personalization-feature-store-domain\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
