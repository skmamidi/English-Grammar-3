(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAppTelemetry = api;

  if (root && root.GRAMMAR_QUEST_CONFIG && root.GRAMMAR_QUEST_CONFIG.appTelemetry) {
    api.installAppTelemetryCapture(root.GRAMMAR_QUEST_CONFIG.appTelemetry);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const domain = root.GrammarQuestAppTelemetryDomain ||
    (typeof require === 'function' ? require('./app-telemetry-domain') : null);
  const privacyDomain = root.GrammarQuestPrivacyPreferencesDomain ||
    (typeof require === 'function' ? require('./privacy-preferences-domain') : null);

  function createAppTelemetrySink(options = {}) {
    const transport = typeof options.transport === 'function' ? options.transport : defaultTransport(options);
    return {
      capture(event) {
        try {
          if (!canSendAppTelemetry(event, options)) return { status: 'disabled' };
          const normalized = domain.normalizeAppTelemetryEvent(event, options);
          transport(normalized);
          return { status: 'sent', event: normalized };
        } catch (error) {
          return { status: 'dropped' };
        }
      }
    };
  }

  function installAppTelemetryCapture(options = {}) {
    const target = options.target || root;
    if (!target || typeof target.addEventListener !== 'function') return { uninstall() {} };
    const sink = createAppTelemetrySink(options);
    const handlers = [
      ['error', event => {
        if (event && event.target && event.target !== target && (event.target.src || event.target.href)) {
          sink.capture({
            type: 'resource_load_failed',
            route: options.route || root.location && root.location.pathname || '/',
            appVersion: options.appVersion,
            category: `${event.target.tagName || 'resource'} load failed`,
            severity: 'warn',
            occurredAt: event.occurredAt,
            featureFlags: options.featureFlags
          });
          return;
        }
        sink.capture({
          type: 'app_error',
          route: options.route || root.location && root.location.pathname || '/',
          appVersion: options.appVersion,
          category: event && event.message || 'window_error',
          severity: 'error',
          featureFlags: options.featureFlags,
          occurredAt: event && event.occurredAt
        });
      }],
      ['unhandledrejection', event => {
        sink.capture({
          type: 'app_error',
          route: options.route || root.location && root.location.pathname || '/',
          appVersion: options.appVersion,
          category: 'unhandled_promise_rejection',
          severity: 'error',
          featureFlags: options.featureFlags,
          occurredAt: event && event.occurredAt
        });
      }]
    ];
    handlers.forEach(([name, handler]) => target.addEventListener(name, handler, true));
    return {
      uninstall() {
        handlers.forEach(([name, handler]) => target.removeEventListener(name, handler, true));
      },
      sink
    };
  }

  function hasConsent(consent) {
    return !!(consent && consent.telemetry === true && consent.optOut !== true);
  }

  function canSendAppTelemetry(event, options) {
    if (privacyDomain && typeof privacyDomain.canSendTelemetry === 'function') {
      return privacyDomain.canSendTelemetry(Object.assign({}, options, {
        type: event && event.type || 'error'
      }));
    }
    return options.enabled === true && hasConsent(options.consent);
  }

  function defaultTransport(options) {
    const endpoint = options.endpoint || '';
    return event => {
      if (!endpoint) return;
      const body = JSON.stringify(event);
      if (root.navigator && typeof root.navigator.sendBeacon === 'function') {
        root.navigator.sendBeacon(endpoint, body);
      } else if (typeof root.fetch === 'function') {
        root.fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true
        }).catch(() => {});
      }
    };
  }

  return {
    createAppTelemetrySink,
    installAppTelemetryCapture
  };
});
