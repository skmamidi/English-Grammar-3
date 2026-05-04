const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

const core = require('../assets/quiz-selection-core');
const { loadQuestionBanks } = require('../scripts/qa/bank-loader');

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

function semanticVariant(id, question, choices, correct) {
  const questionRecord = q(id, [4], { 4: 'easy' }, 'alpha');
  return Object.assign(questionRecord, {
    id,
    question,
    choices,
    correct
  });
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

test('shared selection core allows one question per selected mixed subtopic', () => {
  const alpha = Array.from({ length: 5 }, (_, index) => q(`alpha-${index + 1}`, [4], { 4: 'medium' }, 'alpha'));
  const beta = Array.from({ length: 5 }, (_, index) => q(`beta-${index + 1}`, [4], { 4: 'medium' }, 'beta'));

  const selected = core.selectMixedQuestions({
    mixedQuizConfig: {
      questionsPerSubtopic: 4,
      subtopics: [
        { id: 'alpha', questions: alpha },
        { id: 'beta', questions: beta }
      ]
    },
    selectedMixedQuestionLimit: '1',
    selectedGrade: '4',
    selectedDifficulty: 'medium'
  }, { shuffle: identity });

  assert.deepEqual(selected.map(question => question.metadata.sourceSet), ['alpha', 'beta']);
});

test('selection request normalization accepts mixed quiz per-subtopic count of one', () => {
  const request = core.normalizeSelectionRequest({
    mode: 'mixed',
    domain: 'grammar',
    setIds: ['alpha', 'beta'],
    count: 2,
    questionsPerSubtopic: 1
  });

  assert.equal(request.count, 2);
  assert.equal(request.questionsPerSubtopic, 1);
});

test('shared selection core resumes at first unanswered question when saved index is stale', () => {
  const questions = Array.from({ length: 12 }, (_, index) => q(`alpha-${index + 1}`, [4], { 4: 'medium' }, 'alpha'));
  const attempts = questions.slice(0, 10).map((question, index) => ({
    position: index + 1,
    questionId: question.id,
    correct: index % 2 === 0
  }));

  assert.equal(core.findNextUnansweredQuestionIndex(questions, attempts, 3), 10);
});

test('shared selection core uses question ids to recover answered mixed questions when positions are missing', () => {
  const alpha = Array.from({ length: 3 }, (_, index) => q(`alpha-${index + 1}`, [4], { 4: 'medium' }, 'alpha'));
  const beta = Array.from({ length: 3 }, (_, index) => q(`beta-${index + 1}`, [4], { 4: 'medium' }, 'beta'));
  const questions = [alpha[0], beta[0], alpha[1], beta[1], alpha[2], beta[2]];
  const attempts = questions.slice(0, 4).map(question => ({
    questionId: question.id,
    correct: true
  }));

  assert.equal(core.findNextUnansweredQuestionIndex(questions, attempts, 0), 4);
});

test('shared selection core preserves saved index when no answered question evidence exists', () => {
  const questions = Array.from({ length: 5 }, (_, index) => q(`alpha-${index + 1}`, [4], { 4: 'medium' }, 'alpha'));

  assert.equal(core.findNextUnansweredQuestionIndex(questions, [], 2), 2);
});

test('shared selection core does not select repeated semantic variants from a set', () => {
  const questions = [
    semanticVariant('alpha-q0001', 'Grade 3 Easy: Choose the best answer. Which detail best supports the topic sentence "Libraries help students learn"?', [
      'The library carpet is blue.',
      'Students can borrow books, use computers, and ask librarians for help.',
      'Some doors have handles.',
      'Lunch begins at noon.'
    ], 1),
    semanticVariant('alpha-q0002', 'Grade 3 Easy: Choose the best answer. Which detail best supports the topic sentence "Libraries help students learn"?', [
      'Lunch begins at noon.',
      'The library carpet is blue.',
      'Some doors have handles.',
      'Students can borrow books, use computers, and ask librarians for help.'
    ], 3),
    semanticVariant('alpha-q0003', 'Grade 3 Easy: Choose the best answer. Which detail best supports the topic sentence "Gardens need regular care"?', [
      'Plants need water, sunlight, and space to grow.',
      'Shoes come in many sizes.',
      'The hallway has lockers.',
      'Some clocks are round.'
    ], 0)
  ];

  const selected = core.selectQuestionsForLevel(questions, '4', 'easy', {
    targetQuestionCount: 3,
    shuffle: identity
  });

  assert.deepEqual(selected.map(question => question.id), ['alpha-q0001', 'alpha-q0003']);
});

test('shared selection core de-dupes repeated semantic variants across mixed subtopics', () => {
  const repeatedAlpha = semanticVariant('alpha-q0001', 'Grade 3 Easy: Choose the best answer. Which detail best supports the topic sentence "Libraries help students learn"?', [
    'The library carpet is blue.',
    'Students can borrow books, use computers, and ask librarians for help.',
    'Some doors have handles.',
    'Lunch begins at noon.'
  ], 1);
  const repeatedBeta = Object.assign({}, repeatedAlpha, {
    id: 'beta-q0001',
    metadata: Object.assign({}, repeatedAlpha.metadata, {
      sourceSet: 'beta',
      sequence: 1
    })
  });
  const uniqueBeta = semanticVariant('beta-q0002', 'Grade 3 Easy: Choose the best answer. Which detail best supports the topic sentence "Gardens need regular care"?', [
    'Plants need water, sunlight, and space to grow.',
    'Shoes come in many sizes.',
    'The hallway has lockers.',
    'Some clocks are round.'
  ], 0);

  const selected = core.selectMixedQuestions({
    mixedQuizConfig: {
      questionsPerSubtopic: 2,
      subtopics: [
        { id: 'alpha', questions: [repeatedAlpha] },
        { id: 'beta', questions: [repeatedBeta, uniqueBeta] }
      ]
    },
    selectedMixedSubtopicIds: ['alpha', 'beta'],
    selectedMixedQuestionLimit: '2',
    selectedGrade: '4',
    selectedDifficulty: 'easy'
  }, { shuffle: identity });

  assert.deepEqual(selected.map(question => question.id), ['alpha-q0001', 'beta-q0002']);
});

test('live paragraph-structure selection avoids repeated question fingerprints', () => {
  const bankLoad = loadQuestionBanks();
  const paragraphStructure = bankLoad.bank['grammar-paragraph-structure'];
  assert.ok(paragraphStructure, 'expected live paragraph structure set');

  const selected = core.selectQuestionsForLevel(paragraphStructure.questions, '4', 'easy', {
    targetQuestionCount: 15,
    shuffle: identity
  });
  const fingerprints = selected.map(core.getQuestionFingerprint);

  assert.equal(new Set(fingerprints).size, fingerprints.length);
  assert.ok(selected.length >= 10, 'expected selector to preserve a useful quiz length after de-duping');
});

test('live subtopic selections never repeat question fingerprints', () => {
  const bankLoad = loadQuestionBanks();
  const failures = [];

  Object.entries(bankLoad.bank).forEach(([setId, set]) => {
    getSupportedLevels(set.questions).forEach(({ grade, difficulty }) => {
      const selected = core.selectQuestionsForLevel(set.questions, grade, difficulty, {
        targetQuestionCount: 15,
        shuffle: identity
      });
      const fingerprints = selected.map(core.getQuestionFingerprint);
      if (new Set(fingerprints).size !== fingerprints.length) {
        failures.push(`${setId} grade ${grade} ${difficulty}`);
      }
    });
  });

  assert.deepEqual(failures, []);
});

test('shared selection core normalizes subtopic selection requests', () => {
  assert.deepEqual(core.normalizeSelectionRequest({
    mode: 'subtopic',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 10,
    countMode: 'max',
    questionsPerSubtopic: 0,
    selectionPolicyVersion: 1
  }, {
    maxCount: 60
  }), {
    mode: 'subtopic',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 10,
    countMode: 'max',
    questionsPerSubtopic: 0,
    selectionPolicyVersion: 1
  });
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

function getSupportedLevels(questions) {
  const levels = new Map();
  (Array.isArray(questions) ? questions : []).forEach(question => {
    const grades = question && question.metadata && Array.isArray(question.metadata.gradeLevels)
      ? question.metadata.gradeLevels
      : [];
    grades.forEach(grade => {
      const difficulty = question.metadata.difficultyByGrade && question.metadata.difficultyByGrade[String(grade)]
        ? question.metadata.difficultyByGrade[String(grade)]
        : 'medium';
      levels.set(`${grade}:${difficulty}`, { grade: String(grade), difficulty: String(difficulty) });
    });
  });
  return Array.from(levels.values());
}
