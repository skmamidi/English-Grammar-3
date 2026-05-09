const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_SYNTHETIC_MONITOR_POLICY,
  buildSyntheticFailureSummary,
  sanitizeSyntheticMonitorResult,
  validateSyntheticMonitorPolicy
} = require('../assets/synthetic-monitor-policy');
const {
  buildSyntheticMonitorTargets,
  runSyntheticMonitors
} = require('../scripts/monitor/run-synthetic-monitors');

test('synthetic monitor policy defines the critical public and operational flows', () => {
  const result = validateSyntheticMonitorPolicy(DEFAULT_SYNTHETIC_MONITOR_POLICY);
  const monitorIds = result.policy.monitors.map(monitor => monitor.id);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(monitorIds, [
    'home_page_shell',
    'topic_index_manifest',
    'subtopic_quiz_start',
    'selection_health_readiness',
    'offline_fallback',
    'admin_readiness_metadata',
    'billing_operations_health',
    'billing_page_render_health',
    'billing_checkout_start_test_mode',
    'billing_webhook_health_test_mode',
    'institutional_login_smoke',
    'institutional_roster_sync_health',
    'institutional_assignment_smoke',
    'institutional_verified_report_health',
    'institutional_export_request_policy',
    'institutional_rollback_rehearsal'
  ]);
});

