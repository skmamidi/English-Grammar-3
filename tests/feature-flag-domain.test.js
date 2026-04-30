const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_FEATURE_FLAGS,
  getFeatureFlagConfigHash,
  isFeatureEnabled,
  normalizeFeatureFlags,
  validateFeatureFlags
} = require('../assets/feature-flag-domain');

test('feature flag domain validates typed defaults and rollout stages', () => {
  const flags = normalizeFeatureFlags({
    serverSelectionPilotDomains: ['grammar'],
    preloadingEnabled: true,
    telemetryEnabled: false,
    syncEnabled: false,
    rolloutStage: 'pilot'
  });

  assert.equal(flags.preloadingEnabled, true);
  assert.deepEqual(flags.serverSelectionPilotDomains, ['grammar']);
  assert.equal(isFeatureEnabled(flags, 'preloadingEnabled'), true);
  assert.deepEqual(validateFeatureFlags(flags), []);
  assert.match(getFeatureFlagConfigHash(flags), /^sha256:[a-f0-9]{64}$/);
});

test('invalid feature flag config fails closed for risky features', () => {
  const flags = normalizeFeatureFlags({
    serverSelectionPilotDomains: ['unknown-domain'],
    snapshotFallbackEnabled: 'yes',
    syncEnabled: 'yes',
    telemetryEnabled: 'yes',
    preloadingEnabled: 'yes'
  });

  assert.deepEqual(flags.serverSelectionPilotDomains, []);
  assert.equal(flags.snapshotFallbackEnabled, false);
  assert.equal(flags.syncEnabled, false);
  assert.equal(flags.telemetryEnabled, false);
  assert.equal(flags.preloadingEnabled, false);
  assert.deepEqual(DEFAULT_FEATURE_FLAGS.serverSelectionPilotDomains, []);
});
