const crypto = require('node:crypto');

const HASH_PATTERN = /^sha256:[a-f0-9]{8,}$/i;
const PAYLOAD_FIELD_PATTERN = /^(question|prompt|choices|correct|answer|answers|explanation|studyAid|generatedVisualScene|visualScene)$/i;

function buildPlatformContentPackageManifest(options = {}) {
  const questionManifest = normalizeObject(options.questionManifest);
  const staticAssetManifest = normalizeObject(options.staticAssetManifest);
  const frontendManifest = normalizeObject(options.frontendManifest);
  const releaseManifest = normalizeObject(options.releaseManifest);
  const questionSourceHash = String(questionManifest.artifact && questionManifest.artifact.sourceHash || releaseManifest.questionManifestSourceHash || '');
  const packageVersion = String(options.packageVersion || releaseManifest.releaseId || 'local');
  const minimumClientVersion = String(options.minimumClientVersion || '1.0.0');
  const compatibilityWindow = normalizeCompatibilityWindow(options.compatibilityWindow);
  const questionSets = Array.isArray(questionManifest.sets) ? questionManifest.sets.map(set => packageSet(set, questionSourceHash)) : [];
  const staticAssets = Array.isArray(staticAssetManifest.files) ? staticAssetManifest.files.map(packageAsset) : [];
  const manifest = {
    schemaVersion: 1,
    kind: 'platform-neutral-content-package',
    packageVersion,
    minimumClientVersion,
    compatibilityWindow,
    questionManifest: {
      sourceHash: questionSourceHash,
      artifactSchemaVersion: Number(questionManifest.artifact && questionManifest.artifact.artifactSchemaVersion) || 0,
      setCount: questionSets.length,
      sets: questionSets
    },
    staticAssetManifest: {
      schemaVersion: Number(staticAssetManifest.schemaVersion) || 0,
      strategy: String(staticAssetManifest.strategy || ''),
      hash: hashObject(staticAssetManifest),
      totalBytes: Number(staticAssetManifest.totals && staticAssetManifest.totals.totalBytes) || 0
    },
    staticAssets,
    frontendManifest: {
      schemaVersion: Number(frontendManifest.schemaVersion) || 0,
      generatedQuestionArtifactsBundled: frontendManifest.generatedQuestionArtifactsBundled === true,
      hash: hashObject(frontendManifest)
    },
    release: {
      releaseId: String(releaseManifest.releaseId || ''),
      serviceWorkerCacheVersion: String(releaseManifest.serviceWorkerCacheVersion || ''),
      featureFlagConfigHash: String(releaseManifest.featureFlagConfigHash || '')
    },
    cache: {
      policy: 'versioned-cacheable',
      serviceWorkerCacheVersion: String(releaseManifest.serviceWorkerCacheVersion || ''),
      maxAgeSeconds: Number(options.maxAgeSeconds) || 604800
    },
    localization: {
      keys: normalizeStringList(options.localizationKeys)
    },
    rollback: {
      packageId: String(options.rollback && options.rollback.packageId || ''),
      releaseId: String(options.rollback && options.rollback.releaseId || '')
    },
    signature: normalizeSignature(options.signature)
  };
  manifest.packageId = `pkg_${hashObject({
    packageVersion,
    questionSourceHash,
    staticAssetManifestHash: manifest.staticAssetManifest.hash,
    releaseId: manifest.release.releaseId
  }).slice('sha256:'.length, 'sha256:'.length + 16)}`;
  return manifest;
}

