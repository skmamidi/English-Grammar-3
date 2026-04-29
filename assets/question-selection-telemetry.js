(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSelectionTelemetry = api;

  if (root && root.GRAMMAR_QUEST_CONFIG && root.GRAMMAR_QUEST_CONFIG.selectionTelemetry) {
    api.installSelectionTelemetrySink(root.GRAMMAR_QUEST_CONFIG.selectionTelemetry);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const EVENT_NAMES = [
    'grammarquest:question-selection-started',
    'grammarquest:question-selection-api-used',
    'grammarquest:question-selection-fallback',
    'grammarquest:question-selection-completed'
  ];

  const EVENT_MAP = {
    'grammarquest:question-selection-started': 'selection.started',
    'grammarquest:question-selection-api-used': 'selection.api_used',
    'grammarquest:question-selection-fallback': 'selection.fallback',
    'grammarquest:question-selection-completed': 'selection.completed'
  };

  function normalizeSelectionTelemetry(eventName, detail) {
    const input = detail && typeof detail === 'object' ? detail : {};
    return {
      event: EVENT_MAP[eventName] || 'selection.unknown',
      domain: safeString(input.domain),
      source: safeSource(input.source),
      setCount: safeNonNegativeInt(input.setCount),
      requestedQuestionCount: safeNonNegativeInt(input.requestedQuestionCount),
      selectedQuestionCount: safeNonNegativeInt(input.selectedQuestionCount),
      requestBytes: safeNonNegativeInt(input.requestBytes),
      responseBytes: safeNonNegativeInt(input.responseBytes),
      selectionMs: safeNonNegativeNumber(input.selectionMs),
      hydrateMs: safeNonNegativeNumber(input.hydrateMs),
      fallbackReason: eventName === 'grammarquest:question-selection-fallback'
        ? categorizeFallbackReason(input.fallbackReason || input.reason)
        : '',
      selectionPolicyVersion: safeNonNegativeInt(input.selectionPolicyVersion)
    };
  }

  function installSelectionTelemetrySink(options = {}) {
    const target = options.target || root;
    if (!target || typeof target.addEventListener !== 'function') return { uninstall() {} };
    const enabled = options.enabled === true;
    const sampleRate = clampSampleRate(options.sampleRate);
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const transport = getTransport(options);

    const handlers = EVENT_NAMES.map(eventName => {
      const handler = event => {
        if (!enabled) return;
        if (sampleRate < 1 && random() >= sampleRate) return;
        const normalized = normalizeSelectionTelemetry(eventName, event && event.detail);
        try {
          transport(normalized);
        } catch (error) {
          // Telemetry must not affect quiz flow.
        }
      };
      target.addEventListener(eventName, handler);
      return { eventName, handler };
    });

    return {
      uninstall() {
        handlers.forEach(({ eventName, handler }) => {
          if (typeof target.removeEventListener === 'function') target.removeEventListener(eventName, handler);
        });
      }
    };
  }

  function categorizeFallbackReason(reason) {
    const text = String(reason || '').toLowerCase();
    if (!text) return '';
    if (text.includes('integrity_failed')) return 'integrity_failed';
    if (text.includes('returned 5') || text.includes('returned 0') || text.includes('no response') || text.includes('failed to fetch')) {
      return 'api_unavailable';
    }
    if (text.includes('contenthash') || text.includes('version') || text.includes('sequence') || text.includes('manifest question') || text.includes('sourceset')) {
      return 'manifest_mismatch';
    }
    if (text.includes('response must be') || text.includes('invalid') || text.includes('no question refs') || text.includes('policy version')) {
      return 'invalid_response';
    }
    if (text.includes('hydrat') || text.includes('refs could not') || text.includes('partially hydrated')) return 'hydrate_failed';
    return 'unknown';
  }

  function getTransport(options) {
    if (typeof options.transport === 'function') return options.transport;
    const endpoint = options.endpoint || '';
    return event => {
      if (!endpoint) return;
      const body = JSON.stringify(event);
      if ((options.transport || 'beacon') === 'beacon' && root.navigator && typeof root.navigator.sendBeacon === 'function') {
        root.navigator.sendBeacon(endpoint, body);
        return;
      }
      if (typeof root.fetch === 'function') {
        root.fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true
        }).catch(() => {});
      }
    };
  }

  function safeString(value) {
    return String(value || '').slice(0, 80);
  }

  function safeSource(value) {
    const source = safeString(value);
    return ['api', 'chunks', 'fallback', 'disabled'].includes(source) ? source : '';
  }

  function safeNonNegativeInt(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function safeNonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function clampSampleRate(value) {
    if (value === undefined) return 1;
    const number = Number(value);
    if (!Number.isFinite(number)) return 1;
    return Math.max(0, Math.min(1, number));
  }

  return {
    categorizeFallbackReason,
    installSelectionTelemetrySink,
    normalizeSelectionTelemetry
  };
});
