const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const integrity = require('../assets/question-selection-integrity');
const { loadManifest } = require('../scripts/generate-question-manifest');
const { loadChunkBank } = require('../scripts/qa/chunk-qa');
const {
  buildRuntimeConfig,
  createSelectionRuntime,
  validateRuntimeConfig
} = require('../server/question-selection-runtime');
const {
  BACKEND_STORAGE_PATHS,
  assertBackendReadableDocumentSafe
} = require('../server/backend-policy-rules');
const {
  scanRepositoryForSecrets
} = require('../scripts/security/scan-secrets');
const testKeys = require('./fixtures/selection-test-keys.json');

const repoRoot = path.resolve(__dirname, '..');
const runtimeManifest = loadManifest();

test('production runtime config requires signing metadata without private key values', () => {
  const env = {
    SELECTION_RUNTIME_MODE: 'production',
    SELECTION_POLICY_VERSION: '1',
    SELECTION_SIGNING_KEY_ID: 'selection-key-prod-2026-04',
    SELECTION_PRIVATE_KEY_REF: 'projects/app/secrets/selection-key-prod-2026-04',
    SELECTION_RESPONSE_TTL_SECONDS: '300',
    SELECTION_ALLOWED_DOMAINS: 'grammar,capitalization',
    SELECTION_MAX_QUESTIONS: '60'
  };

  const config = buildRuntimeConfig(env);

  assert.deepEqual(config.allowedDomains, ['grammar', 'capitalization']);
  assert.equal(config.signingKeyId, 'selection-key-prod-2026-04');
  assert.equal(config.privateKeyRef, env.SELECTION_PRIVATE_KEY_REF);
  assert.equal(Object.hasOwn(config, 'privateKey'), false);
  assert.doesNotThrow(() => validateRuntimeConfig(config));
});

test('production runtime rejects missing signer or private key reference', () => {
  assert.throws(
    () => validateRuntimeConfig(buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'production',
      SELECTION_SIGNING_KEY_ID: 'selection-key-prod-2026-04',
      SELECTION_RESPONSE_TTL_SECONDS: '300',
      SELECTION_ALLOWED_DOMAINS: 'grammar',
      SELECTION_MAX_QUESTIONS: '60'
    })),
    /SELECTION_PRIVATE_KEY_REF/
  );

  assert.throws(
    () => createSelectionRuntime({
      config: buildRuntimeConfig({
        SELECTION_RUNTIME_MODE: 'production',
        SELECTION_SIGNING_KEY_ID: 'selection-key-prod-2026-04',
        SELECTION_PRIVATE_KEY_REF: 'projects/app/secrets/key',
        SELECTION_ALLOWED_DOMAINS: 'grammar'
      }),
      manifestProvider: () => ({ sets: [] }),
      chunkSetProvider: () => ({ questions: [] })
    }),
    /production runtime requires a signer/
  );
});

test('runtime rejects invalid response TTL configuration', () => {
  assert.throws(
    () => validateRuntimeConfig(buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'local',
      SELECTION_ALLOWED_DOMAINS: 'grammar',
      SELECTION_RESPONSE_TTL_SECONDS: '0',
      SELECTION_MAX_QUESTIONS: '4'
    })),
    /SELECTION_RESPONSE_TTL_SECONDS/
  );

  assert.throws(
    () => validateRuntimeConfig(buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'local',
      SELECTION_ALLOWED_DOMAINS: 'grammar',
      SELECTION_RESPONSE_TTL_SECONDS: 'not-a-number',
      SELECTION_MAX_QUESTIONS: '4'
    })),
    /SELECTION_RESPONSE_TTL_SECONDS/
  );
});

test('runtime config uses the default response TTL when env omits it', () => {
  const config = buildRuntimeConfig({
    SELECTION_RUNTIME_MODE: 'local',
    SELECTION_ALLOWED_DOMAINS: 'grammar',
    SELECTION_MAX_QUESTIONS: '4'
  });

  assert.equal(config.responseTtlSeconds, 300);
  assert.doesNotThrow(() => validateRuntimeConfig(config));
});

test('public key rotation accepts multiple active keys and rejects expired key metadata', async () => {
  const response = await signedResponse();
  const options = {
    requireSignature: true,
    publicKeys: {
      [testKeys.kid]: {
        algorithm: testKeys.algorithm,
        publicKey: testKeys.publicKey,
        notAfter: '2030-04-29T12:04:00.000Z'
      },
      'selection-key-next': {
        algorithm: testKeys.algorithm,
        publicKey: testKeys.publicKey,
        notAfter: '2030-05-29T12:04:00.000Z'
      }
    },
    now: () => new Date('2030-04-29T12:05:00.000Z')
  };

  await assert.rejects(
    () => integrity.validateSelectionResponseIntegrity(response, requestFixture(), manifestFixture(), options),
    /integrity_failed: signature key expired/
  );
});

