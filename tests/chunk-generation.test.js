const assert = require('node:assert/strict');
const test = require('node:test');

const { loadQuestionBanks } = require('../scripts/qa/bank-loader');
const {
  buildQuestionChunkScript,
  generateManifest,
  getSourceSet,
  loadChunkBank,
  validateManifest,
  validateQuestionChunkSet,
  validateQuestionChunks
} = require('../scripts/generate-question-manifest');

test('chunk files exactly match source bank sets', () => {
  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);
  const result = validateQuestionChunks(manifest, bankLoad);

  assert.deepEqual(result.errors, []);
});

test('chunk validation fails when a chunk has stale content', () => {
  const bankLoad = loadQuestionBanks();
  const chunkBank = loadChunkBank(
    'assets/question-chunks/capitalization/capitalization-proper-names-titles.js'
  );

  chunkBank['capitalization-proper-names-titles'].questions[0].contentHash = `sha256:${'0'.repeat(64)}`;

  const result = validateQuestionChunkSet({
    setId: 'capitalization-proper-names-titles',
    sourceSet: getSourceSet(bankLoad, 'capitalization-proper-names-titles'),
    chunkSet: chunkBank['capitalization-proper-names-titles']
  });

  assert.ok(result.errors.some(error => error.includes('contentHash')));
});

test('chunk generation is deterministic', () => {
  const bankLoad = loadQuestionBanks();
  const sourceSet = getSourceSet(bankLoad, 'capitalization-proper-names-titles');
  const sourceFile = 'assets/question-banks/capitalization.js';

  const first = buildQuestionChunkScript(
    'capitalization-proper-names-titles',
    sourceSet,
    sourceFile
  );
  const second = buildQuestionChunkScript(
    'capitalization-proper-names-titles',
    sourceSet,
    sourceFile
  );

  assert.equal(first, second);
});

test('manifest validation fails if a declared chunk is stale', () => {
  const staleBankLoad = structuredClone(loadQuestionBanks());
  staleBankLoad.bank['capitalization-proper-names-titles'].questions[0].contentHash =
    `sha256:${'1'.repeat(64)}`;
  staleBankLoad.files
    .find(file => file.relativeFile === 'assets/question-banks/capitalization.js')
    .bank['capitalization-proper-names-titles'].questions[0].contentHash =
      `sha256:${'1'.repeat(64)}`;
  const manifest = generateManifest(staleBankLoad);

  assert.throws(
    () => validateManifest(manifest, staleBankLoad, { validateChunks: true }),
    /Question chunk validation failed/
  );
});
