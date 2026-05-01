(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestFailureInjectionDrillPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_FAILURE_MODES = Object.freeze([
    'stale_manifest',
    'bad_signature',
    'selection_api_downtime',
    'quota_pressure',
    'auth_session_outage',
    'learner_sync_conflict',
    'telemetry_endpoint_failure'
  ]);
  const APPROVED_COMMAND_PREFIXES = Object.freeze(['npm run ', 'node --test ', 'node scripts/']);
  const UNSAFE_OUTPUT_FIELDS = new Set([
    'learnerid',
    'studentid',
    'question',
    'choices',
    'answer',
    'explanation',
    'prompt',
    'email',
    'token',
    'credential',
    'credentials',
    'rawstacktrace',
    'stack'
  ]);

  const DEFAULT_FAILURE_INJECTION_DRILL_POLICY = Object.freeze({
    schemaVersion: 1,
    drills: Object.freeze([
      drill({
        id: 'stale_manifest_drill',
        label: 'Stale manifest',
        failureMode: 'stale_manifest',
        owner: 'content-operations',
        sloObjectiveId: 'content_publication_freshness',
        runbook: 'docs/operations/runbook-stale-question-artifacts.md',
        rollbackLever: 'Roll back to the last approved release manifest and regenerate stale artifacts.',
        verificationCommand: 'npm run release:manifest',
        steps: [
          'Serve an older synthetic release manifest beside current generated chunks.',
          'Load the public topic index and confirm stale artifact detection is reported.',
          'Verify rollback points to the last approved manifest without reading learner records.'
        ],
        expectedSignals: ['stale_artifact_detected', 'release_manifest_fresh'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      }),
      drill({
        id: 'bad_signature_drill',
        label: 'Bad signature',
        failureMode: 'bad_signature',
        owner: 'platform',
        sloObjectiveId: 'chunk_hydration_success',
        runbook: 'docs/operations/runbook-bad-selection-signature.md',
        rollbackLever: 'Reject the signed response and fall back to local deterministic question selection.',
        verificationCommand: 'node --test tests/question-selection-signing.test.js',
        steps: [
          'Inject a synthetic selection response with a mismatched signature.',
          'Confirm the verifier rejects the response before hydration.',
          'Verify local deterministic selection remains available.'
        ],
        expectedSignals: ['selection_signature_invalid', 'selection_api_fallback'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      }),
      drill({
        id: 'selection_api_downtime_drill',
        label: 'Selection API downtime',
        failureMode: 'selection_api_downtime',
        owner: 'platform',
        sloObjectiveId: 'selection_api_readiness',
        runbook: 'docs/operations/runbook-selection-api-failure.md',
        rollbackLever: 'Disable server selection or narrow the pilot domain flags.',
        verificationCommand: 'node --test tests/question-selection-service.test.js tests/question-selection-runtime-contract.test.js',
        steps: [
          'Point the selection service adapter at an unavailable synthetic endpoint.',
          'Confirm public quiz start falls back to local selection.',
          'Verify readiness evidence shows selection API unavailable without learner payloads.'
        ],
        expectedSignals: ['selection_health_not_ready', 'selection_api_fallback'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      }),
      drill({
        id: 'quota_pressure_drill',
        label: 'Quota pressure',
        failureMode: 'quota_pressure',
        owner: 'platform',
        sloObjectiveId: 'offline_recovery_success',
        runbook: 'docs/operations/runbook-offline-cache-issue.md',
        rollbackLever: 'Reduce preloaded chunks and keep only required shell and quiz assets cached.',
        verificationCommand: 'node --test tests/service-worker-cache.test.js tests/operational-cost-budget.test.js',
        steps: [
          'Simulate cache quota pressure using synthetic required and preload chunk metadata.',
          'Confirm cache cleanup keeps shell and required chunks before preload assets.',
          'Verify operational cost diagnostics stay aggregate.'
        ],
        expectedSignals: ['cache_quota_pressure', 'offline_cache_recovery'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      }),
      drill({
        id: 'auth_session_outage_drill',
        label: 'Auth/session outage',
        failureMode: 'auth_session_outage',
        owner: 'platform',
        sloObjectiveId: 'learner_sync_success',
        runbook: 'docs/operations/runbook-auth-session-outage.md',
        rollbackLever: 'Treat expired sessions as signed out and preserve local parent-preview and practice flows.',
        verificationCommand: 'node --test tests/session-domain.test.js tests/auth-service-contract.test.js',
        steps: [
          'Expire a synthetic session and deny account-backed capabilities.',
          'Confirm signed-out state clears privileged role and managed learner selection.',
          'Verify local practice and parent-preview state remain separate.'
        ],
        expectedSignals: ['auth_session_expired', 'sync_failed'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      }),
      drill({
        id: 'learner_sync_conflict_drill',
        label: 'Learner sync conflict',
        failureMode: 'learner_sync_conflict',
        owner: 'data-platform',
        sloObjectiveId: 'learner_sync_success',
        runbook: 'docs/operations/runbook-learner-sync-failure.md',
        rollbackLever: 'Pause account-backed sync and keep local-first learner state active.',
        verificationCommand: 'node --test tests/learner-state-sync-domain.test.js tests/learner-state-sync-adapter-contract.test.js',
        steps: [
          'Create conflicting synthetic learner-state revisions with no real identifiers.',
          'Confirm merge resolution preserves local-first progress boundaries.',
          'Verify failed sync diagnostics contain only aggregate status and revision counts.'
        ],
        expectedSignals: ['sync_conflict_detected', 'sync_failed'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      }),
      drill({
        id: 'telemetry_endpoint_failure_drill',
        label: 'Telemetry endpoint failure',
        failureMode: 'telemetry_endpoint_failure',
        owner: 'platform',
        sloObjectiveId: 'quiz_start_success',
        runbook: 'docs/operations/runbook-telemetry-outage.md',
        rollbackLever: 'Disable telemetry transport while keeping quiz, dashboard, and offline flows active.',
        verificationCommand: 'node --test tests/app-telemetry.test.js tests/app-telemetry-privacy.test.js',
        steps: [
          'Force the telemetry transport to reject synthetic operational events.',
          'Confirm telemetry failures do not throw into learner-facing flows.',
          'Verify privacy preferences and parent-preview suppression remain enforced.'
        ],
        expectedSignals: ['telemetry_transport_failed', 'quiz_start_completed'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      })
    ])
  });

  function validateFailureInjectionDrillPolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const drills = (Array.isArray(input.drills) ? input.drills : []).map(normalizeDrill);
    const errors = [];
    const ids = new Set();
    const modes = new Set();

    drills.forEach(item => {
      if (!item.id) errors.push('drill id is required');
      if (ids.has(item.id)) errors.push(`${item.id} id must be unique`);
      ids.add(item.id);
      if (!REQUIRED_FAILURE_MODES.includes(item.failureMode)) errors.push(`${item.id} failureMode is not supported`);
      if (modes.has(item.failureMode)) errors.push(`${item.id} failureMode must be unique`);
      modes.add(item.failureMode);
      if (!item.owner) errors.push(`${item.id} owner is required`);
      if (!item.sloObjectiveId) errors.push(`${item.id} sloObjectiveId is required`);
      if (!item.runbook) errors.push(`${item.id} runbook is required`);
      if (!item.rollbackLever) errors.push(`${item.id} rollbackLever is required`);
      if (!isApprovedCommand(item.verificationCommand)) errors.push(`${item.id} verificationCommand must use an approved local command`);
      if (!item.steps.length) errors.push(`${item.id} steps are required`);
      if (!item.expectedSignals.length) errors.push(`${item.id} expectedSignals are required`);
      if (item.usesSyntheticInputs !== true) errors.push(`${item.id} must use synthetic inputs`);
      if (item.mutatesProduction !== false) errors.push(`${item.id} must not mutate production`);
      if (item.requiresLiveCredentials !== false) errors.push(`${item.id} must not require live credentials`);
      if (item.capturesPayload !== false) errors.push(`${item.id} must not capture payloads`);
      item.outputFields.forEach(field => {
        if (UNSAFE_OUTPUT_FIELDS.has(field.toLowerCase())) errors.push(`${item.id} outputFields include unsafe field ${field}`);
      });
    });

    REQUIRED_FAILURE_MODES.forEach(mode => {
      if (!modes.has(mode)) errors.push(`missing required failure mode ${mode}`);
    });

    return {
      valid: errors.length === 0,
      errors,
      policy: {
        schemaVersion: 1,
        drills
      }
    };
  }

  function buildFailureInjectionDrillPlan(policy, options = {}) {
    const validation = validateFailureInjectionDrillPolicy(policy);
    const ids = new Set(normalizeStringArray(options.drillIds));
    const mode = ['local', 'staging'].includes(options.mode) ? options.mode : 'local';
    const drills = validation.policy.drills
      .filter(item => ids.size === 0 || ids.has(item.id))
      .map(item => ({
        id: item.id,
        label: item.label,
        failureMode: item.failureMode,
        owner: item.owner,
        sloObjectiveId: item.sloObjectiveId,
        runbook: item.runbook,
        rollbackLever: item.rollbackLever,
        verificationCommand: item.verificationCommand,
        steps: item.steps.slice(),
        expectedSignals: item.expectedSignals.slice(),
        nextStep: 'Run the listed synthetic setup steps, execute the verification command, and record only sanitized signals.'
      }));

    return {
      schemaVersion: 1,
      ok: validation.valid,
      valid: validation.valid,
      errors: validation.errors,
      mode,
      checkedLiveDependencies: false,
      drills
    };
  }

  function sanitizeFailureInjectionDrillResult(result = {}) {
    return {
      id: safeString(result.id),
      ok: Boolean(result.ok),
      observedSignals: normalizeStringArray(result.observedSignals).map(redactUnsafeText),
      evidenceUrl: stripQueryString(result.evidenceUrl),
      error: redactUnsafeText(result.error),
      action: 'Compare observed signals with the drill runbook, then verify the rollback lever.'
    };
  }

  function drill(input) {
    return Object.freeze(Object.assign({
      usesSyntheticInputs: true,
      mutatesProduction: false,
      requiresLiveCredentials: false,
      capturesPayload: false
    }, input, {
      steps: Object.freeze((input.steps || []).slice()),
      expectedSignals: Object.freeze((input.expectedSignals || []).slice()),
      outputFields: Object.freeze((input.outputFields || []).slice())
    }));
  }

  function normalizeDrill(drill) {
    const input = drill && typeof drill === 'object' ? drill : {};
    return {
      id: safeString(input.id),
      label: safeString(input.label || input.id),
      failureMode: safeString(input.failureMode),
      owner: safeString(input.owner),
      sloObjectiveId: safeString(input.sloObjectiveId),
      runbook: safeString(input.runbook),
      rollbackLever: safeString(input.rollbackLever),
      verificationCommand: safeString(input.verificationCommand),
      steps: normalizeStringArray(input.steps),
      expectedSignals: normalizeStringArray(input.expectedSignals),
      usesSyntheticInputs: input.usesSyntheticInputs === true,
      mutatesProduction: input.mutatesProduction === true,
      requiresLiveCredentials: input.requiresLiveCredentials === true,
      capturesPayload: input.capturesPayload === true,
      outputFields: normalizeStringArray(input.outputFields)
    };
  }

  function isApprovedCommand(command) {
    const normalized = safeString(command);
    if (/[?&=]/.test(normalized)) return false;
    return APPROVED_COMMAND_PREFIXES.some(prefix => normalized.startsWith(prefix));
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function redactUnsafeText(value) {
    const text = safeString(value);
    if (/^(token|learnerId|studentId|email|credential|credentials)=/i.test(text)) return '[redacted]';
    return text
      .replace(/\b(token|learnerId|studentId|email|credential|credentials)=([^\s&]+)/gi, '$1=[redacted]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
      .replace(/\b(raw stack|raw stack trace|stack trace)\b/gi, 'stack trace');
  }

  function stripQueryString(value) {
    const text = safeString(value);
    if (!text) return '';
    try {
      const url = new URL(text);
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch (_error) {
      return text.split('?')[0];
    }
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_FAILURE_INJECTION_DRILL_POLICY,
    REQUIRED_FAILURE_MODES,
    buildFailureInjectionDrillPlan,
    sanitizeFailureInjectionDrillResult,
    validateFailureInjectionDrillPolicy
  };
});
