(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSelectionTelemetryDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SAFE_EVENT_NAMES = new Set([
    'grammarquest:question-selection-completed',
    'grammarquest:question-selection-fallback',
    'grammarquest:question-selection-failed'
  ]);

  function normalizeSelectionTelemetryEvent(eventName, details = {}, options = {}) {
    const now = typeof options.now === 'function' ? options.now : () => new Date();
    const input = details && typeof details === 'object' ? details : {};
    const normalizedName = SAFE_EVENT_NAMES.has(eventName)
      ? eventName
      : 'grammarquest:question-selection-failed';
    return {
      eventName: normalizedName,
      eventVersion: 1,
      occurredAt: safeIso(input.occurredAt) || now().toISOString(),
      source: safeString(input.source || 'domain'),
      domain: safeString(input.domain),
      requestHash: safeHash(input.requestHash),
      responseDigest: safeHash(input.responseDigest),
      fallbackReason: safeString(input.fallbackReason || input.reason),
      selectedRefCount: Math.max(0, Math.round(Number(input.selectedRefCount) || 0))
    };
  }

  function validateSelectionTelemetryEvent(event) {
    const errors = [];
    const input = event && typeof event === 'object' ? event : {};
    if (!SAFE_EVENT_NAMES.has(input.eventName)) errors.push('selection_telemetry_event_name_invalid');
    if (Number(input.eventVersion) !== 1) errors.push('selection_telemetry_event_version_required');
    if (!safeIso(input.occurredAt)) errors.push('selection_telemetry_occurred_at_required');
    if (!safeString(input.source)) errors.push('selection_telemetry_source_required');
    if (hasUnsafePayload(input)) errors.push('selection_telemetry_must_not_include_payload');
    return errors;
  }

  function hasUnsafePayload(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => {
      if (/question|choices|answer|explanation|studentName|learnerId|email|token|stack/i.test(key)) return true;
      const child = value[key];
      return child && typeof child === 'object' && hasUnsafePayload(child);
    });
  }

  function safeHash(value) {
    const text = safeString(value);
    return /^sha256:[a-f0-9]{8,}$/i.test(text) ? text : '';
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim().slice(0, 120);
  }

  return {
    normalizeSelectionTelemetryEvent,
    validateSelectionTelemetryEvent
  };
});
