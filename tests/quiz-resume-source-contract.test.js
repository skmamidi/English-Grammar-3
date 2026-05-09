const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'quiz-engine.js'), 'utf8');

test('quiz resume derives position from saved attempts instead of trusting stale current index', () => {
  assert.match(source, /findNextUnansweredQuestionIndex\(currentQuestions, attemptRecords, savedIndex\)/);
  assert.match(source, /attemptRecords = normalizeSavedAttemptRecords\(savedQuiz\.attempts\)/);
  assert.match(source, /position: currentIndex \+ 1/);
});

test('mission progress does not replace active quiz resume ownership', () => {
  assert.match(source, /getActiveQuiz\(\)/);
  assert.doesNotMatch(source, /missionProgress\.activeQuiz|activeMissionQuiz/);
});
