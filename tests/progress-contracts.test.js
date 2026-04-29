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

function loadProgressStoreForTest(options = {}) {
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
  if (options.learnerStateRepository) {
    context.window.GrammarQuestLearnerStateRepository = options.learnerStateRepository;
  }
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, '..', 'assets', 'progress-store.js'), 'utf8'),
    context,
    { filename: 'assets/progress-store.js' }
  );
  return {
    progressStore: context.window.GrammarQuestProgress,
    context
  };
}

function normalizeQuestionReportForTest(report) {
  return loadProgressStoreForTest().progressStore.normalizeQuestionReport(report);
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
    schemaVersion: 2,
    setId: 'grammar-sentence-types',
    title: 'Sentence Types',
    topic: 'Grammar & Usage',
    grade: '4',
    difficulty: 'medium',
    questionRefs: [{ id: 'grammar-sentence-types-q0001', version: 1, contentHash: 'sha256:abc', sourceSet: 'grammar-sentence-types', sequence: 1 }],
    questionSnapshots: [{ id: 'grammar-sentence-types-q0001', version: 1, contentHash: 'sha256:abc', question: 'Question', choices: ['A'], correct: 0 }],
    currentIndex: 0,
    score: 0,
    attempts: []
  };

  assert.deepEqual(validateActiveQuiz(activeQuiz), []);
  assert.ok(validateActiveQuiz(Object.assign({}, activeQuiz, { questionRefs: null })).includes('questionRefs'));
  assert.ok(validateActiveQuiz(Object.assign({}, activeQuiz, { questionSnapshots: null })).includes('questionSnapshots'));
});

test('active quiz v1 normalization preserves legacy full-question saves', () => {
  const normalized = loadProgressStoreForTest().progressStore.normalizeActiveQuiz({
    setId: 'grammar-sentence-types',
    title: 'Sentence Types',
    topic: 'Grammar & Usage',
    grade: '4',
    difficulty: 'medium',
    questions: [{
      id: 'grammar-sentence-types-q0001',
      version: 1,
      contentHash: 'sha256:abc',
      question: 'Question',
      choices: ['A'],
      correct: 0,
      metadata: { sourceSet: 'grammar-sentence-types', sequence: 1 }
    }],
    currentIndex: 0,
    score: 0,
    attempts: []
  });

  assert.equal(normalized.schemaVersion, 1);
  assert.equal(normalized.questions.length, 1);
  assert.equal(normalized.questionSnapshots.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(normalized.questionRefs)), [{
    id: 'grammar-sentence-types-q0001',
    version: 1,
    contentHash: 'sha256:abc',
    sourceSet: 'grammar-sentence-types',
    sequence: 1
  }]);
});

test('active quiz v2 normalization accepts refs with snapshot fallback and no full questions', () => {
  const normalized = loadProgressStoreForTest().progressStore.normalizeActiveQuiz({
    schemaVersion: 2,
    setId: 'grammar-sentence-types',
    title: 'Sentence Types',
    topic: 'Grammar & Usage',
    grade: '4',
    difficulty: 'medium',
    questionRefs: [{ id: 'grammar-sentence-types-q0001', version: 1, contentHash: 'sha256:abc', sourceSet: 'grammar-sentence-types', sequence: 1 }],
    questionSnapshots: [{ id: 'grammar-sentence-types-q0001', version: 1, contentHash: 'sha256:abc', question: 'Question', choices: ['A'], correct: 0 }],
    currentIndex: 0,
    score: 0,
    attempts: []
  });

  assert.equal(normalized.schemaVersion, 2);
  assert.equal(normalized.questions, undefined);
  assert.equal(normalized.questionRefs.length, 1);
  assert.equal(normalized.questionSnapshots.length, 1);
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

test('runtime progress store delegates active quiz and saved sessions to learner state repository', () => {
  const calls = [];
  const repository = createSpyRepository(calls);
  const { progressStore, context } = loadProgressStoreForTest({
    learnerStateRepository: createRepositoryBoundarySpy(repository, calls)
  });

  progressStore.saveActiveQuiz({
    schemaVersion: 2,
    setId: 'grammar-sentence-types',
    questionRefs: [{
      id: 'grammar-sentence-types-q0001',
      version: 1,
      contentHash: 'sha256:abc',
      sourceSet: 'grammar-sentence-types',
      sequence: 1
    }],
    questionSnapshots: [{
      id: 'grammar-sentence-types-q0001',
      version: 1,
      contentHash: 'sha256:abc',
      question: 'Snapshot',
      choices: ['A'],
      correct: 0
    }]
  });
  progressStore.appendSavedSession({ id: 'session-new', completedAt: '2030-04-29T12:00:00.000Z', attempts: [] });

  assert.deepEqual(calls.map(call => call.type), [
    'createAdapter',
    'createRepository',
    'saveActiveQuiz',
    'getProgress',
    'appendSavedSession'
  ]);
  assert.equal(context.localStorage.getItem('grammarQuestProgress'), null, 'spy repository should own writes');
});

test('runtime progress store repository delegation respects active student storage keys', () => {
  const calls = [];
  const repository = createSpyRepository(calls);
  const { progressStore, context } = loadProgressStoreForTest({
    learnerStateRepository: createRepositoryBoundarySpy(repository, calls)
  });

  context.localStorage.setItem('grammarQuestActiveStudentId', 'student-1');
  progressStore.saveProgress({ totalGems: 3 }, { sync: false });
  context.localStorage.setItem('grammarQuestActiveStudentId', 'student-2');
  progressStore.saveProgress({ totalGems: 7 }, { sync: false });

  assert.deepEqual(
    calls.filter(call => call.type === 'createAdapter').map(call => call.storageKey),
    ['grammarQuestProgress:student-1', 'grammarQuestProgress:student-2']
  );
});

function createRepositoryBoundarySpy(repository, calls) {
  return {
    createLocalStorageLearnerStateAdapter(storage, options) {
      calls.push({ type: 'createAdapter', storageKey: options.storageKey });
      return { storage, options };
    },
    createLearnerStateRepository(adapter) {
      calls.push({ type: 'createRepository', storageKey: adapter.options.storageKey });
      return repository;
    }
  };
}

function createSpyRepository(calls) {
  const state = {
    reports: { sessions: [], questionReports: [] },
    activeQuiz: null
  };
  return {
    getProgress() {
      calls.push({ type: 'getProgress' });
      return state;
    },
    saveProgress(progress) {
      calls.push({ type: 'saveProgress', progress });
      Object.assign(state, progress);
      return state;
    },
    updateProgress(mutator) {
      calls.push({ type: 'updateProgress' });
      Object.assign(state, mutator(state) || state);
      return state;
    },
    getActiveQuiz() {
      calls.push({ type: 'getActiveQuiz' });
      return state.activeQuiz;
    },
    saveActiveQuiz(activeQuiz) {
      calls.push({ type: 'saveActiveQuiz', activeQuiz });
      state.activeQuiz = activeQuiz;
      return state.activeQuiz;
    },
    clearActiveQuiz() {
      calls.push({ type: 'clearActiveQuiz' });
      state.activeQuiz = null;
    },
    appendSavedSession(session) {
      calls.push({ type: 'appendSavedSession', session });
      state.reports.sessions = [session].concat(state.reports.sessions);
      return state;
    },
    upsertQuestionReport(report) {
      calls.push({ type: 'upsertQuestionReport', report });
      state.reports.questionReports = [report];
      return state;
    }
  };
}
