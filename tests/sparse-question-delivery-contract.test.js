const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { loadQuestionBanks } = require('../scripts/qa/bank-loader');
const { loadManifest } = require('../scripts/generate-question-manifest');
const {
  buildContentRepositoryRecordsFromBankLoad,
  createContentRepository,
  createFakeContentRepositoryAdapter
} = require('../server/content-repository-contract');
const {
  buildSparseQuestionDeliveryResponse,
  normalizeSparseQuestionDeliveryRequest,
  validateSparseQuestionDeliveryResponse
} = require('../server/sparse-question-delivery-contract');

const repoRoot = path.resolve(__dirname, '..');
const manifest = loadManifest();
const records = buildContentRepositoryRecordsFromBankLoad(loadQuestionBanks({ sourceType: 'json' }), { manifest });

function repository() {
  return createContentRepository(createFakeContentRepositoryAdapter(records));
}

test('sparse delivery returns exactly requested public fields for server-adjudicated mode', async () => {
  const request = normalizeSparseQuestionDeliveryRequest({
    mode: 'server_adjudicated',
    questionRefs: refsForSet('grammar-correct-article', 2),
    requestedFields: ['questionId', 'sourceSet', 'version', 'contentHash', 'sequence', 'question']
  });
  const response = await buildSparseQuestionDeliveryResponse(repository(), request);

  assert.deepEqual(Object.keys(response.questions[0]).sort(), [
    'contentHash',
    'question',
    'questionId',
    'sequence',
    'sourceSet',
    'version'
  ].sort());
  assert.equal(response.questions.length, 2);
  assert.equal(response.requiresScriptExecution, false);
  assert.equal(response.hydrationGlobal, null);
  assert.doesNotThrow(() => validateSparseQuestionDeliveryResponse(response, request));
  assertNoPrivateFields(response);
});

test('sparse delivery does not include prompts or choices unless explicitly requested', async () => {
  const questionOnly = await buildSparseQuestionDeliveryResponse(repository(), normalizeSparseQuestionDeliveryRequest({
    mode: 'server_adjudicated',
    questionRefs: refsForSet('grammar-correct-article', 1),
    requestedFields: ['questionId', 'question']
  }));
  const withChoices = await buildSparseQuestionDeliveryResponse(repository(), normalizeSparseQuestionDeliveryRequest({
    mode: 'server_adjudicated',
    questionRefs: refsForSet('grammar-correct-article', 1),
    requestedFields: ['questionId', 'question', 'choices']
  }));

  assert.equal(Object.prototype.hasOwnProperty.call(questionOnly.questions[0], 'choices'), false);
  assert.ok(Array.isArray(withChoices.questions[0].choices));
  assertNoPrivateFields(questionOnly);
  assertNoPrivateFields(withChoices);
});

test('sparse delivery blocks answer keys except explicit offline content package policy', async () => {
  await assert.rejects(
    () => buildSparseQuestionDeliveryResponse(repository(), normalizeSparseQuestionDeliveryRequest({
      mode: 'server_adjudicated',
      questionRefs: refsForSet('grammar-correct-article', 1),
      requestedFields: ['questionId', 'correct']
    })),
    /answer fields require offline content package policy/
  );

  const offline = await buildSparseQuestionDeliveryResponse(repository(), normalizeSparseQuestionDeliveryRequest({
    mode: 'offline_practice',
    questionRefs: refsForSet('grammar-correct-article', 1),
    requestedFields: ['questionId', 'question', 'choices', 'correct'],
    offlinePolicy: { allowAnswerKeys: true, packageId: 'pkg_grammar_preview' }
  }));

  assert.equal(typeof offline.questions[0].correct, 'number');
  assert.equal(offline.policy.offlinePackageId, 'pkg_grammar_preview');
});

test('sparse delivery payload budgets scale for 10, 25, and 60 requested questions without executable chunks', async () => {
  const setId = 'grammar-sentence-correction';

  for (const count of [10, 25, 60]) {
    const chunkBytes = executableChunkBytesForSet(setId, count);
    const request = normalizeSparseQuestionDeliveryRequest({
      mode: 'server_adjudicated',
      questionRefs: refsForSet(setId, count),
      requestedFields: ['questionId', 'sourceSet', 'version', 'contentHash', 'sequence', 'question', 'choices']
    });
    const response = await buildSparseQuestionDeliveryResponse(repository(), request);
    const text = JSON.stringify(response);
    const bytes = Buffer.byteLength(text, 'utf8');

    assert.equal(response.questions.length, count);
    assert.ok(bytes < chunkBytes, `${count} sparse questions should be smaller than the executable chunk`);
    assert.equal(text.includes('window.QUESTION_BANK'), false);
    assert.equal(response.requiresScriptExecution, false);
    assertNoPrivateFields(response);
  }
});

function refsForSet(setId, count) {
  const set = manifest.sets.find(item => item.id === setId);
  return set.questions.slice(0, count).map(question => ({
    id: question.id,
    sourceSet: setId,
    version: question.version,
    contentHash: question.contentHash,
    sequence: question.sequence
  }));
}

function executableChunkBytesForSet(setId, count) {
  const set = manifest.sets.find(item => item.id === setId);
  const chunkFiles = Array.isArray(set.chunks) && set.chunks.length
    ? set.chunks.filter(chunk => chunk.firstSequence <= count).map(chunk => chunk.chunkFile)
    : [set.chunkFile];
  return chunkFiles.reduce((total, file) => total + fs.statSync(path.join(repoRoot, file)).size, 0);
}

function assertNoPrivateFields(payload) {
  const text = JSON.stringify(payload);
  ['"correct"', '"answerKey"', '"explanation"', '"providerPayload"', '"window.QUESTION_BANK"'].forEach(field => {
    assert.equal(text.includes(field), false, `payload should not include ${field}`);
  });
}
