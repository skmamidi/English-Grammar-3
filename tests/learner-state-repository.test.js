const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  createLearnerStateRepository,
  createLocalStorageLearnerStateAdapter,
  normalizeLearnerState
} = require('../assets/learner-state-repository');
const { createFakeLearnerStateSyncAdapter } = require('./helpers/fake-learner-state-sync-adapter');

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

test('learner state repository saves and clears privacy preferences in learner state', () => {
  const repository = createRepository();

  const saved = repository.savePrivacyPreferences({
    telemetryEnabled: true,
    errorTelemetryEnabled: true,
    performanceTelemetryEnabled: true,
    experimentParticipationEnabled: true,
    updatedBy: 'student-1',
    policyVersion: 2
  });

  assert.equal(saved.telemetryEnabled, true);
  assert.equal(saved.errorTelemetryEnabled, true);
  assert.equal(saved.performanceTelemetryEnabled, true);
  assert.equal(saved.experimentParticipationEnabled, true);
  assert.equal(saved.updatedAt, '2030-04-29T12:00:00.000Z');
  assert.equal(repository.getPrivacyPreferences().updatedBy, 'student-1');
  assert.equal(repository.getProgress().privacyPreferences.policyVersion, 2);

  repository.clearPrivacyPreferences();
  assert.deepEqual(repository.getPrivacyPreferences(), {
    schemaVersion: 1,
    telemetryEnabled: false,
    errorTelemetryEnabled: false,
    performanceTelemetryEnabled: false,
    experimentParticipationEnabled: false,
    updatedAt: '',
    updatedBy: '',
    policyVersion: 1
  });
});

test('learner state repository saves goals without overwriting learner records', () => {
  const repository = createRepository();
  repository.saveProgress({
    activeQuiz: {
      startedAt: '2030-04-29T11:00:00.000Z',
      questionRefs: [{ id: 'q1', contentHash: 'sha256:abc' }]
    },
    reports: {
      sessions: [{ id: 'session-1', completedAt: '2030-04-29T12:00:00.000Z', attempts: [{ questionId: 'q1' }] }],
      questionReports: [{ id: 'report-1', questionId: 'q1' }]
    },
    assignments: [{ id: 'assignment-1', status: 'active' }],
    reviewQueue: { items: [{ questionRef: { id: 'q1' }, status: 'queued' }] },
    deletionTombstones: [{ learnerId: 'learner-1', deletedAt: '2030-04-01T12:00:00.000Z', retentionUntil: '2030-05-01T12:00:00.000Z' }]
  });

  const saved = repository.saveLearnerGoals({
    dailyQuestionTarget: 12,
    weeklySessionTarget: 5,
    updatedBy: 'local-learner',
    question: 'do not copy'
  });
  const state = repository.getProgress();

  assert.equal(saved.dailyQuestionTarget, 12);
  assert.equal(saved.updatedAt, '2030-04-29T12:00:00.000Z');
  assert.equal(state.reports.sessions.length, 1);
  assert.equal(state.reports.questionReports.length, 1);
  assert.equal(state.activeQuiz.questionRefs[0].id, 'q1');
  assert.equal(state.assignments.length, 1);
  assert.equal(state.reviewQueue.items.length, 1);
  assert.equal(state.deletionTombstones.length, 1);
  assert.equal(JSON.stringify(state.learnerGoals).includes('do not copy'), false);
});

