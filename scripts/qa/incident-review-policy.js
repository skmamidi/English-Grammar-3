#!/usr/bin/env node

const {
  DEFAULT_INCIDENT_REVIEW_POLICY,
  buildIncidentReviewTemplate,
  validateIncidentReviewPolicy
} = require('../../assets/incident-review-policy');

function parseArgs(argv) {
  const options = {
    json: false,
    incidentId: 'INC-synthetic',
    title: 'Sanitized incident review'
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
    } else if (arg === '--incident-id') {
      index += 1;
      options.incidentId = argv[index];
    } else if (arg.startsWith('--incident-id=')) {
      options.incidentId = arg.slice('--incident-id='.length);
    } else if (arg === '--title') {
      index += 1;
      options.title = argv[index];
    } else if (arg.startsWith('--title=')) {
      options.title = arg.slice('--title='.length);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function runIncidentReviewPolicyCheck(options = {}) {
  const policy = options.policy || DEFAULT_INCIDENT_REVIEW_POLICY;
  const validation = validateIncidentReviewPolicy(policy);
  const template = buildIncidentReviewTemplate(policy, {
    incidentId: options.incidentId || 'INC-synthetic',
    title: options.title || 'Sanitized incident review'
  });

  return {
    ok: validation.valid,
    valid: validation.valid,
    errors: validation.errors,
    checkedLiveIncidentService: false,
    sections: template.sections.map(section => section.id),
    capture: validation.policy.capture,
    verificationCommand: 'node --test tests/incident-review-policy.test.js tests/operations-docs.test.js tests/ci-contract.test.js',
    nextStep: template.nextStep
  };
}

function runCli() {
  const options = parseArgs(process.argv);
  const result = runIncidentReviewPolicyCheck(options);
  printResult(result, options.json);
  process.exitCode = result.ok ? 0 : 1;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Incident review policy ${result.ok ? 'passed' : 'failed'} (${result.sections.length} sections).`);
  console.log(`- Verification: ${result.verificationCommand}`);
  console.log(`- Capture owner: ${result.capture.owner}`);
  (result.errors || []).forEach(error => console.log(`- ${error}`));
}

if (require.main === module) {
  runCli();
}

module.exports = {
  parseArgs,
  runIncidentReviewPolicyCheck
};
