const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const { flattenQuestionBanks, loadQuestionBanks } = require('../scripts/qa/bank-loader');
const { CHUNK_MIGRATION_ORDER } = require('../scripts/question-chunk-config');
const {
  buildQuestionChunkScript,
  buildQuestionSubchunkScript,
  getChunkedSets,
  getExpectedChunkPath,
  getExpectedSubchunkPath,
  writeQuestionChunks
} = require('../scripts/generate-question-chunks');
const {
  generateManifest,
  getSourceSet,
  validateManifest
} = require('../scripts/generate-question-manifest');
const {
  loadChunkBank,
  validateQuestionChunkSet,
  validateQuestionChunks
} = require('../scripts/qa/chunk-qa');
const { runDomainGate } = require('../scripts/qa/chunk-migration-gates');

test('chunk files exactly match source bank sets', () => {
  const bankLoad = loadQuestionBanks();
  const manifest = loadMutableManifest();
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

  assert.match(result.errors[0], /capitalization-proper-names-titles/);
  assert.match(result.errors[0], /q0001/);
  assert.match(result.errors[0], /contentHash/);
});

test('generated chunks preserve stable skill and standard ids for runtime reporting', () => {
  const chunkBank = loadChunkBank('assets/question-chunks/grammar/grammar-sentence-types.js');
  const question = chunkBank['grammar-sentence-types'].questions[0];

  assert.ok(question.metadata.skillIds.includes('grammar.sentence-analysis'));
  assert.ok(question.metadata.standardIds.includes('L.3-6.1'));
});

test('manifest validation fails when a declared chunk is missing', () => {
  const manifest = loadMutableManifest();
  manifest.sets.find(set => set.chunkFile).chunkFile = 'assets/question-chunks/missing.js';

  assert.throws(
    () => validateManifest(manifest, loadQuestionBanks(), { validateChunks: true }),
    /missing\.js/
  );
});

test('chunk validation reports question id order drift', () => {
  const bankLoad = loadQuestionBanks();
  const sourceSet = getSourceSet(bankLoad, 'capitalization-proper-names-titles');
  const result = validateQuestionChunkSet({
    setId: 'capitalization-proper-names-titles',
    sourceSet,
    chunkSet: Object.assign({}, sourceSet, {
      questions: sourceSet.questions.slice(1).concat(sourceSet.questions[0])
    })
  });

  assert.match(result.errors[0], /question 1 id/);
  assert.match(result.errors[0], /capitalization-proper-names-titles/);
});

test('chunk validation requires each chunk to populate exactly the declared set id', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'question-chunk-validation-'));
  const chunkDir = path.join(tempRoot, 'assets', 'question-chunks', 'capitalization');
  const chunkPath = path.join(chunkDir, 'capitalization-proper-names-titles.js');
  fs.mkdirSync(chunkDir, { recursive: true });
  fs.writeFileSync(chunkPath, [
    '(function () {',
    '  window.QUESTION_BANK = Object.assign(window.QUESTION_BANK || {}, {',
    '    "capitalization-proper-names-titles": { title: "x", topic: "x", questions: [] },',
    '    "capitalization-extra": { title: "x", topic: "x", questions: [] }',
    '  });',
    '})();'
  ].join('\n'));

  const manifest = loadMutableManifest();
  const result = validateQuestionChunks(manifest, loadQuestionBanks(), { repoRoot: tempRoot });

  assert.ok(result.errors.some(error => /expected exactly capitalization-proper-names-titles/.test(error)));
});

test('chunk generation is deterministic', () => {
  const bankLoad = loadQuestionBanks();
  const sourceSet = getSourceSet(bankLoad, 'capitalization-proper-names-titles');
  const sourceFile = 'assets/question-bank-source/capitalization.json';

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

test('writeQuestionChunks dry run reports expected chunk paths for every question domain', () => {
  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);
  const summary = writeQuestionChunks(manifest, bankLoad, { dryRun: true });
  const paths = [...summary.written, ...summary.unchanged].map(write => write.path);

  assert.ok(paths.some(chunkPath => chunkPath.endsWith('assets/question-chunks/capitalization/capitalization-proper-names-titles.js')));
  assert.ok(paths.some(chunkPath => chunkPath.endsWith('assets/question-chunks/reference-skills/reference-skills-alphabetical-order.js')));
  assert.ok(paths.some(chunkPath => chunkPath.endsWith('assets/question-chunks/punctuation/punctuation-commas-series.js')));
  assert.ok(paths.some(chunkPath => chunkPath.endsWith('assets/question-chunks/vocabulary/vocabulary-homophones.js')));
  assert.ok(paths.some(chunkPath => /assets\/question-chunks\/reading-comprehension\/reading-comprehension-main-idea-supporting-details-(001|002)\.js$/.test(chunkPath)));
  assert.ok(paths.some(chunkPath => chunkPath.endsWith('assets/question-chunks/grammar/grammar-sentence-types.js')));
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
    const buildOptions = {
      domain: entry.domain,
      setId: entry.id,
      sourceFile: sourceRecord.relativeFile,
      set: sourceRecord.set
    };
    if (Array.isArray(entry.chunks) && entry.chunks.length) {
      entry.chunks.forEach((chunk, index) => {
        const questions = sourceRecord.set.questions.filter(question => chunk.ids.includes(question.id));
        const expected = buildQuestionSubchunkScript(Object.assign({}, buildOptions, {
          fullSet: sourceRecord.set,
          questions,
          chunkIndex: index + 1
        }));
        const actual = fs.readFileSync(getExpectedSubchunkPath({
          domain: entry.domain,
          setId: entry.id,
          index: index + 1
        }), 'utf8');

        assert.equal(actual, expected, `${entry.id} subchunk ${index + 1} should match generated output`);
      });
      return;
    }

    const expected = buildQuestionChunkScript(buildOptions);
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
    .find(file => file.domain === 'capitalization')
    .bank['capitalization-proper-names-titles'].questions[0].contentHash =
      `sha256:${'1'.repeat(64)}`;
  const manifest = generateManifest(staleBankLoad);

  assert.throws(
    () => validateManifest(manifest, staleBankLoad, { validateChunks: true }),
    /Question chunk validation failed/
  );
});

test('every manifest set is chunk-backed', () => {
  const manifest = generateManifest(loadQuestionBanks());

  assert.ok(manifest.sets.length > 0, 'expected manifest sets');
  manifest.sets.forEach(set => {
    assert.ok(set.chunkFile, `${set.id} should expose a chunkFile`);
    if (Array.isArray(set.chunks) && set.chunks.length) {
      assert.equal(set.chunkFile, set.chunks[0].chunkFile);
      assert.equal(set.chunks.reduce((sum, chunk) => sum + chunk.questionCount, 0), set.questionCount);
      assert.deepEqual(
        set.chunks.flatMap(chunk => chunk.ids).sort(),
        set.questions.map(question => question.id).sort()
      );
    } else {
      assert.equal(set.chunkFile, `assets/question-chunks/${set.domain}/${set.id}.js`);
    }
  });
});

test('domain migration gate passes for all chunked domains', () => {
  CHUNK_MIGRATION_ORDER.forEach(domain => {
    const result = runDomainGate(domain);
    assert.deepEqual(result.errors, []);
    assert.ok(result.checked > 0, `${domain} should have checked sets`);
  });
});

function loadMutableManifest() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'question-manifest.json'), 'utf8'));
}
