#!/usr/bin/env node

const fs = require('node:fs');
const {
  DEFAULT_OPERATIONAL_COST_BUDGET_POLICY,
  evaluateOperationalCostBudget,
  validateOperationalCostBudgetPolicy
} = require('../../assets/operational-cost-budget');

function parseArgs(argv) {
  const options = {
    metricsFile: '',
    json: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--metrics') {
      index += 1;
      options.metricsFile = argv[index];
    } else if (arg.startsWith('--metrics=')) {
      options.metricsFile = arg.slice('--metrics='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function buildOperationalCostMetrics(input = {}) {
  const requestMetrics = input.requestMetrics || {};
  const telemetry = input.telemetry || {};
  const selectionApi = input.selectionApi || {};
  const sync = input.sync || {};
  const requestCount = Number(input.requestCount) || (Array.isArray(input.requests) ? input.requests.length : 0);
  const chunkBytes = Number(input.chunkBytes) || Number(requestMetrics.requiredChunkBytes) || Number(requestMetrics.questionChunkBytes) || 0;
  const cacheStorageBytes = Number(input.cacheStorageBytes) || (
    (Number(requestMetrics.requiredCachedBytes) || 0) +
    (Number(requestMetrics.preloadCachedBytes) || 0) +
    (Number(requestMetrics.appShellBytes) || 0)
  );
  const telemetryVolumeBytes = Number(input.telemetryVolumeBytes) || Number(telemetry.bytes) || (
    (Number(telemetry.eventCount) || 0) * (Number(telemetry.averageBytes) || 0)
  );
  const selectionApiWork = Number(input.selectionApiWork) || (
    (Number(selectionApi.sourceSetsScanned) || 0) +
    (Number(selectionApi.candidateQuestionCount) || 0)
  );
  const syncPayloadBytes = Number(input.syncPayloadBytes) || Number(sync.payloadBytes) || 0;

  return {
    route: input.route || '',
    requestCount,
    chunkBytes,
    cacheStorageBytes,
    telemetryVolumeBytes,
    selectionApiWork,
    syncPayloadBytes
  };
}

function runOperationalCostBudgetCheck(options = {}) {
  const policy = options.policy || DEFAULT_OPERATIONAL_COST_BUDGET_POLICY;
  const validation = validateOperationalCostBudgetPolicy(policy);
  if (!options.metrics) {
    return {
      ok: validation.valid,
      valid: validation.valid,
      policyErrors: validation.errors,
      checkedMetrics: false,
      budgets: validation.policy.budgets.map(item => ({
        id: item.id,
        metric: item.metric,
        warn: item.warn,
        fail: item.fail,
        unit: item.unit,
        owner: item.owner,
        runbook: item.runbook
      }))
    };
  }

  return evaluateOperationalCostBudget(policy, buildOperationalCostMetrics(options.metrics));
}

function runCli() {
  const options = parseArgs(process.argv);
  const metrics = options.metricsFile ? JSON.parse(fs.readFileSync(options.metricsFile, 'utf8')) : null;
  const result = runOperationalCostBudgetCheck({ metrics });
  printResult(result, options.json);
  process.exitCode = result.ok ? 0 : 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.checkedMetrics === false) {
    console.log(`Operational cost budget policy ${result.ok ? 'passed' : 'failed'} (${result.budgets.length} budgets).`);
    return;
  }
  console.log(result.ok ? 'Operational cost budgets passed.' : 'Operational cost budgets failed.');
  (result.errors || []).forEach(error => {
    console.log(`- ${error.id}: ${error.message}. ${error.mitigation}`);
  });
}

if (require.main === module) {
  runCli();
}

module.exports = {
  buildOperationalCostMetrics,
  parseArgs,
  runOperationalCostBudgetCheck
};
