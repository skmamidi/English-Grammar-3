(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestPersonalizationRolloutGates = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_PERSONALIZATION_ROLLOUT_EVIDENCE = Object.freeze([
    'featureFreshnessVerified',
    'fallbackRateVerified',
    'latencyBudgetVerified',
    'payloadBudgetVerified',
    'fairnessGateVerified',
    'rollbackPlanVerified'
  ]);

  function evaluatePersonalizationRolloutGates(input = {}) {
    const evidence = input.evidence || {};
    const health = input.health || {};
    const blockers = REQUIRED_PERSONALIZATION_ROLLOUT_EVIDENCE
      .filter(key => evidence[key] !== true)
      .map(key => `${toSnake(key)}_missing`);
    if ((Number(health.fallbackRate) || 0) > 0.1) blockers.push('fallback_rate_high');
    if ((Number(health.p95LatencyMs) || 0) > 150) blockers.push('latency_budget_exceeded');
    if ((Number(health.p95PayloadBytes) || 0) > 12 * 1024) blockers.push('payload_budget_exceeded');
    if (Array.isArray(health.fairnessBlockers) && health.fairnessBlockers.length) blockers.push('fairness_blockers_present');
    return {
      ready: blockers.length === 0,
      blockers: Array.from(new Set(blockers)),
      preserveVerifiedEvidence: true
    };
  }

  function evaluatePersonalizationKillSwitches(input = {}) {
    return {
      capabilities: {
        featureStoreReads: input.featureStoreReadsDisabled !== true,
        assembly: input.assemblyDisabled !== true,
        experiments: input.experimentsDisabled !== true,
        display: input.displayDisabled !== true,
        telemetry: input.telemetryDisabled !== true
      },
      preserveVerifiedEvidence: true,
      rollbackFlags: [
        'personalizationFeatureStorePilot',
        'dynamicQuizAssemblyPilot',
        'learningExperimentPilot',
        'personalizationDisplayEnabled',
        'personalizationTelemetryEnabled'
      ]
    };
  }

  function toSnake(value) {
    return String(value).replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  return {
    REQUIRED_PERSONALIZATION_ROLLOUT_EVIDENCE,
    evaluatePersonalizationKillSwitches,
    evaluatePersonalizationRolloutGates
  };
});
