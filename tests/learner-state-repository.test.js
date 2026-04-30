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
  assert.deepEqual(state.reviewSchedules, []);
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

test('learner state repository stores assignment refs and status transitions', () => {
  const storage = createMemoryStorage();
  const repository = createRepository(storage);
  const assignment = repository.upsertAssignment({
    id: 'assignment-1',
    title: 'Sentence tune-up',
    assignedTo: { learnerIds: ['learner-1'] },
    scope: { setIds: ['grammar-sentence-types'], skillIds: ['grammar.sentence-analysis'] },
    quizOptions: { count: 1 },
    status: 'active'
  });

  assert.equal(assignment.status, 'active');
  assert.equal(JSON.stringify(assignment).includes('"question"'), false);
  assert.equal(repository.listAssignments().length, 1);

  repository.markAssignmentStarted('assignment-1', '2030-04-29T12:00:00.000Z');
  const completed = repository.markAssignmentCompleted('assignment-1', {
    sessionId: 'session-1',
    completedAt: '2030-04-29T12:05:00.000Z'
  });

  assert.equal(completed.status, 'completed');
  assert.equal(completed.completedSessionId, 'session-1');
  assert.equal(repository.archiveAssignment('assignment-1').status, 'archived');
});

test('learner state repository stores adaptive review queue refs and item status', () => {
  const repository = createRepository();
  repository.saveReviewQueue({
    queueId: 'adaptive-review-2030-04-29',
    generatedAt: '2030-04-29T12:00:00.000Z',
    items: [{
      questionRef: {
        id: 'grammar-sentence-types-q0001',
        sourceSet: 'grammar-sentence-types',
        version: 1,
        contentHash: 'sha256:abc',
        sequence: 1
      },
      skillIds: ['grammar.sentence-analysis'],
      reason: 'missed_recently',
      priority: 100,
      dueAt: '2030-04-29T12:00:00.000Z',
      status: 'queued',
      question: 'do not copy'
    }]
  });

  const queue = repository.getReviewQueue();
  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].questionRef.id, 'grammar-sentence-types-q0001');
  assert.equal(JSON.stringify(queue).includes('do not copy'), false);

  repository.markReviewItemSeen('grammar-sentence-types-q0001', '2030-04-29T12:01:00.000Z');
  const mastered = repository.markReviewItemMastered('grammar-sentence-types-q0001', '2030-04-29T12:02:00.000Z');
  assert.equal(mastered.items[0].status, 'mastered');
  assert.equal(mastered.items[0].masteredAt, '2030-04-29T12:02:00.000Z');
});

test('learner state repository stores spaced repetition schedules as refs', () => {
  const repository = createRepository();
  const schedules = repository.updateReviewSchedules([{
    questionRef: {
      id: 'grammar-sentence-types-q0001',
      sourceSet: 'grammar-sentence-types',
      version: 1,
      contentHash: 'sha256:abc',
      sequence: 1
    },
    skillIds: ['grammar.sentence-analysis'],
    correct: true,
    question: 'do not copy'
  }], '2030-04-29T12:00:00.000Z');

  assert.equal(schedules.length, 1);
  assert.equal(schedules[0].ref.id, 'grammar-sentence-types-q0001');
  assert.equal(schedules[0].dueAt, '2030-05-01T12:00:00.000Z');
  assert.equal(JSON.stringify(repository.getProgress().reviewSchedules).includes('do not copy'), false);
  assert.equal(repository.getReviewSchedules()[0].ref.id, 'grammar-sentence-types-q0001');
});

test('learner state repository drops corrupt spaced repetition schedule entries', () => {
  const normalized = normalizeLearnerState({
    reviewSchedules: [
      null,
      { ref: { id: '' }, dueAt: '2030-04-29T12:00:00.000Z' },
      {
        ref: { id: 'grammar-sentence-types-q0002', sourceSet: 'grammar-sentence-types' },
        skillIds: ['grammar.sentence-analysis'],
        intervalDays: 2,
        ease: 2.4,
        dueAt: '2030-05-01T12:00:00.000Z',
        lastReviewedAt: '2030-04-29T12:00:00.000Z'
      }
    ]
  });

  assert.equal(normalized.reviewSchedules.length, 1);
  assert.equal(normalized.reviewSchedules[0].ref.id, 'grammar-sentence-types-q0002');
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
