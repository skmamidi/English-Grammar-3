(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestMissionRolloutGates = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const featureFlags = root.GrammarQuestFeatureFlagDomain ||
    (typeof require === 'function' ? require('./feature-flag-domain') : null);

  const REQUIRED_MISSION_LAUNCH_EVIDENCE = Object.freeze([
    'catalogQaVerified',
    'routeAccessibilityVerified',
    'offlineResumeVerified',
    'privacyTelemetryVerified',
    'assignmentScopeVerified',
    'reminderFatigueVerified',
    'rewardAbuseVerified',
    'rollbackPlanVerified'
  ]);

  function evaluateMissionRolloutGates(input = {}) {
    const flags = normalizeFlags(input.flags || input.featureFlags);
    const evidence = objectOrEmpty(input.evidence || input.launchEvidence);
    const blockers = REQUIRED_MISSION_LAUNCH_EVIDENCE
      .filter(key => evidence[key] !== true)
      .map(key => `${toSnakeCase(key)}_missing`);

    return {
      ready: blockers.length === 0,
      blockers,
      localPracticeAvailable: flags.coreLocalPracticeEnabled !== false,
      capabilities: {
        catalog: flags.missionCatalogEnabled === true,
        learnerRoute: flags.missionLearnerRouteEnabled === true,
        recommendations: flags.missionRecommendationsEnabled === true,
        assignmentWorkflows: flags.missionAssignmentWorkflowsEnabled === true,
        reminders: flags.missionRemindersEnabled === true,
        rewards: flags.missionRewardsEnabled === true,
        telemetry: flags.missionTelemetryEnabled === true
      },
      rollback: {
        preserveLocalPractice: true,
        disableCatalogFlag: 'missionCatalogEnabled',
        disableRouteFlag: 'missionLearnerRouteEnabled',
        disableRecommendationsFlag: 'missionRecommendationsEnabled',
        disableAssignmentFlag: 'missionAssignmentWorkflowsEnabled',
        disableRemindersFlag: 'missionRemindersEnabled',
        disableRewardsFlag: 'missionRewardsEnabled',
        disableTelemetryFlag: 'missionTelemetryEnabled'
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
    REQUIRED_MISSION_LAUNCH_EVIDENCE,
    evaluateMissionRolloutGates
  };
});
