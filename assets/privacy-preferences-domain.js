(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestPrivacyPreferencesDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DEFAULT_POLICY_VERSION = 1;
  const TELEMETRY_TYPES = Object.freeze({
    SELECTION: 'selection',
    ERROR: 'error',
    PERFORMANCE: 'performance',
    EXPERIMENT: 'experiment'
  });

  function normalizePrivacyPreferences(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    const telemetryEnabled = input.optOut === true ? false : input.telemetryEnabled === true;
    return {
      schemaVersion: 1,
      telemetryEnabled,
      errorTelemetryEnabled: telemetryEnabled && input.errorTelemetryEnabled === true,
      performanceTelemetryEnabled: telemetryEnabled && input.performanceTelemetryEnabled === true,
      experimentParticipationEnabled: telemetryEnabled && input.experimentParticipationEnabled === true,
      updatedAt: safeIso(input.updatedAt),
      updatedBy: safeString(input.updatedBy || input.actorId || input.userId),
      policyVersion: safePositiveInt(input.policyVersion, DEFAULT_POLICY_VERSION)
    };
  }

  function applyPrivacyPreferenceUpdate(current, patch, options = {}) {
    const previous = normalizePrivacyPreferences(current);
    const input = patch && typeof patch === 'object' ? patch : {};
    const merged = Object.assign({}, previous, {
      telemetryEnabled: hasOwn(input, 'telemetryEnabled') ? input.telemetryEnabled : previous.telemetryEnabled,
      errorTelemetryEnabled: hasOwn(input, 'errorTelemetryEnabled') ? input.errorTelemetryEnabled : previous.errorTelemetryEnabled,
      performanceTelemetryEnabled: hasOwn(input, 'performanceTelemetryEnabled') ? input.performanceTelemetryEnabled : previous.performanceTelemetryEnabled,
      experimentParticipationEnabled: hasOwn(input, 'experimentParticipationEnabled') ? input.experimentParticipationEnabled : previous.experimentParticipationEnabled,
      updatedAt: typeof options.now === 'function' ? options.now() : input.updatedAt || previous.updatedAt,
      updatedBy: options.actorId || input.updatedBy || previous.updatedBy,
      policyVersion: options.policyVersion || input.policyVersion || previous.policyVersion
    });
    return normalizePrivacyPreferences(merged);
  }

  function canSendTelemetry(options = {}) {
    if (options.enabled !== true) return false;
    if (isParentPreview(options)) return false;
    if (!hasTelemetryConsent(options.consent)) return false;
    const preferences = normalizePrivacyPreferences(options.preferences || options.privacyPreferences);
    if (!preferences.telemetryEnabled) return false;
    const type = normalizeTelemetryType(options.type || options.telemetryType || 'selection');
    if (type === TELEMETRY_TYPES.ERROR) return preferences.errorTelemetryEnabled === true;
    if (type === TELEMETRY_TYPES.PERFORMANCE) return preferences.performanceTelemetryEnabled === true;
    if (type === TELEMETRY_TYPES.EXPERIMENT) return preferences.experimentParticipationEnabled === true;
    return true;
  }

  function hasTelemetryConsent(consent) {
    return !!(consent && consent.telemetry === true && consent.optOut !== true);
  }

  function isParentPreview(options) {
    return options.parentPreview === true || options.parentBrowse === true || options.parentMode === true ||
      options.previewMode === 'parent' || options.mode === 'parent_preview';
  }

  function normalizeTelemetryType(type) {
    const value = safeString(type).toLowerCase();
    if (value.includes('error') || value.includes('resource')) return TELEMETRY_TYPES.ERROR;
    if (value.includes('perf') || value.includes('timing') || value.includes('metric')) return TELEMETRY_TYPES.PERFORMANCE;
    if (value.includes('experiment')) return TELEMETRY_TYPES.EXPERIMENT;
    return TELEMETRY_TYPES.SELECTION;
  }

  function safeString(value) {
    return String(value || '').trim().slice(0, 120);
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safePositiveInt(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  return {
    TELEMETRY_TYPES,
    applyPrivacyPreferenceUpdate,
    canSendTelemetry,
    hasTelemetryConsent,
    isParentPreview,
    normalizePrivacyPreferences,
    normalizeTelemetryType
  };
});