test('learner state repository projects goal progress from stored activity', () => {
  const repository = createRepository();
  repository.saveProgress({
    learnerGoals: {
      dailyQuestionTarget: 2,
      weeklySessionTarget: 1,
      assignmentCompletionTargetPercent: 50,
      reviewStreakTargetDays: 1
    },
    reports: {
      sessions: [{
        id: 'session-1',
        completedAt: '2030-04-29T08:00:00.000Z',
        attempts: [{ questionId: 'q1' }, { questionId: 'q2' }]
      }]
    },
    assignments: [
      { id: 'assignment-1', status: 'completed' },
      { id: 'assignment-2', status: 'active' }
    ],
    reviewQueue: { items: [{ questionRef: { id: 'q3' }, status: 'queued', dueAt: '2030-04-29T12:00:00.000Z' }] }
  });

  const progress = repository.getLearnerGoalProgress();

  assert.equal(repository.getLearnerGoals().dailyQuestionTarget, 2);
  assert.equal(progress.dailyQuestions.met, true);
  assert.equal(progress.weeklySessions.met, true);
  assert.equal(progress.assignments.met, true);
  assert.equal(progress.review.dueCount, 1);
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

test('learner state repository lists and transitions question reports', () => {
  const repository = createRepository();
  repository.upsertQuestionReport({
    id: 'report-1',
    questionId: 'grammar-sentence-types-q0001',
    learnerId: 'learner-1',
    status: 'open'
  });

  assert.equal(repository.listQuestionReports({ status: 'open' }).length, 1);
  assert.equal(repository.getQuestionReport('report-1').questionIdentity.questionId, 'grammar-sentence-types-q0001');

  const transitioned = repository.transitionQuestionReport('report-1', {
    type: 'assign',
    assignedTo: 'reviewer-1',
    actor: { id: 'teacher-1', role: 'teacher', capabilities: ['question-report:triage', 'question-report:assign'] }
  });

  assert.equal(transitioned.status, 'assigned');
});

test('learner state repository returns normalized dashboard sources without question payloads', () => {
  const repository = createRepository();
  repository.saveProgress({
    reports: {
      sessions: [{
        id: 'session-1',
        studentId: 'learner-1',
        attempts: [{ questionId: 'grammar-q0001', correct: true, question: 'raw prompt' }]
      }],
      questionReports: [{ id: 'report-1', learnerId: 'learner-1', questionId: 'grammar-q0001', status: 'open', answer: 'raw answer' }]
    },
    assignments: [{ id: 'assignment-1', status: 'active', assignedTo: { learnerIds: ['learner-1'] } }],
    reviewQueue: { queueId: 'review-1', items: [{ questionRef: { id: 'grammar-q0001' }, dueAt: '2030-04-29T12:00:00.000Z' }] }
  });

  const source = repository.getLearnerDashboardSource('learner-1');

  assert.equal(source.learner.id, 'learner-1');
  assert.equal(source.sessions.length, 1);
  assert.equal(source.assignments.length, 1);
  assert.equal(source.questionReports.length, 1);
  assert.equal(JSON.stringify(source).includes('raw prompt'), false);
  assert.equal(JSON.stringify(source).includes('raw answer'), false);
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

test('learner state repository can reconcile local-first state with injected sync adapter', async () => {
  const storage = createMemoryStorage();
  const syncAdapter = createFakeLearnerStateSyncAdapter();
  await syncAdapter.writeLearnerState('learner-1', {
    reports: { sessions: [{ id: 'session-remote', completedAt: '2030-04-30T12:00:00.000Z' }] },
    totalGems: 7
  }, { revision: 0, now: '2030-04-30T12:00:00.000Z' });
  const repository = createRepository(storage, { learnerId: 'learner-1', syncAdapter });
  repository.saveProgress({
    reports: { sessions: [{ id: 'session-local', completedAt: '2030-04-29T12:00:00.000Z' }] },
    totalGems: 3
  });

  const result = await repository.reconcileSync();

  assert.equal(result.status, 'merged');
  assert.deepEqual(repository.getProgress().reports.sessions.map(session => session.id), ['session-remote', 'session-local']);
  assert.equal(repository.getProgress().totalGems, 7);
  assert.equal(repository.getSyncStatus().revision, 2);
});

test('learner state repository reports sync write failures without corrupting local state', async () => {
  const syncAdapter = createFakeLearnerStateSyncAdapter({ mode: 'unavailable' });
  const repository = createRepository(createMemoryStorage(), {
    learnerId: 'learner-1',
    syncAdapter
  });
  repository.saveProgress({ totalGems: 11 });

  const result = await repository.flushSync();

  assert.equal(result.status, 'failed');
  assert.equal(repository.getProgress().totalGems, 11);
  assert.equal(repository.getSyncStatus().pending, true);
});

test('learner state repository records deletion requests and tombstones deleted state', () => {
  const repository = createRepository();
  repository.saveProgress({ totalGems: 12, reports: { sessions: [{ id: 'session-1' }] } });

  const request = repository.requestLearnerDataDeletion({
    learnerId: 'learner-1',
    requestedBy: { id: 'student-1', role: 'student', learnerId: 'learner-1' },
    reason: 'student request'
  });
  repository.approveLearnerDataDeletion(request.deletionRequestId, {
    id: 'admin-1',
    role: 'system_admin'
  });
  const deleted = repository.deleteLearnerState(request.deletionRequestId);

  assert.equal(deleted.tombstone.learnerId, 'learner-1');
  assert.equal(repository.getProgress().totalGems, 0);
  assert.equal(repository.getProgress().deletionTombstones[0].deletionRequestId, request.deletionRequestId);
  assert.equal(repository.listDeletionRequests()[0].status, 'completed');
});

test('learner state repository previews restore and blocks stale backups after tombstone', () => {
  const repository = createRepository();
  repository.writeDeletionTombstone({
    learnerId: 'learner-1',
    deletionRequestId: 'delete-1',
    deletedAt: '2030-05-01T12:00:00.000Z'
  });

  assert.equal(repository.restoreLearnerStateFromBackup({
    app: { exportedAt: '2030-04-30T12:00:00.000Z' },
    data: { progress: { totalGems: 5 } }
  }, { preview: true }).allowed, false);

  const restored = repository.restoreLearnerStateFromBackup({
    app: { exportedAt: '2030-05-02T12:00:00.000Z' },
    data: { progress: { totalGems: 5 } }
  }, { confirm: true });

  assert.equal(restored.allowed, true);
  assert.equal(repository.getProgress().totalGems, 5);
});

test('learner state repository quarantines corrupt remote sync records before local writes', async () => {
  const storage = createMemoryStorage();
  const syncAdapter = createFakeLearnerStateSyncAdapter();
  await syncAdapter.writeLearnerState('learner-1', {
    totalGems: 99,
    reports: { questionReports: [{ id: 'report-corrupt', status: 'open' }] }
  }, { revision: 0, now: '2030-04-30T12:00:00.000Z' });
  const repository = createRepository(storage, { learnerId: 'learner-1', syncAdapter });
  repository.saveProgress({ totalGems: 7 });

  const result = await repository.reconcileSync();

  assert.equal(result.status, 'failed');
  assert.equal(result.error.code, 'record_corrupt');
  assert.equal(repository.getProgress().totalGems, 7);
  assert.equal(repository.getProgress().reports.questionReports.length, 0);
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

function createRepository(storage = createMemoryStorage(), options = {}) {
  return createLearnerStateRepository(createLocalStorageLearnerStateAdapter(storage, {
    storageKey: 'grammarQuestProgress',
    corruptBackupKey: 'grammarQuestProgress.corrupt'
  }), Object.assign({
    now: () => '2030-04-29T12:00:00.000Z'
  }, options));
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
