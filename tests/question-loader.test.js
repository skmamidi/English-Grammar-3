const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

const { buildIndexManifest, getSourceSet, loadManifest } = require('../scripts/generate-question-manifest');
const { loadChunkBank } = require('../scripts/qa/chunk-qa');
const { loadQuestionBanks } = require('../scripts/qa/bank-loader');

const repoRoot = path.resolve(__dirname, '..');
const loaderScript = fs.readFileSync(path.join(repoRoot, 'assets', 'question-loader.js'), 'utf8');

test('loader resolves a set by id from an already loaded generated chunk', async () => {
  const bank = loadChunkBank('assets/question-chunks/grammar/grammar-sentence-types.js');
  const context = createLoaderContext({ bank });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const set = await context.window.GrammarQuestQuestionLoader.loadSet('grammar-sentence-types');
  assert.equal(set.id, 'grammar-sentence-types');
  assert.equal(set.title, 'Sentence Types');
  assert.ok(set.questions.length > 0);
});

test('loader requires manifest entries to provide chunkFile', async () => {
  const context = createLoaderContext({
    manifest: {
      sets: [{
        id: 'grammar-sentence-types',
        bankFile: 'assets/question-banks/grammar.js'
      }]
    }
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  await assert.rejects(
    () => context.window.GrammarQuestQuestionLoader.loadSet('grammar-sentence-types'),
    /manifest entry for "grammar-sentence-types" is missing chunkFile/
  );
  assert.deepEqual(context.loadedScriptPaths, []);
});

test('loader resolves a set by id from chunk manifest', async () => {
  const context = createLoaderContext({
    manifest: buildIndexManifest(loadManifest())
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const set = await context.window.GrammarQuestQuestionLoader.loadSet('capitalization-proper-names-titles');
  assert.equal(set.id, 'capitalization-proper-names-titles');
  assert.equal(set.topic, 'Capitalization');
  assert.ok(set.questions.length > 0);
  assert.ok(set.questions.every(question => question.id.startsWith('capitalization-proper-names-titles-q')));
});

test('loader returns canonical source-bank content for chunk-loaded sets', async () => {
  const context = createLoaderContext({
    manifest: buildIndexManifest(loadManifest())
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const set = await context.window.GrammarQuestQuestionLoader.loadSet('capitalization-proper-names-titles');
  const sourceSet = getSourceSet(loadQuestionBanks(), 'capitalization-proper-names-titles');
  const canonicalContent = Object.assign({}, set);
  delete canonicalContent.id;

  assert.deepEqual(toJsonValue(canonicalContent), toJsonValue(sourceSet));
});

test('loader hydrates question refs from chunk-backed source sets', async () => {
  const context = createLoaderContext({
    manifest: buildIndexManifest(loadManifest())
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const questions = await context.window.GrammarQuestQuestionLoader.hydrateQuestionRefs([{
    id: 'capitalization-proper-names-titles-q0001',
    sourceSet: 'capitalization-proper-names-titles'
  }]);

  assert.equal(questions.length, 1);
  assert.equal(questions[0].id, 'capitalization-proper-names-titles-q0001');
  assert.match(questions[0].question, /capitalized|Capitalized|edited|version/);
});

test('loader sends server selection request and hydrates returned refs when enabled', async () => {
  const requests = [];
  const context = createLoaderContext({
    manifest: buildIndexManifest(loadManifest()),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection'
    },
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          selectionId: 'sel_unit',
          selectionPolicyVersion: 1,
          questionRefs: [{
            id: 'capitalization-proper-names-titles-q0001',
            sourceSet: 'capitalization-proper-names-titles',
            version: 1,
            contentHash: getManifestQuestion('capitalization-proper-names-titles', 'capitalization-proper-names-titles-q0001').contentHash,
            sequence: 1
          }]
        })
      };
    }
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    selectionPolicyVersion: 1
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/question-selection');
  assert.deepEqual(requests[0].body.setIds, ['capitalization-proper-names-titles']);
  assert.equal(result.source, 'api');
  assert.equal(result.selectionId, 'sel_unit');
  assert.equal(result.sets.length, 1);
  assert.equal(result.sets[0].questions[0].id, 'capitalization-proper-names-titles-q0001');
  assert.ok(context.events.some(event => event.name === 'grammarquest:question-selection-api-used'));
});

test('loader falls back to chunks when server selection fails', async () => {
  const context = createLoaderContext({
    manifest: buildIndexManifest(loadManifest()),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection'
    },
    fetch: async () => ({
      ok: false,
      status: 503,
      json: async () => ({})
    })
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    selectionPolicyVersion: 1
  });

  assert.equal(result.source, 'fallback');
  assert.equal(result.sets.length, 1);
  assert.equal(result.sets[0].id, 'capitalization-proper-names-titles');
  assert.ok(context.events.some(event => event.name === 'grammarquest:question-selection-fallback'));
});

test('loader rejects invalid server selection refs and falls back', async () => {
  const context = createLoaderContext({
    manifest: buildIndexManifest(loadManifest()),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection'
    },
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        selectionId: 'sel_bad',
        selectionPolicyVersion: 1,
        questionRefs: [{
          id: 'grammar-sentence-types-q0001',
          sourceSet: 'grammar-sentence-types',
          version: 1,
          contentHash: `sha256:${'0'.repeat(64)}`,
          sequence: 1
        }]
      })
    })
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    selectionPolicyVersion: 1
  });

  assert.equal(result.source, 'fallback');
  assert.ok(context.events.some(event => /unauthorized sourceSet/.test(event.detail.reason)));
});

function createLoaderContext(options = {}) {
  const events = [];
  const window = {
    QUESTION_BANK: options.bank || {},
    QUESTION_MANIFEST: options.manifest,
    GRAMMAR_QUEST_CONFIG: options.config || {},
    dispatchEvent(event) {
      events.push({ name: event.type, detail: event.detail });
    }
  };
  const context = {
    window,
    console: Object.assign({}, console, { warn() {} }),
    document: null,
    loadedScriptPaths: [],
    events,
    CustomEvent: function CustomEvent(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    },
    fetch: options.fetch
  };
  context.document = createScriptLoadingDocument(context);
  vm.createContext(context);
  return context;
}

function getManifestQuestion(setId, questionId) {
  const set = loadManifest().sets.find(item => item.id === setId);
  return set.questions.find(question => question.id === questionId);
}

function createScriptLoadingDocument(context) {
  const scripts = [{ src: 'http://grammar-quest.test/assets/question-loader.js' }];
  const document = {
    currentScript: scripts[0],
    createElement(tagName) {
      assert.equal(tagName, 'script');
      return {
        async: false,
        src: '',
        onload: null,
        onerror: null
      };
    },
    getElementsByTagName(tagName) {
      return tagName === 'script' ? scripts : [];
    },
    head: {
      appendChild(script) {
        try {
          const url = new URL(script.src);
          const file = path.join(repoRoot, url.pathname.replace(/^\//, ''));
          context.loadedScriptPaths.push(url.pathname.replace(/^\//, ''));
          vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
          scripts.push(script);
          if (script.onload) script.onload();
        } catch (error) {
          if (script.onerror) script.onerror(error);
          else throw error;
        }
      }
    }
  };
  document.documentElement = document.head;
  document.body = document.head;
  return document;
}

function toJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}
