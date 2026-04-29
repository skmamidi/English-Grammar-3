const assert = require('node:assert/strict');
const test = require('node:test');

const { validateSerializedAttempt, validateActiveQuiz, validateQuestionReport } = require('../scripts/qa/quiz-contracts');
const { createMemoryStorage } = require('../scripts/qa/bank-loader');

test('saved session attempt contract contains report dashboard fields', () => {
  const attempt = {
    id: 'grammar-sentence-types-q0001',
    questionId: 'grammar-sentence-types-q0001',
    questionVersion: 1,
    questionHash: 'sha256:abc',
    question: 'Which sentence is a command?',
    selectedChoice: 'Close the door.',
    correctChoice: 'Close the door.',
    correct: true,
    firstAttemptCorrect: true,
    skills: ['sentence types'],
    subtopicId: 'grammar-sentence-types',
    subtopicTitle: 'Sentence Types'
  };

  assert.deepEqual(validateSerializedAttempt(attempt), []);
  assert.deepEqual(validateSerializedAttempt(Object.assign({}, attempt, { skills: 'sentence types' })), ['skills']);
});

test('active quiz contract preserves resumable state', () => {
  const activeQuiz = {
    setId: 'grammar-sentence-types',
    title: 'Sentence Types',
    topic: 'Grammar & Usage',
    grade: '4',
    difficulty: 'medium',
    questions: [{ id: 'grammar-sentence-types-q0001', version: 1, contentHash: 'sha256:abc', question: 'Question', choices: ['A'], correct: 0 }],
    questionRefs: [{ id: 'grammar-sentence-types-q0001', version: 1, contentHash: 'sha256:abc', sourceSet: 'grammar-sentence-types', sequence: 1 }],
    currentIndex: 0,
    score: 0,
    attempts: []
  };

  assert.deepEqual(validateActiveQuiz(activeQuiz), []);
  assert.ok(validateActiveQuiz(Object.assign({}, activeQuiz, { questions: null })).includes('questions'));
});

test('empty and sample progress objects normalize for report consumers', () => {
  const storage = createMemoryStorage();
  storage.setItem('grammarQuestProgress', JSON.stringify({ reports: { sessions: [] } }));
  const empty = JSON.parse(storage.getItem('grammarQuestProgress'));
  assert.deepEqual(empty.reports.sessions, []);

  const sample = {
    reports: {
      sessions: [{
        id: 'session-1',
        completedAt: '2026-04-29T12:00:00.000Z',
        score: 1,
        total: 1,
        attempts: [{
          id: 'q-1',
          questionId: 'q-1',
          questionVersion: 1,
          questionHash: 'sha256:abc',
          question: 'Question',
          selectedChoice: 'A',
          correctChoice: 'A',
          correct: true,
          firstAttemptCorrect: true,
          skills: ['grammar'],
          subtopicId: 'grammar',
          subtopicTitle: 'Grammar'
        }]
      }]
    }
  };

  assert.equal(sample.reports.sessions[0].attempts.filter(attempt => validateSerializedAttempt(attempt).length === 0).length, 1);
});

test('saved session reports preserve question report contract fields', () => {
  const existingReports = {
    sessions: [],
    questionReports: [{
      id: 'question-report-existing',
      status: 'open',
      questionId: 'grammar-sentence-types-q0001',
      questionVersion: 1,
      questionHash: 'sha256:abc',
      reason: 'answer_or_explanation',
      createdAt: '2026-04-29T12:00:00.000Z',
      updatedAt: '2026-04-29T12:00:00.000Z'
    }]
  };

  const updated = Object.assign({}, existingReports, {
    sessions: [{
      id: 'session-1',
      completedAt: '2026-04-29T12:05:00.000Z',
      score: 1,
      total: 1,
      attempts: []
    }].concat(existingReports.sessions)
  });

  assert.equal(updated.questionReports.length, 1);
  assert.equal(updated.questionReports[0].id, 'question-report-existing');
  assert.equal(updated.questionReports[0].status, 'open');
  assert.equal(updated.questionReports[0].questionId, 'grammar-sentence-types-q0001');
  assert.deepEqual(validateQuestionReport(updated.questionReports[0]), []);
  assert.equal(updated.sessions.length, 1);
});
