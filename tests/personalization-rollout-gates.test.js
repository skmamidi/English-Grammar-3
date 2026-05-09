const assert = require('node:assert/strict');
const test = require('node:test');

const {
  REQUIRED_PERSONALIZATION_ROLLOUT_EVIDENCE,
  evaluatePersonalizationKillSwitches,
  evaluatePersonalizationRolloutGates
} = require('../assets/personalization-rollout-gates');

test('personalization rollout gates require freshness fallback latency payload fairness and rollback evidence', () => {
  const blocked = evaluatePersonalizationRolloutGates({
    evidence: {
      featureFreshnessVerified: true,
      fallbackRateVerified: false,
      latencyBudgetVerified: false
    },
    health: {
      fallbackRate: 0.22,
      p95LatencyMs: 260,
      p95PayloadBytes: 20000,
      fairnessBlockers: ['grade_skew']
    }
  });
  const ready = evaluatePersonalizationRolloutGates({
    evidence: Object.fromEntries(REQUIRED_PERSONALIZATION_ROLLOUT_EVIDENCE.map(key => [key, true])),
    health: {
      fallbackRate: 0.02,
      p95LatencyMs: 80,
      p95PayloadBytes: 6000,
      fairnessBlockers: []
    }
  });

  assert.equal(blocked.ready, false);
  ['fallback_rate_verified_missing', 'latency_budget_verified_missing', 'payload_budget_verified_missing', 'fairness_gate_verified_missing', 'rollback_plan_verified_missing', 'fallback_rate_high', 'latency_budget_exceeded', 'payload_budget_exceeded', 'fairness_blockers_present'].forEach(blocker => {
    assert.ok(blocked.blockers.includes(blocker), blocker);
  });
  assert.equal(ready.ready, true);
  assert.deepEqual(ready.blockers, []);
});

test('personalization kill switches disable capabilities independently while preserving evidence', () => {
  const result = evaluatePersonalizationKillSwitches({
    featureStoreReadsDisabled: true,
    assemblyDisabled: false,
    experimentsDisabled: true,
    displayDisabled: true,
    telemetryDisabled: false
  });

  assert.deepEqual(result.capabilities, {
    featureStoreReads: false,
    assembly: true,
    experiments: false,
    display: false,
    telemetry: true
  });
  assert.equal(result.preserveVerifiedEvidence, true);
  assert.deepEqual(result.rollbackFlags, [
    'personalizationFeatureStorePilot',
    'dynamicQuizAssemblyPilot',
    'learningExperimentPilot',
    'personalizationDisplayEnabled',
    'personalizationTelemetryEnabled'
  ]);
});
