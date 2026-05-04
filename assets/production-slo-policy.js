(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestProductionSloPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const VALID_WINDOWS = new Set(['7d', '14d', '30d']);

  const DEFAULT_PRODUCTION_SLO_POLICY = Object.freeze({
    schemaVersion: 1,
    objectives: Object.freeze([
      objective({
        id: 'quiz_start_success',
        label: 'Quiz start success',
        owner: 'platform',
        measurementWindow: '30d',
        target: 0.998,
        errorBudget: 0.002,
        telemetrySignals: ['route_load_failed', 'question_loader_failed', 'quiz_start_completed'],
        runbook: 'docs/operations/runbook-stale-question-artifacts.md',
        rollback: 'Disable optional enhancements and fall back to generated chunks.'
      }),
      objective({
        id: 'chunk_hydration_success',
        label: 'Question chunk hydration success',
        owner: 'platform',
        measurementWindow: '30d',
        target: 0.995,
        errorBudget: 0.015,
        telemetrySignals: ['resource_load_failed', 'chunk_hydration_failed', 'offline_cache_recovery'],
        runbook: 'docs/operations/runbook-offline-cache-issue.md',
        rollback: 'Regenerate chunks, clear stale service-worker caches, and disable preload expansion.'
      }),
      objective({
        id: 'selection_api_readiness',
        label: 'Selection API readiness',
        owner: 'platform',
        measurementWindow: '7d',
        target: 0.99,
        errorBudget: 0.05,
        telemetrySignals: ['selection_api_used', 'selection_api_fallback', 'selection_health_not_ready'],
        runbook: 'docs/operations/runbook-selection-api-failure.md',
        rollback: 'Disable server selection or narrow the pilot domain flags.'
      }),
      objective({
        id: 'offline_recovery_success',
        label: 'Offline recovery success',
        owner: 'platform',
        measurementWindow: '30d',
        target: 0.985,
        errorBudget: 0.025,
        telemetrySignals: ['offline_cache_recovery', 'service_worker_failed', 'resource_load_failed'],
        runbook: 'docs/operations/runbook-offline-cache-issue.md',
        rollback: 'Reduce offline cache pressure and refresh shell/cache metadata.'
      }),
      objective({
        id: 'learner_sync_success',
        label: 'Learner state sync success',
        owner: 'data-platform',
        measurementWindow: '14d',
        target: 0.99,
        errorBudget: 0.02,
        telemetrySignals: ['sync_success', 'sync_failed', 'auth_session_expired'],
        runbook: 'docs/operations/runbook-learner-sync-failure.md',
        rollback: 'Pause account-backed sync and keep local-first state active.'
      }),
      objective({
        id: 'content_publication_freshness',
        label: 'Content publication freshness',
        owner: 'content-operations',
        measurementWindow: '30d',
        target: 0.99,
        errorBudget: 0.01,
        telemetrySignals: ['release_manifest_fresh', 'content_publication_failed', 'stale_artifact_detected'],
        runbook: 'docs/operations/runbook-content-publication-rollback.md',
        rollback: 'Roll back to the last approved release manifest and regenerate stale artifacts.'
      }),
      objective({
        id: 'billing_operations_health',
        label: 'Billing operations health',
        owner: 'billing-platform',
        measurementWindow: '7d',
        target: 0.99,
        errorBudget: 0.03,
        telemetrySignals: ['billing_reconciliation_completed', 'billing_missed_webhook_detected', 'billing_provider_health_degraded'],
        runbook: 'docs/billing-operations-jobs.md',
        rollback: 'Pause paid checkout, keep free practice available, and queue billing operations review.'
      }),
      objective({
        id: 'billing_checkout_start_success',
        label: 'Billing checkout start success',
        owner: 'billing-platform',
        measurementWindow: '7d',
        target: 0.995,
        errorBudget: 0.02,
        telemetrySignals: ['billing_checkout_start_completed', 'billing_checkout_start_failed'],
        runbook: 'docs/operations/billing-observability.md',
        rollback: 'Disable paid checkout and keep subscription route read-only.'
      }),
      objective({
        id: 'billing_checkout_completion_webhook_latency',
        label: 'Billing checkout completion webhook latency',
        owner: 'billing-platform',
        measurementWindow: '7d',
        target: 0.99,
        errorBudget: 0.03,
        telemetrySignals: ['billing_webhook_received_within_target', 'billing_webhook_late'],
        runbook: 'docs/operations/billing-observability.md',
        rollback: 'Pause checkout and route parents to pending status copy.'
      }),
      objective({
        id: 'billing_entitlement_update_latency',
        label: 'Billing entitlement update latency',
        owner: 'billing-platform',
        measurementWindow: '7d',
        target: 0.99,
        errorBudget: 0.03,
        telemetrySignals: ['billing_entitlement_projection_updated', 'billing_entitlement_projection_late'],
        runbook: 'docs/operations/billing-observability.md',
        rollback: 'Keep free practice active and queue entitlement review.'
      }),
      objective({
        id: 'billing_renewal_success',
        label: 'Billing renewal success',
        owner: 'billing-policy',
        measurementWindow: '30d',
        target: 0.985,
        errorBudget: 0.04,
        telemetrySignals: ['billing_renewal_succeeded', 'billing_renewal_failed'],
        runbook: 'docs/operations/billing-observability.md',
        rollback: 'Pause renewal expansion and review dunning projections.'
      }),
      objective({
        id: 'billing_provider_api_error_rate',
        label: 'Billing provider API healthy response rate',
        owner: 'billing-platform',
        measurementWindow: '7d',
        target: 0.99,
        errorBudget: 0.05,
        telemetrySignals: ['billing_provider_api_ok', 'billing_provider_api_failed'],
        runbook: 'docs/operations/billing-observability.md',
        rollback: 'Disable provider-dependent checkout surfaces.'
      }),
      objective({
        id: 'billing_page_render_health',
        label: 'Billing page render health',
        owner: 'platform',
        measurementWindow: '7d',
        target: 0.995,
        errorBudget: 0.02,
        telemetrySignals: ['subscription_route_loaded', 'subscription_route_failed'],
        runbook: 'docs/operations/billing-observability.md',
        rollback: 'Keep subscription route in read-only fallback.'
      }),
      objective({
        id: 'billing_webhook_failure_rate',
        label: 'Billing webhook healthy processing rate',
        owner: 'billing-platform',
        measurementWindow: '7d',
        target: 0.995,
        errorBudget: 0.02,
        telemetrySignals: ['billing_webhook_processed', 'billing_webhook_failed'],
        runbook: 'docs/operations/billing-observability.md',
        rollback: 'Pause entitlement-changing billing launches.'
      }),
      objective({
        id: 'billing_refund_dispute_queue_age',
        label: 'Billing refund and dispute queue age',
        owner: 'billing-policy',
        measurementWindow: '7d',
        target: 0.98,
        errorBudget: 0.05,
        telemetrySignals: ['billing_refund_dispute_within_target', 'billing_refund_dispute_overdue'],
        runbook: 'docs/operations/billing-observability.md',
        rollback: 'Escalate support queue and pause checkout expansion.'
      })
    ])
  });

  function validateProductionSloPolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const objectives = (Array.isArray(input.objectives) ? input.objectives : []).map(normalizeObjective);
    const errors = [];
    const ids = new Set();
    objectives.forEach(item => {
      if (!item.id) errors.push('objective id is required');
      if (ids.has(item.id)) errors.push(`${item.id} id must be unique`);
      ids.add(item.id);
      if (!item.owner) errors.push(`${item.id} owner is required`);
      if (!VALID_WINDOWS.has(item.measurementWindow)) errors.push(`${item.id} measurementWindow must be one of 7d, 14d, 30d`);
      if (!(item.target >= 0.9 && item.target <= 0.9999)) errors.push(`${item.id} target must be between 0.9 and 0.9999`);
      if (!(item.errorBudget > 0 && item.errorBudget <= 0.1)) errors.push(`${item.id} errorBudget must be greater than 0 and less than or equal to 0.1`);
      if (!item.telemetrySignals.length) errors.push(`${item.id} telemetrySignals are required`);
      if (!item.runbook) errors.push(`${item.id} runbook is required`);
      if (!item.rollback) errors.push(`${item.id} rollback is required`);
    });
    return {
      valid: errors.length === 0,
      errors,
      policy: {
        schemaVersion: 1,
        objectives
      }
    };
  }

  function buildErrorBudgetSummary(policy, observations = {}) {
    const validation = validateProductionSloPolicy(policy);
    const objectives = validation.policy.objectives.map(item => {
      const observation = observations[item.id] || {};
      const totalEvents = Math.max(0, Math.round(Number(observation.totalEvents) || 0));
      const successfulEvents = Math.max(0, Math.min(totalEvents, Math.round(Number(observation.successfulEvents) || 0)));
      const successRate = totalEvents ? round(successfulEvents / totalEvents) : null;
      const floor = round(item.target - item.errorBudget);
      const status = successRate === null
        ? 'unknown'
        : successRate >= item.target
          ? 'healthy'
          : successRate >= floor
            ? 'burning'
            : 'exhausted';
      return {
        id: item.id,
        label: item.label,
        owner: item.owner,
        measurementWindow: item.measurementWindow,
        target: item.target,
        errorBudget: item.errorBudget,
        totalEvents,
        successfulEvents,
        successRate,
        status,
        runbook: item.runbook,
        rollback: item.rollback
      };
    });
    return {
      schemaVersion: 1,
      valid: validation.valid,
      errors: validation.errors,
      objectives
    };
  }

  function objective(input) {
    return Object.freeze(Object.assign({}, input, {
      telemetrySignals: Object.freeze((input.telemetrySignals || []).slice())
    }));
  }

  function normalizeObjective(objective) {
    const input = objective && typeof objective === 'object' ? objective : {};
    return {
      id: safeString(input.id),
      label: safeString(input.label || input.id),
      owner: safeString(input.owner),
      measurementWindow: safeString(input.measurementWindow),
      target: Number(input.target),
      errorBudget: Number(input.errorBudget),
      telemetrySignals: normalizeStringArray(input.telemetrySignals),
      runbook: safeString(input.runbook),
      rollback: safeString(input.rollback)
    };
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function round(value) {
    return Math.round(value * 10000) / 10000;
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_PRODUCTION_SLO_POLICY,
    buildErrorBudgetSummary,
    validateProductionSloPolicy
  };
});
