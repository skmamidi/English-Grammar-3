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
  flattenQuestionBanks,
  flattenQuestions,
  loadQuestionBanks
} = require('../scripts/qa/bank-loader');

test('conversion output preserves domain ids, set ids, and question count', () => {
  const legacyLoad = loadQuestionBanks({ sourceType: 'legacy' });
  const sources = buildJsonBankSources(legacyLoad);
  const sourceSetIds = Object.values(sources).flatMap(source => Object.keys(source.sets));

  assert.deepEqual(Object.keys(sources), [
    'capitalization',
    'grammar',
    'punctuation',
    'reading-comprehension',
    'reference-skills',
    'vocabulary'
  ]);
  assert.deepEqual(sourceSetIds.sort(), flattenQuestionBanks(legacyLoad).map(record => record.setId).sort());
  assert.equal(
    Object.values(sources).reduce((sum, source) => {
      return sum + Object.values(source.sets).reduce((setSum, set) => setSum + set.questions.length, 0);
    }, 0),
    flattenQuestions(legacyLoad).length
  );
});

test('conversion output preserves question ids, versions, and content hashes', () => {
  const legacyQuestions = flattenQuestions(loadQuestionBanks({ sourceType: 'legacy' }));
  const sources = buildJsonBankSources(loadQuestionBanks({ sourceType: 'legacy' }));
  const jsonQuestions = Object.values(sources).flatMap(source => {
    return Object.entries(source.sets).flatMap(([setId, set]) => {
      return set.questions.map(question => ({
        setId,
        id: question.id,
        version: question.version,
        contentHash: question.contentHash
      }));
    });
  });

  assert.deepEqual(
    jsonQuestions.sort(bySetAndQuestion),
    legacyQuestions.map(record => ({
      setId: record.setId,
      id: record.question.id,
      version: record.question.version,
      contentHash: record.question.contentHash
    })).sort(bySetAndQuestion)
  );
});

test('JSON loader returns the same flattened sets and questions as legacy JS loader', () => {
  const legacyLoad = loadQuestionBanks({ sourceType: 'legacy' });
  const jsonLoad = loadQuestionBanks({ sourceType: 'json' });

  assert.deepEqual(
    toJsonValue(flattenQuestionBanks(jsonLoad).map(record => ({
      setId: record.setId,
      relativeFile: record.relativeFile,
      sourceType: record.sourceType,
      runtimeBankFile: record.runtimeBankFile,
      set: record.set
    }))),
    toJsonValue(flattenQuestionBanks(legacyLoad).map(record => ({
      setId: record.setId,
      relativeFile: record.relativeFile.replace('assets/question-banks/', 'assets/question-bank-source/').replace(/\.js$/, '.json'),
      sourceType: 'json',
      runtimeBankFile: record.relativeFile,
      set: record.set
    })))
  );
  assert.deepEqual(
    toJsonValue(flattenQuestions(jsonLoad).map(record => record.question)),
    toJsonValue(flattenQuestions(legacyLoad).map(record => record.question))
  );
});

test('dry-run conversion fails when JSON source is stale', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'question-bank-json-'));
  const sourceDir = path.join(tempRoot, 'assets', 'question-banks');
  const jsonDir = path.join(tempRoot, 'assets', 'question-bank-source');
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(jsonDir, { recursive: true });
  fs.copyFileSync(
    path.join(__dirname, '..', 'assets', 'question-banks', 'capitalization.js'),
    path.join(sourceDir, 'capitalization.js')
  );
  fs.writeFileSync(path.join(jsonDir, 'capitalization.json'), `${JSON.stringify({
    schemaVersion: 1,
    domain: 'capitalization',
    sets: {}
  }, null, 2)}\n`);

  const result = convertQuestionBanksToJson({ repoRoot: tempRoot, dryRun: true });

  assert.equal(result.changed.length, 1);
  assert.equal(result.unchanged.length, 0);
});

function bySetAndQuestion(left, right) {
  return `${left.setId}/${left.id}`.localeCompare(`${right.setId}/${right.id}`);
}

function toJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}
