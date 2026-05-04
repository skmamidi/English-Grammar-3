(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestXpRolloutGates = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const featureFlags = root.GrammarQuestFeatureFlagDomain ||
    (typeof require === 'function' ? require('./feature-flag-domain') : null);

  const REQUIRED_XP_LAUNCH_EVIDENCE = Object.freeze([
    'securityRulesReviewed',
    'leaderboardOptInVerified',
    'periodResetVerified',
    'offlineReconciliationVerified',
    'accessibilityVerified',
    'rollbackPlanVerified'
  ]);

  function evaluateXpRolloutGates(input = {}) {
    const flags = normalizeFlags(input.flags || input.featureFlags);
    const evidence = objectOrEmpty(input.evidence || input.launchEvidence);
    const blockers = REQUIRED_XP_LAUNCH_EVIDENCE
      .filter(key => evidence[key] !== true)
      .map(key => `${toSnakeCase(key)}_missing`);

    return {
      ready: blockers.length === 0,
      blockers,
      localPracticeAvailable: flags.coreLocalPracticeEnabled !== false,
      capabilities: {
        localXpPreview: flags.xpLocalPreviewEnabled === true,
        serverAwarding: flags.xpServerAwardingEnabled === true,
        leaderboardMaterialization: flags.leaderboardMaterializationEnabled === true,
        leaderboardDisplay: flags.leaderboardDisplayEnabled === true,
        telemetry: flags.xpTelemetryEnabled === true
      },
      rollback: {
        preserveLocalPractice: true,
        disableAwardingFlag: 'xpServerAwardingEnabled',
        disableRankingFlag: 'leaderboardMaterializationEnabled',
        disableDisplayFlag: 'leaderboardDisplayEnabled',
        disableTelemetryFlag: 'xpTelemetryEnabled'
      }
    };
  }

  function normalizeFlags(value) {
    if (featureFlags && typeof featureFlags.normalizeFeatureFlags === 'function') {
      return featureFlags.normalizeFeatureFlags(value);
    }
    return Object.assign({ coreLocalPracticeEnabled: true }, objectOrEmpty(value));
  }

  function toSnakeCase(value) {
    return String(value || '').replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  function objectOrEmpty(value) {
    return value && typeof value === 'object' ? value : {};
  }

  return {
    REQUIRED_XP_LAUNCH_EVIDENCE,
    evaluateXpRolloutGates
  };
});
