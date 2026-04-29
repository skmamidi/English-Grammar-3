const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');

const { loadManifest } = require('../scripts/generate-question-manifest');
const { loadChunkBank } = require('../scripts/qa/chunk-qa');
const selectionCore = require('../assets/quiz-selection-core');
const selectionIntegrity = require('../assets/question-selection-integrity');
const testKeys = require('./fixtures/selection-test-keys.json');
const {
  buildSelectionResponse,
  selectQuestionRefs,
  validateSelectionRequest
} = require('../server/question-selection-service');

const manifest = loadManifest();

function context(overrides = {}) {
  return Object.assign({
    manifest,
    selectionPolicyVersion: 1,
    now: () => new Date('2030-04-29T12:00:00.000Z'),
    loadSetById(setId) {
      const entry = manifest.sets.find(set => set.id === setId);
      if (!entry) throw new Error(`missing set ${setId}`);
      const bank = loadChunkBank(entry.chunkFile);
      const set = bank[setId];
      return Object.assign({}, set, { id: entry.id });
    }
  }, overrides);
}

test('selection service returns digest-bound refs for valid grammar mixed request', async () => {
  const request = validateSelectionRequest({
    mode: 'mixed',
    domain: 'grammar',
    setIds: ['grammar-sentence-types', 'grammar-subject-predicate'],
    grade: '4',
    difficulty: 'medium',
    count: 5,
    countMode: 'per-subtopic',
    questionsPerSubtopic: 4,
    selectionPolicyVersion: 1
  }, manifest);

  assert.deepEqual(request, selectionCore.normalizeSelectionRequest(request, { maxCount: 60, defaultQuestionsPerSubtopic: 4 }));

  const selection = await selectQuestionRefs(request, context());
  const response = await buildSelectionResponse(selection, request, context());

  assert.equal(response.selectionPolicyVersion, 1);
  assert.equal(response.questionRefs.length, 5);
  assert.deepEqual(response.questionSnapshots, []);
  assert.match(response.selectionId, /^sel_/);
  assert.match(response.requestHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(response.responseDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(response.signature, null);
  assert.equal(response.signatureVersion, 'none');
  assert.equal(response.expiresAt, '2030-04-29T12:05:00.000Z');
  assert.equal(JSON.stringify(response).includes('"question"'), false);
  assert.equal(JSON.stringify(response).includes('"choices"'), false);

  await selectionIntegrity.validateSelectionResponseIntegrity(response, request, manifest.artifact);
});

test('selection service supports capitalization and rejects unauthorized domains or sets', async () => {
  const request = validateSelectionRequest({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    countMode: 'per-subtopic',
    questionsPerSubtopic: 4,
    selectionPolicyVersion: 1
  }, manifest);
  const selection = await selectQuestionRefs(request, context());
  assert.equal(selection.questionRefs.length, 4);
  assert.ok(selection.questionRefs.every(ref => ref.sourceSet === 'capitalization-proper-names-titles'));

  assert.throws(
    () => validateSelectionRequest(Object.assign({}, request, { domain: 'vocabulary' }), manifest),
    /does not belong to domain/
  );
  assert.throws(
    () => validateSelectionRequest(Object.assign({}, request, { domain: 'capitalization', setIds: ['grammar-sentence-types'] }), manifest),
    /does not belong to domain/
  );
  assert.throws(
    () => validateSelectionRequest(Object.assign({}, request, { domain: 'unknown-domain' }), manifest),
    /unsupported selection domain/
  );
});

test('selection service returns refs for subtopic mode only from the requested set', async () => {
  const request = validateSelectionRequest({
    mode: 'subtopic',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 10,
    countMode: 'max',
    questionsPerSubtopic: 0,
    selectionPolicyVersion: 1
  }, manifest);
  const selection = await selectQuestionRefs(request, context());
  const response = await buildSelectionResponse(selection, request, context());

  assert.equal(request.mode, 'subtopic');
  assert.equal(response.questionRefs.length, 10);
  assert.ok(response.questionRefs.every(ref => ref.sourceSet === 'capitalization-proper-names-titles'));
  assert.deepEqual(response.questionSnapshots, []);
  assert.equal(JSON.stringify(response).includes('"question"'), false);
  await selectionIntegrity.validateSelectionResponseIntegrity(response, request, manifest.artifact);

  assert.throws(
    () => validateSelectionRequest(Object.assign({}, request, { setIds: ['grammar-sentence-types'] }), manifest),
    /does not belong to domain/
  );
});

test('selection service response validation fails with stale manifest artifact', async () => {
  const request = validateSelectionRequest({
    mode: 'mixed',
    domain: 'grammar',
    setIds: ['grammar-sentence-types'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    countMode: 'per-subtopic',
    questionsPerSubtopic: 4,
    selectionPolicyVersion: 1
  }, manifest);
  const response = await buildSelectionResponse(await selectQuestionRefs(request, context()), request, context());

  await assert.rejects(
    () => selectionIntegrity.validateSelectionResponseIntegrity(response, request, { sourceHash: `sha256:${'0'.repeat(64)}` }),
    /integrity_failed/
  );
});

test('selection service signs responses when a signer is injected', async () => {
  const request = validateSelectionRequest({
    mode: 'mixed',
    domain: 'grammar',
    setIds: ['grammar-sentence-types'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    countMode: 'per-subtopic',
    questionsPerSubtopic: 4,
    selectionPolicyVersion: 1
  }, manifest);
  const response = await buildSelectionResponse(await selectQuestionRefs(request, context()), request, context({
    signing: {
      kid: testKeys.kid,
      signatureVersion: 'selection-signature-v1',
      sign(payload) {
        return crypto.sign('sha256', Buffer.from(payload), {
          key: crypto.createPrivateKey({ key: testKeys.privateKey, format: 'jwk' }),
          dsaEncoding: 'ieee-p1363'
        }).toString('base64');
      }
    }
  }));

  assert.equal(response.signatureVersion, 'selection-signature-v1');
  assert.equal(response.kid, testKeys.kid);
  assert.match(response.signature, /^[A-Za-z0-9+/]+=*$/);
  await selectionIntegrity.validateSelectionResponseIntegrity(response, request, manifest.artifact, {
    requireSignature: true,
    publicKeys: {
      [testKeys.kid]: {
        algorithm: testKeys.algorithm,
        publicKey: testKeys.publicKey
      }
    },
    now: () => new Date('2030-04-29T12:01:00.000Z')
  });
});
