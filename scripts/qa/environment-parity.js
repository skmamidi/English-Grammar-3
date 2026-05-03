#!/usr/bin/env node

const {
  DEFAULT_ENVIRONMENT_PARITY_POLICY,
  buildEnvironmentParityReport,
  validateEnvironmentParityPolicy
} = require('../../assets/environment-parity-policy');

function parseArgs(argv) {
  const options = { json: false };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function runEnvironmentParityCheck(options = {}) {
  const policy = options.policy || DEFAULT_ENVIRONMENT_PARITY_POLICY;
  const validation = validateEnvironmentParityPolicy(policy);
  const report = buildEnvironmentParityReport(policy);

  return {
    ok: validation.valid && report.drift.length === 0,
    valid: validation.valid,
    errors: validation.errors,
    environments: report.environments,
    dimensions: report.dimensions,
    checkedLiveEnvironments: false,
    drift: report.drift,
    nextStep: report.nextStep
  };
}

function runCli() {
  const options = parseArgs(process.argv);
  const result = runEnvironmentParityCheck(options);
  printResult(result, options.json);
  process.exitCode = result.ok ? 0 : 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Environment parity policy ${result.ok ? 'passed' : 'failed'} (${result.environments.length} environments, ${result.dimensions.length} dimensions).`);
  result.drift.forEach(item => {
    console.log(`- ${item.environment} ${item.dimension}: expected ${item.expected}, got ${item.actual}`);
  });
  (result.errors || []).forEach(error => console.log(`- ${error}`));
}

if (require.main === module) {
  runCli();
}

module.exports = {
  parseArgs,
  runEnvironmentParityCheck
};
