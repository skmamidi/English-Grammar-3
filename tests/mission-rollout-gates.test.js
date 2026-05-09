const assert = require('node:assert/strict');
const test = require('node:test');

const gates = require('../assets/mission-rollout-gates');

test('mission rollout gates block broad launch until required evidence is present', () => {
  const decision = gates.evaluateMissionRolloutGates({
    flags: {
      missionCatalogEnabled: true,
      missionLearnerRouteEnabled: true,
      missionRecommendationsEnabled: true,
      missionAssignmentWorkflowsEnabled: true,
      missionRemindersEnabled: true,
      missionRewardsEnabled: true,
      missionTelemetryEnabled: true
    },
    evidence: {
      catalogQaVerified: true,
      routeAccessibilityVerified: true,
      offlineResumeVerified: true,
      privacyTelemetryVerified: false,
      assignmentScopeVerified: true,
      reminderFatigueVerified: true,
      rewardAbuseVerified: true,
      rollbackPlanVerified: true
    }
  });

  assert.equal(decision.ready, false);
  assert.deepEqual(decision.blockers, ['privacy_telemetry_verified_missing']);
  assert.equal(decision.localPracticeAvailable, true);
});

test('mission rollout gates expose independent kill switches while preserving local practice', () => {
  const evidence = gates.REQUIRED_MISSION_LAUNCH_EVIDENCE.reduce((result, key) => {
    result[key] = true;
    return result;
  }, {});
  const decision = gates.evaluateMissionRolloutGates({
    flags: {
      missionCatalogEnabled: true,
      missionLearnerRouteEnabled: true,
      missionRecommendationsEnabled: false,
      missionAssignmentWorkflowsEnabled: false,
      missionRemindersEnabled: false,
      missionRewardsEnabled: false,
      missionTelemetryEnabled: false
    },
    evidence
  });

  assert.equal(decision.ready, true);
  assert.equal(decision.localPracticeAvailable, true);
  assert.deepEqual(decision.capabilities, {
    catalog: true,
    learnerRoute: true,
    recommendations: false,
    assignmentWorkflows: false,
    reminders: false,
    rewards: false,
    telemetry: false
  });
  assert.deepEqual(decision.rollback, {
    preserveLocalPractice: true,
    disableCatalogFlag: 'missionCatalogEnabled',
    disableRouteFlag: 'missionLearnerRouteEnabled',
    disableRecommendationsFlag: 'missionRecommendationsEnabled',
    disableAssignmentFlag: 'missionAssignmentWorkflowsEnabled',
    disableRemindersFlag: 'missionRemindersEnabled',
    disableRewardsFlag: 'missionRewardsEnabled',
    disableTelemetryFlag: 'missionTelemetryEnabled'
  });
});