test('runtime config TTL controls selection response expiry', async () => {
  const runtime = createSelectionRuntime({
    config: buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'local',
      SELECTION_ALLOWED_DOMAINS: 'grammar',
      SELECTION_RESPONSE_TTL_SECONDS: '42',
      SELECTION_MAX_QUESTIONS: '4'
    }),
    manifestProvider: () => runtimeManifest,
    chunkSetProvider: loadRuntimeSet,
    clock: () => new Date('2030-04-29T12:00:00.000Z'),
    logger: null
  });

  const response = await runtime.handleSelectionRequest({
    mode: 'mixed',
    domain: 'grammar',
    setIds: ['grammar-sentence-types'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    countMode: 'per-subtopic',
    questionsPerSubtopic: 4
  });

  assert.equal(response.expiresAt, '2030-04-29T12:00:42.000Z');
});

test('selection runtime returns structured API errors for rejected origins and oversized bodies', async () => {
  const runtime = createSelectionRuntime({
    config: buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'local',
      SELECTION_ALLOWED_DOMAINS: 'grammar',
      SELECTION_ALLOWED_ORIGINS: 'https://grammar.example',
      SELECTION_MAX_REQUEST_BYTES: '64',
      SELECTION_MAX_QUESTIONS: '4'
    }),
    manifestProvider: () => runtimeManifest,
    chunkSetProvider: loadRuntimeSet,
    clock: () => new Date('2030-04-29T12:00:00.000Z'),
    logger: null
  });

  const originResult = await runtime.handleSelectionHttpRequest({
    method: 'POST',
    origin: 'https://evil.example',
    body: requestFixture()
  });
  const sizeResult = await runtime.handleSelectionHttpRequest({
    method: 'POST',
    origin: 'https://grammar.example',
    rawBody: JSON.stringify(Object.assign({}, requestFixture(), { extra: 'x'.repeat(100) }))
  });

  assert.equal(originResult.error.code, 'unauthorized_origin');
  assert.equal(sizeResult.error.code, 'payload_too_large');
  assert.equal(JSON.stringify(originResult).includes('grammar-sentence-types-q0001'), false);
});

test('selection runtime returns structured retryable errors for rate limits', async () => {
  const runtime = createSelectionRuntime({
    config: buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'local',
      SELECTION_ALLOWED_DOMAINS: 'grammar',
      SELECTION_ALLOWED_ORIGINS: 'https://grammar.example',
      SELECTION_MAX_QUESTIONS: '4'
    }),
    manifestProvider: () => runtimeManifest,
    chunkSetProvider: loadRuntimeSet,
    rateLimitAdapter: {
      async checkLimit() {
        return { allow: false };
      }
    },
    clock: () => new Date('2030-04-29T12:00:00.000Z'),
    logger: null
  });

  const result = await runtime.handleSelectionHttpRequest({
    method: 'POST',
    origin: 'https://grammar.example',
    body: requestFixture()
  });

  assert.equal(result.error.code, 'rate_limited');
  assert.equal(result.error.retryable, true);
});

test('selection runtime maps domain validation failures to safe API error envelopes', async () => {
  const runtime = createSelectionRuntime({
    config: buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'local',
      SELECTION_ALLOWED_DOMAINS: 'grammar',
      SELECTION_ALLOWED_ORIGINS: 'https://grammar.example',
      SELECTION_MAX_QUESTIONS: '4'
    }),
    manifestProvider: () => runtimeManifest,
    chunkSetProvider: loadRuntimeSet,
    clock: () => new Date('2030-04-29T12:00:00.000Z'),
    logger: null
  });

  const result = await runtime.handleSelectionHttpRequest({
    method: 'POST',
    origin: 'https://grammar.example',
    body: Object.assign({}, requestFixture(), { domain: 'vocabulary' })
  });

  assert.equal(result.error.code, 'invalid_request');
  assert.equal(JSON.stringify(result).includes('private'), false);
});

test('selection runtime health endpoint returns privacy-safe readiness shape', async () => {
  const runtime = createSelectionRuntime({
    config: buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'local',
      SELECTION_ALLOWED_DOMAINS: 'grammar',
      SELECTION_ALLOWED_ORIGINS: 'https://grammar.example',
      SELECTION_MAX_QUESTIONS: '4'
    }),
    manifestProvider: () => runtimeManifest,
    chunkSetProvider: loadRuntimeSet,
    health: {
      telemetryEnabled: true
    },
    clock: () => new Date('2030-04-29T12:00:00.000Z'),
    logger: null
  });

  const result = await runtime.handleHealthHttpRequest({
    method: 'GET',
    origin: 'https://grammar.example'
  });

  assert.equal(result.ok, true);
  assert.equal(result.response.status, 'ready');
  assert.deepEqual(result.response.allowedDomains, ['grammar']);
  assert.equal(result.response.manifest.sourceHash, runtimeManifest.artifact.sourceHash);
  assert.equal(JSON.stringify(result).includes('grammar-sentence-types-q0001'), false);
  assert.equal(JSON.stringify(result).includes('"questions"'), false);
});

