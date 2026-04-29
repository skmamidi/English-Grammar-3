const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const { flattenQuestionBanks, loadQuestionBanks } = require('../scripts/qa/bank-loader');
const {
  buildQuestionChunkScript,
  getChunkedSets,
  getExpectedChunkPath,
  writeQuestionChunks
} = require('../scripts/generate-question-chunks');
const {
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

  const first = buildQuestionChunkScript({
    domain: 'capitalization',
    setId: 'capitalization-proper-names-titles',
    sourceFile,
    set: sourceSet
  });
  const second = buildQuestionChunkScript({
    domain: 'capitalization',
    setId: 'capitalization-proper-names-titles',
    sourceFile,
    set: sourceSet
  });

  assert.equal(first, second);
});

test('writeQuestionChunks dry run reports expected chunk paths for chunked domains only', () => {
  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);
  const summary = writeQuestionChunks(manifest, bankLoad, { dryRun: true });
  const paths = [...summary.written, ...summary.unchanged].map(write => write.path);

  assert.ok(paths.some(chunkPath => chunkPath.endsWith('assets/question-chunks/capitalization/capitalization-proper-names-titles.js')));
  assert.equal(paths.some(chunkPath => chunkPath.includes('/grammar/')), false);
});

test('writeQuestionChunks dry run does not mutate files', () => {
  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);
  const chunkPath = getExpectedChunkPath({
    domain: 'capitalization',
    setId: 'capitalization-proper-names-titles'
  });
  const before = fs.readFileSync(chunkPath, 'utf8');

  writeQuestionChunks(manifest, bankLoad, { dryRun: true });

  assert.equal(fs.readFileSync(chunkPath, 'utf8'), before);
});

test('writeQuestionChunks reports stale generated chunk removals', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'question-chunks-'));
  const staleDir = path.join(tempRoot, 'assets', 'question-chunks', 'capitalization');
  const stalePath = path.join(staleDir, 'capitalization-stale-set.js');
  fs.mkdirSync(staleDir, { recursive: true });
  fs.writeFileSync(stalePath, '// stale generated chunk\n');

  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);
  const summary = writeQuestionChunks(manifest, bankLoad, { repoRoot: tempRoot });

  assert.ok(summary.removed.some(write => write.path === stalePath));
  assert.equal(fs.existsSync(stalePath), false);
});

test('checked-in chunk files match deterministic generated output', () => {
  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);
  const sourceRecords = new Map(flattenQuestionBanks(bankLoad).map(record => [record.setId, record]));

  getChunkedSets(manifest).forEach(entry => {
    const sourceRecord = sourceRecords.get(entry.id);
    const expected = buildQuestionChunkScript({
      domain: entry.domain,
      setId: entry.id,
      sourceFile: sourceRecord.relativeFile,
      set: sourceRecord.set
    });
    const actual = fs.readFileSync(getExpectedChunkPath({
      domain: entry.domain,
      setId: entry.id
    }), 'utf8');

    assert.equal(actual, expected, `${entry.id} chunk should match generated output`);
  });
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
