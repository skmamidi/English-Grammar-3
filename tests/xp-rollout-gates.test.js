const assert = require('node:assert/strict');
const test = require('node:test');

const gates = require('../assets/xp-rollout-gates');

test('XP rollout gates block broad launch until required evidence is present', () => {
  const decision = gates.evaluateXpRolloutGates({
    flags: {
      xpLocalPreviewEnabled: true,
      xpServerAwardingEnabled: true,
      leaderboardMaterializationEnabled: true,
      leaderboardDisplayEnabled: true,
      xpTelemetryEnabled: true
    },
    evidence: {
      securityRulesReviewed: true,
      leaderboardOptInVerified: true,
      periodResetVerified: false,
      offlineReconciliationVerified: true,
      accessibilityVerified: true,
      rollbackPlanVerified: true
    }
  });

  assert.equal(decision.ready, false);
  assert.deepEqual(decision.blockers, ['period_reset_verified_missing']);
  assert.equal(decision.localPracticeAvailable, true);
});

test('XP rollout gates expose independent kill switches while preserving local practice', () => {
  const decision = gates.evaluateXpRolloutGates({
    flags: {
      xpLocalPreviewEnabled: true,
      xpServerAwardingEnabled: false,
      leaderboardMaterializationEnabled: false,
      leaderboardDisplayEnabled: false,
      xpTelemetryEnabled: false
    },
    evidence: gates.REQUIRED_XP_LAUNCH_EVIDENCE.reduce((result, key) => {
      result[key] = true;
      return result;
    }, {})
  });

  assert.equal(decision.ready, true);
  assert.equal(decision.localPracticeAvailable, true);
  assert.deepEqual(decision.capabilities, {
    localXpPreview: true,
    serverAwarding: false,
    leaderboardMaterialization: false,
    leaderboardDisplay: false,
    telemetry: false
  });
});
