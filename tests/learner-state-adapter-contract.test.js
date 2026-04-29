const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createIndexedDbLearnerStateAdapter,
  createLocalStorageLearnerStateAdapter,
  normalizeLearnerState
} = require('../assets/learner-state-repository');
const { createFakeIndexedDB } = require('./helpers/fake-indexeddb');

const sampleState = {
  totalGems: 9,
  badges: ['report-ready'],
  mastery: {
    domains: { grammar: { correct: 2, total: 3 } },
    skills: {},
    cognitiveDemand: {},
    difficulty: {},
    subtopics: {},
    standards: {}
  },
  reports: {
    sessions: [{
      id: 'session-1',
      attempts: [{ id: 'grammar-sentence-types-q0001', questionVersion: 1, questionHash: 'sha256:abc' }]
    }],
    questionReports: [{
      id: 'question-report-existing',
      questionId: 'grammar-sentence-types-q0001',
      status: 'open'
    }]
  },
  activeQuiz: {
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
      question: 'Snapshot fallback',
      choices: ['A', 'B'],
      correct: 0,
      metadata: { sourceSet: 'grammar-sentence-types', sequence: 1 }
    }]
  }
};

for (const adapterCase of [
  {
    name: 'localStorage',
    create(storageKey) {
      return createLocalStorageLearnerStateAdapter(createMemoryStorage(), { storageKey });
    }
  },
  {
    name: 'IndexedDB',
    create(storageKey) {
      return createIndexedDbLearnerStateAdapter({
        indexedDB: createFakeIndexedDB(),
        storageKey
      });
    }
  }
]) {
  test(`${adapterCase.name} learner state adapter reads, writes, and removes normalized progress`, async () => {
    const adapter = adapterCase.create('grammarQuestProgress');

    assert.equal(await adapter.read(), null);
    await adapter.write(sampleState);

    const stored = normalizeLearnerState(await adapter.read());
    assert.equal(stored.totalGems, 9);
    assert.equal(stored.badges[0], 'report-ready');
    assert.equal(stored.activeQuiz.questionRefs[0].id, 'grammar-sentence-types-q0001');
    assert.equal(stored.reports.sessions[0].attempts[0].questionId, 'grammar-sentence-types-q0001');
    assert.equal(stored.reports.questionReports[0].id, 'question-report-existing');

    await adapter.remove();
    assert.equal(await adapter.read(), null);
  });

  test(`${adapterCase.name} learner state adapter isolates active student storage keys`, async () => {
    const first = adapterCase.create('grammarQuestProgress:student-1');
    const second = adapterCase.create('grammarQuestProgress:student-2');

    await first.write(Object.assign({}, sampleState, { totalGems: 1 }));
    await second.write(Object.assign({}, sampleState, { totalGems: 7 }));

    assert.equal(normalizeLearnerState(await first.read()).totalGems, 1);
    assert.equal(normalizeLearnerState(await second.read()).totalGems, 7);
  });
}

test('localStorage adapter quarantines corrupt JSON behind the contract', async () => {
  const storage = createMemoryStorage();
  storage.setItem('grammarQuestProgress', '{bad json');
  const adapter = createLocalStorageLearnerStateAdapter(storage, {
    storageKey: 'grammarQuestProgress',
    corruptBackupKey: 'grammarQuestProgress.corrupt'
  });

  assert.equal(await adapter.read(), null);
  assert.equal(storage.getItem('grammarQuestProgress.corrupt'), '{bad json');
});

test('IndexedDB adapter surfaces unavailable storage without mutating local state', async () => {
  const adapter = createIndexedDbLearnerStateAdapter({
    indexedDB: createFakeIndexedDB({ failOpen: true }),
    storageKey: 'grammarQuestProgress'
  });

  await assert.rejects(() => adapter.write(sampleState), /learner_state_indexeddb_open_failed/);
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
