const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { loadManifest } = require('../scripts/generate-question-manifest');
const { createQuestionSelectionApiHarness } = require('./helpers/question-selection-api-harness');
const { createSeededShuffle } = require('./helpers/seeded-selection');
const { MIXED_QUIZ_SERVER_SELECTION_DOMAINS } = require('../assets/question-selection-rollout');

const manifest = loadManifest();

const API_BUDGETS = {
  grammar: {
    maxRefs: 60,
    maxResponseBytes: 25 * 1024,
    maxP95LatencyMs: 100,
    maxSourceSetsScanned: 34,
    maxCandidateQuestions: 3689
  },
  capitalization: {
    maxRefs: 20,
    maxResponseBytes: 10 * 1024,
    maxP95LatencyMs: 50,
    maxSourceSetsScanned: 5,
    maxCandidateQuestions: 207
  },
  punctuation: {
    maxRefs: 52,
    maxResponseBytes: 20 * 1024,
    maxP95LatencyMs: 100,
    maxSourceSetsScanned: 13,
    maxCandidateQuestions: 915
  },
  'reading-comprehension': {
    maxRefs: 60,
    maxResponseBytes: 25 * 1024,
    maxP95LatencyMs: 120,
    maxSourceSetsScanned: 19,
    maxCandidateQuestions: 2816
  },
  'reference-skills': {
    maxRefs: 32,
    maxResponseBytes: 18 * 1024,
    maxP95LatencyMs: 100,
    maxSourceSetsScanned: 8,
    maxCandidateQuestions: 808
  },
  vocabulary: {
    maxRefs: 60,
    maxResponseBytes: 25 * 1024,
    maxP95LatencyMs: 120,
    maxSourceSetsScanned: 16,
    maxCandidateQuestions: 1805
  }
};

const API_BUDGET_RESULT_DIR = path.join(__dirname, '..', 'test-results', 'api-budget');

test('all rollout domain selection API responses stay within ref-only payload budgets', async () => {
  for (const domain of MIXED_QUIZ_SERVER_SELECTION_DOMAINS) {
    const setIds = domainSetIds(domain);
    const request = mixedRequest(domain, setIds, Math.min(API_BUDGETS[domain].maxRefs, setIds.length * 4), 4);
    const response = await apiResponse(request, `${domain}-budget`);
    const metrics = assertSelectionApiBudget(`${domain} mixed selection`, response, request, API_BUDGETS[domain]);
    assertDeterministicWorkBudget(`${domain} mixed selection`, metrics, API_BUDGETS[domain]);

    assert.equal(metrics.sourceHash, manifest.artifact.sourceHash);
    assert.equal(response.questionRefs.length, request.count);
    assert.equal(response.questionSnapshots.length, 0);
  }
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
  for (const domain of MIXED_QUIZ_SERVER_SELECTION_DOMAINS) {
    const setIds = domainSetIds(domain);
    const request = mixedRequest(domain, setIds, Math.min(API_BUDGETS[domain].maxRefs, setIds.length * 4), 4);
    const stats = await measureRepeatedCalls(request, `${domain}-load`, 12);

    evaluateLatencyBudget(domain, stats, API_BUDGETS[domain], {
      strict: process.env.STRICT_PERF_BUDGETS === '1'
    });
  }
});

test('non-strict selection API latency budget writes diagnostics instead of failing', () => {
  fs.mkdirSync(API_BUDGET_RESULT_DIR, { recursive: true });
  const artifactDir = fs.mkdtempSync(path.join(API_BUDGET_RESULT_DIR, 'non-strict-'));
  const stats = latencyStats({ p95Ms: 250, selectedCount: 12, responseBytes: 2048 });

  assert.doesNotThrow(() => evaluateLatencyBudget('grammar', stats, API_BUDGETS.grammar, {
    artifactDir,
    strict: false
  }));

  const artifact = JSON.parse(fs.readFileSync(path.join(artifactDir, 'grammar-latency-warning.json'), 'utf8'));
  assert.equal(artifact.domain, 'grammar');
  assert.equal(artifact.strict, false);
  assert.equal(artifact.stats.p95Ms, 250);
  assert.equal(artifact.selectedCount, 12);
  assert.equal(artifact.responseBytes, 2048);
  assert.equal(artifact.sourceHash, manifest.artifact.sourceHash);
});

