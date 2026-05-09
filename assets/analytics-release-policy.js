(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAnalyticsReleasePolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const inventory = root.GrammarQuestDataInventoryClassification ||
    (typeof require === 'function' ? require('./data-inventory-classification') : null);
  const experiments = root.GrammarQuestExperimentPolicyDomain ||
    (typeof require === 'function' ? require('./experiment-policy-domain') : null);

  const forbiddenFieldPattern = /(learner|student|question|choice|answer|explanation|prompt|url|stack|billing|payment|customer|subscription|invoice|email|token|secret|password|credential)/i;

  const DEFAULT_ANALYTICS_RELEASE_POLICY = Object.freeze({
    minCohortSize: 5,
    countBucketSize: 5,
    allowedAggregationLevels: Object.freeze(['aggregate', 'cohort']),
    requiredSuppression: 'suppress_small_cohorts',
    forbiddenFieldPattern
  });

  function validateAnalyticsMetricDefinition(metric = {}, policy = DEFAULT_ANALYTICS_RELEASE_POLICY) {
    const input = metric && typeof metric === 'object' ? metric : {};
    const errors = [];
    const id = safeString(input.id);
    const fields = Array.isArray(input.fields) ? input.fields.map(safeString) : [];
    if (!id) errors.push('id is required');
    if (forbiddenFieldPattern.test(id)) errors.push('id contains unsafe analytics field');
    if (!inventory.REQUIRED_DATA_CATEGORIES.includes(safeString(input.sourceCategory))) {
      errors.push('sourceCategory must map to data inventory');
    }
    if (!policy.allowedAggregationLevels.includes(safeString(input.aggregationLevel))) {
      errors.push('aggregationLevel must be aggregate or cohort');
    }
    if ((Number(input.minCohortSize) || 0) < policy.minCohortSize) {
      errors.push(`minCohortSize must be at least ${policy.minCohortSize}`);
    }
    if ((Number(input.countBucketSize) || 0) < policy.countBucketSize) {
      errors.push(`countBucketSize must be at least ${policy.countBucketSize}`);
    }
    if (safeString(input.suppression) !== policy.requiredSuppression) {
      errors.push('suppression must suppress small cohorts');
    }
    if (!safeString(input.retentionClass)) errors.push('retentionClass is required');
    if (input.releaseEligible !== true) errors.push('releaseEligible must be true');
    if (fields.some(field => forbiddenFieldPattern.test(field))) errors.push('fields contains unsafe analytics field');
    return {
      valid: errors.length === 0,
      errors,
      metric: {
        id,
        sourceCategory: safeString(input.sourceCategory),
        aggregationLevel: safeString(input.aggregationLevel),
        minCohortSize: Number(input.minCohortSize) || 0,
        countBucketSize: Number(input.countBucketSize) || 0,
        suppression: safeString(input.suppression),
        retentionClass: safeString(input.retentionClass),
        releaseEligible: input.releaseEligible === true,
        fields
      }
    };
  }

  function evaluateAnalyticsReleaseReadiness(input = {}, policy = DEFAULT_ANALYTICS_RELEASE_POLICY) {
    const errors = [];
    (Array.isArray(input.metrics) ? input.metrics : []).forEach(metric => {
      const result = validateAnalyticsMetricDefinition(metric, policy);
      result.errors.forEach(error => errors.push(`metric ${safeString(metric.id || 'unknown')}: ${error}`));
    });
    (Array.isArray(input.experiments) ? input.experiments : []).forEach(definition => {
      const result = experiments.validateExperimentDefinition(definition);
      result.errors.forEach(error => errors.push(`experiment ${safeString(definition.id || 'unknown')}: ${error}`));
    });
    const personalizationGate = input.personalizationEvaluation && input.personalizationEvaluation.gate || input.personalizationEvaluationGate;
    if (personalizationGate && personalizationGate.status === 'blocked') {
      const blockers = Array.isArray(personalizationGate.blockers) ? personalizationGate.blockers : ['unknown'];
      errors.push(`personalization evaluation gate blocked: ${blockers.map(safeString).filter(Boolean).join(',') || 'unknown'}`);
    }
    const institution = input.institutionPolicy && typeof input.institutionPolicy === 'object' ? input.institutionPolicy : {};
    if (Array.isArray(institution.disabledFeatures) && institution.disabledFeatures.includes('telemetry')) {
      errors.push('institution policy disables telemetry');
    }
    return { ready: errors.length === 0, errors };
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_ANALYTICS_RELEASE_POLICY,
    evaluateAnalyticsReleaseReadiness,
    validateAnalyticsMetricDefinition
  };
});
