const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const {
  flattenQuestionBanks,
  loadQuestionBanks
} = require('../scripts/qa/bank-loader');
const {
  buildQuestionChunkScript,
  buildQuestionSubchunkScript,
  getChunkedSets,
  getExpectedChunkPath,
  getExpectedSubchunkPath,
  writeQuestionChunks
} = require('../scripts/generate-question-chunks');
const {
  DEFAULT_MANIFEST_SCRIPT_PATH,
  buildManifestScript,
  generateManifest,
  loadManifest,
  validateManifest,
  validateManifestScript
} = require('../scripts/generate-question-manifest');
const { validateJsonQuestionSources } = require('../scripts/qa/json-source-qa');

const repoRoot = path.resolve(__dirname, '..');

test('generation source defaults to canonical JSON', () => {
  const bankLoad = loadQuestionBanks();
  const result = validateJsonQuestionSources(bankLoad);

  assert.deepEqual(result.errors, []);
  assert.ok(bankLoad.files.length > 0, 'expected JSON source files');
  assert.ok(bankLoad.files.every(file => file.sourceType === 'json'));
  assert.ok(bankLoad.files.every(file => file.relativeFile.startsWith('assets/question-bank-source/')));
});

test('manifest generated from JSON matches committed manifest JSON and JS', () => {
  const bankLoad = loadQuestionBanks();
  const generated = generateManifest(bankLoad);
  const committed = loadManifest();

  assert.deepEqual(generated, committed);
  assert.equal(fs.readFileSync(DEFAULT_MANIFEST_SCRIPT_PATH, 'utf8'), buildManifestScript(generated));
  assert.deepEqual(validateManifest(committed, bankLoad), generated);
  assert.equal(validateManifestScript(generated), buildManifestScript(generated));
});

test('every chunk generated from JSON matches the committed browser chunk file', () => {
  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);
  const sourceRecords = new Map(flattenQuestionBanks(bankLoad).map(record => [record.setId, record]));

  getChunkedSets(manifest).forEach(entry => {
    const sourceRecord = sourceRecords.get(entry.id);
    assert.equal(sourceRecord.sourceType, 'json');
    const buildOptions = {
      domain: entry.domain,
      setId: entry.id,
      sourceFile: sourceRecord.relativeFile,
      set: sourceRecord.set
    };
    if (Array.isArray(entry.chunks) && entry.chunks.length) {
      entry.chunks.forEach((chunk, index) => {
        const expected = buildQuestionSubchunkScript(Object.assign({}, buildOptions, {
          fullSet: sourceRecord.set,
          questions: sourceRecord.set.questions.filter(question => chunk.ids.includes(question.id)),
          chunkIndex: index + 1
        }));
        const actual = fs.readFileSync(getExpectedSubchunkPath({
          domain: entry.domain,
          setId: entry.id,
          index: index + 1
        }), 'utf8');

        assert.equal(actual, expected, `${entry.id} subchunk ${index + 1} should be generated from JSON source`);
      });
      return;
    }

    const expected = buildQuestionChunkScript(buildOptions);
    const actual = fs.readFileSync(getExpectedChunkPath({
      domain: entry.domain,
      setId: entry.id
    }), 'utf8');

    assert.equal(actual, expected, `${entry.id} chunk should be generated from JSON source`);
  });
});

test('chunk dry-run reports stale generated chunk files', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'json-chunk-drift-'));
  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);
  const entry = getChunkedSets(manifest)[0];
  const stalePath = getExpectedChunkPath({ domain: entry.domain, setId: entry.id }, tempRoot);
  fs.mkdirSync(path.dirname(stalePath), { recursive: true });
  fs.writeFileSync(stalePath, '// stale chunk\n');

  const summary = writeQuestionChunks(manifest, bankLoad, { repoRoot: tempRoot, dryRun: true });

  assert.ok(summary.written.some(item => item.path === stalePath));
});

test('manifest dry-run checks fail when manifest artifacts are stale', () => {
  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);
  const staleManifest = structuredClone(manifest);
  staleManifest.totalQuestions += 1;
  const staleScript = path.join(os.tmpdir(), `stale-question-manifest-${Date.now()}.js`);
  fs.writeFileSync(staleScript, 'window.QUESTION_MANIFEST = { stale: true };\n');

  assert.throws(() => validateManifest(staleManifest, bankLoad), /totalQuestions/);
  assert.throws(() => validateManifestScript(manifest, staleScript), /manifest script is stale/);
});

test('generated chunks reference JSON source files, not legacy source-bank JavaScript', () => {
  const chunkFiles = getChunkFiles(path.join(repoRoot, 'assets', 'question-chunks'));

  assert.ok(chunkFiles.length > 0, 'expected generated chunk files');
  chunkFiles.forEach(file => {
    const contents = fs.readFileSync(file, 'utf8');
    assert.match(contents, /Generated from assets\/question-bank-source\//, file);
    assert.doesNotMatch(contents, /Generated from assets\/question-banks\/[^.]+\.js/, file);
  });
});

function getChunkFiles(dir) {
  const files = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...getChunkFiles(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  });
  return files.sort();
}
