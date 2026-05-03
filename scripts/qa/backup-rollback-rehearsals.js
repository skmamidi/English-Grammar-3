#!/usr/bin/env node

const {
  DEFAULT_BACKUP_ROLLBACK_REHEARSAL_POLICY,
  buildBackupRollbackRehearsalPlan,
  validateBackupRollbackRehearsalPolicy
} = require('../../assets/backup-rollback-rehearsal-policy');

function parseArgs(argv) {
  const options = {
    mode: 'local',
    rehearsalIds: [],
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
    } else if (arg === '--rehearsal') {
      index += 1;
      options.rehearsalIds.push(argv[index]);
    } else if (arg.startsWith('--rehearsal=')) {
      options.rehearsalIds.push(arg.slice('--rehearsal='.length));
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function runBackupRollbackRehearsalCheck(options = {}) {
  const policy = options.policy || DEFAULT_BACKUP_ROLLBACK_REHEARSAL_POLICY;
  const validation = validateBackupRollbackRehearsalPolicy(policy);
  const plan = buildBackupRollbackRehearsalPlan(policy, {
    mode: options.mode || 'local',
    rehearsalIds: options.rehearsalIds || []
  });

  return {
    ok: validation.valid,
    valid: validation.valid,
    errors: validation.errors,
    mode: plan.mode,
    checkedLiveDependencies: false,
    rehearsals: plan.rehearsals.map(rehearsal => ({
      id: rehearsal.id,
      label: rehearsal.label,
      type: rehearsal.type,
      owner: rehearsal.owner,
      runbook: rehearsal.runbook,
      verificationCommand: rehearsal.verificationCommand,
      nonDestructiveEvidence: rehearsal.nonDestructiveEvidence,
      nextStep: rehearsal.nextStep
    }))
  };
}

function runCli() {
  const options = parseArgs(process.argv);
  const result = runBackupRollbackRehearsalCheck(options);
  printResult(result, options.json);
  process.exitCode = result.ok ? 0 : 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Backup/rollback rehearsal policy ${result.ok ? 'passed' : 'failed'} (${result.rehearsals.length} rehearsals, ${result.mode} mode).`);
  result.rehearsals.forEach(rehearsal => {
    console.log(`- ${rehearsal.label}: ${rehearsal.verificationCommand}`);
  });
  (result.errors || []).forEach(error => console.log(`- ${error}`));
}

if (require.main === module) {
  runCli();
}

module.exports = {
  parseArgs,
  runBackupRollbackRehearsalCheck
};
