const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_RUNTIME_PERFORMANCE_BUDGETS = Object.freeze({
  hydrationMs: Object.freeze({ warn: 2500, fail: 6000 }),
  longTaskCount: Object.freeze({ warn: 8, fail: 30 }),
  longestTaskMs: Object.freeze({ warn: 250, fail: 1200 }),
  totalLongTaskMs: Object.freeze({ warn: 1200, fail: 5000 }),
  domNodeCount: Object.freeze({ warn: 2200, fail: 5000 }),
  requiredChunkBytes: Object.freeze({ warn: 512 * 1024, fail: 1024 * 1024 })
});

const STRICT_RUNTIME_PERFORMANCE_BUDGETS = Object.freeze({
  hydrationMs: Object.freeze({ warn: 1500, fail: 3000 }),
  longTaskCount: Object.freeze({ warn: 4, fail: 12 }),
  longestTaskMs: Object.freeze({ warn: 150, fail: 600 }),
  totalLongTaskMs: Object.freeze({ warn: 800, fail: 2500 }),
  domNodeCount: Object.freeze({ warn: 1800, fail: 3500 }),
  requiredChunkBytes: Object.freeze({ warn: 384 * 1024, fail: 768 * 1024 })
});

function getRuntimePerformanceBudgets(options = {}) {
  return options.strict ? STRICT_RUNTIME_PERFORMANCE_BUDGETS : DEFAULT_RUNTIME_PERFORMANCE_BUDGETS;
}

function evaluateRuntimePerformanceBudget(metrics, budgets = DEFAULT_RUNTIME_PERFORMANCE_BUDGETS) {
  const input = normalizeMetrics(metrics);
  const warnings = [];
  const errors = [];
  checkMetric('hydrationMs', input.hydrationMs, budgets.hydrationMs, warnings, errors);
  checkMetric('longTaskCount', input.longTaskCount, budgets.longTaskCount, warnings, errors);
  checkMetric('longestTaskMs', input.longestTaskMs, budgets.longestTaskMs, warnings, errors);
  checkMetric('totalLongTaskMs', input.totalLongTaskMs, budgets.totalLongTaskMs, warnings, errors);
  checkMetric('domNodeCount', input.domNodeCount, budgets.domNodeCount, warnings, errors);
  checkMetric('requiredChunkBytes', input.requiredChunkBytes, budgets.requiredChunkBytes, warnings, errors);
  if (Number.isFinite(input.heapUsedBytes) && input.heapUsedBytes > 0) {
    warnings.push({
      metric: 'heapUsedBytes',
      actual: input.heapUsedBytes,
      limit: 0,
      delta: 0,
      message: `heapUsedBytes=${input.heapUsedBytes} is diagnostic only`
    });
  }
  return {
    ok: errors.length === 0,
    warnings,
    errors,
    metrics: input
  };
}

function writeRuntimePerformanceArtifact(result, options = {}) {
  if (result.ok && !options.alwaysWrite) return '';
  const dir = options.dir || path.join(process.cwd(), 'test-results', 'performance');
  fs.mkdirSync(dir, { recursive: true });
  const flow = safeSlug(result.metrics && result.metrics.flow || 'runtime-performance');
  const file = path.join(dir, `${flow}.json`);
  fs.writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
  return file;
}

function checkMetric(metric, actual, budget, warnings, errors) {
  if (!budget) return;
  if (actual > budget.fail) {
    errors.push(makeFinding(metric, actual, budget.fail));
  }
  if (actual > budget.warn) {
    warnings.push(makeFinding(metric, actual, budget.warn));
  }
}

function makeFinding(metric, actual, limit) {
  return {
    metric,
    actual,
    limit,
    delta: Math.max(0, actual - limit),
    message: `${metric}=${actual} exceeds ${limit}`
  };
}

function normalizeMetrics(metrics = {}) {
  return {
    route: safeString(metrics.route),
    flow: safeString(metrics.flow || 'unknown-flow'),
    hydrationMs: nonNegative(metrics.hydrationMs),
    longTaskCount: nonNegative(metrics.longTaskCount),
    longestTaskMs: nonNegative(metrics.longestTaskMs),
    totalLongTaskMs: nonNegative(metrics.totalLongTaskMs),
    domNodeCount: nonNegative(metrics.domNodeCount),
    requiredChunkBytes: nonNegative(metrics.requiredChunkBytes),
    loadedChunkCount: nonNegative(metrics.loadedChunkCount),
    heapUsedBytes: Number.isFinite(Number(metrics.heapUsedBytes)) ? Math.max(0, Math.round(Number(metrics.heapUsedBytes))) : 0,
    longTaskSupported: metrics.longTaskSupported !== false
  };
}

function nonNegative(value) {
  const number = Math.round(Number(value));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function safeString(value) {
  return String(value || '').trim().slice(0, 120);
}

function safeSlug(value) {
  return safeString(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'runtime-performance';
}

module.exports = {
  DEFAULT_RUNTIME_PERFORMANCE_BUDGETS,
  STRICT_RUNTIME_PERFORMANCE_BUDGETS,
  evaluateRuntimePerformanceBudget,
  getRuntimePerformanceBudgets,
  writeRuntimePerformanceArtifact
};
