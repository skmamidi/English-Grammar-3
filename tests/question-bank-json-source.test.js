const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const {
  buildJsonBankSources,
  convertQuestionBanksToJson
} = require('../scripts/convert-question-banks-to-json');
const {
  flattenQuestions,
  loadQuestionBanks
} = require('../scripts/qa/bank-loader');

const conversionFixtureRoot = path.join(__dirname, 'fixtures', 'legacy-bank-conversion');

test('canonical JSON source exposes expected live domain coverage', () => {
  const jsonLoad = loadQuestionBanks({ sourceType: 'json' });
  const sourceSetIds = jsonLoad.files.flatMap(file => Object.keys(file.bank));
  const domains = jsonLoad.files.map(file => file.domain).sort();

  assert.ok(jsonLoad.files.every(file => file.sourceType === 'json'));
  assert.deepEqual(domains, [
    'capitalization',
    'grammar',
    'punctuation',
    'reading-comprehension',
    'reference-skills',
    'vocabulary'
  ]);
  assert.equal(sourceSetIds.length, 95);
  assert.equal(flattenQuestions(jsonLoad).length, 10240);
});

test('legacy JS fixture converts to expected JSON source shape', () => {
  const legacyLoad = loadQuestionBanks({ repoRoot: conversionFixtureRoot, sourceType: 'legacy' });
  const sources = buildJsonBankSources(legacyLoad);
  const expected = readFixtureJson('expected-question-bank-source.json');

  assert.deepEqual(toJsonValue(sources), expected);
});

test('JSON loader reads canonical sources without live legacy JS parity', () => {
  const jsonLoad = loadQuestionBanks({ sourceType: 'json' });

  assert.ok(jsonLoad.files.length > 0, 'expected canonical JSON files');
  assert.ok(jsonLoad.files.every(file => file.relativeFile.startsWith('assets/question-bank-source/')));
  assert.ok(jsonLoad.files.every(file => file.runtimeBankFile.startsWith('assets/question-banks/')));
});

test('dry-run conversion reports stale fixture JSON output', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'question-bank-json-'));
  const sourceDir = path.join(tempRoot, 'assets', 'question-banks');
  const jsonDir = path.join(tempRoot, 'assets', 'question-bank-source');
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(jsonDir, { recursive: true });
  copyDir(path.join(conversionFixtureRoot, 'assets', 'question-banks'), sourceDir);
  fs.writeFileSync(path.join(jsonDir, 'grammar.json'), `${JSON.stringify({
    schemaVersion: 1,
    domain: 'grammar',
    sets: {}
  }, null, 2)}\n`);

  const result = convertQuestionBanksToJson({ repoRoot: tempRoot, dryRun: true });

  assert.equal(result.changed.length, 1);
  assert.equal(result.unchanged.length, 0);
});

function readFixtureJson(file) {
  return JSON.parse(fs.readFileSync(path.join(conversionFixtureRoot, file), 'utf8'));
}

function toJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function copyDir(fromDir, toDir) {
  fs.readdirSync(fromDir, { withFileTypes: true }).forEach(entry => {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  });
}
