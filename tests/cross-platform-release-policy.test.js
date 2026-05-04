const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildCrossPlatformReleaseFixtures,
  evaluateClientReleaseCompatibility,
  evaluatePlatformFeatureFlag,
  normalizeObservabilityEvent,
  validateCrossPlatformReleasePolicy
} = require('../assets/cross-platform-release-policy');

const repoRoot = path.resolve(__dirname, '..');

test('cross-platform release policy declares compatibility windows and observability taxonomy', () => {
  const fixtures = buildCrossPlatformReleaseFixtures();
  const policy = fixtures.policy;

  assert.deepEqual(validateCrossPlatformReleasePolicy(policy), []);
  assert.deepEqual(policy.platforms, ['web', 'iphone', 'ipados']);
  assert.equal(policy.contentPackage.minimumSupportedSchemaVersion, 1);
  assert.equal(policy.syncEnvelope.maximumSupportedSchemaVersion, 1);
  assert.ok(policy.telemetry.allowedEventTypes.includes('app_error'));
  assert.ok(policy.telemetry.allowedEventTypes.includes('native_crash_summary'));
  assert.ok(policy.forcedUpgradeCriteria.includes('unsupported_sync_schema'));
});

test('compatibility decisions distinguish current web future native and stale native clients', () => {
  const { policy, clients } = buildCrossPlatformReleaseFixtures();

  assert.equal(evaluateClientReleaseCompatibility(policy, clients.currentWeb).status, 'compatible');
  assert.equal(evaluateClientReleaseCompatibility(policy, clients.futureIpad).status, 'compatible');

  const stale = evaluateClientReleaseCompatibility(policy, clients.staleNative);
  assert.equal(stale.status, 'force_upgrade');
  assert.ok(stale.reasons.includes('client_version_below_minimum'));

  const unsupported = evaluateClientReleaseCompatibility(policy, clients.unsupportedSchema);
  assert.equal(unsupported.status, 'force_upgrade');
  assert.ok(unsupported.reasons.includes('unsupported_sync_schema'));

  const unsafeOld = evaluateClientReleaseCompatibility(policy, clients.unsafeOldClient);
  assert.equal(unsafeOld.status, 'force_upgrade');
  assert.ok(unsafeOld.reasons.includes('unsafe_client_sunset'));
});

test('feature flags target platforms without forking domain rules', () => {
  const { policy } = buildCrossPlatformReleaseFixtures();

  assert.deepEqual(evaluatePlatformFeatureFlag(policy, 'nativeContentBundle', { platform: 'ipados', version: '1.2.0' }), {
    enabled: true,
    reason: 'eligible',
    platform: 'ipados',
    domainRule: 'shared'
  });
  assert.deepEqual(evaluatePlatformFeatureFlag(policy, 'nativeContentBundle', { platform: 'web', version: '1.2.0' }), {
    enabled: false,
    reason: 'platform_not_targeted',
    platform: 'web',
    domainRule: 'shared'
  });
});

test('observability events are schema-versioned and privacy safe', () => {
  const { policy } = buildCrossPlatformReleaseFixtures();
  const normalized = normalizeObservabilityEvent(policy, {
    type: 'native_crash_summary',
    platform: 'ipados',
    clientVersion: '1.2.0',
    telemetrySchemaVersion: 1,
    category: 'startup',
    severity: 'error',
    route: '/topics/grammar/index.html?learnerId=secret',
    stack: 'raw stack',
    email: 'learner@example.test'
  });

  assert.deepEqual(normalized, {
    type: 'native_crash_summary',
    platform: 'ipados',
    clientVersion: '1.2.0',
    telemetrySchemaVersion: 1,
    category: 'startup',
    severity: 'error',
    route: '/topics/grammar/index.html'
  });
  assert.throws(() => normalizeObservabilityEvent(policy, {
    type: 'native_crash_summary',
    platform: 'ipados',
    telemetrySchemaVersion: 99
  }), /telemetry_schema_unsupported/);
});

test('cross-platform release docs and unit gate are wired', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'cross-platform-release-policy.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /forced-upgrade/i);
  assert.match(docs, /content package compatibility/i);
  assert.match(docs, /privacy-safe observability/i);
  assert.match(pkg.scripts['test:unit'], /tests\/cross-platform-release-policy\.test\.js/);
});
