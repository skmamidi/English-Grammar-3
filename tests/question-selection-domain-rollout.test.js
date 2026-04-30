const assert = require('node:assert/strict');
const test = require('node:test');

const { loadManifest } = require('../scripts/generate-question-manifest');
const { loadChunkBank } = require('../scripts/qa/chunk-qa');
const {
  MIXED_QUIZ_SERVER_SELECTION_DOMAINS,
  isServerSelectionDomainEnabled
} = require('../assets/question-selection-rollout');
const {
  buildSelectionResponse,
  selectQuestionRefs,
  validateSelectionRequest
} = require('../server/question-selection-service');
const {
  buildRuntimeConfig,
  createSelectionRuntime
} = require('../server/question-selection-runtime');

const manifest = loadManifest();

test('server selection rollout matrix covers every mixed quiz question domain', () => {
  assert.deepEqual(MIXED_QUIZ_SERVER_SELECTION_DOMAINS, [
    'grammar',
    'capitalization',
    'punctuation',
    'reading-comprehension',
    'reference-skills',
    'vocabulary'
  ]);
  assert.equal(MIXED_QUIZ_SERVER_SELECTION_DOMAINS.includes('sound-symbols'), false);
});

test('server selection domain feature flags are explicit and deny by default', () => {
  assert.equal(isServerSelectionDomainEnabled('punctuation', {}), false);
  assert.equal(isServerSelectionDomainEnabled('punctuation', {
    enableServerQuestionSelection: true,
    serverQuestionSelectionPilotDomains: ['punctuation']
  }), true);
  assert.equal(isServerSelectionDomainEnabled('sound-symbols', {
    enableServerQuestionSelection: true,
    serverQuestionSelectionPilotDomains: ['sound-symbols']
  }), false);
  assert.equal(isServerSelectionDomainEnabled('grammar', {
    GrammarQuestFeatureFlags: {
      serverSelectionEnabled: true,
      serverSelectionPilotDomains: ['grammar']
    }
  }), true);
});

test('all rollout domains are chunk-backed and produce ref-only mixed responses', async () => {
  for (const domain of MIXED_QUIZ_SERVER_SELECTION_DOMAINS) {
    const setIds = domainSetIds(domain);
    assert.ok(setIds.length > 0, `${domain} should have manifest sets`);
    assert.ok(setIds.every(setId => manifest.sets.find(set => set.id === setId).chunkFile), `${domain} sets should be chunk-backed`);

    const request = validateSelectionRequest(mixedRequest(domain, setIds, Math.min(12, setIds.length * 4)), manifest);
    const response = await buildSelectionResponse(await selectQuestionRefs(request, serviceContext()), request, serviceContext());

    assert.ok(response.questionRefs.length <= request.count, `${domain} should respect request count`);
    assert.ok(response.questionRefs.every(ref => request.setIds.includes(ref.sourceSet)), `${domain} refs should belong to requested sets`);
    assert.deepEqual(response.questionSnapshots, [], `${domain} response should stay ref-only`);
    const text = JSON.stringify(response);
    assert.equal(text.includes('"question"'), false, `${domain} response should not include question text`);
    assert.equal(text.includes('"choices"'), false, `${domain} response should not include choices`);
    assert.equal(text.includes('"explanation"'), false, `${domain} response should not include explanations`);
  }
});

test('runtime accepts enabled rollout domains and rejects disabled domains', async () => {
  const runtime = createSelectionRuntime({
    config: buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'local',
      SELECTION_ALLOWED_DOMAINS: MIXED_QUIZ_SERVER_SELECTION_DOMAINS.join(','),
      SELECTION_MAX_QUESTIONS: '12'
    }),
    manifestProvider: () => manifest,
    chunkSetProvider: loadSet,
    clock: () => new Date('2030-04-29T12:00:00.000Z'),
    logger: null
  });

  const vocabularyResponse = await runtime.handleSelectionRequest(mixedRequest('vocabulary', domainSetIds('vocabulary'), 12));
  assert.ok(vocabularyResponse.questionRefs.length > 0);

  const disabledRuntime = createSelectionRuntime({
    config: buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'local',
      SELECTION_ALLOWED_DOMAINS: 'grammar,capitalization',
      SELECTION_MAX_QUESTIONS: '12'
    }),
    manifestProvider: () => manifest,
    chunkSetProvider: loadSet,
    logger: null
  });
  await assert.rejects(
    () => disabledRuntime.handleSelectionRequest(mixedRequest('vocabulary', domainSetIds('vocabulary'), 12)),
    /not enabled/
  );
});

function serviceContext() {
  return {
    manifest,
    selectionPolicyVersion: 1,
    now: () => new Date('2030-04-29T12:00:00.000Z'),
    loadSetById: loadSet
  };
}

function domainSetIds(domain) {
  return manifest.sets.filter(set => set.domain === domain).map(set => set.id);
}

function mixedRequest(domain, setIds, count) {
  return {
    mode: 'mixed',
    domain,
    setIds,
    grade: '4',
    difficulty: 'medium',
    count,
    countMode: 'per-subtopic',
    questionsPerSubtopic: 4,
    selectionPolicyVersion: 1
  };
}

function loadSet(setId) {
  const entry = manifest.sets.find(set => set.id === setId);
  if (!entry) throw new Error(`missing set ${setId}`);
  const bank = loadChunkBank(entry.chunkFile);
  return Object.assign({}, bank[setId], { id: entry.id });
}
