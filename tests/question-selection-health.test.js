const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildRuntimeConfig
} = require('../server/question-selection-runtime');
const {
  buildSelectionHealthSnapshot
} = require('../server/question-selection-health');

test('selection health reports ready local pilot with manifest provenance and allowed domains', () => {
  const snapshot = buildSelectionHealthSnapshot(buildRuntimeConfig({
    SELECTION_RUNTIME_MODE: 'local',
    SELECTION_ALLOWED_DOMAINS: 'grammar,capitalization',
    SELECTION_RESPONSE_TTL_SECONDS: '120'
  }), manifestFixture(), {
    telemetryEnabled: true
  });

  assert.equal(snapshot.status, 'ready');
  assert.deepEqual(snapshot.allowedDomains, ['grammar', 'capitalization']);
  assert.equal(snapshot.responseTtlSeconds, 120);
  assert.equal(snapshot.manifest.sourceHash, 'sha256:manifest-source');
  assert.equal(snapshot.manifest.sourceType, 'json');
  assert.equal(snapshot.manifest.setCount, 1);
  assert.deepEqual(snapshot.signing, {
    mode: 'unsigned-local',
    required: false,
    ready: true,
    activePublicKeyIds: []
  });
  assert.deepEqual(snapshot.failureCodes, []);
});

test('selection health reports ready production signed mode with active public key ids', () => {
  const snapshot = buildSelectionHealthSnapshot(buildRuntimeConfig({
    SELECTION_RUNTIME_MODE: 'production',
    SELECTION_ALLOWED_DOMAINS: 'grammar',
    SELECTION_SIGNING_KEY_ID: 'selection-key-prod-2026-04',
    SELECTION_PRIVATE_KEY_REF: 'projects/app/secrets/selection-key-prod-2026-04'
  }), manifestFixture(), {
    signerAvailable: true,
    publicKeys: {
      'selection-key-prod-2026-04': { notAfter: '2030-01-01T00:00:00.000Z' },
      'selection-key-next': { notAfter: '2030-06-01T00:00:00.000Z' }
    },
    telemetryEnabled: true
  });

  assert.equal(snapshot.status, 'ready');
  assert.equal(snapshot.signing.mode, 'signed-production');
  assert.equal(snapshot.signing.required, true);
  assert.equal(snapshot.signing.ready, true);
  assert.deepEqual(snapshot.signing.activePublicKeyIds, ['selection-key-next', 'selection-key-prod-2026-04']);
  assert.deepEqual(snapshot.failureCodes, []);
});

test('selection health fails closed when production signing readiness is missing', () => {
  const snapshot = buildSelectionHealthSnapshot({
    mode: 'production',
    allowedDomains: ['grammar'],
    signingKeyId: 'selection-key-prod-2026-04',
    responseTtlSeconds: 300
  }, manifestFixture(), {
    signerAvailable: false,
    publicKeys: {}
  });

  assert.equal(snapshot.status, 'not_ready');
  assert.equal(snapshot.signing.ready, false);
  assert.ok(snapshot.failureCodes.includes('signer_unavailable'));
  assert.ok(snapshot.failureCodes.includes('active_public_keys_missing'));
});

test('selection health fails closed when manifest provenance is missing or stale', () => {
  const missing = buildSelectionHealthSnapshot(buildRuntimeConfig({
    SELECTION_RUNTIME_MODE: 'local',
    SELECTION_ALLOWED_DOMAINS: 'grammar'
  }), { sets: [] });
  const stale = buildSelectionHealthSnapshot(buildRuntimeConfig({
    SELECTION_RUNTIME_MODE: 'local',
    SELECTION_ALLOWED_DOMAINS: 'grammar'
  }), manifestFixture(), {
    expectedSourceHash: 'sha256:expected-newer-source'
  });

  assert.equal(missing.status, 'not_ready');
  assert.ok(missing.failureCodes.includes('manifest_provenance_missing'));
  assert.equal(stale.status, 'not_ready');
  assert.ok(stale.failureCodes.includes('manifest_source_hash_stale'));
});

test('selection health degrades for optional telemetry or no rollout domains', () => {
  const snapshot = buildSelectionHealthSnapshot({
    mode: 'local',
    allowedDomains: [],
    responseTtlSeconds: 300
  }, manifestFixture(), {
    telemetryEnabled: false
  });

  assert.equal(snapshot.status, 'degraded');
  assert.ok(snapshot.failureCodes.includes('rollout_domains_empty'));
  assert.ok(snapshot.failureCodes.includes('telemetry_disabled'));
});

test('selection health response excludes learner question and secret payload fields', () => {
  const snapshot = buildSelectionHealthSnapshot(buildRuntimeConfig({
    SELECTION_RUNTIME_MODE: 'production',
    SELECTION_ALLOWED_DOMAINS: 'grammar',
    SELECTION_SIGNING_KEY_ID: 'selection-key-prod-2026-04',
    SELECTION_PRIVATE_KEY_REF: 'projects/app/secrets/selection-key-prod-2026-04'
  }), Object.assign({}, manifestFixture(), {
    sets: [{
      id: 'grammar-sentence-types',
      questions: [{
        id: 'grammar-sentence-types-q0001',
        question: 'Choose the sentence.',
        choices: ['A', 'B'],
        correct: 0
      }]
    }]
  }), {
    signerAvailable: true,
    publicKeys: { 'selection-key-prod-2026-04': {} },
    telemetryEnabled: true,
    unsafe: {
      learnerId: 'learner-1',
      privateKey: 'secret'
    }
  });
  const serialized = JSON.stringify(snapshot);

  assert.equal(serialized.includes('Choose the sentence'), false);
  assert.equal(serialized.includes('"choices"'), false);
  assert.equal(serialized.includes('"correct"'), false);
  assert.equal(serialized.includes('learner-1'), false);
  assert.equal(serialized.includes('privateKey'), false);
  assert.equal(serialized.includes('SELECTION_PRIVATE_KEY_REF'), false);
  assert.equal(serialized.includes('projects/app/secrets'), false);
});

function manifestFixture() {
  return {
    schemaVersion: 1,
    artifact: {
      type: 'question-manifest',
      artifactSchemaVersion: 1,
      generatorVersion: 1,
      sourceType: 'json',
      sourceHash: 'sha256:manifest-source',
      sourceFiles: [
        'assets/question-bank-source/grammar.json'
      ]
    },
    totalQuestions: 24,
    sets: [{
      id: 'grammar-sentence-types',
      domain: 'grammar',
      questionCount: 24
    }]
  };
}
