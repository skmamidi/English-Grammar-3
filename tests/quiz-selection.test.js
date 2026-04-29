const assert = require('node:assert/strict');
const test = require('node:test');

const {
  selectQuestionsForLevel,
  selectCurrentQuestions,
  selectMixedQuestions
} = require('../scripts/qa/quiz-contracts');

const identity = items => items;

function q(id, grades, difficultyByGrade) {
  return {
    question: id,
    choices: ['A', 'B'],
    correct: 0,
    metadata: {
      gradeLevels: grades,
      difficultyByGrade,
      sourceSet: 'contract-fixture',
      sequence: id
    }
  };
}

test('exact grade and difficulty questions are prioritized before fallback questions', () => {
  const questions = [
    q('exact-1', [4], { 4: 'medium' }),
    q('adjacent-1', [4], { 4: 'easy' }),
    q('fallback-1', [4], { 4: 'hard' }),
    q('other-grade', [5], { 5: 'medium' })
  ];

  const selected = selectQuestionsForLevel(questions, '4', 'medium', { targetQuestionCount: 3, shuffle: identity });
  assert.deepEqual(selected.map(item => item.question), ['exact-1', 'adjacent-1', 'fallback-1']);
});

test('adjacent difficulty fallback works when exact matches are limited', () => {
  const questions = [
    q('easy', [4], { 4: 'easy' }),
    q('hard', [4], { 4: 'hard' })
  ];

  const selected = selectQuestionsForLevel(questions, '4', 'medium', { targetQuestionCount: 2, shuffle: identity });
  assert.deepEqual(selected.map(item => item.question), ['easy', 'hard']);
});

test('returned quiz length respects configured question count', () => {
  const questions = Array.from({ length: 20 }, (_, index) => q(`q-${index}`, [4], { 4: 'medium' }));
  const selected = selectQuestionsForLevel(questions, '4', 'medium', { targetQuestionCount: 7, shuffle: identity });
  assert.equal(selected.length, 7);
});

test('parent preview mode can include all questions', () => {
  const questions = Array.from({ length: 22 }, (_, index) => q(`q-${index}`, [4], { 4: 'medium' }));
  const selected = selectCurrentQuestions({
    parentMode: true,
    baseQuestions: questions,
    selectedGrade: '4',
    selectedDifficulty: 'medium'
  }, { targetQuestionCount: 5, shuffle: identity });
  assert.equal(selected.length, 22);
});

test('mixed quiz selection pulls from every chosen subtopic', () => {
  const alpha = [q('alpha-1', [4], { 4: 'medium' }), q('alpha-2', [4], { 4: 'medium' }), q('alpha-3', [4], { 4: 'medium' }), q('alpha-4', [4], { 4: 'medium' })];
  const beta = [q('beta-1', [4], { 4: 'medium' }), q('beta-2', [4], { 4: 'medium' }), q('beta-3', [4], { 4: 'medium' }), q('beta-4', [4], { 4: 'medium' })];
  const selected = selectMixedQuestions({
    mixedQuizConfig: {
      questionsPerSubtopic: 4,
      subtopics: [
        { id: 'alpha', questions: alpha },
        { id: 'beta', questions: beta }
      ]
    },
    selectedMixedSubtopicIds: ['alpha', 'beta'],
    selectedMixedQuestionLimit: '4',
    selectedGrade: '4',
    selectedDifficulty: 'medium'
  }, { targetQuestionCount: 15, shuffle: identity });

  assert.equal(selected.length, 8);
  assert.ok(selected.some(item => item.question.startsWith('alpha')));
  assert.ok(selected.some(item => item.question.startsWith('beta')));
});

test('empty or malformed sets fail gracefully', () => {
  assert.deepEqual(selectQuestionsForLevel(null, '4', 'medium'), []);
  assert.deepEqual(selectMixedQuestions({ mixedQuizConfig: { subtopics: null }, baseQuestions: [] }), []);
});
