const assert = require('node:assert/strict');
const test = require('node:test');

const { validateContent } = require('../scripts/qa/content-qa');
const { loadQuestionBanks } = require('../scripts/qa/bank-loader');
const {
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
