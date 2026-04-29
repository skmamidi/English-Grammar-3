const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  createLearnerStateRepository,
  createLocalStorageLearnerStateAdapter,
  normalizeLearnerState
} = require('../assets/learner-state-repository');

const fixtureRoot = path.join(__dirname, 'fixtures', 'learner-state');

test('learner state repository reads empty normalized state when no progress exists', () => {
  const repository = createRepository();
  const state = repository.getProgress();

  assert.equal(state.schemaVersion, 2);
  assert.deepEqual(state.reports.sessions, []);
  assert.deepEqual(state.reports.questionReports, []);
  assert.equal(state.activeQuiz, null);
});

test('learner state repository normalizes legacy active quiz full-question saves', () => {
  const legacy = readFixture('legacy-active-quiz.json');
  const normalized = normalizeLearnerState(legacy);

  assert.equal(normalized.schemaVersion, 2);
  assert.equal(normalized.activeQuiz.schemaVersion, 1);
  assert.deepEqual(normalized.activeQuiz.questionRefs, [{
    id: 'grammar-sentence-types-q0001',
    version: 1,
    contentHash: 'sha256:abc',
    sourceSet: 'grammar-sentence-types',
    sequence: 1
  }]);
  assert.equal(normalized.activeQuiz.questionSnapshots[0].question, 'Legacy prompt');
  assert.equal(normalized.reports.questionReports[0].id, 'question-report-existing');
  assert.equal(normalized.reports.questionReports[0].questionId, 'grammar-sentence-types-q0001');
});

test('learner state repository preserves reports while appending saved sessions', () => {
  const storage = createMemoryStorage();
  const repository = createRepository(storage);
  repository.saveProgress(readFixture('legacy-active-quiz.json'));

  repository.appendSavedSession({
    id: 'session-new',
    completedAt: '2030-04-29T12:00:00.000Z',
    attempts: [{
      id: 'grammar-sentence-types-q0001',
      questionVersion: 1,
      questionHash: 'sha256:abc'
    }]
  });

  const state = repository.getProgress();
  assert.equal(state.reports.sessions[0].id, 'session-new');
  assert.equal(state.reports.questionReports.length, 1);
  assert.equal(state.reports.questionReports[0].id, 'question-report-existing');
});

test('learner state repository upserts question reports without conflating report and question ids', () => {
  const repository = createRepository();
  repository.upsertQuestionReport({
    id: 'question-report-new',
    questionId: 'grammar-sentence-types-q0001',
    status: 'open',
    updatedAt: '2030-04-29T12:00:00.000Z'
  });

  const report = repository.getProgress().reports.questionReports[0];
  assert.equal(report.id, 'question-report-new');
  assert.equal(report.questionId, 'grammar-sentence-types-q0001');
});

test('learner state repository saves and clears active quiz refs atomically', () => {
  const repository = createRepository();
  repository.saveActiveQuiz({
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
      question: 'Snapshot fallback',
      choices: ['A', 'B'],
      correct: 0,
      metadata: { sourceSet: 'grammar-sentence-types', sequence: 1 }
    }]
  });

  assert.equal(repository.getActiveQuiz().questionRefs[0].id, 'grammar-sentence-types-q0001');
  repository.clearActiveQuiz();
  assert.equal(repository.getActiveQuiz(), null);
});

test('learner state repository quarantines corrupt JSON and returns empty state', () => {
  const storage = createMemoryStorage();
  storage.setItem('grammarQuestProgress', '{bad json');
  const repository = createRepository(storage);

  assert.equal(repository.getProgress().schemaVersion, 2);
  assert.equal(storage.getItem('grammarQuestProgress.corrupt'), '{bad json');
});

test('learner state repository surfaces controlled storage write errors', () => {
  const storage = createMemoryStorage({
    setItem() {
      throw new Error('quota exceeded');
    }
  });
  const repository = createRepository(storage);

  assert.throws(
    () => repository.saveProgress({ totalGems: 1 }),
    /learner_state_write_failed/
  );
});

function createRepository(storage = createMemoryStorage()) {
  return createLearnerStateRepository(createLocalStorageLearnerStateAdapter(storage, {
    storageKey: 'grammarQuestProgress',
    corruptBackupKey: 'grammarQuestProgress.corrupt'
  }), {
    now: () => '2030-04-29T12:00:00.000Z'
  });
}

function createMemoryStorage(overrides = {}) {
  const data = {};
  return Object.assign({
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    }
  }, overrides);
}

function readFixture(file) {
  return JSON.parse(fs.readFileSync(path.join(fixtureRoot, file), 'utf8'));
}
