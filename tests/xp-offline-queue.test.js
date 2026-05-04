const assert = require('node:assert/strict');
const test = require('node:test');

const {
  OFFLINE_XP_STATES,
  applyXpAdjudicationResult,
  createLocalOnlyXpQueueEntry,
  createProvisionalXpQueueEntry,
  markXpQueueEntrySubmitted,
  normalizeXpOfflineQueue
} = require('../assets/xp-offline-queue');

const attemptEvidence = {
  attemptId: 'attempt-1',
  idempotencyKey: 'idem-1',
  learnerId: 'learner-a',
  quiz: {
    assignedGrade: 4,
    quizGrade: 5,
    startedAt: '2030-04-29T12:00:00.000Z',
    completedAt: '2030-04-29T12:01:30.000Z'
  },
  questionRefs: [{
    id: 'grammar-sentence-types-q0001',
    sourceSet: 'grammar-sentence-types',
    version: 1,
    contentHash: 'sha256:abc',
    sequence: 1
  }],
  selectedAnswers: [{ questionId: 'grammar-sentence-types-q0001', selectedIndex: 0 }],
  question: 'Do not store prompt',
  choices: ['A', 'B'],
  correctAnswer: 0
};

test('offline XP queue creates sanitized provisional entries', () => {
  const entry = createProvisionalXpQueueEntry({
    attemptEvidence,
    provisionalAwardSummary: {
      awardedXp: 15,
      provisional: true,
      correctCount: 1,
      totalQuestions: 1,
      question: 'Do not store summary prompt'
    },
    localPracticeRef: {
      sessionId: 'session-1',
      completedAt: '2030-04-29T12:01:30.000Z',
      questionRefs: ['grammar-sentence-types-q0001']
    },
    queuedAt: '2030-04-29T12:02:00.000Z'
  });

  assert.equal(entry.status, OFFLINE_XP_STATES.PROVISIONAL);
  assert.equal(entry.provisionalXp, 15);
  assert.equal(entry.attemptEvidence.questionRefs[0].id, 'grammar-sentence-types-q0001');
  assert.equal(entry.localPracticeRef.sessionId, 'session-1');
  assert.equal(JSON.stringify(entry).includes('Do not store'), false);
  assert.equal(JSON.stringify(entry).includes('correctAnswer'), false);
});

test('offline XP queue moves through submitted awarded duplicate and rejected states', () => {
  const provisional = createProvisionalXpQueueEntry({
    attemptEvidence,
    provisionalAwardSummary: { awardedXp: 15, provisional: true },
    localPracticeRef: { sessionId: 'session-1' },
    queuedAt: '2030-04-29T12:02:00.000Z'
  });
  const submitted = markXpQueueEntrySubmitted(provisional, {
    submittedAt: '2030-04-29T12:03:00.000Z',
    syncRequestId: 'sync-1'
  });
  const awarded = applyXpAdjudicationResult(submitted, {
    status: 'awarded',
    awardEventId: 'award-1',
    awardedXp: 18,
    syncedAt: '2030-04-29T12:03:10.000Z'
  });
  const duplicate = applyXpAdjudicationResult(submitted, {
    status: 'duplicate',
    awardEventId: 'award-1',
    awardedXp: 18,
    syncedAt: '2030-04-29T12:03:20.000Z'
  });
  const rejected = applyXpAdjudicationResult(submitted, {
    status: 'rejected',
    reason: 'stale_content',
    syncedAt: '2030-04-29T12:03:30.000Z'
  });

  assert.equal(submitted.status, OFFLINE_XP_STATES.SUBMITTED);
  assert.equal(awarded.status, OFFLINE_XP_STATES.AWARDED);
  assert.equal(awarded.syncedXp, 18);
  assert.equal(duplicate.status, OFFLINE_XP_STATES.DUPLICATE);
  assert.equal(duplicate.syncedXp, 18);
  assert.equal(rejected.status, OFFLINE_XP_STATES.REJECTED);
  assert.equal(rejected.rejectionReason, 'stale_content');
  assert.equal(rejected.localPracticeRef.sessionId, 'session-1');
  assert.equal(rejected.provisionalXp, 15);
});

test('offline XP queue preserves local-only practice when synced XP is ineligible', () => {
  const localOnly = createLocalOnlyXpQueueEntry({
    attemptEvidence,
    reason: 'offline_unverifiable',
    localPracticeRef: { sessionId: 'session-1', completedAt: '2030-04-29T12:01:30.000Z' },
    queuedAt: '2030-04-29T12:02:00.000Z'
  });
  const queue = normalizeXpOfflineQueue([
    localOnly,
    Object.assign({}, localOnly, { status: 'rejected', rejectionReason: 'impossible_cadence' })
  ]);

  assert.equal(localOnly.status, OFFLINE_XP_STATES.LOCAL_ONLY);
  assert.equal(localOnly.localPracticeRef.sessionId, 'session-1');
  assert.equal(queue.length, 2);
  assert.equal(queue[0].status, OFFLINE_XP_STATES.LOCAL_ONLY);
  assert.equal(queue[1].status, OFFLINE_XP_STATES.REJECTED);
  assert.equal(queue[1].localPracticeRef.sessionId, 'session-1');
});
