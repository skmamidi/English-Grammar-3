#!/usr/bin/env node

const {
  DEFAULT_FAILURE_INJECTION_DRILL_POLICY,
  buildFailureInjectionDrillPlan,
  validateFailureInjectionDrillPolicy
} = require('../../assets/failure-injection-drill-policy');

function parseArgs(argv) {
  const options = {
    mode: 'local',
    drillIds: [],
    json: false
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--mode') {
      index += 1;
      options.mode = argv[index];
    } else if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length);
    } else if (arg === '--drill') {
      index += 1;
      options.drillIds.push(argv[index]);
    } else if (arg.startsWith('--drill=')) {
      options.drillIds.push(arg.slice('--drill='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function runFailureInjectionDrillCheck(options = {}) {
  const policy = options.policy || DEFAULT_FAILURE_INJECTION_DRILL_POLICY;
  const validation = validateFailureInjectionDrillPolicy(policy);
  const plan = buildFailureInjectionDrillPlan(policy, {
    mode: options.mode || 'local',
    drillIds: options.drillIds || []
  });

  return {
    ok: validation.valid,
    valid: validation.valid,
    errors: validation.errors,
    mode: plan.mode,
    checkedLiveDependencies: false,
    drills: plan.drills.map(drill => ({
      id: drill.id,
      label: drill.label,
      failureMode: drill.failureMode,
      owner: drill.owner,
      sloObjectiveId: drill.sloObjectiveId,
      runbook: drill.runbook,
      rollbackLever: drill.rollbackLever,
      verificationCommand: drill.verificationCommand,
      expectedSignals: drill.expectedSignals,
      nextStep: drill.nextStep
    }))
  };
}

function runCli() {
  const options = parseArgs(process.argv);
  const result = runFailureInjectionDrillCheck(options);
  printResult(result, options.json);
  process.exitCode = result.ok ? 0 : 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Failure-injection drill policy ${result.ok ? 'passed' : 'failed'} (${result.drills.length} drills, ${result.mode} mode).`);
  result.drills.forEach(drill => {
    console.log(`- ${drill.label}: ${drill.verificationCommand}`);
  });
  (result.errors || []).forEach(error => console.log(`- ${error}`));
}

if (require.main === module) {
  runCli();
}

module.exports = {
  parseArgs,
  runFailureInjectionDrillCheck
};
