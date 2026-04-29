const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const { computeContentHash } = require('../scripts/qa/question-metadata');
const {
  validateQuestionSourceFiles
} = require('../scripts/qa/question-source-schema-qa');

test('real canonical JSON sources pass schema validation', () => {
  const result = validateQuestionSourceFiles();

  assert.deepEqual(result.errors, []);
  assert.equal(result.files, 6);
  assert.equal(result.sets, 95);
  assert.equal(result.questions, 10240);
});

[
  ['missing id', question => { delete question.id; }, /question id is required/],
  ['duplicate question id', (question, source) => { source.sets['grammar-schema-fixture'].questions[1].id = question.id; }, /duplicate question id/],
  ['duplicate sequence', (question, source) => { source.sets['grammar-schema-fixture'].questions[1].metadata.sequence = question.metadata.sequence; }, /duplicate metadata.sequence/],
  ['invalid version', question => { question.version = 0; }, /version must be a positive integer/],
  ['wrong sourceSet', question => { question.metadata.sourceSet = 'grammar-wrong-set'; }, /metadata.sourceSet is "grammar-wrong-set"; expected "grammar-schema-fixture"/],
  ['missing contentHash', question => { delete question.contentHash; }, /contentHash is required/],
  ['stale contentHash', question => { question.question = 'Changed prompt without updating the hash.'; }, /contentHash is stale/],
  ['empty choices', question => { question.choices = []; }, /choices must be a non-empty array/],
  ['correct outside choices', question => { question.correct = 12; }, /correct answer must reference a valid choice/],
  ['invalid difficulty', question => { question.metadata.difficultyByGrade['4'] = 'expert'; }, /invalid difficulty "expert"/],
  ['invalid grade level', question => { question.metadata.gradeLevels = [2]; }, /invalid grade level 2/],
  ['unknown skill id', question => { question.metadata.skillIds = ['grammar.unknown-skill']; }, /unknown skillId "grammar\.unknown-skill"/],
  ['domain-incompatible skill id', question => { question.metadata.skillIds = ['vocabulary.word-study']; }, /does not belong to domain "grammar"/],
  ['unknown standard id', question => { question.metadata.standardIds = ['NOT.A.STANDARD']; }, /unknown standardId "NOT\.A\.STANDARD"/],
  ['domain mismatch', null, /domain is "vocabulary"; expected "grammar"/, source => { source.domain = 'vocabulary'; }]
].forEach(([name, mutateQuestion, expected, mutateSource]) => {
  test(`schema validation fails for ${name}`, () => {
    const source = makeFixtureSource();
    if (mutateQuestion) mutateQuestion(source.sets['grammar-schema-fixture'].questions[0], source);
    if (mutateSource) mutateSource(source);
    const fixture = writeFixture(`${slug(name)}.json`, source);

    const result = validateQuestionSourceFiles({ files: [fixture] });

    assert.ok(
      result.errors.some(error => expected.test(error)),
      `expected ${expected} in:\n${result.errors.join('\n')}`
    );
  });
});

test('schema validation reports malformed JSON with the source file path', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'question-schema-fixture-'));
  const file = path.join(dir, 'grammar.json');
  fs.writeFileSync(file, '{ broken json');

  const result = validateQuestionSourceFiles({ files: [file] });

  assert.ok(result.errors.some(error => /grammar\.json: invalid JSON/.test(error)));
});

function writeFixture(fileName, source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'question-schema-fixture-'));
  const domainFile = fileName.includes('.')
    ? fileName.replace(/^[^.]+/, source.domain === 'vocabulary' ? 'grammar' : source.domain)
    : `${source.domain}.json`;
  const file = path.join(dir, domainFile);
  fs.writeFileSync(file, `${JSON.stringify(source, null, 2)}\n`);
  return file;
}

function makeFixtureSource() {
  const questions = [
    makeQuestion(1, 'Which sentence uses a noun?', ['The dog ran.', 'Quickly!'], 0),
    makeQuestion(2, 'Which sentence uses a verb?', ['The dog ran.', 'A tall tree.'], 0)
  ];
  return {
    schemaVersion: 1,
    domain: 'grammar',
    sets: {
      'grammar-schema-fixture': {
        title: 'Schema Fixture',
        topic: 'Grammar',
        metadata: {
          gradesSupported: [3, 4, 5, 6],
          difficultiesSupported: ['easy', 'medium', 'hard']
        },
        questions
      }
    }
  };
}

function makeQuestion(sequence, prompt, choices, correct) {
  const question = {
    id: `grammar-schema-fixture-q${String(sequence).padStart(4, '0')}`,
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
      sourceSet: 'grammar-schema-fixture',
      sequence,
      gradeLevels: [3, 4, 5, 6],
      difficultyByGrade: {
        3: 'easy',
        4: 'medium',
        5: 'hard',
        6: 'hard'
      },
      skills: ['schema validation']
    }
  };
  question.contentHash = computeContentHash(question);
  return question;
}

function slug(value) {
  return String(value).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}
