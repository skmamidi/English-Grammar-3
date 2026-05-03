(function initDeploymentAttestation(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('node:crypto'));
  } else {
    root.GrammarQuestDeploymentAttestation = factory(root.crypto || null);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function deploymentAttestationFactory(cryptoModule) {
  const SECRET_FIELD_PATTERN = /(^|_|\b)(privateKey|privateKeyRef|authToken|sessionToken|accessToken|refreshToken|serviceAccount|client_email|clientEmail|secret|token|password|credential|rawEnv|raw|env|learnerId|studentId|email)(\b|_|$)/i;

  function buildDeploymentAttestation(options = {}) {
    const releaseManifest = normalizeObject(options.releaseManifest);
    const questionManifest = normalizeObject(options.questionManifest);
    const frontendManifest = normalizeObject(options.frontendManifest);
    const staticAssetManifest = normalizeObject(options.staticAssetManifest);
    const questionSourceHash = String(questionManifest.artifact && questionManifest.artifact.sourceHash || releaseManifest.questionManifestSourceHash || '');
    const featureFlagConfigHash = String(options.featureFlagConfigHash || releaseManifest.featureFlagConfigHash || '');
    const serviceWorkerCacheVersion = String(options.serviceWorkerCacheVersion || releaseManifest.serviceWorkerCacheVersion || '');
    const attestation = {
      schemaVersion: 1,
      kind: 'deployment-artifact-attestation',
      environment: String(options.environment || 'local'),
      commit: String(options.commit || releaseManifest.gitSha || ''),
      buildTimestamp: String(options.buildTimestamp || releaseManifest.generatedAt || ''),
      artifacts: {
        releaseManifest: {
          releaseId: String(releaseManifest.releaseId || ''),
          appVersion: String(releaseManifest.appVersion || ''),
          generatedAt: String(releaseManifest.generatedAt || ''),
          questionManifestSourceHash: String(releaseManifest.questionManifestSourceHash || ''),
          serviceWorkerCacheVersion: String(releaseManifest.serviceWorkerCacheVersion || ''),
          featureFlagConfigHash: String(releaseManifest.featureFlagConfigHash || ''),
          hash: hashObject(publicReleaseManifest(releaseManifest))
        },
        questionManifest: {
          sourceHash: questionSourceHash,
          artifactSchemaVersion: Number(questionManifest.artifact && questionManifest.artifact.artifactSchemaVersion) || 0,
          setCount: Array.isArray(questionManifest.sets) ? questionManifest.sets.length : 0,
          hash: hashObject({
            artifact: questionManifest.artifact || {},
            setIds: Array.isArray(questionManifest.sets) ? questionManifest.sets.map(set => set.id).sort() : []
          })
        },
        frontendManifest: {
          schemaVersion: Number(frontendManifest.schemaVersion) || 0,
          strategy: String(frontendManifest.strategy || ''),
          entrypoints: Array.isArray(frontendManifest.entrypoints) ? frontendManifest.entrypoints.slice().sort() : [],
          fileCount: Array.isArray(frontendManifest.files) ? frontendManifest.files.length : 0,
          hash: hashObject(frontendManifest)
        },
        staticAssetManifest: {
          schemaVersion: Number(staticAssetManifest.schemaVersion) || 0,
          strategy: String(staticAssetManifest.strategy || ''),
          fileCount: Array.isArray(staticAssetManifest.files) ? staticAssetManifest.files.length : 0,
          totalBytes: Number(staticAssetManifest.totals && staticAssetManifest.totals.totalBytes) || 0,
          hash: hashObject(staticAssetManifest)
        }
      },
      config: {
        serviceWorkerCacheVersion,
        featureFlagConfigHash,
        providerConfigRevision: String(options.providerConfigRevision || 'local-disabled')
      },
      signer: normalizeSigner(options.signer),
      validationEvidence: normalizeValidationEvidence(options.validationEvidence),
      rollback: normalizeRollback(options.rollback)
    };
    attestation.attestationHash = hashObject(withoutAttestationHash(attestation));
    return attestation;
  }

  function validateDeploymentAttestation(attestation) {
    const input = normalizeObject(attestation);
    const errors = [];

    requireString(input.environment, 'missing_environment', errors);
    requireString(input.commit, 'missing_commit', errors);
    requireString(input.buildTimestamp, 'missing_build_timestamp', errors);
    requireHash(input.artifacts && input.artifacts.releaseManifest && input.artifacts.releaseManifest.hash, 'missing_release_manifest_hash', errors);
    requireHash(input.artifacts && input.artifacts.questionManifest && input.artifacts.questionManifest.sourceHash, 'missing_question_manifest_source_hash', errors);
    requireHash(input.artifacts && input.artifacts.questionManifest && input.artifacts.questionManifest.hash, 'missing_question_manifest_hash', errors);
    requireHash(input.artifacts && input.artifacts.frontendManifest && input.artifacts.frontendManifest.hash, 'missing_frontend_manifest_hash', errors);
    requireHash(input.artifacts && input.artifacts.staticAssetManifest && input.artifacts.staticAssetManifest.hash, 'missing_static_asset_manifest_hash', errors);
    requireString(input.config && input.config.providerConfigRevision, 'missing_provider_config_revision', errors);

    const release = input.artifacts && input.artifacts.releaseManifest || {};
    const question = input.artifacts && input.artifacts.questionManifest || {};
    const config = input.config || {};
    if (release.questionManifestSourceHash && question.sourceHash && release.questionManifestSourceHash !== question.sourceHash) {
      errors.push(error('question_manifest_source_hash_mismatch', 'release manifest source hash does not match attested question manifest'));
    }
    if (release.serviceWorkerCacheVersion && config.serviceWorkerCacheVersion && release.serviceWorkerCacheVersion !== config.serviceWorkerCacheVersion) {
      errors.push(error('service_worker_cache_version_mismatch', 'release manifest cache version does not match attested config'));
    }
    if (release.featureFlagConfigHash && config.featureFlagConfigHash && release.featureFlagConfigHash !== config.featureFlagConfigHash) {
      errors.push(error('feature_flag_config_hash_mismatch', 'release manifest feature flag hash does not match attested config'));
    }

    if (!Array.isArray(input.validationEvidence) || input.validationEvidence.length === 0) {
      errors.push(error('missing_validation_evidence', 'attestation requires validation evidence'));
    } else {
      input.validationEvidence.forEach((entry, index) => {
        requireString(entry.command, `missing_validation_command:${index}`, errors);
        if (!['passed', 'warning'].includes(entry.status)) {
          errors.push(error(`invalid_validation_status:${index}`, 'validation evidence status must be passed or warning'));
        }
      });
    }

    const secretPath = findSecretLikeField(input);
    if (secretPath) {
      errors.push(error('secret_like_field', `attestation contains disallowed field ${secretPath}`));
    }

    return {
      ok: errors.length === 0,
      errors,
      attestationHash: input.attestationHash || hashObject(withoutAttestationHash(input))
    };
  }

  function normalizeValidationEvidence(entries) {
    return Array.isArray(entries) ? entries.map(entry => ({
      command: String(entry.command || ''),
      status: String(entry.status || ''),
      completedAt: String(entry.completedAt || '')
    })) : [];
  }

  function normalizeSigner(signer) {
    const input = normalizeObject(signer);
    return {
      mode: String(input.mode || 'unsigned-public-metadata'),
      activePublicKeyIds: Array.isArray(input.activePublicKeyIds) ? input.activePublicKeyIds.map(String).sort() : []
    };
  }

  function normalizeRollback(rollback) {
    const input = normalizeObject(rollback);
    return {
      releaseId: String(input.releaseId || ''),
      serviceWorkerCacheVersion: String(input.serviceWorkerCacheVersion || '')
    };
  }

  function publicReleaseManifest(releaseManifest) {
    return {
      releaseId: releaseManifest.releaseId,
      appVersion: releaseManifest.appVersion,
      generatedAt: releaseManifest.generatedAt,
      questionManifestSourceHash: releaseManifest.questionManifestSourceHash,
      serviceWorkerCacheVersion: releaseManifest.serviceWorkerCacheVersion,
      featureFlagConfigHash: releaseManifest.featureFlagConfigHash
    };
  }

  function findSecretLikeField(value, trail = []) {
    if (!value || typeof value !== 'object') return '';
    return Object.keys(value).map(key => {
      const nextTrail = trail.concat(key);
      if (SECRET_FIELD_PATTERN.test(key)) return nextTrail.join('.');
      return findSecretLikeField(value[key], nextTrail);
    }).find(Boolean) || '';
  }

  function requireString(value, code, errors) {
    if (!String(value || '').trim()) errors.push(error(code, `${code} is required`));
  }

  function requireHash(value, code, errors) {
    if (!/^sha256:[a-f0-9]{8,}$/i.test(String(value || ''))) errors.push(error(code, `${code} is required`));
  }

  function error(code, message) {
    return { code, message };
  }

  function withoutAttestationHash(value) {
    const clone = JSON.parse(JSON.stringify(value || {}));
    delete clone.attestationHash;
    return clone;
  }

  function normalizeObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function hashObject(value) {
    return `sha256:${hash(stableStringify(value))}`;
  }

  function hash(value) {
    if (!cryptoModule || !cryptoModule.createHash) return '';
    return cryptoModule.createHash('sha256').update(String(value || '')).digest('hex');
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  return {
    buildDeploymentAttestation,
    validateDeploymentAttestation
  };
}));
