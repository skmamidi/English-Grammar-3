const STATUS_READY = 'ready';
const STATUS_DEGRADED = 'degraded';
const STATUS_NOT_READY = 'not_ready';

function buildSelectionHealthSnapshot(config = {}, manifest = {}, options = {}) {
  const cfg = config || {};
  const failureCodes = [];
  const checks = [];
  const allowedDomains = Array.isArray(cfg.allowedDomains)
    ? cfg.allowedDomains.map(item => String(item).trim()).filter(Boolean)
    : [];
  const manifestSummary = summarizeManifest(manifest);
  const signing = summarizeSigning(cfg, options);
  const responseTtlSeconds = Number.isInteger(cfg.responseTtlSeconds) && cfg.responseTtlSeconds > 0
    ? cfg.responseTtlSeconds
    : null;

  if (!manifestSummary.sourceHash || !manifestSummary.sourceType) {
    failureCodes.push('manifest_provenance_missing');
    checks.push(check('manifest_provenance', STATUS_NOT_READY, 'manifest_provenance_missing'));
  } else if (options.expectedSourceHash && manifestSummary.sourceHash !== options.expectedSourceHash) {
    failureCodes.push('manifest_source_hash_stale');
    checks.push(check('manifest_provenance', STATUS_NOT_READY, 'manifest_source_hash_stale'));
  } else {
    checks.push(check('manifest_provenance', STATUS_READY));
  }

  if (!allowedDomains.length) {
    failureCodes.push('rollout_domains_empty');
    checks.push(check('rollout_domains', STATUS_DEGRADED, 'rollout_domains_empty'));
  } else {
    checks.push(check('rollout_domains', STATUS_READY));
  }

  if (signing.required && !signing.ready) {
    if (!cfg.signingKeyId) failureCodes.push('signing_key_id_missing');
    if (!cfg.privateKeyRef) failureCodes.push('private_key_reference_missing');
    if (!options.signerAvailable) failureCodes.push('signer_unavailable');
    if (!signing.activePublicKeyIds.length) failureCodes.push('active_public_keys_missing');
    checks.push(check('signing_readiness', STATUS_NOT_READY, 'signing_not_ready'));
  } else {
    checks.push(check('signing_readiness', STATUS_READY));
  }

  if (!responseTtlSeconds) {
    failureCodes.push('response_ttl_invalid');
    checks.push(check('response_ttl', STATUS_NOT_READY, 'response_ttl_invalid'));
  } else {
    checks.push(check('response_ttl', STATUS_READY));
  }

  if (options.telemetryEnabled === false) {
    failureCodes.push('telemetry_disabled');
    checks.push(check('telemetry', STATUS_DEGRADED, 'telemetry_disabled'));
  } else {
    checks.push(check('telemetry', STATUS_READY));
  }

  const uniqueFailureCodes = Array.from(new Set(failureCodes));
  const status = checks.some(item => item.status === STATUS_NOT_READY)
    ? STATUS_NOT_READY
    : checks.some(item => item.status === STATUS_DEGRADED)
      ? STATUS_DEGRADED
      : STATUS_READY;

  return {
    status,
    checkedAt: safeIsoDate(options.checkedAt),
    runtimeMode: cfg.mode === 'production' ? 'production' : 'local',
    allowedDomains,
    responseTtlSeconds,
    manifest: manifestSummary,
    signing,
    checks,
    failureCodes: uniqueFailureCodes
  };
}

function summarizeManifest(manifest = {}) {
  const artifact = manifest && typeof manifest === 'object' ? manifest.artifact || {} : {};
  const sets = Array.isArray(manifest.sets) ? manifest.sets : [];
  return {
    schemaVersion: Number.isInteger(manifest.schemaVersion) ? manifest.schemaVersion : null,
    artifactType: stringOrNull(artifact.type),
    artifactSchemaVersion: numberOrNull(artifact.artifactSchemaVersion),
    generatorVersion: numberOrNull(artifact.generatorVersion),
    sourceType: stringOrNull(artifact.sourceType),
    sourceHash: stringOrNull(artifact.sourceHash),
    sourceFileCount: Array.isArray(artifact.sourceFiles) ? artifact.sourceFiles.length : 0,
    totalQuestions: numberOrNull(manifest.totalQuestions),
    setCount: sets.length
  };
}

function summarizeSigning(config, options) {
  const required = config.mode === 'production';
  const activePublicKeyIds = Object.keys(options.publicKeys || {}).sort();
  const ready = required
    ? Boolean(config.signingKeyId && config.privateKeyRef && options.signerAvailable && activePublicKeyIds.length)
    : true;
  return {
    mode: required ? 'signed-production' : 'unsigned-local',
    required,
    ready,
    activePublicKeyIds
  };
}

function check(name, status, code) {
  const result = { name, status };
  if (code) result.code = code;
  return result;
}

function safeIsoDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'string' && value) return value;
  return null;
}

function stringOrNull(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function numberOrNull(value) {
  return Number.isInteger(value) ? value : null;
}

module.exports = {
  STATUS_DEGRADED,
  STATUS_NOT_READY,
  STATUS_READY,
  buildSelectionHealthSnapshot
};
