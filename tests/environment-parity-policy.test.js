const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_ENVIRONMENT_PARITY_POLICY,
  REQUIRED_PARITY_DIMENSIONS,
  buildEnvironmentParityReport,
  sanitizeEnvironmentSnapshot,
  validateEnvironmentParityPolicy
} = require('../assets/environment-parity-policy');
const {
  runEnvironmentParityCheck
} = require('../scripts/qa/environment-parity');

test('environment parity policy covers required release dimensions', () => {
  const result = validateEnvironmentParityPolicy(DEFAULT_ENVIRONMENT_PARITY_POLICY);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.policy.dimensions.map(dimension => dimension.id), REQUIRED_PARITY_DIMENSIONS);
});

test('environment parity report compares local ci staging and production snapshots', () => {
  const report = buildEnvironmentParityReport(DEFAULT_ENVIRONMENT_PARITY_POLICY);

  assert.equal(report.ok, true);
  assert.deepEqual(report.environments, ['local', 'ci', 'staging', 'production']);
  assert.deepEqual(report.drift, []);
  assert.match(report.nextStep, /Review parity before promotion/);
  assert.doesNotMatch(JSON.stringify(report), /token|secret|password|privateKey|credential|learnerId|studentId/i);
});

test('environment parity detects drifted dimensions with bounded diagnostics', () => {
  const policy = JSON.parse(JSON.stringify(DEFAULT_ENVIRONMENT_PARITY_POLICY));
  policy.snapshots.production.nodeVersion = '25.x';
  policy.snapshots.staging.telemetryDefault = 'enabled';
  policy.snapshots.local.allowedOrigins = ['http://localhost:8000', 'https://extra.example.test'];

  const report = buildEnvironmentParityReport(policy);

  assert.equal(report.ok, false);
  assert.deepEqual(report.drift.map(item => item.dimension), [
    'node_version',
    'allowed_origins',
    'telemetry_defaults'
  ]);
  assert.doesNotMatch(JSON.stringify(report), /token|secret|password|privateKey|credential/i);
});

test('environment parity validation rejects missing fields and unsafe snapshots', () => {
  const result = validateEnvironmentParityPolicy({
    dimensions: [{
      id: 'node_version',
      label: '',
      owner: '',
      expected: '',
      verificationCommand: 'curl https://example.test?token=secret'
    }],
    snapshots: {
      local: {
        nodeVersion: '24.x',
        playwrightBrowsers: ['chromium'],
        featureFlags: ['serverSelectionEnabled=false'],
        assetBudgets: ['appShellBytes<=250000'],
        securityHeaders: ['content-security-policy'],
        allowedOrigins: ['http://localhost:8000'],
        telemetryDefault: 'disabled',
        selectionApiMode: 'local-fallback',
        token: 'secret'
      }
    }
  });

  assert.deepEqual(result.errors, [
    'node_version label is required',
    'node_version owner is required',
    'node_version expected is required',
    'node_version verificationCommand must use an approved local command',
    'missing required dimension playwright_browser_matrix',
    'missing required dimension feature_flags',
    'missing required dimension asset_budgets',
    'missing required dimension security_headers',
    'missing required dimension allowed_origins',
    'missing required dimension telemetry_defaults',
    'missing required dimension selection_api_mode',
    'missing required environment ci',
    'missing required environment staging',
    'missing required environment production',
    'local snapshot includes unsafe field token'
  ]);
});

test('environment snapshot sanitizer redacts unsafe fields and keeps public parity values', () => {
  const sanitized = sanitizeEnvironmentSnapshot({
    nodeVersion: '24.x',
    allowedOrigins: ['https://grammar.example.test?token=secret'],
    telemetryDefault: 'disabled',
    privateKey: 'secret',
    learnerId: 'abc'
  });

  assert.deepEqual(sanitized, {
    nodeVersion: '24.x',
    allowedOrigins: ['https://grammar.example.test'],
    telemetryDefault: 'disabled'
  });
});

test('environment parity helper validates without live environment dumps', () => {
  const result = runEnvironmentParityCheck();

  assert.equal(result.ok, true);
  assert.equal(result.checkedLiveEnvironments, false);
  assert.deepEqual(result.environments, ['local', 'ci', 'staging', 'production']);
  assert.deepEqual(result.dimensions, REQUIRED_PARITY_DIMENSIONS);
  assert.doesNotMatch(JSON.stringify(result), /token|secret|password|privateKey|credential|learnerId|studentId/i);
});
