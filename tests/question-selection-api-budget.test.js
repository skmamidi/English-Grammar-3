const assert = require('node:assert/strict');
const test = require('node:test');

const { loadManifest } = require('../scripts/generate-question-manifest');
const { createQuestionSelectionApiHarness } = require('./helpers/question-selection-api-harness');
const { createSeededShuffle } = require('./helpers/seeded-selection');

const manifest = loadManifest();

const API_BUDGETS = {
  grammar: {
    maxRefs: 60,
    maxResponseBytes: 25 * 1024,
    maxP95LatencyMs: 100
  },
  capitalization: {
    maxRefs: 20,
    maxResponseBytes: 10 * 1024,
    maxP95LatencyMs: 50
  }
};

test('grammar selection API response stays within ref-only payload budget', async () => {
  const request = mixedRequest('grammar', grammarSetIds(), 60, 4);
  const response = await apiResponse(request, 'grammar-budget');
  const metrics = assertSelectionApiBudget('grammar mixed selection', response, request, API_BUDGETS.grammar);

  assert.equal(metrics.sourceHash, manifest.artifact.sourceHash);
  assert.equal(response.questionRefs.length, 60);
  assert.equal(response.questionSnapshots.length, 0);
});

test('capitalization selection API response stays within ref-only payload budget', async () => {
  const request = mixedRequest('capitalization', capitalizationSetIds(), 20, 4);
  const response = await apiResponse(request, 'capitalization-budget');
  const metrics = assertSelectionApiBudget('capitalization mixed selection', response, request, API_BUDGETS.capitalization);

  assert.equal(metrics.sourceHash, manifest.artifact.sourceHash);
  assert.equal(response.questionRefs.length, 20);
  assert.equal(response.questionSnapshots.length, 0);
});

test('selection API respects requested ref cap before payload budget', async () => {
  const request = mixedRequest('grammar', grammarSetIds().slice(0, 2), 3, 4);
  const response = await apiResponse(request, 'count-cap');

  assertSelectionApiBudget('grammar count cap selection', response, request, {
    maxRefs: 3,
    maxResponseBytes: 8 * 1024
  });
  assert.equal(response.questionRefs.length, 3);
});

test('seeded selection API calls are deterministic for tests', async () => {
  const request = mixedRequest('grammar', grammarSetIds().slice(0, 4), 12, 4);
  const first = await apiResponse(request, 'same-seed');
  const second = await apiResponse(request, 'same-seed');

  assert.deepEqual(
    first.questionRefs.map(ref => ref.id),
    second.questionRefs.map(ref => ref.id)
  );
});

test('selection API repeated-call local latency stays within budget', async () => {
  const grammarRequest = mixedRequest('grammar', grammarSetIds(), 60, 4);
  const capitalizationRequest = mixedRequest('capitalization', capitalizationSetIds(), 20, 4);

  const grammarStats = await measureRepeatedCalls(grammarRequest, 'grammar-load', 25);
  const capitalizationStats = await measureRepeatedCalls(capitalizationRequest, 'capitalization-load', 25);

  assert.ok(
    grammarStats.p95Ms < API_BUDGETS.grammar.maxP95LatencyMs,
    `grammar p95 ${grammarStats.p95Ms.toFixed(2)}ms should stay under ${API_BUDGETS.grammar.maxP95LatencyMs}ms; ${JSON.stringify(grammarStats)}`
  );
  assert.ok(
    capitalizationStats.p95Ms < API_BUDGETS.capitalization.maxP95LatencyMs,
    `capitalization p95 ${capitalizationStats.p95Ms.toFixed(2)}ms should stay under ${API_BUDGETS.capitalization.maxP95LatencyMs}ms; ${JSON.stringify(capitalizationStats)}`
  );
});

