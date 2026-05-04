(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestOperationalCostBudget = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ALLOWED_METRICS = new Set([
    'requestCount',
    'chunkBytes',
    'cacheStorageBytes',
    'telemetryVolumeBytes',
    'selectionApiWork',
    'syncPayloadBytes',
    'providerFeesMinor',
    'failedPaymentRecoveryMinor',
    'refundDisputeQueueAgeHours',
    'billingMonitorRequests'
  ]);
  const PRIVATE_KEYS = new Set([
    'learnerId',
    'studentId',
    'question',
    'choices',
    'answer',
    'explanation',
    'prompt',
    'token',
    'authToken',
    'email',
    'stack',
    'responseBody',
    'body',
    'rawProviderPayload',
    'paymentCredential',
    'providerCustomerId'
  ]);

  const DEFAULT_OPERATIONAL_COST_BUDGET_POLICY = Object.freeze({
    schemaVersion: 1,
    budgets: Object.freeze([
      budget({
        id: 'request_count',
        label: 'Request count',
        metric: 'requestCount',
        warn: 80,
        fail: 120,
        unit: 'requests',
        owner: 'platform',
        runbook: 'docs/performance/app-shell-budgets.md',
        mitigation: 'Review route composition, duplicate assets, and optional enhancement loading before increasing request budgets.'
      }),
      budget({
        id: 'chunk_bytes',
        label: 'Chunk bytes',
        metric: 'chunkBytes',
        warn: 512 * 1024,
        fail: 768 * 1024,
        unit: 'bytes',
        owner: 'content-platform',
        runbook: 'docs/performance/question-chunk-preloading.md',
        mitigation: 'Split oversized question chunks or narrow required hydration before widening chunk-byte budgets.'
      }),
      budget({
        id: 'cache_storage_bytes',
        label: 'Cache storage bytes',
        metric: 'cacheStorageBytes',
        warn: 1500 * 1024,
        fail: 2500 * 1024,
        unit: 'bytes',
        owner: 'platform',
        runbook: 'docs/performance/offline-cache-policy.md',
        mitigation: 'Review required cache, preload retention, and service-worker cleanup before increasing cache storage budgets.'
      }),
      budget({
        id: 'telemetry_volume_bytes',
        label: 'Telemetry volume bytes',
        metric: 'telemetryVolumeBytes',
        warn: 64 * 1024,
        fail: 128 * 1024,
        unit: 'bytes',
        owner: 'data-platform',
        runbook: 'docs/telemetry-contract.md',
        mitigation: 'Reduce event frequency or fields; telemetry must remain aggregate and privacy-safe.'
      }),
      budget({
        id: 'selection_api_work',
        label: 'Selection API work',
        metric: 'selectionApiWork',
        warn: 1200,
        fail: 2000,
        unit: 'work units',
        owner: 'platform',
        runbook: 'docs/operations/runbook-selection-api-failure.md',
        mitigation: 'Reduce scanned source sets or candidate questions before widening selection API work budgets.'
      }),
      budget({
        id: 'sync_payload_bytes',
        label: 'Sync payload bytes',
        metric: 'syncPayloadBytes',
        warn: 256 * 1024,
        fail: 512 * 1024,
        unit: 'bytes',
        owner: 'data-platform',
        runbook: 'docs/operations/runbook-learner-sync-failure.md',
        mitigation: 'Compact learner-state deltas and remove redundant fields before increasing sync payload budgets.'
      }),
      budget({
        id: 'provider_fees_minor',
        label: 'Provider fees',
        metric: 'providerFeesMinor',
        warn: 100000,
        fail: 150000,
        unit: 'minor currency units',
        owner: 'finance_owner',
        runbook: 'docs/operations/billing-observability.md',
        mitigation: 'Review provider fee assumptions, target markets, and plan pricing before widening the launch budget.'
      }),
      budget({
        id: 'failed_payment_recovery_minor',
        label: 'Failed-payment recovery costs',
        metric: 'failedPaymentRecoveryMinor',
        warn: 40000,
        fail: 60000,
        unit: 'minor currency units',
        owner: 'billing_policy_owner',
        runbook: 'docs/operations/billing-observability.md',
        mitigation: 'Review dunning volume, retry policy, and support escalation before widening recovery budgets.'
      }),
      budget({
        id: 'refund_dispute_queue_age_hours',
        label: 'Refund and dispute queue age',
        metric: 'refundDisputeQueueAgeHours',
        warn: 48,
        fail: 72,
        unit: 'hours',
        owner: 'billing_policy_owner',
        runbook: 'docs/operations/billing-observability.md',
        mitigation: 'Escalate billing support queue ownership before widening queue age budgets.'
      }),
      budget({
        id: 'billing_monitor_requests',
        label: 'Billing monitor requests',
        metric: 'billingMonitorRequests',
        warn: 400,
        fail: 600,
        unit: 'requests',
        owner: 'operations_owner',
        runbook: 'docs/operations/billing-observability.md',
        mitigation: 'Reduce monitor frequency or target count before increasing synthetic billing monitor traffic.'
      })
    ])
  });

  function validateOperationalCostBudgetPolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const budgets = (Array.isArray(input.budgets) ? input.budgets : []).map(normalizeBudget);
    const errors = [];
    const ids = new Set();

    budgets.forEach(item => {
      if (!item.id) errors.push('budget id is required');
      if (ids.has(item.id)) errors.push(`${item.id} id must be unique`);
      ids.add(item.id);
      if (!item.label) errors.push(`${item.id} label is required`);
      if (!ALLOWED_METRICS.has(item.metric)) errors.push(`${item.id} metric must be one of ${Array.from(ALLOWED_METRICS).join(', ')}`);
      if (!(item.warn > 0)) errors.push(`${item.id} warn must be greater than 0`);
      if (!(item.fail > item.warn)) errors.push(`${item.id} fail must be greater than warn`);
      if (!item.unit) errors.push(`${item.id} unit is required`);
      if (!item.owner) errors.push(`${item.id} owner is required`);
      if (!item.runbook) errors.push(`${item.id} runbook is required`);
      if (!item.mitigation) errors.push(`${item.id} mitigation is required`);
    });

    return {
      valid: errors.length === 0,
      errors,
      policy: {
        schemaVersion: 1,
        budgets
      }
    };
  }

  function evaluateOperationalCostBudget(policy, metrics) {
    const validation = validateOperationalCostBudgetPolicy(policy);
    const safeMetrics = normalizeMetrics(sanitizeOperationalCostDiagnostics(metrics));
    const warnings = [];
    const errors = [];

    validation.policy.budgets.forEach(item => {
      const value = Number(safeMetrics[item.metric]) || 0;
      if (value > item.fail) {
        errors.push(makeFinding(item, value, item.fail));
      } else if (value > item.warn) {
        warnings.push(makeFinding(item, value, item.warn));
      }
    });

    return {
      ok: validation.valid && errors.length === 0,
      valid: validation.valid,
      policyErrors: validation.errors,
      metrics: safeMetrics,
      warnings,
      errors
    };
  }

  function sanitizeOperationalCostDiagnostics(value) {
    return sanitizeValue(value);
  }

  function normalizeMetrics(metrics) {
    const input = metrics && typeof metrics === 'object' ? metrics : {};
    return {
      route: stripUrlQuery(input.route || ''),
      requestCount: boundedNumber(input.requestCount),
      chunkBytes: boundedNumber(input.chunkBytes),
      cacheStorageBytes: boundedNumber(input.cacheStorageBytes),
      telemetryVolumeBytes: boundedNumber(input.telemetryVolumeBytes),
      selectionApiWork: boundedNumber(input.selectionApiWork),
      syncPayloadBytes: boundedNumber(input.syncPayloadBytes),
      providerFeesMinor: boundedNumber(input.providerFeesMinor),
      failedPaymentRecoveryMinor: boundedNumber(input.failedPaymentRecoveryMinor),
      refundDisputeQueueAgeHours: boundedNumber(input.refundDisputeQueueAgeHours),
      billingMonitorRequests: boundedNumber(input.billingMonitorRequests),
      details: input.details && typeof input.details === 'object' ? sanitizeValue(input.details) : undefined
    };
  }

  function makeFinding(budget, value, limit) {
    return {
      id: budget.id,
      metric: budget.metric,
      label: budget.label,
      value,
      limit,
      unit: budget.unit,
      delta: value - limit,
      owner: budget.owner,
      runbook: budget.runbook,
      mitigation: budget.mitigation,
      message: `${budget.label.toLowerCase()} is ${value} ${budget.unit}, over ${limit}`
    };
  }

  function budget(input) {
    return Object.freeze(Object.assign({}, input));
  }

  function normalizeBudget(budget) {
    const input = budget && typeof budget === 'object' ? budget : {};
    return {
      id: safeString(input.id),
      label: safeString(input.label),
      metric: safeString(input.metric),
      warn: Number(input.warn),
      fail: Number(input.fail),
      unit: safeString(input.unit),
      owner: safeString(input.owner),
      runbook: safeString(input.runbook),
      mitigation: safeString(input.mitigation)
    };
  }

  function sanitizeValue(value) {
    if (Array.isArray(value)) return value.map(sanitizeValue).filter(item => item !== undefined);
    if (!value || typeof value !== 'object') {
      return typeof value === 'string' ? redactSecretText(value) : value;
    }

    return Object.keys(value).reduce((result, key) => {
      if (PRIVATE_KEYS.has(key)) return result;
      const sanitized = sanitizeValue(value[key]);
      if (sanitized !== undefined) result[key] = key === 'route' ? stripUrlQuery(sanitized) : sanitized;
      return result;
    }, {});
  }

  function boundedNumber(value) {
    return Math.max(0, Math.round(Number(value) || 0));
  }

  function stripUrlQuery(value) {
    const raw = safeString(value);
    if (!raw) return '';
    try {
      const url = new URL(raw, 'https://grammar.local');
      return url.pathname || '/';
    } catch {
      return raw.split('?')[0].split('#')[0];
    }
  }

  function redactSecretText(value) {
    return safeString(value)
      .replace(/\b(token|authToken|learnerId|studentId|email)=([^&\s]+)/gi, '$1=[redacted]')
      .slice(0, 180);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_OPERATIONAL_COST_BUDGET_POLICY,
    evaluateOperationalCostBudget,
    sanitizeOperationalCostDiagnostics,
    validateOperationalCostBudgetPolicy
  };
});
