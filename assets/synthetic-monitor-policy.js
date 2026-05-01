(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSyntheticMonitorPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const VALID_METHODS = new Set(['GET', 'HEAD']);
  const DEFAULT_ACTION = 'Open the linked runbook for this monitor and validate the public route or health surface.';
  const PRIVATE_KEYS = new Set([
    'learnerId',
    'studentId',
    'question',
    'choices',
    'answer',
    'explanation',
    'prompt',
    'responseBody',
    'body',
    'stack',
    'token',
    'authToken',
    'email'
  ]);

  const DEFAULT_SYNTHETIC_MONITOR_POLICY = Object.freeze({
    schemaVersion: 1,
    monitors: Object.freeze([
      monitor({
        id: 'home_page_shell',
        label: 'Home page shell',
        targetPath: '/index.html',
        assertions: ['status:200', 'body:English Grammar'],
        sloObjectiveId: 'quiz_start_success',
        runbook: 'docs/operations/runbook-stale-question-artifacts.md',
        nextStep: 'Check the home page shell, static asset release, and stale artifact runbook.'
      }),
      monitor({
        id: 'topic_index_manifest',
        label: 'Topic index and manifest',
        targetPath: '/topics.html',
        assertions: ['status:200', 'body:topic'],
        sloObjectiveId: 'content_publication_freshness',
        runbook: 'docs/operations/runbook-stale-question-artifacts.md',
        nextStep: 'Check topic index freshness, release manifest generation, and stale artifact recovery.'
      }),
      monitor({
        id: 'subtopic_quiz_start',
        label: 'Subtopic quiz start',
        targetPath: '/quiz.html',
        assertions: ['status:200', 'body:quiz'],
        sloObjectiveId: 'quiz_start_success',
        runbook: 'docs/operations/runbook-stale-question-artifacts.md',
        nextStep: 'Check quiz route loading, generated question chunks, and the quiz start SLO.'
      }),
      monitor({
        id: 'selection_health_readiness',
        label: 'Selection API readiness',
        targetPath: '/api/question-selection/health',
        assertions: ['status:200'],
        sloObjectiveId: 'selection_api_readiness',
        runbook: 'docs/operations/runbook-selection-api-failure.md',
        nextStep: 'Check Selection API readiness, signature configuration, and server-selection rollback flags.'
      }),
      monitor({
        id: 'offline_fallback',
        label: 'Offline fallback metadata',
        targetPath: '/offline.html',
        assertions: ['status:200', 'body:offline'],
        sloObjectiveId: 'offline_recovery_success',
        runbook: 'docs/operations/runbook-offline-cache-issue.md',
        nextStep: 'Check offline fallback shell, service-worker cache metadata, and recovery instructions.'
      }),
      monitor({
        id: 'admin_readiness_metadata',
        label: 'Admin readiness metadata',
        targetPath: '/admin.html',
        assertions: ['status:200', 'body:admin'],
        sloObjectiveId: 'content_publication_freshness',
        runbook: 'docs/operations/runbook-content-publication-rollback.md',
        nextStep: 'Check admin readiness metadata and content publication rollback signals.'
      })
    ])
  });

  function validateSyntheticMonitorPolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const monitors = (Array.isArray(input.monitors) ? input.monitors : []).map(normalizeMonitor);
    const errors = [];
    const ids = new Set();

    monitors.forEach(item => {
      if (!item.id) errors.push('monitor id is required');
      if (ids.has(item.id)) errors.push(`${item.id} id must be unique`);
      ids.add(item.id);
      if (!item.label) errors.push(`${item.id} label is required`);
      if (!VALID_METHODS.has(item.method)) errors.push(`${item.id} method must be GET or HEAD`);
      if (!item.targetPath.startsWith('/')) errors.push(`${item.id} targetPath must start with /`);
      if (item.targetPath.includes('?')) errors.push(`${item.id} targetPath must not include a query string`);
      if (!(item.timeoutMs >= 3000 && item.timeoutMs <= 15000)) errors.push(`${item.id} timeoutMs must be between 3000 and 15000`);
      if (item.mutatesState !== false) errors.push(`${item.id} must not mutate production state`);
      if (item.capturesPayload !== false) errors.push(`${item.id} must not capture payloads`);
      if (item.requiresCredentials !== false) errors.push(`${item.id} must not require credentials`);
      if (!item.assertions.length) errors.push(`${item.id} assertions are required`);
      if (!item.runbook) errors.push(`${item.id} runbook is required`);
      if (!item.sloObjectiveId) errors.push(`${item.id} sloObjectiveId is required`);
    });

    return {
      valid: errors.length === 0,
      errors,
      policy: {
        schemaVersion: 1,
        monitors
      }
    };
  }

  function sanitizeSyntheticMonitorResult(result) {
    const input = result && typeof result === 'object' ? result : {};
    const sanitized = {};

    Object.keys(input).forEach(key => {
      if (PRIVATE_KEYS.has(key)) return;
      const value = input[key];
      if (value === undefined || value === null) return;
      if (key === 'targetUrl') {
        sanitized.targetUrl = stripUrlQuery(value);
      } else if (key === 'error') {
        sanitized.error = redactSecretText(value);
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
    });

    if (!sanitized.action) sanitized.action = DEFAULT_ACTION;
    return sanitized;
  }

  function buildSyntheticFailureSummary(policy, results = []) {
    const validation = validateSyntheticMonitorPolicy(policy);
    const monitorById = new Map(validation.policy.monitors.map(monitor => [monitor.id, monitor]));
    const failures = (Array.isArray(results) ? results : [])
      .filter(result => !result?.ok)
      .map(result => {
        const sanitized = sanitizeSyntheticMonitorResult(result);
        const monitor = monitorById.get(sanitized.id) || {};
        return {
          id: sanitized.id,
          label: monitor.label || sanitized.id,
          status: sanitized.status || null,
          targetUrl: sanitized.targetUrl || '',
          runbook: monitor.runbook || '',
          sloObjectiveId: monitor.sloObjectiveId || '',
          nextStep: monitor.nextStep || DEFAULT_ACTION
        };
      });

    return {
      ok: validation.valid && failures.length === 0,
      valid: validation.valid,
      errors: validation.errors,
      total: Array.isArray(results) ? results.length : 0,
      failed: failures.length,
      failures
    };
  }

  function monitor(input) {
    return Object.freeze(Object.assign({
      method: 'GET',
      timeoutMs: 8000,
      mutatesState: false,
      capturesPayload: false,
      requiresCredentials: false
    }, input, {
      assertions: Object.freeze((input.assertions || []).slice())
    }));
  }

  function normalizeMonitor(monitor) {
    const input = monitor && typeof monitor === 'object' ? monitor : {};
    return {
      id: safeString(input.id),
      label: safeString(input.label || input.id),
      targetPath: safeString(input.targetPath),
      method: safeString(input.method || 'GET').toUpperCase(),
      timeoutMs: Number(input.timeoutMs ?? 8000),
      mutatesState: input.mutatesState === true,
      capturesPayload: input.capturesPayload === true,
      requiresCredentials: input.requiresCredentials === true,
      assertions: normalizeStringArray(input.assertions),
      runbook: safeString(input.runbook),
      sloObjectiveId: safeString(input.sloObjectiveId),
      nextStep: safeString(input.nextStep)
    };
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function redactSecretText(value) {
    return safeString(value)
      .replace(/\b(token|authToken|learnerId|studentId|email)=([^&\s]+)/gi, '$1=[redacted]')
      .slice(0, 180);
  }

  function stripUrlQuery(value) {
    try {
      const url = new URL(String(value));
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch {
      return safeString(value).split('?')[0].split('#')[0];
    }
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_SYNTHETIC_MONITOR_POLICY,
    buildSyntheticFailureSummary,
    sanitizeSyntheticMonitorResult,
    validateSyntheticMonitorPolicy
  };
});
