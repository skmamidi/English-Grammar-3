const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_FAILURE_INJECTION_DRILL_POLICY,
  buildFailureInjectionDrillPlan,
  sanitizeFailureInjectionDrillResult,
  validateFailureInjectionDrillPolicy
} = require('../assets/failure-injection-drill-policy');
const {
  runFailureInjectionDrillCheck
} = require('../scripts/qa/failure-injection-drills');

const REQUIRED_FAILURE_MODES = [
  'stale_manifest',
  'bad_signature',
  'selection_api_downtime',
  'quota_pressure',
  'auth_session_outage',
  'learner_sync_conflict',
  'telemetry_endpoint_failure'
];

test('failure-injection drill policy covers required production dependency modes', () => {
  const result = validateFailureInjectionDrillPolicy(DEFAULT_FAILURE_INJECTION_DRILL_POLICY);
  const modes = result.policy.drills.map(drill => drill.failureMode);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(modes, REQUIRED_FAILURE_MODES);
});

test('failure drills are non-destructive synthetic and linked to operational evidence', () => {
  const result = validateFailureInjectionDrillPolicy(DEFAULT_FAILURE_INJECTION_DRILL_POLICY);

  result.policy.drills.forEach(drill => {
    assert.equal(drill.mutatesProduction, false, `${drill.id} must not mutate production data`);
    assert.equal(drill.requiresLiveCredentials, false, `${drill.id} must not require live learner credentials`);
    assert.equal(drill.usesSyntheticInputs, true, `${drill.id} must use synthetic inputs`);
    assert.match(drill.sloObjectiveId, /^[a-z0-9_]+$/, `${drill.id} should map to an SLO objective`);
    assert.match(drill.runbook, /^docs\/operations\/runbook-/, `${drill.id} should link a runbook`);
    assert.ok(drill.rollbackLever, `${drill.id} should define a rollback lever`);
    assert.ok(drill.owner, `${drill.id} should define an owner`);
    assert.match(drill.verificationCommand, /^(npm run|node --test|node scripts\/)/, `${drill.id} should expose a reproducible verification command`);
  });
});

test('failure drill validation rejects unsafe or incomplete definitions', () => {
  const result = validateFailureInjectionDrillPolicy({
    drills: [{
      id: 'unsafe_drill',
      label: 'Unsafe drill',
      failureMode: 'stale_manifest',
      owner: '',
      sloObjectiveId: '',
      runbook: '',
      rollbackLever: '',
      verificationCommand: 'curl https://example.test?learnerId=abc',
      steps: [],
      expectedSignals: [],
      usesSyntheticInputs: false,
      mutatesProduction: true,
      requiresLiveCredentials: true,
      capturesPayload: true,
      outputFields: ['learnerId', 'rawStackTrace']
    }]
  });

  assert.deepEqual(result.errors, [
    'unsafe_drill owner is required',
    'unsafe_drill sloObjectiveId is required',
    'unsafe_drill runbook is required',
    'unsafe_drill rollbackLever is required',
    'unsafe_drill verificationCommand must use an approved local command',
    'unsafe_drill steps are required',
    'unsafe_drill expectedSignals are required',
    'unsafe_drill must use synthetic inputs',
    'unsafe_drill must not mutate production',
    'unsafe_drill must not require live credentials',
    'unsafe_drill must not capture payloads',
    'unsafe_drill outputFields include unsafe field learnerId',
    'unsafe_drill outputFields include unsafe field rawStackTrace'
  ]);
});

test('failure drill plan is actionable and privacy-safe', () => {
  const plan = buildFailureInjectionDrillPlan(DEFAULT_FAILURE_INJECTION_DRILL_POLICY, {
    mode: 'staging',
    drillIds: ['stale_manifest_drill', 'learner_sync_conflict_drill']
  });

  assert.equal(plan.mode, 'staging');
  assert.deepEqual(plan.drills.map(drill => drill.id), ['stale_manifest_drill', 'learner_sync_conflict_drill']);
  assert.match(plan.drills[0].nextStep, /Run the listed synthetic setup steps/);
  assert.match(plan.drills[1].rollbackLever, /local-first/i);
  assert.doesNotMatch(JSON.stringify(plan), /learnerId|studentId|question text|answer choices|explanation|prompt|token|raw stack/i);
});

test('failure drill result sanitizer keeps bounded diagnostics only', () => {
  const sanitized = sanitizeFailureInjectionDrillResult({
    id: 'selection_api_downtime_drill',
    ok: false,
    observedSignals: ['selection_api_fallback', 'learnerId=secret'],
    evidenceUrl: 'https://example.test/admin?token=secret',
    error: 'stack trace mentions prompt and token=secret',
    payload: { learnerId: 'abc', question: 'Choose one', answer: 'A' }
  });

  assert.deepEqual(sanitized, {
    id: 'selection_api_downtime_drill',
    ok: false,
    observedSignals: ['selection_api_fallback', '[redacted]'],
    evidenceUrl: 'https://example.test/admin',
    error: 'stack trace mentions prompt and token=[redacted]',
    action: 'Compare observed signals with the drill runbook, then verify the rollback lever.'
  });
});

test('failure drill helper lists validated drills without live dependency access', () => {
  const result = runFailureInjectionDrillCheck({ mode: 'local' });

  assert.equal(result.ok, true);
  assert.equal(result.checkedLiveDependencies, false);
  assert.deepEqual(result.drills.map(drill => drill.failureMode), REQUIRED_FAILURE_MODES);
  assert.doesNotMatch(JSON.stringify(result), /learnerId|studentId|credentials|question text|answer choices|raw stack/i);
});
