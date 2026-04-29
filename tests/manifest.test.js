const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

const { validateContent } = require('../scripts/qa/content-qa');
const { loadQuestionBanks } = require('../scripts/qa/bank-loader');
const {
  DEFAULT_MANIFEST_SCRIPT_PATH,
  buildIndexManifest,
  generateManifest,
  loadManifest,
  validateManifest
} = require('../scripts/generate-question-manifest');

test('generated manifest matches loaded question banks', () => {
  const banks = validateContent();
  const manifest = generateManifest(banks.bankLoad);

  assert.equal(manifest.totalQuestions, banks.questions.length);
  assert.equal(manifest.sets.length, banks.sets.length);
  assert.ok(manifest.sets.every(set => set.id && set.questionCount > 0));
});

test('checked-in manifest is in sync with loaded question banks', () => {
  const validated = validateManifest(loadManifest(), loadQuestionBanks());

  assert.ok(validated.totalQuestions > 0);
  assert.ok(validated.sets.every(set => set.questions.length === set.questionCount));
});

test('manifest check fails when bank counts drift', () => {
  const manifest = loadManifest();
  manifest.totalQuestions += 1;

  assert.throws(
    () => validateManifest(manifest, loadQuestionBanks()),
    /totalQuestions/
  );
});

test('manifest exposes compact lookup metadata without learner-facing prompts', () => {
  const manifest = validateManifest(loadManifest(), loadQuestionBanks());
  const set = manifest.sets.find(item => item.id === 'grammar-sentence-types');

  assert.ok(set, 'expected representative set in manifest');
  assert.equal(set.bankFile, 'assets/question-banks/grammar.js');
  assert.ok(set.gradesSupported.includes(4));
  assert.ok(set.difficultiesSupported.includes('medium'));
  assert.ok(set.questions[0].id.startsWith('grammar-sentence-types-q'));
  assert.ok(set.questions[0].contentHash.startsWith('sha256:'));
  assert.equal(Object.hasOwn(set.questions[0], 'question'), false);
  assert.equal(Object.hasOwn(set.questions[0], 'choices'), false);
  assert.equal(Object.hasOwn(set.questions[0], 'explanation'), false);
});

test('checked-in manifest script exposes index metadata as a browser global', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(DEFAULT_MANIFEST_SCRIPT_PATH, 'utf8'), context);

  assert.equal(
    JSON.stringify(context.window.QUESTION_MANIFEST),
    JSON.stringify(buildIndexManifest(loadManifest()))
  );
  assert.equal(Object.hasOwn(context.window.QUESTION_MANIFEST.sets[0], 'questions'), false);
});

test('index manifest script stays smaller than topic question banks', () => {
  const manifestBytes = fs.statSync(DEFAULT_MANIFEST_SCRIPT_PATH).size;
  const bankDir = path.join(__dirname, '..', 'assets', 'question-banks');
  const bankFiles = fs.readdirSync(bankDir).filter(file => file.endsWith('.js'));

  assert.ok(bankFiles.length, 'expected question bank files');
  bankFiles.forEach(file => {
    const bankBytes = fs.statSync(path.join(bankDir, file)).size;
    assert.ok(
      manifestBytes < bankBytes,
      `expected manifest script (${manifestBytes} bytes) to be smaller than ${file} (${bankBytes} bytes)`
    );
  });
});

test('topic index helper can resolve subtopics from manifest entries without a full bank', () => {
  const context = {
    window: {},
    document: {
      addEventListener() {},
      createElement() {
        return { textContent: '', innerHTML: '' };
      }
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'topic-index.js'), 'utf8'), context);

  const manifest = {
    sets: [{
      id: 'grammar-sentence-types',
      title: 'Sentence Types',
      bankFile: 'assets/question-banks/grammar.js',
      questionCount: 42,
      gradesSupported: [3, 4, 5, 6],
      difficultiesSupported: ['easy', 'medium']
    }]
  };

  const entry = context.window.GrammarQuestTopicIndex.findQuestionSetManifestEntry(
    manifest,
    'subtopics/sentence-types.html'
  );

  assert.equal(entry.id, 'grammar-sentence-types');
  assert.equal(context.window.GrammarQuestTopicIndex.getQuestionCount(entry.set), 42);
  assert.equal(
    context.window.GrammarQuestTopicIndex.getPracticeLabel(entry.set),
    'Adaptive practice: Grades 2-5'
  );
});
