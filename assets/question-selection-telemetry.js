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
    'grammarquest:question-selection-completed',
    'grammarquest:review-queue-generated',
    'grammarquest:review-item-stale-ref',
    'grammarquest:review-quiz-started',
    'grammarquest:review-quiz-completed',
    'grammarquest:weak-skill-recommendations-generated',
    'grammarquest:weak-skill-recommendation-clicked'
  ];

  const EVENT_MAP = {
    'grammarquest:question-selection-started': 'selection.started',
    'grammarquest:question-selection-api-used': 'selection.api_used',
    'grammarquest:question-selection-fallback': 'selection.fallback',
    'grammarquest:question-selection-completed': 'selection.completed',
    'grammarquest:review-queue-generated': 'review.queue_generated',
    'grammarquest:review-item-stale-ref': 'review.item_stale_ref',
    'grammarquest:review-quiz-started': 'review.quiz_started',
    'grammarquest:review-quiz-completed': 'review.quiz_completed',
    'grammarquest:weak-skill-recommendations-generated': 'recommendation.generated',
    'grammarquest:weak-skill-recommendation-clicked': 'recommendation.clicked'
  };

  const UNSAFE_TELEMETRY_FIELDS = [
    'question',
    'choices',
    'answer',
    'explanation',
    'explanations',
    'questionSnapshots',
    'learnerAnswer',
    'studentName',
    'parentName',
    'userId',
    'uid',
    'activeStudentId',
    'role',
    'capabilities',
    'authToken',
    'email',
    'error',
    'stack',
    'localStorage'
  ];

  const privacyDomain = root.GrammarQuestPrivacyPreferencesDomain ||
    (typeof require === 'function' ? require('./privacy-preferences-domain') : null);

  function normalizeSelectionTelemetry(eventName, detail, options = {}) {
    const input = detail && typeof detail === 'object' ? detail : {};
    const normalizedEventName = EVENT_MAP[eventName] || 'selection.unknown';
    const source = safeSource(input.source || input.selectionSource);
    const requestedCount = safeNonNegativeInt(input.requestedQuestionCount || input.requestedCount);
    const selectedCount = safeNonNegativeInt(input.selectedQuestionCount || input.selectedCount);
    const hydrateLatencyMs = safeNonNegativeNumber(input.hydrateMs || input.hydrateLatencyMs);
    const policyVersion = safeNonNegativeInt(input.selectionPolicyVersion || input.policyVersion);
    const now = typeof options.now === 'function' ? options.now : () => new Date();
    if (normalizedEventName.startsWith('recommendation.')) {
      return {
        event: normalizedEventName,
        eventName: normalizedEventName,
        eventVersion: 1,
        occurredAt: safeIsoTimestamp(input.occurredAt) || now().toISOString(),
        recommendationCount: safeNonNegativeInt(input.recommendationCount),
        reasonCode: safeRecommendationReason(input.reasonCode),
        skillId: safeSkillId(input.skillId),
        targetType: safeRecommendationTarget(input.targetType)
      };
    }
    const normalized = {
      event: normalizedEventName,
      eventName: normalizedEventName,
      eventVersion: 1,
      occurredAt: safeIsoTimestamp(input.occurredAt) || now().toISOString(),
      domain: safeString(input.domain),
      mode: safeString(input.mode),
      source,
      selectionSource: source,
      setCount: safeNonNegativeInt(input.setCount),
      requestedQuestionCount: requestedCount,
      requestedCount,
      selectedQuestionCount: selectedCount,
      selectedCount,
      requestBytes: safeNonNegativeInt(input.requestBytes),
      responseBytes: safeNonNegativeInt(input.responseBytes),
      selectionMs: safeNonNegativeNumber(input.selectionMs),
      hydrateMs: hydrateLatencyMs,
      hydrateLatencyMs,
      fallbackReason: eventName === 'grammarquest:question-selection-fallback'
        ? categorizeFallbackReason(input.fallbackReason || input.reason)
        : '',
      routeType: safeString(input.routeType),
      selectionPolicyVersion: policyVersion,
      policyVersion,
      sourceHash: safeString(input.sourceHash)
    };
    if (normalizedEventName.startsWith('review.')) {
      normalized.source = safeReviewSource(input.source || input.selectionSource);
      normalized.selectionSource = normalized.source;
      normalized.queueId = safeString(input.queueId);
      normalized.itemCount = safeNonNegativeInt(input.itemCount);
      normalized.staleRefCount = safeNonNegativeInt(input.staleRefCount);
    }
    return normalized;
  }

  function installSelectionTelemetrySink(options = {}) {
    const target = options.target || root;
    if (!target || typeof target.addEventListener !== 'function') return { uninstall() {} };
    const sampleRate = clampSampleRate(options.sampleRate);
    const random = typeof options.random === 'function' ? options.random : Math.random;
    const transport = getTransport(options);

    const handlers = EVENT_NAMES.map(eventName => {
      const handler = event => {
        if (!canSendSelectionTelemetry(options)) return;
        if (sampleRate < 1 && random() >= sampleRate) return;
        const normalized = normalizeSelectionTelemetry(eventName, event && event.detail, options);
        try {
          assertSelectionTelemetryPrivacy(normalized);
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

  function assertSelectionTelemetryPrivacy(event) {
    scanUnsafeTelemetry(event, []);
    return true;
  }

  function scanUnsafeTelemetry(value, path) {
    if (!value || typeof value !== 'object') return;
    Object.keys(value).forEach(key => {
      if (UNSAFE_TELEMETRY_FIELDS.includes(key)) {
        throw new Error(`unsafe telemetry field: ${path.concat(key).join('.')}`);
      }
      scanUnsafeTelemetry(value[key], path.concat(key));
    });
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

  function canSendSelectionTelemetry(options) {
    if (privacyDomain && typeof privacyDomain.canSendTelemetry === 'function') {
      return privacyDomain.canSendTelemetry(Object.assign({}, options, {
        type: 'selection'
      }));
    }
    return options.enabled === true;
  }

  function safeString(value) {
    return String(value || '').slice(0, 80);
  }

  function safeSource(value) {
    const source = safeString(value);
    return ['api', 'chunks', 'fallback', 'disabled'].includes(source) ? source : '';
  }

  function safeReviewSource(value) {
    const source = safeString(value);
    return source === 'review' ? source : safeSource(source);
  }

  function safeRecommendationReason(value) {
    const reason = safeString(value);
    return /^[a-z0-9_-]+$/.test(reason) ? reason : '';
  }

  function safeSkillId(value) {
    const skillId = safeString(value);
    return /^[a-z0-9.-]+$/.test(skillId) ? skillId : '';
  }

  function safeRecommendationTarget(value) {
    const targetType = safeString(value);
    return ['subtopic', 'assignment', 'review', 'practice-plan', 'dashboard'].includes(targetType) ? targetType : '';
  }

  function safeNonNegativeInt(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function safeNonNegativeNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  function safeIsoTimestamp(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function clampSampleRate(value) {
    if (value === undefined) return 1;
    const number = Number(value);
    if (!Number.isFinite(number)) return 1;
    return Math.max(0, Math.min(1, number));
  }

  return {
    assertSelectionTelemetryPrivacy,
    categorizeFallbackReason,
    canSendSelectionTelemetry,
    installSelectionTelemetrySink,
    normalizeSelectionTelemetry
  };
});