test('strict selection API latency budget remains a hard regression gate', () => {
  assert.throws(
    () => evaluateLatencyBudget('grammar', latencyStats({ p95Ms: 250 }), API_BUDGETS.grammar, { strict: true }),
    /grammar p95 250\.00ms should stay under 100ms/
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

test('selection API deterministic work budget rejects oversized fixture scans', async () => {
  const request = mixedRequest('grammar', grammarSetIds().slice(0, 2), 3, 4);
  const response = await apiResponse(request, 'work-budget');
  const metrics = assertSelectionApiBudget('grammar work budget selection', response, request, {
    maxRefs: 3,
    maxResponseBytes: 8 * 1024
  });

  assert.throws(
    () => assertDeterministicWorkBudget('grammar work budget selection', metrics, {
      maxSourceSetsScanned: 1,
      maxCandidateQuestions: metrics.candidateQuestionCount
    }),
    /scanned 2 source sets/
  );
  assert.throws(
    () => assertDeterministicWorkBudget('grammar work budget selection', metrics, {
      maxSourceSetsScanned: 2,
      maxCandidateQuestions: metrics.candidateQuestionCount - 1
    }),
    /candidate question scan/
  );
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
    responseBytes: Math.max(...responseBytes),
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
    snapshotCount: Array.isArray(response.questionSnapshots) ? response.questionSnapshots.length : 0,
    sourceSetsScanned: request.setIds.length,
    candidateQuestionCount: candidateQuestionCount(request.setIds),
    sourceHash: manifest.artifact.sourceHash
  };
}

function evaluateLatencyBudget(domain, stats, budget, options = {}) {
  if (!Number.isFinite(budget.maxP95LatencyMs)) return;
  const message = `${domain} p95 ${stats.p95Ms.toFixed(2)}ms should stay under ${budget.maxP95LatencyMs}ms; ${JSON.stringify(stats)}`;
  if (options.strict) {
    assert.ok(stats.p95Ms < budget.maxP95LatencyMs, message);
    return;
  }
  if (stats.p95Ms >= budget.maxP95LatencyMs) {
    writeLatencyBudgetWarning(domain, stats, budget, options.artifactDir || API_BUDGET_RESULT_DIR);
  }
}

function writeLatencyBudgetWarning(domain, stats, budget, artifactDir) {
  fs.mkdirSync(artifactDir, { recursive: true });
  const artifact = {
    domain,
    budget: {
      maxP95LatencyMs: budget.maxP95LatencyMs
    },
    stats,
    selectedCount: stats.selectedCount,
    responseBytes: stats.responseBytes || stats.maxResponseBytes,
    sourceHash: stats.sourceHash,
    strict: false
  };
  fs.writeFileSync(
    path.join(artifactDir, `${domain}-latency-warning.json`),
    `${JSON.stringify(artifact, null, 2)}\n`
  );
}

function assertDeterministicWorkBudget(label, metrics, budget) {
  assert.ok(
    metrics.sourceSetsScanned <= budget.maxSourceSetsScanned,
    `${label} scanned ${metrics.sourceSetsScanned} source sets; expected at most ${budget.maxSourceSetsScanned}`
  );
  assert.ok(
    metrics.candidateQuestionCount <= budget.maxCandidateQuestions,
    `${label} candidate question scan ${metrics.candidateQuestionCount} should stay under ${budget.maxCandidateQuestions}`
  );
  assert.equal(metrics.snapshotCount, 0, `${label} should have zero snapshot work by default`);
}

function latencyStats(overrides = {}) {
  return Object.assign({
    minMs: 1,
    medianMs: 2,
    p95Ms: 3,
    maxResponseBytes: 1024,
    responseBytes: 1024,
    selectedCount: 3,
    sourceHash: manifest.artifact.sourceHash
  }, overrides);
}

function candidateQuestionCount(setIds) {
  return setIds.reduce((total, setId) => {
    const set = manifest.sets.find(item => item.id === setId);
    return total + (set && Array.isArray(set.questions) ? set.questions.length : 0);
  }, 0);
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

function domainSetIds(domain) {
  return manifest.sets.filter(set => set.domain === domain).map(set => set.id);
}
