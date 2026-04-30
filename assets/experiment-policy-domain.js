(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestExperimentPolicyDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const privacyDomain = root.GrammarQuestPrivacyPreferencesDomain ||
    (typeof require === 'function' ? require('./privacy-preferences-domain') : null);

  function evaluateExperimentEnrollment(input = {}) {
    const experimentId = safeString(input.experimentId || input.id);
    if (!input.configEnabled) return result(false, 'experiment_disabled', experimentId);
    if (privacyDomain.isParentPreview(input)) return result(false, 'parent_preview', experimentId);
    const preferences = privacyDomain.normalizePrivacyPreferences(input.privacyPreferences || input.preferences);
    if (!preferences.telemetryEnabled) return result(false, 'telemetry_disabled', experimentId);
    if (!privacyDomain.hasTelemetryConsent(input.consent)) return result(false, 'telemetry_consent_required', experimentId);
    if (!preferences.experimentParticipationEnabled) return result(false, 'experiment_consent_required', experimentId);
    return result(true, 'eligible', experimentId);
  }

  const unsafeMetricPattern = /(learner|student|question|choice|answer|explanation|snapshot|auth|email|name|text)/i;

  function validateExperimentDefinition(definition = {}) {
    const errors = [];
    if (!safeString(definition.id)) errors.push('id_required');
    if (!safeString(definition.status)) errors.push('status_required');
    if (!Array.isArray(definition.successMetrics) || !definition.successMetrics.length) errors.push('successMetrics_required');
    if (!Array.isArray(definition.guardrailMetrics) || !definition.guardrailMetrics.length) errors.push('guardrailMetrics_required');
    if (!Array.isArray(definition.rollbackCriteria) || !definition.rollbackCriteria.length) errors.push('rollbackCriteria_required');
    if (!toTime(definition.startsAt)) errors.push('startsAt_required');
    if (!toTime(definition.endsAt)) errors.push('endsAt_required');
    if (toTime(definition.startsAt) && toTime(definition.endsAt) && toTime(definition.endsAt) <= toTime(definition.startsAt)) {
      errors.push('duration_invalid');
    }
    const metricFields = []
      .concat(definition.successMetrics || [])
      .concat(definition.guardrailMetrics || [])
      .concat((definition.rollbackCriteria || []).map(item => item && item.metric));
    if (metricFields.some(value => unsafeMetricPattern.test(safeString(value)))) errors.push('unsafe_metric_field');
    return {
      valid: errors.length === 0,
      errors: Array.from(new Set(errors)),
      definition: sanitizeExperimentDefinition(definition)
    };
  }

  function sanitizeExperimentDefinition(definition = {}) {
    return {
      id: safeString(definition.id),
      status: safeString(definition.status),
      eligibleRoles: normalizeStringList(definition.eligibleRoles),
      requiredConsent: normalizeStringList(definition.requiredConsent),
      featureFlag: safeString(definition.featureFlag),
      successMetrics: normalizeStringList(definition.successMetrics),
      guardrailMetrics: normalizeStringList(definition.guardrailMetrics),
      rollbackCriteria: Array.isArray(definition.rollbackCriteria) ? definition.rollbackCriteria.map(item => ({
        metric: safeString(item && item.metric),
        operator: safeString(item && item.operator),
        threshold: Number(item && item.threshold) || 0
      })) : [],
      startsAt: safeIso(definition.startsAt),
      endsAt: safeIso(definition.endsAt)
    };
  }

  function result(allowed, reason, experimentId) {
    return { allowed, reason, experimentId };
  }

  function safeString(value) {
    return String(value || '').trim().slice(0, 120);
  }

  function normalizeStringList(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
  }

  function toTime(value) {
    const time = new Date(value || '').getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function safeIso(value) {
    const time = toTime(value);
    return time ? new Date(time).toISOString() : '';
  }

  return {
    evaluateExperimentEnrollment,
    validateExperimentDefinition
  };
});
