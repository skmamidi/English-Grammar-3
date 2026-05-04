const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createIndexedDbLearnerStateAdapter,
  createLocalStorageLearnerStateAdapter,
  normalizeLearnerState
} = require('../assets/learner-state-repository');
const {
  migrateLocalStorageToIndexedDb
} = require('../assets/learner-state-migration');
const {
  buildContentChangeImpactAnalysis
} = require('../assets/content-change-impact-analysis');
const { createFakeIndexedDB } = require('./helpers/fake-indexeddb');

test('learner state migration preserves normalized progress and keeps localStorage intact', async () => {
  const storage = createMemoryStorage();
  const source = createLocalStorageLearnerStateAdapter(storage, { storageKey: 'grammarQuestProgress:student-1' });
  const target = createIndexedDbLearnerStateAdapter({
    indexedDB: createFakeIndexedDB(),
    storageKey: 'grammarQuestProgress:student-1'
  });
  const original = {
    totalGems: 42,
    badges: ['streak-3'],
    mastery: { domains: { vocabulary: { correct: 5, total: 6 } } },
    activeQuiz: {
      schemaVersion: 2,
      setId: 'vocabulary-context-clues',
      questionRefs: [{
        id: 'vocabulary-context-clues-q0001',
        version: 2,
        contentHash: 'sha256:def',
        sourceSet: 'vocabulary-context-clues',
        sequence: 1
      }],
      questionSnapshots: [{
        id: 'vocabulary-context-clues-q0001',
        question: 'Which clue helps?',
        choices: ['A', 'B'],
        correct: 1
      }]
    },
    reports: {
      sessions: [{ id: 'session-1', attempts: [] }],
      questionReports: [{ id: 'report-1', questionId: 'vocabulary-context-clues-q0001' }]
    }
  };
  await source.write(original);

  const result = await migrateLocalStorageToIndexedDb({
    localStorageAdapter: source,
    indexedDbAdapter: target,
    markerStorage: storage,
    markerKey: 'grammarQuestProgress:student-1.indexeddbMigrated'
  });

  assert.equal(result.status, 'migrated');
  assert.equal(storage.getItem('grammarQuestProgress:student-1.indexeddbMigrated'), 'true');
  assert.ok(storage.getItem('grammarQuestProgress:student-1'), 'localStorage copy remains available');
  const migrated = normalizeLearnerState(await target.read());
  assert.equal(migrated.totalGems, 42);
  assert.equal(migrated.badges[0], 'streak-3');
  assert.equal(migrated.mastery.domains.vocabulary.correct, 5);
  assert.equal(migrated.activeQuiz.questionRefs[0].id, 'vocabulary-context-clues-q0001');
  assert.equal(migrated.activeQuiz.questionSnapshots[0].question, 'Which clue helps?');
  assert.equal(migrated.reports.questionReports[0].id, 'report-1');
});

test('learner state migration normalizes optional XP metadata without client-owned totals', async () => {
  const storage = createMemoryStorage();
  const source = createLocalStorageLearnerStateAdapter(storage, { storageKey: 'grammarQuestProgress:student-xp' });
  const target = createIndexedDbLearnerStateAdapter({
    indexedDB: createFakeIndexedDB(),
    storageKey: 'grammarQuestProgress:student-xp'
  });
  await source.write({
    totalGems: 12,
    totalXp: 99999,
    xpProjection: {
      totalXp: 99999,
      currentWeeklyXp: 99999,
      question: 'Do not copy'
    },
    xp: {
      projectionRef: 'xpProjections/learner-a',
      projectionUpdatedAt: '2030-04-29T12:00:00.000Z',
      offlineQueue: [{
        attemptId: 'attempt-1',
        idempotencyKey: 'idem-1',
        status: 'rejected',
        provisionalXp: 15,
        rejectionReason: 'stale_content',
        localPracticeRef: { sessionId: 'session-1' },
        attemptEvidence: {
          questionRefs: [{ id: 'grammar-sentence-types-q0001', contentHash: 'sha256:abc' }],
          selectedAnswers: [{ questionId: 'grammar-sentence-types-q0001', selectedIndex: 0 }],
          question: 'Do not store prompt',
          answerKey: [0]
        }
      }]
    }
  });

  await migrateLocalStorageToIndexedDb({
    localStorageAdapter: source,
    indexedDbAdapter: target,
    markerStorage: storage,
    markerKey: 'grammarQuestProgress:student-xp.indexeddbMigrated'
  });

  const migrated = normalizeLearnerState(await target.read());
  assert.equal(migrated.totalGems, 12);
  assert.equal(migrated.xp.projectionRef, 'xpProjections/learner-a');
  assert.equal(migrated.xp.projectionUpdatedAt, '2030-04-29T12:00:00.000Z');
  assert.equal(migrated.xp.offlineQueue[0].status, 'rejected');
  assert.equal(migrated.xp.offlineQueue[0].localPracticeRef.sessionId, 'session-1');
  assert.equal(Object.hasOwn(migrated, 'totalXp'), false);
  assert.equal(Object.hasOwn(migrated, 'xpProjection'), false);
  assert.equal(JSON.stringify(migrated.xp).includes('Do not store'), false);
  assert.equal(JSON.stringify(migrated.xp).includes('answerKey'), false);
});

test('learner state migration is idempotent once the marker is set', async () => {
  const storage = createMemoryStorage();
  storage.setItem('grammarQuestProgress.indexeddbMigrated', 'true');
  const result = await migrateLocalStorageToIndexedDb({
    localStorageAdapter: createLocalStorageLearnerStateAdapter(storage),
    indexedDbAdapter: createIndexedDbLearnerStateAdapter({ indexedDB: createFakeIndexedDB() }),
    markerStorage: storage
  });

  assert.equal(result.status, 'already_migrated');
});

test('learner state migration does not mark complete when IndexedDB write fails', async () => {
  const storage = createMemoryStorage();
  const source = createLocalStorageLearnerStateAdapter(storage, { storageKey: 'grammarQuestProgress' });
  await source.write({ totalGems: 3 });

  await assert.rejects(() => migrateLocalStorageToIndexedDb({
    localStorageAdapter: source,
    indexedDbAdapter: createIndexedDbLearnerStateAdapter({
      indexedDB: createFakeIndexedDB({ failWrite: true }),
      storageKey: 'grammarQuestProgress'
    }),
    markerStorage: storage
  }), /learner_state_indexeddb_write_failed/);

  assert.equal(storage.getItem('grammarQuestProgress.indexeddbMigrated'), null);
  assert.ok(storage.getItem('grammarQuestProgress'), 'localStorage copy remains after failed migration');
});

test('content impact analysis reports learner-state compatibility risk without mutating progress', () => {
  const analysis = buildContentChangeImpactAnalysis({
    changes: [{
      questionId: 'grammar-q0001',
      changeType: 'removed',
      domain: 'grammar',
      setId: 'grammar-set',
      chunkFile: 'assets/question-chunks/grammar/grammar-set.js',
      manifestEntryId: 'grammar-set:q0001',
      rollbackRef: 'release:previous',
      learnerStateCompatibilityRisk: 'high',
      activeLearnerRefs: 12
    }]
  });

  assert.equal(analysis.summary.learnerStateCompatibilityRisk, 'high');
  assert.equal(Object.hasOwn(analysis, 'learnerState'), false);
  assert.doesNotMatch(JSON.stringify(analysis), /activeLearnerRefs/);
});

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
