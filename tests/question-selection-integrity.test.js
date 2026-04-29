const assert = require('node:assert/strict');
const test = require('node:test');

const integrity = require('../assets/question-selection-integrity');

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

const refs = [{
  id: 'grammar-sentence-types-q0001',
  sourceSet: 'grammar-sentence-types',
  version: 1,
  contentHash: `sha256:${'1'.repeat(64)}`,
  sequence: 1
}];

test('selection request hash is stable for equivalent request objects', async () => {
  const a = await integrity.buildSelectionRequestHash(request, manifestArtifact);
  const b = await integrity.buildSelectionRequestHash({
    questionsPerSubtopic: 4,
    countMode: 'per-subtopic',
    selectionPolicyVersion: 1,
    count: 4,
    difficulty: 'medium',
    grade: '4',
    setIds: ['grammar-sentence-types'],
    domain: 'grammar',
    mode: 'mixed'
  }, manifestArtifact);

  assert.match(a, /^sha256:[a-f0-9]{64}$/);
  assert.equal(a, b);
});

test('selection response digest changes when refs change', async () => {
  const base = {
    selectionId: 'sel_unit',
    selectionPolicyVersion: 1,
    requestHash: await integrity.buildSelectionRequestHash(request, manifestArtifact),
    questionRefs: refs,
    signature: null,
    signatureVersion: 'none'
  };
  const digest = await integrity.buildSelectionResponseDigest(base, manifestArtifact);
  const changed = await integrity.buildSelectionResponseDigest(Object.assign({}, base, {
    questionRefs: [Object.assign({}, refs[0], { sequence: 2 })]
  }), manifestArtifact);

  assert.match(digest, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(digest, changed);
});

test('selection integrity validation accepts valid pilot digest and rejects tampering', async () => {
  const requestHash = await integrity.buildSelectionRequestHash(request, manifestArtifact);
  const response = {
    selectionId: 'sel_unit',
    selectionPolicyVersion: 1,
    requestHash,
    questionRefs: refs,
    signature: null,
    signatureVersion: 'none'
  };
  response.responseDigest = await integrity.buildSelectionResponseDigest(response, manifestArtifact);

  await assert.doesNotReject(() => integrity.validateSelectionResponseIntegrity(response, request, manifestArtifact));
  await assert.rejects(
    () => integrity.validateSelectionResponseIntegrity(Object.assign({}, response, {
      responseDigest: `sha256:${'0'.repeat(64)}`
    }), request, manifestArtifact),
    /integrity_failed: response digest mismatch/
  );
  await assert.rejects(
    () => integrity.validateSelectionResponseIntegrity(Object.assign({}, response, {
      requestHash: `sha256:${'0'.repeat(64)}`
    }), request, manifestArtifact),
    /integrity_failed: request hash mismatch/
  );
});
