(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAppTelemetryDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const privacy = root.GrammarQuestAppTelemetryPrivacy ||
    (typeof require === 'function' ? require('./app-telemetry-privacy') : null);
  const EVENT_TYPES = new Set([
    'app_error',
    'route_load_failed',
    'service_worker_failed',
    'resource_load_failed',
    'long_task_detected',
    'page_performance_summary',
    'feature_flag_state'
  ]);

  function normalizeAppTelemetryEvent(event, options = {}) {
    const input = event && typeof event === 'object' ? event : {};
    const type = String(input.type || '').trim();
    if (!EVENT_TYPES.has(type)) throw new Error(`app_telemetry_unknown_type:${type}`);
    const now = typeof options.now === 'function' ? options.now : () => new Date();
    const normalized = privacy.sanitizeAppTelemetryPayload({
      type,
      appVersion: safeString(input.appVersion || options.appVersion),
      route: privacy.stripQuery(input.route || options.route || '/'),
      category: normalizeCategory(input.category || input.message || type),
      severity: normalizeSeverity(input.severity),
      featureFlags: input.featureFlags || options.featureFlags || {},
      timing: normalizeTiming(input.timing),
      occurredAt: safeIso(input.occurredAt) || now().toISOString()
    });
    privacy.assertAppTelemetryPrivacy(normalized);
    return normalized;
  }

  function normalizeCategory(value) {
    const text = String(value || '').toLowerCase();
    if (text.includes('typeerror') || text.includes('type_error')) return 'type_error';
    if (text.includes('promise') || text.includes('unhandled')) return 'unhandled_rejection';
    if (text.includes('service')) return 'service_worker_failed';
    if (text.includes('resource') || text.includes('script') || text.includes('stylesheet')) return 'resource_load_failed';
    if (text.includes('route')) return 'route_load_failed';
    if (text.includes('long')) return 'long_task';
    return text.replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'unknown';
  }

  function normalizeSeverity(value) {
    const severity = String(value || '').toLowerCase();
    if (severity === 'info' || severity === 'warn' || severity === 'error') return severity;
    return severity === 'critical' || severity === 'fatal' ? 'error' : 'warn';
  }

  function normalizeTiming(timing) {
    const input = timing && typeof timing === 'object' ? timing : {};
    return Object.keys(input).sort().reduce((result, key) => {
      const value = Math.round(Number(input[key]));
      if (Number.isFinite(value) && value >= 0) result[key] = Math.min(value, getTimingLimit(key));
      return result;
    }, {});
  }

  function getTimingLimit(key) {
    if (/bytes$/i.test(key)) return 25 * 1024 * 1024;
    if (/count$/i.test(key)) return 100 * 1000;
    return 60 * 1000;
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').slice(0, 80);
  }

  return {
    EVENT_TYPES: Array.from(EVENT_TYPES),
    normalizeAppTelemetryEvent
  };
});