function validatePlatformContentPackageManifest(manifest) {
  const input = normalizeObject(manifest);
  const errors = [];

  if (input.schemaVersion !== 1) errors.push(error('unsupported_schema_version', 'package schemaVersion must be 1'));
  requireString(input.packageId, 'missing_package_id', errors);
  requireString(input.packageVersion, 'missing_package_version', errors);
  if (!isSupportedClientVersion(input.minimumClientVersion)) errors.push(error('unsupported_minimum_client_version', 'minimum client version must be 1.0.0 or newer'));
  requireHash(input.questionManifest && input.questionManifest.sourceHash, 'missing_question_manifest_source_hash', errors);
  requireHash(input.staticAssetManifest && input.staticAssetManifest.hash, 'missing_static_asset_manifest_hash', errors);
  requireHash(input.frontendManifest && input.frontendManifest.hash, 'missing_frontend_manifest_hash', errors);
  requireString(input.release && input.release.serviceWorkerCacheVersion, 'missing_service_worker_cache_version', errors);
  requireHash(input.release && input.release.featureFlagConfigHash, 'missing_feature_flag_config_hash', errors);
  if (!input.rollback || !input.rollback.packageId || !input.rollback.releaseId) {
    errors.push(error('missing_rollback_pointer', 'package requires a previous package and release rollback pointer'));
  }
  if (!input.signature || input.signature.status !== 'signature-ready' || !input.signature.algorithm || !input.signature.keyId || !HASH_PATTERN.test(input.signature.payloadHash || '')) {
    errors.push(error('missing_signature_metadata', 'package requires signature-ready metadata with public key id and payload hash'));
  }

  const questionSourceHash = input.questionManifest && input.questionManifest.sourceHash;
  (input.questionManifest && input.questionManifest.sets || []).forEach(set => {
    if (!set.id) errors.push(error('missing_set_id', 'package set requires id'));
    if (!set.delivery || !isSafePackagePath(set.delivery.path)) errors.push(error('unsafe_chunk_reference', 'package set delivery path must be a safe relative asset path'));
    if (!set.delivery || set.delivery.sourceHash !== questionSourceHash) errors.push(error('stale_set_source_hash', 'package set source hash must match question manifest source hash'));
  });

  (input.staticAssets || []).forEach(asset => {
    if (!isSafePackagePath(asset.path)) errors.push(error('unsafe_asset_reference', 'static asset path must be a safe relative asset path'));
    if (!/^[a-f0-9]{64}$/i.test(asset.sha256 || '')) errors.push(error('missing_asset_hash', 'static asset requires sha256'));
  });

  const payloadPath = findPayloadField(input);
  if (payloadPath) errors.push(error('payload_field_forbidden', `package metadata must not include ${payloadPath}`));

  return {
    ok: errors.length === 0,
    errors
  };
}

function packageSet(set, defaultSourceHash) {
  const input = normalizeObject(set);
  return {
    id: String(input.id || ''),
    title: String(input.title || ''),
    domain: String(input.domain || ''),
    questionCount: Number(input.questionCount) || 0,
    delivery: {
      mode: input.packedSetFile ? 'packed-set' : 'chunk',
      path: String(input.packedSetFile || input.chunkFile || ''),
      sourceHash: String(input.sourceHash || defaultSourceHash || '')
    }
  };
}

function packageAsset(asset) {
  const input = normalizeObject(asset);
  return {
    path: String(input.path || ''),
    type: String(input.type || ''),
    bytes: Number(input.bytes) || 0,
    sha256: String(input.sha256 || ''),
    cacheCategory: String(input.cacheCategory || ''),
    dimensions: input.dimensions || null
  };
}

function normalizeSignature(signature) {
  const input = normalizeObject(signature);
  const base = {
    status: String(input.status || 'signature-ready'),
    algorithm: String(input.algorithm || 'ed25519'),
    keyId: String(input.keyId || 'public-content-key-local')
  };
  base.payloadHash = String(input.payloadHash || hashObject(base));
  return base;
}

function normalizeCompatibilityWindow(window) {
  const input = normalizeObject(window);
  return {
    min: String(input.min || '1.0.0'),
    max: String(input.max || '1.x')
  };
}

function isSupportedClientVersion(version) {
  const match = String(version || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > 1 || (major === 1 && minor >= 0);
}

function isSafePackagePath(value) {
  const path = String(value || '');
  return /^assets\/[a-z0-9._/-]+$/i.test(path) && !path.includes('..') && !/^https?:/i.test(path);
}

function findPayloadField(value, trail = []) {
  if (!value || typeof value !== 'object') return '';
  return Object.keys(value).map(key => {
    const nextTrail = trail.concat(key);
    if (PAYLOAD_FIELD_PATTERN.test(key)) return nextTrail.join('.');
    return findPayloadField(value[key], nextTrail);
  }).find(Boolean) || '';
}

function requireString(value, code, errors) {
  if (!String(value || '').trim()) errors.push(error(code, `${code} is required`));
}

function requireHash(value, code, errors) {
  if (!HASH_PATTERN.test(String(value || ''))) errors.push(error(code, `${code} is required`));
}

function error(code, message) {
  return { code, message };
}

function normalizeStringList(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))).sort();
}

function normalizeObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function hashObject(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

module.exports = {
  buildPlatformContentPackageManifest,
  validatePlatformContentPackageManifest
};
