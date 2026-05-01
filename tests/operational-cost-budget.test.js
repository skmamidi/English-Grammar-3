const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_OPERATIONAL_COST_BUDGET_POLICY,
  evaluateOperationalCostBudget,
  sanitizeOperationalCostDiagnostics,
  validateOperationalCostBudgetPolicy
} = require('../assets/operational-cost-budget');
const {
  buildOperationalCostMetrics
} = require('../scripts/qa/operational-cost-budget');
const {
  summarizeRequestMetrics
} = require('./helpers/request-metrics');

const repoRoot = path.resolve(__dirname, '..');

test('operational cost budget policy defines required production cost dimensions', () => {
  const result = validateOperationalCostBudgetPolicy(DEFAULT_OPERATIONAL_COST_BUDGET_POLICY);
  const budgetIds = result.policy.budgets.map(budget => budget.id);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(budgetIds, [
    'request_count',
    'chunk_bytes',
    'cache_storage_bytes',
    'telemetry_volume_bytes',
    'selection_api_work',
    'sync_payload_bytes'
  ]);
});

test('operational cost budget policy rejects unsafe or incomplete budget definitions', () => {
  const result = validateOperationalCostBudgetPolicy({
    budgets: [{
      id: 'unsafe_cost',
      label: '',
      metric: 'learnerId',
      warn: 100,
      fail: 50,
      unit: '',
      owner: '',
      runbook: '',
      mitigation: ''
    }]
  });

  assert.deepEqual(result.errors, [
    'unsafe_cost label is required',
    'unsafe_cost metric must be one of requestCount, chunkBytes, cacheStorageBytes, telemetryVolumeBytes, selectionApiWork, syncPayloadBytes',
    'unsafe_cost fail must be greater than warn',
    'unsafe_cost unit is required',
    'unsafe_cost owner is required',
    'unsafe_cost runbook is required',
    'unsafe_cost mitigation is required'
  ]);
});

test('operational cost budget evaluation passes conservative release metrics', () => {
  const requestMetrics = summarizeRequestMetrics({
    requests: [
      'https://grammar.test/index.html',
      'https://grammar.test/assets/styles.css',
      'https://grammar.test/assets/question-manifest.js',
      'https://grammar.test/assets/question-chunks/grammar/grammar-sentence-types.js'
    ],
    responses: [
      { url: 'https://grammar.test/assets/styles.css', status: 200, bytes: 42000 },
      { url: 'https://grammar.test/assets/question-manifest.js', status: 200, bytes: 16000 },
      { url: 'https://grammar.test/assets/question-chunks/grammar/grammar-sentence-types.js', status: 200, bytes: 78000 }
    ],
    cacheEvents: [{
      detail: {
        requiredCachedBytes: 78000,
        preloadCachedBytes: 32000
      }
    }]
  });
  const metrics = buildOperationalCostMetrics({
    route: '/quiz.html?student=secret',
    requests: ['index', 'styles', 'manifest', 'chunk'],
    requestMetrics,
    telemetry: { eventCount: 8, bytes: 3200 },
    selectionApi: { sourceSetsScanned: 4, candidateQuestionCount: 240, responseBytes: 2400 },
    sync: { payloadBytes: 12000 }
  });

  const result = evaluateOperationalCostBudget(DEFAULT_OPERATIONAL_COST_BUDGET_POLICY, metrics);

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.metrics.route, '/quiz.html');
  assert.equal(result.metrics.chunkBytes, 78000);
  assert.equal(result.metrics.cacheStorageBytes, 152000);
});

test('operational cost budget evaluation reports actionable oversized synthetic fixtures', () => {
  const result = evaluateOperationalCostBudget(DEFAULT_OPERATIONAL_COST_BUDGET_POLICY, {
    route: '/quiz.html?learnerId=secret',
    requestCount: 160,
    chunkBytes: 900000,
    cacheStorageBytes: 2600000,
    telemetryVolumeBytes: 180000,
    selectionApiWork: 2600,
    syncPayloadBytes: 900000,
    question: 'raw prompt',
    choices: ['a', 'b'],
    answer: 'a',
    explanation: 'raw explanation'
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map(error => error.id), [
    'request_count',
    'chunk_bytes',
    'cache_storage_bytes',
    'telemetry_volume_bytes',
    'selection_api_work',
    'sync_payload_bytes'
  ]);
  assert.match(result.errors[0].message, /request count is 160 requests, over 120/);
  assert.match(result.errors[0].mitigation, /Review route composition/);
  assert.doesNotMatch(JSON.stringify(result), /learnerId=secret|raw prompt|choices|answer|explanation/);
});

test('operational cost diagnostics sanitizer removes learner and question payload fields', () => {
  const sanitized = sanitizeOperationalCostDiagnostics({
    route: '/reports.html?student=secret',
    learnerId: 'learner-1',
    prompt: 'Question prompt',
    stack: 'raw stack',
    requestCount: 10,
    chunkBytes: 20,
    telemetryVolumeBytes: 30,
    details: {
      token: 'secret',
      syncPayloadBytes: 40
    }
  });

  assert.deepEqual(sanitized, {
    route: '/reports.html',
    requestCount: 10,
    chunkBytes: 20,
    telemetryVolumeBytes: 30,
    details: {
      syncPayloadBytes: 40
    }
  });
});

test('operational cost budget docs explain release review and privacy limits', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'performance', 'operational-cost-budgets.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');

  [
    'Request count',
    'Chunk bytes',
    'Cache storage bytes',
    'Telemetry volume bytes',
    'Selection API work',
    'Sync payload bytes'
  ].forEach(label => assert.match(docs, new RegExp(label)));

  assert.match(docs, /npm run qa:operational-costs/);
  assert.match(docs, /must not include learner identifiers/i);
  assert.match(docs, /question text, answer choices, explanations/i);
  assert.match(checklist, /npm run qa:operational-costs/);
  assert.match(checklist, /docs\/performance\/operational-cost-budgets\.md/);
});
