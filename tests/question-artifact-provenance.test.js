const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const { loadQuestionBanks, flattenQuestionBanks } = require('../scripts/qa/bank-loader');
const {
  QUESTION_ARTIFACT_SCHEMA_VERSION,
  QUESTION_GENERATOR_VERSION,
  buildQuestionManifestProvenance,
  computeQuestionSetSourceHash,
  computeQuestionSourceHash,
  parseQuestionChunkProvenance
} = require('../scripts/question-artifact-provenance');
const {
  buildQuestionChunkScript,
  getChunkedSets,
  getExpectedChunkPath
} = require('../scripts/generate-question-chunks');
const {
  buildIndexManifest,
  generateManifest,
  loadManifest,
  validateManifest
} = require('../scripts/generate-question-manifest');
const { validateChunkProvenance } = require('../scripts/qa/chunk-qa');

const repoRoot = path.resolve(__dirname, '..');

test('question source hash is stable for unchanged canonical JSON', () => {
  const first = computeQuestionSourceHash(loadQuestionBanks());
  const second = computeQuestionSourceHash(loadQuestionBanks());

  assert.match(first, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first, second);
});

test('question source hash changes when JSON source changes', () => {
  const root = makeTempQuestionSource('Which sentence is complete?');
  const before = computeQuestionSourceHash(loadQuestionBanks({ repoRoot: root, sourceType: 'json' }));
  const sourcePath = path.join(root, 'assets', 'question-bank-source', 'grammar.json');
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  source.sets['grammar-provenance-fixture'].questions[0].question = 'Which sentence is a fragment?';
  fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 2)}\n`);
  const after = computeQuestionSourceHash(loadQuestionBanks({ repoRoot: root, sourceType: 'json' }));

  assert.notEqual(before, after);
});

test('manifest provenance matches current canonical sources', () => {
  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);

  assert.deepEqual(manifest.artifact, buildQuestionManifestProvenance(bankLoad));
  assert.equal(manifest.artifact.type, 'question-manifest');
  assert.equal(manifest.artifact.artifactSchemaVersion, QUESTION_ARTIFACT_SCHEMA_VERSION);
  assert.equal(manifest.artifact.generatorVersion, QUESTION_GENERATOR_VERSION);
  assert.equal(manifest.artifact.sourceType, 'json');
  assert.ok(manifest.artifact.sourceFiles.every(file => file.startsWith('assets/question-bank-source/')));
});

test('manifest validation fails when provenance source hash is stale', () => {
  const manifest = generateManifest(loadQuestionBanks());
  manifest.artifact.sourceHash = `sha256:${'0'.repeat(64)}`;

  assert.throws(
    () => validateManifest(manifest, loadQuestionBanks()),
    /Question manifest provenance is stale:[\s\S]*source hash/
  );
});

test('runtime manifest keeps compact deterministic provenance', () => {
  const manifest = generateManifest(loadQuestionBanks());
  const runtimeManifest = buildIndexManifest(manifest);

  assert.deepEqual(runtimeManifest.artifact, manifest.artifact);
  assert.equal(Object.hasOwn(runtimeManifest, 'generatedAt'), false);
  assert.equal(Object.hasOwn(runtimeManifest.artifact, 'generatedAt'), false);
});

test('chunk provenance header matches the current source set', () => {
  const bankLoad = loadQuestionBanks();
  const manifest = generateManifest(bankLoad);
  const entry = getChunkedSets(manifest)[0];
  const sourceRecord = flattenQuestionBanks(bankLoad).find(record => record.setId === entry.id);
  const chunk = fs.readFileSync(getExpectedChunkPath({ domain: entry.domain, setId: entry.id }), 'utf8');
  const provenance = parseQuestionChunkProvenance(chunk);

  assert.equal(provenance.sourceFile, sourceRecord.relativeFile);
  assert.equal(provenance.generatorVersion, QUESTION_GENERATOR_VERSION);
  assert.equal(provenance.sourceHash, computeQuestionSetSourceHash(entry.id, sourceRecord.set));
});

test('chunk provenance validation fails when source hash is stale', () => {
  const bankLoad = loadQuestionBanks();
  const sourceRecord = flattenQuestionBanks(bankLoad).find(record => record.setId === 'capitalization-proper-names-titles');
  const chunk = buildQuestionChunkScript({
    domain: sourceRecord.domain,
    setId: sourceRecord.setId,
    sourceFile: sourceRecord.relativeFile,
    set: sourceRecord.set
  }).replace(/Source hash: sha256:[a-f0-9]{64}\./, `Source hash: sha256:${'1'.repeat(64)}.`);

  const result = validateChunkProvenance({
    entry: { id: sourceRecord.setId },
    sourceRecord,
    chunkContents: chunk
  });

  assert.ok(result.errors.some(error => /chunk source hash/.test(error)));
});

test('committed question artifacts do not include wall-clock timestamps', () => {
  const manifest = loadManifest();
  assert.equal(Object.hasOwn(manifest, 'generatedAt'), false);
  assert.equal(Object.hasOwn(manifest.artifact, 'generatedAt'), false);

  const chunkFiles = getChunkFiles(path.join(repoRoot, 'assets', 'question-chunks'));
  assert.ok(chunkFiles.length > 0, 'expected generated chunk files');
  chunkFiles.forEach(file => {
    const header = fs.readFileSync(file, 'utf8').split('*/')[0];
    assert.doesNotMatch(header, /Generated (at|on):/i, file);
    assert.doesNotMatch(header, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, file);
  });
});

function makeTempQuestionSource(prompt) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'question-provenance-'));
  const sourceDir = path.join(root, 'assets', 'question-bank-source');
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'grammar.json'), `${JSON.stringify({
    schemaVersion: 1,
    domain: 'grammar',
    sets: {
      'grammar-provenance-fixture': {
        title: 'Provenance Fixture',
        topic: 'Grammar',
        questions: [{
          id: 'grammar-provenance-fixture-q0001',
          version: 1,
          contentHash: 'sha256:fixture',
          question: prompt,
          choices: ['Sentence.', 'Fragment'],
          correct: 0,
          explanation: {
            correct: 'A complete sentence has a subject and predicate.',
            incorrect: ['This is complete.', 'This is not complete.']
          },
          metadata: {
            sourceSet: 'grammar-provenance-fixture',
            sequence: 1
          }
        }]
      }
    }
  }, null, 2)}\n`);
  return root;
}

function getChunkFiles(dir) {
  const files = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...getChunkFiles(full));
    else if (entry.name.endsWith('.js')) files.push(full);
  });
  return files.sort();
}
