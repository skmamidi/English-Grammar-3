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

test('XP rollout flags fail closed and can be controlled independently', () => {
  const defaults = normalizeFeatureFlags({});
  assert.equal(defaults.coreLocalPracticeEnabled, true);
  assert.equal(defaults.xpLocalPreviewEnabled, false);
  assert.equal(defaults.xpServerAwardingEnabled, false);
  assert.equal(defaults.leaderboardMaterializationEnabled, false);
  assert.equal(defaults.leaderboardDisplayEnabled, false);
  assert.equal(defaults.xpTelemetryEnabled, false);

  const flags = normalizeFeatureFlags({
    xpLocalPreviewEnabled: true,
    xpServerAwardingEnabled: false,
    leaderboardMaterializationEnabled: true,
    leaderboardDisplayEnabled: false,
    xpTelemetryEnabled: true
  });

  assert.equal(isFeatureEnabled(flags, 'xpLocalPreviewEnabled'), true);
  assert.equal(isFeatureEnabled(flags, 'xpServerAwardingEnabled'), false);
  assert.equal(isFeatureEnabled(flags, 'leaderboardMaterializationEnabled'), true);
  assert.equal(isFeatureEnabled(flags, 'leaderboardDisplayEnabled'), false);
  assert.equal(isFeatureEnabled(flags, 'xpTelemetryEnabled'), true);
  assert.equal(flags.coreLocalPracticeEnabled, true);
});

test('mission rollout flags fail closed and can be controlled independently', () => {
  const defaults = normalizeFeatureFlags({});
  assert.equal(defaults.coreLocalPracticeEnabled, true);
  assert.equal(defaults.missionCatalogEnabled, false);
  assert.equal(defaults.missionLearnerRouteEnabled, false);
  assert.equal(defaults.missionRecommendationsEnabled, false);
  assert.equal(defaults.missionAssignmentWorkflowsEnabled, false);
  assert.equal(defaults.missionRemindersEnabled, false);
  assert.equal(defaults.missionRewardsEnabled, false);
  assert.equal(defaults.missionTelemetryEnabled, false);
  assert.equal(defaults.sparseQuestionDeliveryPilot, false);
  assert.equal(defaults.granularOfflineQuestionStore, false);
  assert.equal(defaults.serverAdjudicatedLearningPilot, false);
  assert.equal(defaults.personalizationFeatureStorePilot, false);

  const flags = normalizeFeatureFlags({
    missionCatalogEnabled: true,
    missionLearnerRouteEnabled: true,
    missionRecommendationsEnabled: true,
    missionAssignmentWorkflowsEnabled: false,
    missionRemindersEnabled: true,
    missionRewardsEnabled: false,
    missionTelemetryEnabled: true
  });

  assert.equal(isFeatureEnabled(flags, 'missionCatalogEnabled'), true);
  assert.equal(isFeatureEnabled(flags, 'missionLearnerRouteEnabled'), true);
  assert.equal(isFeatureEnabled(flags, 'missionRecommendationsEnabled'), true);
  assert.equal(isFeatureEnabled(flags, 'missionAssignmentWorkflowsEnabled'), false);
  assert.equal(isFeatureEnabled(flags, 'missionRemindersEnabled'), true);
  assert.equal(isFeatureEnabled(flags, 'missionRewardsEnabled'), false);
  assert.equal(isFeatureEnabled(flags, 'missionTelemetryEnabled'), true);
  assert.deepEqual(validateFeatureFlags(flags), []);
});

test('sparse question delivery pilot flag fails closed while chunk hydration remains default', () => {
  const defaults = normalizeFeatureFlags({});
  const flags = normalizeFeatureFlags({ sparseQuestionDeliveryPilot: true, granularOfflineQuestionStore: true });

  assert.equal(defaults.sparseQuestionDeliveryPilot, false);
  assert.equal(defaults.granularOfflineQuestionStore, false);
  assert.equal(flags.sparseQuestionDeliveryPilot, true);
  assert.equal(flags.granularOfflineQuestionStore, true);
  assert.equal(isFeatureEnabled(flags, 'sparseQuestionDeliveryPilot'), true);
  assert.equal(isFeatureEnabled(flags, 'granularOfflineQuestionStore'), true);
  assert.equal(flags.snapshotFallbackEnabled, false);
});

test('server adjudicated learning pilot flag fails closed', () => {
  const defaults = normalizeFeatureFlags({});
  const flags = normalizeFeatureFlags({ serverAdjudicatedLearningPilot: true });

  assert.equal(defaults.serverAdjudicatedLearningPilot, false);
  assert.equal(flags.serverAdjudicatedLearningPilot, true);
  assert.equal(isFeatureEnabled(flags, 'serverAdjudicatedLearningPilot'), true);
});

test('personalization feature store pilot flag fails closed', () => {
  const defaults = normalizeFeatureFlags({});
  const flags = normalizeFeatureFlags({
    personalizationFeatureStorePilot: true,
    dynamicQuizAssemblyPilot: true,
    learningExperimentPilot: true,
    personalizationDisplayEnabled: true,
    personalizationTelemetryEnabled: true
  });

  assert.equal(defaults.personalizationFeatureStorePilot, false);
  assert.equal(defaults.dynamicQuizAssemblyPilot, false);
  assert.equal(defaults.learningExperimentPilot, false);
  assert.equal(defaults.personalizationDisplayEnabled, false);
  assert.equal(defaults.personalizationTelemetryEnabled, false);
  assert.equal(flags.personalizationFeatureStorePilot, true);
  assert.equal(flags.dynamicQuizAssemblyPilot, true);
  assert.equal(flags.learningExperimentPilot, true);
  assert.equal(flags.personalizationDisplayEnabled, true);
  assert.equal(flags.personalizationTelemetryEnabled, true);
  assert.equal(isFeatureEnabled(flags, 'personalizationFeatureStorePilot'), true);
  assert.equal(isFeatureEnabled(flags, 'dynamicQuizAssemblyPilot'), true);
  assert.equal(isFeatureEnabled(flags, 'learningExperimentPilot'), true);
});