test('synthetic monitor policy covers provider-neutral institutional rehearsal scenarios', () => {
  const result = validateSyntheticMonitorPolicy(DEFAULT_SYNTHETIC_MONITOR_POLICY);
  const monitors = new Map(result.policy.monitors.map(monitor => [monitor.id, monitor]));

  [
    ['institutional_login_smoke', 'institutional_login_success'],
    ['institutional_roster_sync_health', 'roster_sync_freshness'],
    ['institutional_assignment_smoke', 'assignment_provisioning_success'],
    ['institutional_verified_report_health', 'verified_report_projection_freshness'],
    ['institutional_export_request_policy', 'institutional_export_request_success'],
    ['institutional_rollback_rehearsal', 'institutional_rollback_rehearsal_success']
  ].forEach(([id, sloObjectiveId]) => {
    const monitor = monitors.get(id);
    assert.equal(monitor.sloObjectiveId, sloObjectiveId);
    assert.equal(monitor.mutatesState, false);
    assert.equal(monitor.capturesPayload, false);
    assert.equal(monitor.requiresCredentials, false);
    assert.match(monitor.targetPath, /^\/api\/institutional\/synthetic\//);
  });
});

test('synthetic monitors are payload-light non-mutating and credentials-free', () => {
  const result = validateSyntheticMonitorPolicy(DEFAULT_SYNTHETIC_MONITOR_POLICY);

  result.policy.monitors.forEach(monitor => {
    assert.equal(monitor.mutatesState, false, `${monitor.id} must not mutate production state`);
    assert.equal(monitor.capturesPayload, false, `${monitor.id} must not capture question or learner payloads`);
    assert.equal(monitor.requiresCredentials, false, `${monitor.id} must not require learner credentials`);
    assert.ok(monitor.timeoutMs >= 3000 && monitor.timeoutMs <= 15000, `${monitor.id} timeout should stay bounded`);
    assert.match(monitor.runbook, /^docs\/operations\/runbook-/, `${monitor.id} should link an operational runbook`);
    assert.ok(monitor.sloObjectiveId, `${monitor.id} should connect to a production SLO objective`);
  });
});

test('synthetic monitor validation rejects unsafe definitions', () => {
  const result = validateSyntheticMonitorPolicy({
    monitors: [{
      id: 'unsafe_monitor',
      label: 'Unsafe monitor',
      targetPath: '/quiz.html?learnerId=secret',
      method: 'POST',
      timeoutMs: 60000,
      mutatesState: true,
      capturesPayload: true,
      requiresCredentials: true,
      assertions: [],
      runbook: '',
      sloObjectiveId: ''
    }]
  });

  assert.deepEqual(result.errors, [
    'unsafe_monitor method must be GET or HEAD',
    'unsafe_monitor targetPath must not include a query string',
    'unsafe_monitor timeoutMs must be between 3000 and 15000',
    'unsafe_monitor must not mutate production state',
    'unsafe_monitor must not capture payloads',
    'unsafe_monitor must not require credentials',
    'unsafe_monitor assertions are required',
    'unsafe_monitor runbook is required',
    'unsafe_monitor sloObjectiveId is required'
  ]);
});

test('synthetic monitor result sanitizer redacts private payload and leaves actionable fields', () => {
  const sanitized = sanitizeSyntheticMonitorResult({
    id: 'subtopic_quiz_start',
    ok: false,
    status: 500,
    targetUrl: 'https://example.test/quiz.html?student=secret',
    durationMs: 987,
    error: 'Question prompt leaked with token=secret',
    responseBody: 'raw question payload',
    question: 'Choose the answer',
    choices: ['a', 'b'],
    answer: 'a',
    explanation: 'raw explanation',
    stack: 'stack trace'
  });

  assert.deepEqual(sanitized, {
    id: 'subtopic_quiz_start',
    ok: false,
    status: 500,
    targetUrl: 'https://example.test/quiz.html',
    durationMs: 987,
    error: 'Question prompt leaked with token=[redacted]',
    action: 'Open the linked runbook for this monitor and validate the public route or health surface.'
  });
});

test('synthetic failure summary is actionable without learner or question content', () => {
  const summary = buildSyntheticFailureSummary(DEFAULT_SYNTHETIC_MONITOR_POLICY, [{
    id: 'selection_health_readiness',
    ok: false,
    status: 503,
    targetUrl: 'https://example.test/api/question-selection/health?token=secret',
    error: 'Readiness failed for learnerId=abc and prompt text'
  }, {
    id: 'home_page_shell',
    ok: true,
    status: 200,
    targetUrl: 'https://example.test/index.html'
  }]);

  assert.equal(summary.ok, false);
  assert.equal(summary.failures.length, 1);
  assert.equal(summary.failures[0].id, 'selection_health_readiness');
  assert.equal(summary.failures[0].runbook, 'docs/operations/runbook-selection-api-failure.md');
  assert.equal(summary.failures[0].sloObjectiveId, 'selection_api_readiness');
  assert.match(summary.failures[0].nextStep, /Check Selection API readiness/);
  assert.doesNotMatch(JSON.stringify(summary), /learnerId=abc|token=secret|choices|answer|explanation|responseBody/);
});

test('synthetic monitor runner builds deployed targets without query strings', () => {
  const targets = buildSyntheticMonitorTargets(DEFAULT_SYNTHETIC_MONITOR_POLICY, 'https://grammar.example/app/?token=secret');

  assert.equal(targets[0].url, 'https://grammar.example/app/index.html');
  assert.equal(targets.find(target => target.id === 'selection_health_readiness').url, 'https://grammar.example/app/api/question-selection/health');
  targets.forEach(target => assert.doesNotMatch(target.url, /\?/));
});

test('synthetic monitor runner emits sanitized failure results from public fetch checks', async () => {
  const responseByPath = new Map([
    ['/index.html', { status: 200, text: async () => '<main>English Grammar</main>' }],
    ['/topics.html', { status: 500, text: async () => 'server stack with token=secret' }]
  ]);
  const policy = {
    monitors: DEFAULT_SYNTHETIC_MONITOR_POLICY.monitors.slice(0, 2)
  };

  const summary = await runSyntheticMonitors(policy, {
    baseUrl: 'https://grammar.example',
    fetchImpl: async url => responseByPath.get(new URL(url).pathname),
    now: () => 1000
  });

  assert.equal(summary.ok, false);
  assert.equal(summary.results.length, 2);
  assert.equal(summary.results[1].id, 'topic_index_manifest');
  assert.equal(summary.results[1].status, 500);
  assert.equal(summary.failures[0].runbook, 'docs/operations/runbook-stale-question-artifacts.md');
  assert.doesNotMatch(JSON.stringify(summary), /token=secret|server stack/);
});
