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

  function result(allowed, reason, experimentId) {
    return { allowed, reason, experimentId };
  }

  function safeString(value) {
    return String(value || '').trim().slice(0, 120);
  }

  return {
    evaluateExperimentEnrollment
  };
});