test('selection runtime health endpoint reports not-ready manifest state without throwing', async () => {
  const runtime = createSelectionRuntime({
    config: buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'local',
      SELECTION_ALLOWED_DOMAINS: 'grammar',
      SELECTION_ALLOWED_ORIGINS: 'https://grammar.example'
    }),
    manifestProvider: () => runtimeManifest,
    chunkSetProvider: loadRuntimeSet,
    health: {
      expectedSourceHash: 'sha256:stale-manifest-source'
    },
    clock: () => new Date('2030-04-29T12:00:00.000Z'),
    logger: null
  });

  const result = await runtime.handleHealthHttpRequest({
    method: 'GET',
    origin: 'https://grammar.example'
  });

  assert.equal(result.ok, true);
  assert.equal(result.response.status, 'not_ready');
  assert.ok(result.response.failureCodes.includes('manifest_source_hash_stale'));
});

test('selection runtime health endpoint uses guarded origins and method errors', async () => {
  const runtime = createSelectionRuntime({
    config: buildRuntimeConfig({
      SELECTION_RUNTIME_MODE: 'local',
      SELECTION_ALLOWED_DOMAINS: 'grammar',
      SELECTION_ALLOWED_ORIGINS: 'https://grammar.example'
    }),
    manifestProvider: () => runtimeManifest,
    chunkSetProvider: loadRuntimeSet,
    clock: () => new Date('2030-04-29T12:00:00.000Z'),
    logger: null
  });

  const originResult = await runtime.handleHealthHttpRequest({
    method: 'GET',
    origin: 'https://evil.example'
  });
  const methodResult = await runtime.handleHealthHttpRequest({
    method: 'POST',
    origin: 'https://grammar.example'
  });

  assert.equal(originResult.error.code, 'unauthorized_origin');
  assert.equal(methodResult.error.code, 'invalid_request');
  assert.equal(JSON.stringify(originResult).includes('private'), false);
});

test('runtime and security docs do not commit private signing key material', () => {
  const files = [
    'server/question-selection-runtime.js',
    'server/question-selection-runtime.md',
    'docs/security/selection-api-key-rotation.md',
    'docs/security/system-admin-role.md',
    'QA.md'
  ];

  files.forEach(file => {
    const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    assert.doesNotMatch(source, /BEGIN (EC |RSA |)PRIVATE KEY/);
    assert.doesNotMatch(source, /"d"\s*:/);
    assert.doesNotMatch(source, /privateKey\s*[:=]\s*['"`{]/);
  });
});

test('browser-facing runtime artifacts pass the secret scanner', () => {
  assert.deepEqual(scanRepositoryForSecrets({
    rootDir: repoRoot,
    targets: [
      'assets',
      'server/question-selection-runtime.js',
      'docs/security/selection-api-key-rotation.md',
      'docs/security/system-admin-role.md'
    ]
  }), []);
});

test('backend-readable config rejects private selection signing key references', () => {
  assert.throws(() => assertBackendReadableDocumentSafe(BACKEND_STORAGE_PATHS.featureFlag('selection-api'), {
    enabled: true,
    signingKeyId: 'selection-key-prod-2026-04',
    privateKeyRef: 'projects/app/secrets/selection-key-prod-2026-04'
  }), /backend_readable_secret_field/);
});

async function signedResponse() {
  const response = {
    selectionId: 'sel_runtime_unit',
    selectionPolicyVersion: 1,
    requestHash: await integrity.buildSelectionRequestHash(requestFixture(), manifestFixture()),
    questionRefs: [{
      id: 'grammar-sentence-types-q0001',
      sourceSet: 'grammar-sentence-types',
      version: 1,
      contentHash: `sha256:${'1'.repeat(64)}`,
      sequence: 1
    }],
    signature: null,
    signatureVersion: 'selection-signature-v1',
    kid: testKeys.kid,
    expiresAt: '2030-04-29T12:06:00.000Z'
  };
  response.responseDigest = await integrity.buildSelectionResponseDigest(response, manifestFixture());
  response.signature = crypto.sign('sha256', Buffer.from(integrity.buildSelectionSignaturePayload(response, manifestFixture())), {
    key: crypto.createPrivateKey({ key: testKeys.privateKey, format: 'jwk' }),
    dsaEncoding: 'ieee-p1363'
  }).toString('base64');
  return response;
}

function requestFixture() {
  return {
    mode: 'mixed',
    domain: 'grammar',
    setIds: ['grammar-sentence-types'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    countMode: 'per-subtopic',
    questionsPerSubtopic: 4,
    selectionPolicyVersion: 1
  };
}

function manifestFixture() {
  return {
    sourceHash: 'sha256:manifest-source'
  };
}

function loadRuntimeSet(setId) {
  const entry = runtimeManifest.sets.find(set => set.id === setId);
  if (!entry) throw new Error(`missing set ${setId}`);
  const bank = loadChunkBank(entry.chunkFile);
  return Object.assign({}, bank[setId], { id: entry.id });
}
