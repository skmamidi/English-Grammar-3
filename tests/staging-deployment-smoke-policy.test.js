const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const {
  DEFAULT_STAGING_SMOKE_REQUIREMENTS,
  buildExpectedStagingMetadata,
  sanitizeStagingSnapshot,
  validateStagingDeploymentSnapshot
} = require('../assets/staging-deployment-smoke-policy');

const repoRoot = path.resolve(__dirname, '..');
const fixturesDir = path.join(__dirname, 'fixtures', 'staging-smoke');

test('staging smoke policy defines required deployment checks', () => {
  [
    'static_assets',
    'release_manifest',
    'frontend_manifest',
    'question_manifest_source_hash',
    'service_worker_cache_version',
    'feature_flag_config_hash',
    'security_headers',
    'allowed_origins',
    'telemetry_config',
    'health_readiness'
  ].forEach(check => {
    assert.ok(DEFAULT_STAGING_SMOKE_REQUIREMENTS.requiredChecks.includes(check), `${check} is required`);
  });

  assert.ok(DEFAULT_STAGING_SMOKE_REQUIREMENTS.routes.includes('/'));
  assert.ok(DEFAULT_STAGING_SMOKE_REQUIREMENTS.routes.includes('/settings.html'));
  assert.ok(DEFAULT_STAGING_SMOKE_REQUIREMENTS.routes.includes('/reports.html'));
  assert.ok(DEFAULT_STAGING_SMOKE_REQUIREMENTS.routes.includes('/guardian-dashboard.html'));
  assert.ok(DEFAULT_STAGING_SMOKE_REQUIREMENTS.routes.some(route => route.includes('/topics/grammar/')));
});

test('matching dry-run staging snapshot passes without leaking secrets', () => {
  const expected = buildExpectedStagingMetadata({ root: repoRoot });
  const snapshot = readFixture('matching-snapshot.json');
  const result = validateStagingDeploymentSnapshot(snapshot, expected);

  assert.equal(result.ok, true);
  assert.deepEqual(result.failures, []);
  assert.equal(result.summary.checkedRoutes, snapshot.routes.length);

  const sanitized = sanitizeStagingSnapshot(Object.assign({}, snapshot, {
    rawToken: 'secret',
    serviceAccount: { client_email: 'bot@example.test' },
    routes: snapshot.routes.concat([{ path: '/debug?token=secret', status: 200 }])
  }));
  assert.doesNotMatch(JSON.stringify(sanitized), /secret|client_email|token=/i);
});

test('staging smoke classifies deployed config drift', () => {
  const expected = buildExpectedStagingMetadata({ root: repoRoot });
  const result = validateStagingDeploymentSnapshot(readFixture('drift-snapshot.json'), expected);
  const codes = result.failures.map(failure => failure.code);

  assert.equal(result.ok, false);
  assert.ok(codes.includes('release_manifest_mismatch'));
  assert.ok(codes.includes('frontend_manifest_mismatch'));
  assert.ok(codes.includes('question_manifest_source_hash_mismatch'));
  assert.ok(codes.includes('service_worker_cache_version_mismatch'));
  assert.ok(codes.includes('feature_flag_config_hash_mismatch'));
  assert.ok(codes.includes('security_header_mismatch'));
  assert.ok(codes.includes('allowed_origin_mismatch'));
  assert.ok(codes.includes('telemetry_config_mismatch'));
  assert.ok(codes.includes('health_readiness_mismatch'));
  assert.ok(codes.includes('route_unavailable'));
});

test('staging smoke dry-run CLI uses fixtures without network access', () => {
  const output = execFileSync('npm', ['run', 'qa:staging-smoke', '--', '--dry-run'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  assert.match(output, /"ok": true/);
  assert.match(output, /"mode": "dry-run"/);
  assert.doesNotMatch(output, /secret|token|password|client_email/i);
});

test('staging smoke docs and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'staging-deployment-smoke.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /staging deployment smoke/i);
  assert.match(docs, /npm run qa:staging-smoke -- --dry-run/);
  assert.match(docs, /read-only and synthetic/i);
  assert.match(checklist, /qa:staging-smoke/);
  assert.equal(pkg.scripts['qa:staging-smoke'], 'node scripts/qa/staging-smoke.js');
  assert.match(pkg.scripts['test:unit'], /tests\/staging-deployment-smoke-policy\.test\.js/);
});

function readFixture(file) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf8'));
}
