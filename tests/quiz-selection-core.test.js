const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

const core = require('../assets/quiz-selection-core');

const repoRoot = path.resolve(__dirname, '..');

const identity = items => items;

function q(id, grades, difficultyByGrade, sourceSet = 'alpha') {
  const sequence = Number(id.replace(/\D+/g, '')) || 1;
  return {
    id: `${sourceSet}-q${String(sequence).padStart(4, '0')}`,
    version: 1,
    contentHash: `sha256:${String(sequence).padStart(64, '0')}`,
    question: id,
    choices: ['A', 'B'],
    correct: 0,
    metadata: {
      gradeLevels: grades,
      difficultyByGrade,
      sourceSet,
      sequence
    }
  };
}

test('shared selection core exports the pure selector API for Node callers', () => {
  assert.equal(typeof core.selectQuestionsForLevel, 'function');
  assert.equal(typeof core.selectMixedQuestions, 'function');
  assert.equal(typeof core.getQuestionRef, 'function');
  assert.equal(typeof core.normalizeSelectionRequest, 'function');
});

test('shared selection core preserves mixed per-subtopic and max semantics', () => {
  const alpha = Array.from({ length: 5 }, (_, index) => q(`alpha-${index + 1}`, [4], { 4: 'medium' }, 'alpha'));
  const beta = Array.from({ length: 5 }, (_, index) => q(`beta-${index + 1}`, [4], { 4: 'medium' }, 'beta'));

  const perSubtopic = core.selectMixedQuestions({
    mixedQuizConfig: {
      questionsPerSubtopic: 4,
      subtopics: [
        { id: 'alpha', questions: alpha },
        { id: 'beta', questions: beta }
      ]
    },
    selectedMixedQuestionLimit: '4',
    selectedGrade: '4',
    selectedDifficulty: 'medium'
  }, { shuffle: identity });
  assert.deepEqual(perSubtopic.map(question => question.metadata.sourceSet), [
    'alpha', 'alpha', 'alpha', 'alpha',
    'beta', 'beta', 'beta', 'beta'
  ]);

  const maxMode = core.selectMixedQuestions({
    mixedQuizConfig: {
      questionsPerSubtopic: 1,
      subtopics: [
        { id: 'alpha', questions: alpha },
        { id: 'beta', questions: beta }
      ]
    },
    selectedMixedQuestionLimit: 'max',
    selectedGrade: '4',
    selectedDifficulty: 'medium'
  }, { shuffle: identity });
  assert.equal(maxMode.length, 10);
});

test('shared selection core projects stable question refs', () => {
  const question = q('alpha-12', [4], { 4: 'medium' }, 'alpha');
  assert.deepEqual(core.getQuestionRef(question, 12), {
    id: 'alpha-q0012',
    version: 1,
    contentHash: `sha256:${'0'.repeat(62)}12`,
    sourceSet: 'alpha',
    sequence: 12
  });
});

test('quiz-domain browser wrapper exposes the same core selectors', () => {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, 'assets', 'quiz-selection-core.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, 'assets', 'quiz-domain.js'), 'utf8'), context);

  assert.equal(context.window.GrammarQuestQuizDomain.selectMixedQuestions, context.window.GrammarQuestSelectionCore.selectMixedQuestions);
  assert.equal(context.window.GrammarQuestQuizDomain.getQuestionRef, context.window.GrammarQuestSelectionCore.getQuestionRef);
});
