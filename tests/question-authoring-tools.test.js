const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const { normalizeQuestionSources } = require('../scripts/assign-question-ids');
const { checkQuestionConsistency } = require('../scripts/check-question-consistency');
const { computeContentHash } = require('../scripts/qa/question-metadata');
const { validateQuestionSourceFiles } = require('../scripts/qa/question-source-schema-qa');

test('assign-question-ids dry-run reads JSON by default and reports dirty sources without writing', () => {
  const root = makeTempProject(makeDirtySource());
  const sourcePath = path.join(root, 'assets', 'question-bank-source', 'grammar.json');
  const before = fs.readFileSync(sourcePath, 'utf8');

  const summary = normalizeQuestionSources({ repoRoot: root, write: false });

  assert.equal(summary.filesChecked, 1);
  assert.equal(summary.changedQuestions, 2);
  assert.equal(fs.readFileSync(sourcePath, 'utf8'), before);
});

test('assign-question-ids --write updates canonical JSON deterministically', () => {
  const root = makeTempProject(makeDirtySource());
  const sourcePath = path.join(root, 'assets', 'question-bank-source', 'grammar.json');

  const summary = normalizeQuestionSources({ repoRoot: root, write: true });
  const contents = fs.readFileSync(sourcePath, 'utf8');
  const source = JSON.parse(contents);
  const questions = source.sets['grammar-authoring-fixture'].questions;

  assert.equal(summary.changedQuestions, 2);
  assert.equal(contents, `${JSON.stringify(source, null, 2)}\n`);
  assert.equal(questions[0].id, 'grammar-authoring-fixture-q0001');
  assert.equal(questions[0].version, 1);
  assert.equal(questions[0].metadata.sourceSet, 'grammar-authoring-fixture');
  assert.equal(questions[0].metadata.sequence, 1);
  assert.equal(questions[0].contentHash, computeContentHash(questions[0]));
  assert.equal(questions[1].id, 'grammar-authoring-fixture-q0002');
  assert.equal(questions[1].contentHash, computeContentHash(questions[1]));
});

test('assign-question-ids preserves valid stable ids over stale metadata sequences', () => {
  const source = makeValidSource();
  const questions = source.sets['grammar-authoring-fixture'].questions;
  questions[0].metadata.sequence = 99;
  questions[1].metadata.sequence = 98;
  const root = makeTempProject(source);

  normalizeQuestionSources({ repoRoot: root, write: true });

  const normalized = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'question-bank-source', 'grammar.json'), 'utf8'));
  const normalizedQuestions = normalized.sets['grammar-authoring-fixture'].questions;
  assert.equal(normalizedQuestions[0].id, 'grammar-authoring-fixture-q0001');
  assert.equal(normalizedQuestions[0].metadata.sequence, 1);
  assert.equal(normalizedQuestions[1].id, 'grammar-authoring-fixture-q0002');
  assert.equal(normalizedQuestions[1].metadata.sequence, 2);
});

test('assign-question-ids default mode does not mutate legacy JS banks', () => {
  const root = makeTempProject(makeDirtySource());
  const legacyPath = path.join(root, 'assets', 'question-banks', 'grammar.js');
  const before = fs.readFileSync(legacyPath, 'utf8');

  normalizeQuestionSources({ repoRoot: root, write: true });

  assert.equal(fs.readFileSync(legacyPath, 'utf8'), before);
});

test('legacy JS normalization requires explicit migration tooling', () => {
  assert.throws(
    () => normalizeQuestionSources({ legacyJs: true }),
    /Legacy JS normalization is no longer supported/
  );
});

test('check-question-consistency reports JSON source paths', () => {
  const source = makeValidSource();
  source.sets['grammar-authoring-fixture'].questions[0].contentHash = `sha256:${'0'.repeat(64)}`;
  const root = makeTempProject(source);

  const result = checkQuestionConsistency({ repoRoot: root });

  assert.ok(result.errors.some(issue => {
    return issue.message.includes('contentHash is stale') &&
      issue.file.endsWith('assets/question-bank-source/grammar.json');
  }));
});

test('stale JSON contentHash is caught by schema QA and consistency QA', () => {
  const source = makeValidSource();
  source.sets['grammar-authoring-fixture'].questions[0].question = 'Changed prompt with stale hash.';
  const root = makeTempProject(source);
  const sourcePath = path.join(root, 'assets', 'question-bank-source', 'grammar.json');

  const schema = validateQuestionSourceFiles({ files: [sourcePath], repoRoot: root });
  const consistency = checkQuestionConsistency({ repoRoot: root });

  assert.ok(schema.errors.some(error => /contentHash is stale/.test(error)));
  assert.ok(consistency.errors.some(issue => issue.message.includes('contentHash is stale')));
});

function makeTempProject(source) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'question-authoring-'));
  const sourceDir = path.join(root, 'assets', 'question-bank-source');
  const legacyDir = path.join(root, 'assets', 'question-banks');
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'grammar.json'), `${JSON.stringify(source, null, 2)}\n`);
  fs.writeFileSync(path.join(legacyDir, 'grammar.js'), 'window.QUESTION_BANK = { legacy: true };\n');
  return root;
}

function makeDirtySource() {
  const source = makeValidSource();
  const questions = source.sets['grammar-authoring-fixture'].questions;
  delete questions[0].id;
  delete questions[0].version;
  delete questions[0].contentHash;
  questions[0].metadata = {};
  questions[1].contentHash = `sha256:${'1'.repeat(64)}`;
  questions[1].metadata.sourceSet = 'wrong-set';
  questions[1].metadata.sequence = 1;
  return source;
}

function makeValidSource() {
  const questions = [
    makeQuestion(1, 'Which sentence uses a noun?', ['The dog ran.', 'Quickly!'], 0),
    makeQuestion(2, 'Which sentence uses a verb?', ['The dog ran.', 'A tall tree.'], 0)
  ];
  return {
    schemaVersion: 1,
    domain: 'grammar',
    sets: {
      'grammar-authoring-fixture': {
        title: 'Authoring Fixture',
        topic: 'Grammar',
        questions
      }
    }
  };
}

function makeQuestion(sequence, prompt, choices, correct) {
  const question = {
    id: `grammar-authoring-fixture-q${String(sequence).padStart(4, '0')}`,
    version: 1,
    contentHash: '',
    question: prompt,
    choices,
    correct,
    explanation: {
      correct: 'This answer matches the grammar target.',
      incorrect: choices.map(() => 'This choice does not match the grammar target.')
    },
    metadata: {
      sourceSet: 'grammar-authoring-fixture',
      sequence,
      gradeLevels: [3, 4, 5, 6],
      difficultyByGrade: {
        3: 'easy',
        4: 'medium',
        5: 'hard',
        6: 'hard'
      },
      skills: ['authoring tools']
    }
  };
  question.contentHash = computeContentHash(question);
  return question;
}
