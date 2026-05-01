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
    'feature_flag_state',
    'goal_card_interaction'
  ]);

  function normalizeAppTelemetryEvent(event, options = {}) {
    const input = event && typeof event === 'object' ? event : {};
    const type = String(input.type || '').trim();
    if (!EVENT_TYPES.has(type)) throw new Error(`app_telemetry_unknown_type:${type}`);
    const now = typeof options.now === 'function' ? options.now : () => new Date();
    const payload = {
      type,
      appVersion: safeString(input.appVersion || options.appVersion),
      route: privacy.stripQuery(input.route || options.route || '/'),
      category: normalizeCategory(input.category || input.message || type),
      severity: normalizeSeverity(input.severity),
      featureFlags: input.featureFlags || options.featureFlags || {},
      timing: normalizeTiming(input.timing),
      occurredAt: safeIso(input.occurredAt) || now().toISOString()
    };
    if (type === 'goal_card_interaction') payload.interaction = normalizeInteraction(input.interaction);
    const normalized = privacy.sanitizeAppTelemetryPayload(payload);
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

  function normalizeInteraction(interaction) {
    const input = interaction && typeof interaction === 'object' ? interaction : {};
    const kind = normalizeEnum(input.kind || input.type, ['impression', 'click'], 'impression');
    const cardId = normalizeEnum(input.cardId || input.card, [
      'today_progress',
      'weekly_progress',
      'streak_status',
      'review_status',
      'assignment_status',
      'summary'
    ], 'summary');
    const band = normalizeEnum(input.band || input.summaryBand, [
      'empty',
      'on_track',
      'near_target',
      'behind_target',
      'review_due'
    ], 'empty');
    const roleView = normalizeEnum(input.roleView || input.role, [
      'learner',
      'parent_guardian',
      'teacher'
    ], 'learner');
    return { band, cardId, kind, roleView };
  }

  function normalizeEnum(value, allowed, fallback) {
    const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    return allowed.includes(normalized) ? normalized : fallback;
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
