const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..');

test('quiz study aids render internal lesson links alongside external guidance', () => {
  const api = loadQuizEngineTestApi();
  const html = api.renderStudyAidForTest({
    studyAid: {
      definition: 'A sentence type tells the reader the sentence job.',
      example: 'Where is the clue?',
      link: 'https://www.grammar-monster.com/',
      linkText: 'Grammar Monster'
    },
    metadata: { sourceSet: 'grammar-sentence-types' }
  });

  assert.match(html, /Study Aid/);
  assert.match(html, /Grammar Monster/);
  assert.match(html, /Review this lesson/);
  assert.match(html, /topics\/grammar\/subtopics\/sentence-types\.html\?learn=1/);
  assert.doesNotMatch(html, /student-|learner-|question text/i);
});

function loadQuizEngineTestApi() {
  const source = fs.readFileSync(path.join(repoRoot, 'assets', 'quiz-engine.js'), 'utf8');
  const context = {
    console,
    localStorage: { getItem: () => '', setItem: () => {}, removeItem: () => {} },
    document: {
      readyState: 'loading',
      addEventListener() {},
      getElementById() { return null; },
      createElement() {
        return {
          _text: '',
          set textContent(value) {
            this._text = String(value == null ? '' : value);
            this.innerHTML = this._text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
          },
          get textContent() {
            return this._text;
          },
          innerHTML: ''
        };
      }
    },
    window: {
      addEventListener() {},
      GrammarQuestStudyAidLinks: require('../assets/study-aid-link-domain'),
      QUESTION_MANIFEST: require('../assets/question-manifest.json'),
      STORY_LESSON_MANIFEST: require('../assets/story-lesson-manifest.json')
    }
  };
  context.window.window = context.window;
  context.window.document = context.document;
  context.window.localStorage = context.localStorage;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window.GrammarQuestQuizEngine;
}