test('selection API budget guard rejects full question body leakage and over-selection', () => {
  const request = mixedRequest('grammar', grammarSetIds().slice(0, 1), 1, 4);
  const base = {
    selectionId: 'sel_bad_budget',
    selectionPolicyVersion: 1,
    requestHash: `sha256:${'0'.repeat(64)}`,
    responseDigest: `sha256:${'1'.repeat(64)}`,
    signature: null,
    signatureVersion: 'none',
    expiresAt: '2030-04-29T12:05:00.000Z',
    questionRefs: [{
      id: 'grammar-sentence-types-q0001',
      sourceSet: 'grammar-sentence-types',
      version: 1,
      contentHash: `sha256:${'2'.repeat(64)}`,
      sequence: 1
    }],
    questionSnapshots: []
  };

  assert.throws(() => assertSelectionApiBudget('prompt leak', Object.assign({}, base, { prompt: 'Question body' }), request, { maxRefs: 1, maxResponseBytes: 4096 }), /prompt/);
  assert.throws(() => assertSelectionApiBudget('choices leak', Object.assign({}, base, { choices: ['A'] }), request, { maxRefs: 1, maxResponseBytes: 4096 }), /choices/);
  assert.throws(() => assertSelectionApiBudget('explanation leak', Object.assign({}, base, { explanation: 'Because' }), request, { maxRefs: 1, maxResponseBytes: 4096 }), /explanation/);
  assert.throws(() => assertSelectionApiBudget('snapshot leak', Object.assign({}, base, { questionSnapshots: [{ question: 'Snapshot body' }] }), request, { maxRefs: 1, maxResponseBytes: 4096 }), /questionSnapshots/);
  assert.throws(() => assertSelectionApiBudget('too many refs', Object.assign({}, base, { questionRefs: [base.questionRefs[0], base.questionRefs[0]] }), request, { maxRefs: 1, maxResponseBytes: 4096 }), /2 refs/);
});

async function apiResponse(request, seed) {
  const harness = createQuestionSelectionApiHarness({
    shuffle: createSeededShuffle(seed),
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });
  return harness.buildResponse(request);
}

async function measureRepeatedCalls(request, seedPrefix, count) {
  const harness = createQuestionSelectionApiHarness({
    shuffle: createSeededShuffle(seedPrefix),
    now: () => new Date('2030-04-29T12:00:00.000Z')
  });
  const durations = [];
  const responseBytes = [];
  for (let index = 0; index < 3; index += 1) {
    await harness.buildResponse(request);
  }
  for (let index = 0; index < count; index += 1) {
    const start = process.hrtime.bigint();
    const response = await harness.buildResponse(request);
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    durations.push(durationMs);
    responseBytes.push(Buffer.byteLength(JSON.stringify(response), 'utf8'));
  }
  durations.sort((a, b) => a - b);
  return {
    minMs: durations[0],
    medianMs: durations[Math.floor(durations.length / 2)],
    p95Ms: durations[Math.ceil(durations.length * 0.95) - 1],
    maxResponseBytes: Math.max(...responseBytes),
    selectedCount: request.count,
    sourceHash: manifest.artifact.sourceHash
  };
}

function assertSelectionApiBudget(label, response, request, budget) {
  const text = JSON.stringify(response);
  assert.deepEqual(response.questionSnapshots, [], `${label} should not include questionSnapshots by default`);
  ['prompt', 'question', 'choices', 'explanation', 'explanations'].forEach(field => {
    assert.equal(Object.prototype.hasOwnProperty.call(response, field), false, `${label} should not include ${field}`);
  });
  assert.equal(text.includes('"question"'), false, `${label} should not include question body text`);
  assert.equal(text.includes('"choices"'), false, `${label} should not include choices`);
  assert.equal(text.includes('"explanation"'), false, `${label} should not include explanations`);

  const refs = Array.isArray(response.questionRefs) ? response.questionRefs : [];
  assert.ok(refs.length <= budget.maxRefs, `${label} returned ${refs.length} refs; expected at most ${budget.maxRefs}`);
  assert.ok(refs.length <= request.count, `${label} returned ${refs.length} refs; requested at most ${request.count}`);

  const responseBytes = Buffer.byteLength(text, 'utf8');
  assert.ok(
    responseBytes < budget.maxResponseBytes,
    `${label} response ${responseBytes} bytes should stay under ${budget.maxResponseBytes}`
  );
  return {
    responseBytes,
    selectedCount: refs.length,
    sourceHash: manifest.artifact.sourceHash
  };
}

function mixedRequest(domain, setIds, count, questionsPerSubtopic) {
  return {
    mode: 'mixed',
    domain,
    setIds,
    grade: '4',
    difficulty: 'medium',
    count,
    countMode: 'per-subtopic',
    questionsPerSubtopic,
    selectionPolicyVersion: 1
  };
}

function grammarSetIds() {
  return manifest.sets.filter(set => set.domain === 'grammar').map(set => set.id);
}

function capitalizationSetIds() {
  return manifest.sets.filter(set => set.domain === 'capitalization').map(set => set.id);
}
