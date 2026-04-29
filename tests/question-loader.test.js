const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

const { loadQuestionBanks } = require('../scripts/qa/bank-loader');
const { buildIndexManifest, getSourceSet, loadManifest } = require('../scripts/generate-question-manifest');

const repoRoot = path.resolve(__dirname, '..');
const loaderScript = fs.readFileSync(path.join(repoRoot, 'assets', 'question-loader.js'), 'utf8');

test('loader resolves a set by id from existing global banks', async () => {
  const bank = loadQuestionBanks({
    files: [path.join(repoRoot, 'assets', 'question-banks', 'grammar.js')]
  }).bank;
  const context = createLoaderContext({ bank });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const set = await context.window.GrammarQuestQuestionLoader.loadSet('grammar-sentence-types');
  assert.equal(set.id, 'grammar-sentence-types');
  assert.equal(set.title, 'Sentence Types');
  assert.ok(set.questions.length > 0);
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

function createLoaderContext(options = {}) {
  const window = {
    QUESTION_BANK: options.bank || {},
    QUESTION_MANIFEST: options.manifest
  };
  const context = {
    window,
    console,
    document: null
  };
  context.document = createScriptLoadingDocument(context);
  vm.createContext(context);
  return context;
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
