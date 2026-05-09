const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildOfflineQuestionRecordKey,
  createIndexedDbOfflineQuestionStore,
  evaluateOfflineQuestionStoreEviction,
  normalizeOfflineQuestionRecord,
  validateOfflineQuestionRecord
} = require('../assets/offline-question-store');

const repoRoot = path.resolve(__dirname, '..');

test('offline question records are keyed by immutable question identity', () => {
  const record = normalizeOfflineQuestionRecord(questionRecord({
    questionId: 'grammar-sentence-types-q0001',
    sourceSet: 'grammar-sentence-types',
    version: 'published-2030-05',
    contentHash: 'sha256:aaaaaaaaaaaaaaaa',
    prompt: 'Choose the complete sentence.',
    answerKey: 'unsafe-answer',
    explanation: 'unsafe explanation'
  }));

  assert.equal(record.questionId, 'grammar-sentence-types-q0001');
  assert.equal(record.key, 'grammar-sentence-types-q0001::grammar-sentence-types::published-2030-05::sha256:aaaaaaaaaaaaaaaa');
  assert.equal(buildOfflineQuestionRecordKey(record), record.key);
  assert.equal(Object.hasOwn(record, 'answerKey'), false);
  assert.equal(Object.hasOwn(record, 'explanation'), false);
  assert.deepEqual(validateOfflineQuestionRecord(record).errors, []);
});

test('offline question store retrieves sparse selected refs without chunk script hydration', async () => {
  const store = createIndexedDbOfflineQuestionStore({ databaseName: 'offline-question-store-test' });
  await store.putQuestionRecords([
    questionRecord({ questionId: 'q1', sourceSet: 'set-a', contentHash: 'sha256:111111111111' }),
    questionRecord({ questionId: 'q2', sourceSet: 'set-a', contentHash: 'sha256:222222222222' })
  ]);

  const selected = await store.getQuestionRecordsByRefs([
    { questionId: 'q2', sourceSet: 'set-a', version: 'v1', contentHash: 'sha256:222222222222' },
    { questionId: 'q1', sourceSet: 'set-a', version: 'v1', contentHash: 'sha256:111111111111' }
  ]);

  assert.deepEqual(selected.map(record => record.questionId), ['q2', 'q1']);
  assert.equal(selected.every(record => record.storageTarget === 'indexedDB'), true);
  assert.equal(selected.every(record => record.loadedFromChunkScript === false), true);
});

test('answer-bearing offline packages require explicit local practice policy', () => {
  const rejected = validateOfflineQuestionRecord(normalizeOfflineQuestionRecord(questionRecord({
    answerKey: 'choice-a',
    offlinePackage: { packageId: '', allowAnswerKeys: false }
  })));
  const accepted = normalizeOfflineQuestionRecord(questionRecord({
    answerKey: 'choice-a',
    explanation: 'Local practice explanation.',
    offlinePackage: { packageId: 'offline-practice-pack-1', allowAnswerKeys: true }
  }));

  assert.ok(rejected.errors.includes('answer fields require explicit offline practice package policy'));
  assert.equal(accepted.answerKey, 'choice-a');
  assert.equal(accepted.explanation, 'Local practice explanation.');
  assert.deepEqual(validateOfflineQuestionRecord(accepted).errors, []);
});

test('offline question eviction protects learner progress reports active quiz and xp queues', () => {
  const result = evaluateOfflineQuestionStoreEviction({
    quotaBytes: 1000,
    records: [
      storageRecord('question:q-old', 'offlineQuestion', 600, 100),
      storageRecord('media:m-old', 'questionMedia', 600, 200),
      storageRecord('learner:progress', 'learnerProgress', 900, 10),
      storageRecord('report:summary', 'learnerReport', 900, 20),
      storageRecord('quiz:active', 'activeQuizState', 900, 30),
      storageRecord('xp:queue', 'xpOfflineQueue', 900, 40)
    ]
  });

  assert.deepEqual(result.evictions.map(item => item.key), ['question:q-old', 'media:m-old']);
  assert.equal(result.protectedRecordCount, 4);
  assert.equal(result.deletedLearnerState, false);
  assert.equal(result.retained.some(item => item.recordType === 'learnerProgress'), true);
  assert.equal(result.retained.some(item => item.recordType === 'activeQuizState'), true);
});

test('granular offline question store docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'performance', 'granular-offline-question-store.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'IndexedDB',
    'OfflineQuestionRecord',
    'QuestionMediaRef',
    'QuestionCacheIndex',
    'Cache API',
    'learner progress',
    'chunk script'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));
  assert.match(pkg.scripts['test:unit'], /tests\/offline-question-store\.test\.js/);
});

function questionRecord(overrides = {}) {
  return {
    questionId: 'q1',
    sourceSet: 'set-a',
    version: 'v1',
    contentHash: 'sha256:111111111111',
    domain: 'grammar',
    skill: 'sentence-types',
    prompt: 'Choose the complete sentence.',
    choices: ['A complete sentence.', 'Because it rained.'],
    mediaRefs: [
      { type: 'audio', url: '/assets/audio/spelling/immediately.wav', bytes: 2048, required: true }
    ],
    ...overrides
  };
}

function storageRecord(key, recordType, bytes, lastUsedAt) {
  return { key, recordType, bytes, lastUsedAt };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
