const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const integrity = require('../assets/question-selection-integrity');
const testKeys = require('./fixtures/selection-test-keys.json');

const manifestArtifact = {
  sourceHash: 'sha256:manifest-source'
};

const request = {
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

const ref = {
  id: 'grammar-sentence-types-q0001',
  sourceSet: 'grammar-sentence-types',
  version: 1,
  contentHash: `sha256:${'1'.repeat(64)}`,
  sequence: 1
};

test('canonical signature payload binds request, response, refs, manifest, key, and expiry', async () => {
  const response = await signedResponse();
  const payload = integrity.buildSelectionSignaturePayload(response, manifestArtifact);
  const parsed = JSON.parse(payload);

  assert.equal(parsed.requestHash, response.requestHash);
  assert.equal(parsed.responseDigest, response.responseDigest);
  assert.equal(parsed.selectionId, 'sel_signed_unit');
  assert.equal(parsed.selectionPolicyVersion, 1);
  assert.deepEqual(parsed.questionRefs, [ref]);
  assert.equal(parsed.manifestSourceHash, manifestArtifact.sourceHash);
  assert.equal(parsed.expiresAt, '2030-04-29T12:05:00.000Z');
  assert.equal(parsed.kid, testKeys.kid);
  assert.equal(parsed.signatureVersion, 'selection-signature-v1');
});

test('valid signed selection response verifies with public key only', async () => {
  const response = await signedResponse();

  await assert.doesNotReject(() => integrity.validateSelectionResponseIntegrity(response, request, manifestArtifact, {
    requireSignature: true,
    publicKeys: publicKeyConfig(),
    now: () => new Date('2030-04-29T12:01:00.000Z')
  }));
});

test('signed selection response rejects tampering, unknown keys, unsupported versions, and expiry', async () => {
  const response = await signedResponse();

  await assert.rejects(
    () => integrity.validateSelectionResponseIntegrity(Object.assign({}, response, {
      questionRefs: [Object.assign({}, ref, { sequence: 2 })]
    }), request, manifestArtifact, signedOptions()),
    /integrity_failed: response digest mismatch/
  );
  await assert.rejects(
    () => integrity.validateSelectionResponseIntegrity(Object.assign({}, response, {
      responseDigest: `sha256:${'0'.repeat(64)}`
    }), request, manifestArtifact, signedOptions()),
    /integrity_failed: response digest mismatch/
  );
  await assert.rejects(
    () => integrity.validateSelectionResponseIntegrity(Object.assign({}, response, {
      kid: 'selection-key-missing'
    }), request, manifestArtifact, signedOptions()),
    /integrity_failed: unknown signature key/
  );
  await assert.rejects(
    () => integrity.validateSelectionResponseIntegrity(Object.assign({}, response, {
      signatureVersion: 'selection-signature-v999'
    }), request, manifestArtifact, signedOptions()),
    /integrity_failed: unsupported signature version/
  );
  await assert.rejects(
    () => integrity.validateSelectionResponseIntegrity(response, request, manifestArtifact, {
      requireSignature: true,
      publicKeys: publicKeyConfig(),
      now: () => new Date('2030-04-29T12:05:00.000Z')
    }),
    /integrity_failed: response expired/
  );
});

test('unsigned local pilot works by default but fails in production signed mode', async () => {
  const unsigned = {
    selectionId: 'sel_unsigned_unit',
    selectionPolicyVersion: 1,
    requestHash: await integrity.buildSelectionRequestHash(request, manifestArtifact),
    questionRefs: [ref],
    signature: null,
    signatureVersion: 'none',
    expiresAt: '2030-04-29T12:05:00.000Z'
  };
  unsigned.responseDigest = await integrity.buildSelectionResponseDigest(unsigned, manifestArtifact);

  await assert.doesNotReject(() => integrity.validateSelectionResponseIntegrity(unsigned, request, manifestArtifact, {
    now: () => new Date('2030-04-29T12:01:00.000Z')
  }));
  await assert.rejects(
    () => integrity.validateSelectionResponseIntegrity(unsigned, request, manifestArtifact, signedOptions()),
    /integrity_failed: signature is required/
  );
});

test('browser assets do not contain private selection signing material', () => {
  const assetFiles = ['assets/question-selection-integrity.js', 'assets/question-loader.js'];
  assetFiles.forEach(file => {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.equal(source.includes('"d"'), false, `${file} must not embed EC private JWK d`);
    assert.equal(source.includes('privateKey'), false, `${file} must not embed private key material`);
  });
});

async function signedResponse(overrides = {}) {
  const response = Object.assign({
    selectionId: 'sel_signed_unit',
    selectionPolicyVersion: 1,
    requestHash: await integrity.buildSelectionRequestHash(request, manifestArtifact),
    questionRefs: [ref],
    signature: null,
    signatureVersion: 'selection-signature-v1',
    kid: testKeys.kid,
    expiresAt: '2030-04-29T12:05:00.000Z'
  }, overrides);
  response.responseDigest = await integrity.buildSelectionResponseDigest(response, manifestArtifact);
  response.signature = signPayload(integrity.buildSelectionSignaturePayload(response, manifestArtifact));
  return response;
}

function signPayload(payload) {
  return crypto.sign('sha256', Buffer.from(payload), {
    key: crypto.createPrivateKey({ key: testKeys.privateKey, format: 'jwk' }),
    dsaEncoding: 'ieee-p1363'
  }).toString('base64');
}

function signedOptions() {
  return {
    requireSignature: true,
    publicKeys: publicKeyConfig(),
    now: () => new Date('2030-04-29T12:01:00.000Z')
  };
}

function publicKeyConfig() {
  return {
    [testKeys.kid]: {
      algorithm: testKeys.algorithm,
      publicKey: testKeys.publicKey
    }
  };
}
