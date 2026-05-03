(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBackupRollbackRehearsalPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_REHEARSAL_TYPES = Object.freeze([
    'learner_backup_preview',
    'deletion_tombstone_protection',
    'release_manifest_rollback',
    'stale_artifact_rollback',
    'service_worker_cache_recovery'
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

  const DEFAULT_BACKUP_ROLLBACK_REHEARSAL_POLICY = Object.freeze({
    schemaVersion: 1,
    rehearsals: Object.freeze([
      rehearsal({
        id: 'learner_backup_preview_rehearsal',
        label: 'Learner backup preview',
        type: 'learner_backup_preview',
        owner: 'data-platform',
        runbook: 'docs/operations/backup-restore.md',
        verificationCommand: 'node --test tests/learner-data-lifecycle-domain.test.js tests/learner-progress-transfer-service.test.js',
        steps: [
          'Load a synthetic backup envelope with digest metadata and no raw learner identifiers.',
          'Preview restore through the learner-data lifecycle domain without committing writes.',
          'Confirm the preview reports restorable sections and privacy-safe audit evidence.'
        ],
        nonDestructiveEvidence: ['restore_preview_status', 'backup_digest_verified', 'audit_event_redacted'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      }),
      rehearsal({
        id: 'deletion_tombstone_protection_rehearsal',
        label: 'Deletion tombstone protection',
        type: 'deletion_tombstone_protection',
        owner: 'data-platform',
        runbook: 'docs/operations/backup-restore.md',
        verificationCommand: 'node --test tests/learner-data-lifecycle-domain.test.js tests/learner-data-retention-policy.test.js',
        steps: [
          'Create synthetic backup metadata older than a deletion tombstone.',
          'Run restore preview and confirm stale backup resurrection is denied.',
          'Record only the denial reason, tombstone freshness status, and policy version.'
        ],
        nonDestructiveEvidence: ['restore_denied_by_tombstone', 'tombstone_newer_than_backup', 'policy_version'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      }),
      rehearsal({
        id: 'release_manifest_rollback_rehearsal',
        label: 'Release manifest rollback',
        type: 'release_manifest_rollback',
        owner: 'release-operations',
        runbook: 'docs/operations/release-and-rollback.md',
        verificationCommand: 'npm run release:manifest',
        steps: [
          'Compare the current synthetic release manifest with a prior approved manifest snapshot.',
          'Verify rollback metadata includes public app version, question manifest hash, and feature flags only.',
          'Confirm the rollback target can be regenerated without reading learner records.'
        ],
        nonDestructiveEvidence: ['release_manifest_fresh', 'rollback_target_public_safe', 'feature_flags_validated'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      }),
      rehearsal({
        id: 'stale_artifact_rollback_rehearsal',
        label: 'Stale artifact rollback',
        type: 'stale_artifact_rollback',
        owner: 'content-operations',
        runbook: 'docs/operations/runbook-stale-question-artifacts.md',
        verificationCommand: 'node --test tests/release-manifest.test.js tests/chunk-generation.test.js tests/manifest.test.js',
        steps: [
          'Serve synthetic stale chunk metadata beside the current manifest hash.',
          'Confirm stale artifact detection points operators to the prior approved release manifest.',
          'Verify regenerated chunks and manifests match canonical JSON before promotion.'
        ],
        nonDestructiveEvidence: ['stale_artifact_detected', 'manifest_hash_checked', 'generated_artifacts_current'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      }),
      rehearsal({
        id: 'service_worker_cache_recovery_rehearsal',
        label: 'Service worker cache recovery',
        type: 'service_worker_cache_recovery',
        owner: 'platform',
        runbook: 'docs/operations/runbook-offline-cache-issue.md',
        verificationCommand: 'node --test tests/service-worker-cache.test.js tests/offline-cache-policy.test.js',
        steps: [
          'Simulate an old service-worker cache version with synthetic shell and chunk assets.',
          'Confirm cache cleanup keeps required shell and quiz assets before preload artifacts.',
          'Verify offline recovery evidence contains cache names and counts, not learner data.'
        ],
        nonDestructiveEvidence: ['stale_cache_removed', 'required_assets_retained', 'offline_recovery_ready'],
        outputFields: ['id', 'ok', 'observedSignals', 'evidenceUrl', 'error']
      })
    ])
  });

  function validateBackupRollbackRehearsalPolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const rehearsals = (Array.isArray(input.rehearsals) ? input.rehearsals : []).map(normalizeRehearsal);
    const errors = [];
    const ids = new Set();
    const types = new Set();

    rehearsals.forEach(item => {
      if (!item.id) errors.push('rehearsal id is required');
      if (ids.has(item.id)) errors.push(`${item.id} id must be unique`);
      ids.add(item.id);
      if (!REQUIRED_REHEARSAL_TYPES.includes(item.type)) errors.push(`${item.id} type is not supported`);
      if (types.has(item.type)) errors.push(`${item.id} type must be unique`);
      types.add(item.type);
      if (!item.owner) errors.push(`${item.id} owner is required`);
      if (!item.runbook) errors.push(`${item.id} runbook is required`);
      if (!isApprovedCommand(item.verificationCommand)) errors.push(`${item.id} verificationCommand must use an approved local command`);
      if (!item.steps.length) errors.push(`${item.id} steps are required`);
      if (!item.nonDestructiveEvidence.length) errors.push(`${item.id} nonDestructiveEvidence is required`);
      if (item.usesSyntheticFixtures !== true) errors.push(`${item.id} must use synthetic fixtures`);
      if (item.mutatesProduction !== false) errors.push(`${item.id} must not mutate production`);
      if (item.restoresLiveLearnerRecords !== false) errors.push(`${item.id} must not restore live learner records`);
      if (item.requiresLiveCredentials !== false) errors.push(`${item.id} must not require live credentials`);
      if (item.capturesPayload !== false) errors.push(`${item.id} must not capture payloads`);
      item.outputFields.forEach(field => {
        if (UNSAFE_OUTPUT_FIELDS.has(field.toLowerCase())) errors.push(`${item.id} outputFields include unsafe field ${field}`);
      });
    });

    REQUIRED_REHEARSAL_TYPES.forEach(type => {
      if (!types.has(type)) errors.push(`missing required rehearsal type ${type}`);
    });

    return {
      valid: errors.length === 0,
      errors,
      policy: {
        schemaVersion: 1,
        rehearsals
      }
    };
  }

  function buildBackupRollbackRehearsalPlan(policy, options = {}) {
    const validation = validateBackupRollbackRehearsalPolicy(policy);
    const ids = new Set(normalizeStringArray(options.rehearsalIds));
    const mode = ['local', 'staging'].includes(options.mode) ? options.mode : 'local';
    const rehearsals = validation.policy.rehearsals
      .filter(item => ids.size === 0 || ids.has(item.id))
      .map(item => ({
        id: item.id,
        label: item.label,
        type: item.type,
        owner: item.owner,
        runbook: item.runbook,
        verificationCommand: item.verificationCommand,
        steps: item.steps.slice(),
        nonDestructiveEvidence: item.nonDestructiveEvidence.slice(),
        nextStep: 'Run the listed synthetic rehearsal steps, execute the verification command, and record only non-destructive evidence.'
      }));

    return {
      schemaVersion: 1,
      ok: validation.valid,
      valid: validation.valid,
      errors: validation.errors,
      mode,
      checkedLiveDependencies: false,
      rehearsals
    };
  }

  function sanitizeBackupRollbackRehearsalResult(result = {}) {
    return {
      id: safeString(result.id),
      ok: Boolean(result.ok),
      observedSignals: normalizeStringArray(result.observedSignals).map(redactUnsafeText),
      evidenceUrl: stripQueryString(result.evidenceUrl),
      error: redactUnsafeText(result.error),
      action: 'Compare observed signals with the rehearsal runbook, then record only non-destructive evidence.'
    };
  }

  function rehearsal(input) {
    return Object.freeze(Object.assign({
      usesSyntheticFixtures: true,
      mutatesProduction: false,
      restoresLiveLearnerRecords: false,
      requiresLiveCredentials: false,
      capturesPayload: false
    }, input, {
      steps: Object.freeze((input.steps || []).slice()),
      nonDestructiveEvidence: Object.freeze((input.nonDestructiveEvidence || []).slice()),
      outputFields: Object.freeze((input.outputFields || []).slice())
    }));
  }

  function normalizeRehearsal(rehearsal) {
    const input = rehearsal && typeof rehearsal === 'object' ? rehearsal : {};
    return {
      id: safeString(input.id),
      label: safeString(input.label || input.id),
      type: safeString(input.type),
      owner: safeString(input.owner),
      runbook: safeString(input.runbook),
      verificationCommand: safeString(input.verificationCommand),
      steps: normalizeStringArray(input.steps),
      nonDestructiveEvidence: normalizeStringArray(input.nonDestructiveEvidence),
      usesSyntheticFixtures: input.usesSyntheticFixtures === true,
      mutatesProduction: input.mutatesProduction === true,
      restoresLiveLearnerRecords: input.restoresLiveLearnerRecords === true,
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
      .replace(/\b(raw stack trace|raw stack|stack trace)\b/gi, 'stack trace');
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
    DEFAULT_BACKUP_ROLLBACK_REHEARSAL_POLICY,
    REQUIRED_REHEARSAL_TYPES,
    buildBackupRollbackRehearsalPlan,
    sanitizeBackupRollbackRehearsalResult,
    validateBackupRollbackRehearsalPolicy
  };
});
