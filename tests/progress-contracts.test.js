const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const {
  validateSerializedAttempt,
  validateActiveQuiz,
  validateQuestionReport,
  validateQuestionReportWarnings
} = require('../scripts/qa/quiz-contracts');
const { createMemoryStorage } = require('../scripts/qa/bank-loader');

function loadProgressStoreForTest() {
  const context = {
    window: {
      addEventListener() {},
      clearTimeout() {},
      setTimeout() {
        return 0;
      },
      dispatchEvent() {}
    },
    document: {
      addEventListener() {},
      createElement() {
        return { textContent: '', innerHTML: '' };
      }
    },
    localStorage: createMemoryStorage(),
    CustomEvent: function CustomEvent(type, options) {
      this.type = type;
      this.detail = options && options.detail;
    },
    console
  };
  context.window.window = context.window;
  context.window.localStorage = context.localStorage;
  context.window.CustomEvent = context.CustomEvent;
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'assets', 'progress-store.js'), 'utf8'),
    context,
    { filename: 'assets/progress-store.js' }
  );
  return context.window.GrammarQuestProgress;
}

function normalizeQuestionReportForTest(report) {
  return loadProgressStoreForTest().normalizeQuestionReport(report);
}

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

test('question report normalization keeps report id separate from question id', () => {
  const modern = normalizeQuestionReportForTest({
    id: 'question-report-modern',
    status: 'open',
    questionId: 'grammar-sentence-types-q0001',
    questionVersion: '2',
    contentHash: 'sha256:modern'
  });
  assert.equal(modern.id, 'question-report-modern');
  assert.equal(modern.questionId, 'grammar-sentence-types-q0001');
  assert.equal(modern.questionVersion, 2);
  assert.equal(modern.questionHash, 'sha256:modern');

  const legacyWithSource = normalizeQuestionReportForTest({
    id: 'question-report-123',
    sourceSet: 'grammar-sentence-types',
    sequence: 4
  });
  assert.equal(legacyWithSource.id, 'question-report-123');
  assert.equal(legacyWithSource.questionId, 'grammar-sentence-types-q0004');

  const legacyWithSet = normalizeQuestionReportForTest({
    id: 'question-report-456',
    setId: 'grammar-sentence-types',
    sequence: 5
  });
  assert.equal(legacyWithSet.questionId, 'grammar-sentence-types-q0005');

  const legacyWithStableId = normalizeQuestionReportForTest({
    id: 'grammar-sentence-types-q0006'
  });
  assert.equal(legacyWithStableId.questionId, 'grammar-sentence-types-q0006');

  const legacyOnlyReportId = normalizeQuestionReportForTest({
    id: 'question-report-only'
  });
  assert.equal(legacyOnlyReportId.id, 'question-report-only');
  assert.equal(legacyOnlyReportId.questionId, '');
});

test('question report fixture QA warns when questionId is a report record id', () => {
  assert.deepEqual(validateQuestionReportWarnings({
    id: 'question-report-123',
    questionId: 'question-report-123'
  }), ['questionId']);
  assert.deepEqual(validateQuestionReportWarnings({
    id: 'question-report-123',
    questionId: 'grammar-sentence-types-q0004'
  }), []);
});
