const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  normalizeRuntimePerformanceMetrics
} = require('./helpers/runtime-performance-probe');
const {
  evaluateRuntimePerformanceBudget,
  getRuntimePerformanceBudgets,
  writeRuntimePerformanceArtifact
} = require('./helpers/runtime-performance-budgets');

test('runtime performance probe normalizes long tasks and safe coarse metrics', () => {
  const metrics = normalizeRuntimePerformanceMetrics({
    route: '/topics/grammar/index.html?student=hidden',
    flow: 'large grammar mixed quiz',
    hydrationMs: 1234.4,
    domNodeCount: 450,
    heapUsedBytes: 1234567,
    requiredChunkBytes: 64000,
    loadedChunkCount: 1,
    longTaskSupported: true,
    longTasks: [
      { duration: 51.2, startTime: 10 },
      { duration: 80.8, startTime: 120 }
    ],
    learnerId: 'do-not-keep'
  });

  assert.deepEqual(metrics, {
    route: '/topics/grammar/index.html?student=hidden',
    flow: 'large grammar mixed quiz',
    hydrationMs: 1234,
    longTaskCount: 2,
    longestTaskMs: 81,
    totalLongTaskMs: 132,
    domNodeCount: 450,
    heapUsedBytes: 1234567,
    requiredChunkBytes: 64000,
    loadedChunkCount: 1,
    longTaskSupported: true
  });
  assert.equal(JSON.stringify(metrics).includes('do-not-keep'), false);
});

test('runtime performance budgets warn by default and fail only explicit hard limits', () => {
  const result = evaluateRuntimePerformanceBudget({
    flow: 'dashboard projection',
    hydrationMs: 5000,
    longTaskCount: 2,
    longestTaskMs: 50,
    totalLongTaskMs: 100,
    domNodeCount: 300,
    requiredChunkBytes: 2048,
    heapUsedBytes: 999999
  }, getRuntimePerformanceBudgets());

  assert.equal(result.ok, true);
  assert.ok(result.warnings.some(warning => warning.metric === 'hydrationMs'));
  assert.ok(result.warnings.some(warning => warning.metric === 'heapUsedBytes'));
  assert.deepEqual(result.errors, []);
});

test('runtime performance budget writes failure artifacts without learner data', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-performance-'));
  const result = evaluateRuntimePerformanceBudget({
    flow: 'assignment launch',
    route: '/assignments.html',
    hydrationMs: 10000,
    domNodeCount: 100,
    requiredChunkBytes: 0,
    learnerName: 'Hidden Name'
  }, getRuntimePerformanceBudgets({ strict: true }));

  const artifact = writeRuntimePerformanceArtifact(result, { dir });
  const content = fs.readFileSync(artifact, 'utf8');

  assert.equal(result.ok, false);
  assert.match(artifact, /assignment-launch\.json$/);
  assert.equal(content.includes('Hidden Name'), false);
  assert.match(content, /hydrationMs/);
});
