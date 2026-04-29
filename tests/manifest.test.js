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
  assert.equal(Object.hasOwn(set, 'bankFile'), false);
  assert.equal(set.chunkFile, 'assets/question-chunks/grammar/grammar-sentence-types.js');
  assert.ok(set.gradesSupported.includes(4));
  assert.ok(set.difficultiesSupported.includes('medium'));
  assert.ok(set.questions[0].id.startsWith('grammar-sentence-types-q'));
  assert.ok(set.questions[0].contentHash.startsWith('sha256:'));
  assert.equal(Object.hasOwn(set.questions[0], 'question'), false);
  assert.equal(Object.hasOwn(set.questions[0], 'choices'), false);
  assert.equal(Object.hasOwn(set.questions[0], 'explanation'), false);
});

test('all manifest entries point to checked-in chunk files', () => {
  const manifest = validateManifest(loadManifest(), loadQuestionBanks());

  assert.ok(manifest.sets.length > 0, 'expected manifest sets');
  manifest.sets.forEach(set => {
    assert.equal(Object.hasOwn(set, 'bankFile'), false);
    assert.equal(set.chunkFile, `assets/question-chunks/${set.domain}/${set.id}.js`);
    assert.ok(fs.existsSync(path.join(__dirname, '..', set.chunkFile)), `${set.chunkFile} should exist`);
  });
});

test('checked-in manifest script exposes index metadata as a browser global', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(DEFAULT_MANIFEST_SCRIPT_PATH, 'utf8'), context);

  assert.equal(
    JSON.stringify(context.window.QUESTION_MANIFEST),
    JSON.stringify(buildIndexManifest(loadManifest()))
  );
  assert.equal(Object.hasOwn(context.window.QUESTION_MANIFEST.sets[0], 'questions'), false);
  assert.equal(Object.hasOwn(context.window.QUESTION_MANIFEST.sets[0], 'bankFile'), false);
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
  const context = createTopicIndexContext();
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'topic-index.js'), 'utf8'), context);

  const manifest = {
    sets: [{
      id: 'grammar-sentence-types',
      title: 'Sentence Types',
      chunkFile: 'assets/question-chunks/grammar/grammar-sentence-types.js',
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

test('topic index hydrates mixed subtopics from loaded sets by selected id', () => {
  const context = createTopicIndexContext();
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'topic-index.js'), 'utf8'), context);

  const subtopics = [{
    id: 'capitalization-proper-names-titles',
    title: 'Proper Names',
    href: 'subtopics/proper-names-titles.html'
  }, {
    id: 'capitalization-sentence-beginning',
    title: 'Sentence Beginning',
    href: 'subtopics/sentence-beginning.html'
  }, {
    id: 'capitalization-empty',
    title: 'Empty',
    href: 'subtopics/empty.html'
  }];
  const sets = [{
    id: 'capitalization-sentence-beginning',
    questions: [{ id: 'capitalization-sentence-beginning-q0001' }]
  }, {
    id: 'capitalization-proper-names-titles',
    questions: [{ id: 'capitalization-proper-names-titles-q0001' }]
  }, {
    id: 'capitalization-empty',
    questions: []
  }];

  const hydrated = context.window.GrammarQuestTopicIndex.hydrateMixedSubtopics(subtopics, sets);

  assert.deepEqual(hydrated.map(subtopic => subtopic.id), [
    'capitalization-proper-names-titles',
    'capitalization-sentence-beginning'
  ]);
  assert.equal(hydrated[0].set.id, 'capitalization-proper-names-titles');
  assert.equal(hydrated[1].set.id, 'capitalization-sentence-beginning');
});

test('mixed quiz loader hydrates only requested selected subtopics', async () => {
  const requestedIds = [];
  const context = createTopicIndexContext();
  context.window.GrammarQuestQuestionLoader = {
    loadSets(ids) {
      requestedIds.push(...ids);
      return Promise.resolve(ids.map(id => ({ id, questions: [{ id: `${id}-q0001` }] })));
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'topic-index.js'), 'utf8'), context);

  const sets = await context.window.GrammarQuestTopicIndex.loadMixedQuizSets([
    'capitalization-proper-names-titles',
    'capitalization-sentence-beginning'
  ]);

  assert.deepEqual(requestedIds, [
    'capitalization-proper-names-titles',
    'capitalization-sentence-beginning'
  ]);
  assert.deepEqual(sets.map(set => set.id), requestedIds);
});

test('grammar mixed quiz can use server selection pilot when enabled', async () => {
  const selectedRequests = [];
  const context = createTopicIndexContext();
  context.window.GRAMMAR_QUEST_CONFIG = {
    enableServerQuestionSelection: true,
    serverQuestionSelectionPilotDomains: ['grammar']
  };
  context.window.GrammarQuestQuestionLoader = {
    loadSets() {
      throw new Error('loadSets should not be used for grammar API pilot');
    },
    loadSelectedQuiz(request) {
      selectedRequests.push(request);
      return Promise.resolve({
        source: 'api',
        sets: [{ id: 'grammar-sentence-types', questions: [{ id: 'grammar-sentence-types-q0001' }] }]
      });
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'topic-index.js'), 'utf8'), context);

  const sets = await context.window.GrammarQuestTopicIndex.loadMixedQuizSets([{
    id: 'grammar-sentence-types',
    set: { domain: 'grammar' }
  }]);

  assert.equal(selectedRequests.length, 1);
  assert.equal(selectedRequests[0].mode, 'mixed');
  assert.equal(selectedRequests[0].domain, 'grammar');
  assert.deepEqual(selectedRequests[0].setIds, ['grammar-sentence-types']);
  assert.deepEqual(sets.map(set => set.id), ['grammar-sentence-types']);
});

function createTopicIndexContext() {
  return {
    window: {},
    document: {
      addEventListener() {},
      querySelectorAll() {
        return [];
      },
      createElement() {
        return { textContent: '', innerHTML: '' };
      }
    }
  };
}
