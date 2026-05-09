const assert = require('node:assert/strict');
const test = require('node:test');

const {
  adjudicateLearningAttempt,
  createFakeLearningAttemptLedger
} = require('../server/learning-attempt-service');

const canonicalQuestions = [{
  questionId: 'grammar-correct-article-q0001',
  sourceSet: 'grammar-correct-article',
  version: 2,
  contentHash: 'sha256:4db6f58fc836d2ff67b080e13fc72dc8dbfc5db42ede5739f0da6a8261631425',
  sequence: 1,
  correct: 1,
  choices: ['a', 'an', 'the'],
  skillIds: ['grammar.usage'],
  standardIds: ['L.3-6.1'],
  gradeLevels: [4],
  difficulty: 'easy'
}, {
  questionId: 'grammar-correct-article-q0002',
  sourceSet: 'grammar-correct-article',
  version: 2,
  contentHash: 'sha256:370c74b811335c76d200267115fb49385d2ffe461348da745392d7c8ab70ea11',
  sequence: 2,
  correct: 1,
  choices: ['a', 'an', 'the'],
  skillIds: ['grammar.usage'],
  standardIds: ['L.3-6.1'],
  gradeLevels: [4],
  difficulty: 'easy'
}];

test('learning attempt service ignores inflated client scores and recomputes correctness from canonical answers', () => {
  const ledger = createFakeLearningAttemptLedger();
  const decision = adjudicateLearningAttempt(validSubmission({
    score: 100,
    percentage: 1,
    correctCount: 99,
    mastery: { 'grammar.usage': 'secure' },
    totalGems: 999,
    awardedXp: 999,
    leaderboardRank: 1
  }), {
    actor: { learnerId: 'learner-a' },
    canonicalQuestions,
    ledger,
    now: () => new Date('2030-05-04T12:01:00.000Z')
  });

  assert.equal(decision.status, 'verified');
  assert.equal(decision.event.score.correctCount, 1);
  assert.equal(decision.event.score.totalQuestions, 2);
  assert.equal(decision.event.score.accuracy, 0.5);
  assert.deepEqual(decision.event.clientClaimsIgnored.sort(), [
    'awardedXp',
    'correctCount',
    'leaderboardRank',
    'mastery',
    'percentage',
    'score',
    'totalGems'
  ].sort());
  assert.equal(JSON.stringify(decision.event).includes('answerKey'), false);
  assert.equal(ledger.listEvents().length, 1);
});

test('learning attempt service rejects stale refs unauthorized learners replayed refs cadence and malformed answers', () => {
  const cases = [
    ['stale_content', validSubmission({ questionAttempts: [attemptFor(canonicalQuestions[0], { contentHash: `sha256:${'0'.repeat(64)}` })] })],
    ['version_mismatch', validSubmission({ questionAttempts: [attemptFor(canonicalQuestions[0], { version: 1 })] })],
    ['unauthorized_learner', validSubmission({ learnerId: 'learner-b' })],
    ['replayed_question_ref', validSubmission({ questionAttempts: [attemptFor(canonicalQuestions[0]), attemptFor(canonicalQuestions[0])] })],
    ['cadence_rejected', validSubmission({ submittedAt: '2030-05-04T12:00:01.000Z' })],
    ['malformed_answer_id', validSubmission({ questionAttempts: [attemptFor(canonicalQuestions[0], {}, { selectedAnswer: 99 })] })]
  ];

  cases.forEach(([reason, submission]) => {
    const decision = adjudicateLearningAttempt(submission, {
      actor: { learnerId: 'learner-a' },
      canonicalQuestions,
      ledger: createFakeLearningAttemptLedger(),
      now: () => new Date('2030-05-04T12:01:00.000Z')
    });
    assert.equal(decision.status, 'rejected', reason);
    assert.equal(decision.reason, reason);
  });
});

test('learning attempt ledger is idempotent and append-only for duplicate submissions', () => {
  const ledger = createFakeLearningAttemptLedger();
  const first = adjudicateLearningAttempt(validSubmission(), {
    actor: { learnerId: 'learner-a' },
    canonicalQuestions,
    ledger,
    now: () => new Date('2030-05-04T12:01:00.000Z')
  });
  const duplicate = adjudicateLearningAttempt(validSubmission(), {
    actor: { learnerId: 'learner-a' },
    canonicalQuestions,
    ledger,
    now: () => new Date('2030-05-04T12:02:00.000Z')
  });

  assert.equal(first.status, 'verified');
  assert.equal(duplicate.status, 'duplicate');
  assert.equal(duplicate.originalEvent.eventId, first.event.eventId);
  assert.equal(ledger.listEvents().length, 1);
  assert.throws(() => ledger.updateEvent(first.event.eventId, { score: { correctCount: 999 } }), /append_only/);
});

test('offline local completions are normalized as provisional and excluded from verified ledger events', () => {
  const decision = adjudicateLearningAttempt(validSubmission({ offlineLocalOnly: true }), {
    actor: { learnerId: 'learner-a' },
    canonicalQuestions,
    ledger: createFakeLearningAttemptLedger()
  });

  assert.equal(decision.status, 'provisional_local');
  assert.equal(decision.verifiedReportingEligible, false);
  assert.equal(decision.localPracticePreserved, true);
});

function validSubmission(overrides = {}) {
  return Object.assign({
    learnerId: 'learner-a',
    idempotencyKey: 'attempt-key-1',
    startedAt: '2030-05-04T12:00:00.000Z',
    submittedAt: '2030-05-04T12:00:20.000Z',
    assignmentContext: { assignmentId: 'assignment-1', classId: 'class-a' },
    questionAttempts: [
      attemptFor(canonicalQuestions[0], {}, { selectedAnswer: 1 }),
      attemptFor(canonicalQuestions[1], {}, { selectedAnswer: 0 })
    ]
  }, overrides);
}

function attemptFor(canonical, refOverrides = {}, attemptOverrides = {}) {
  return Object.assign({
    questionRef: Object.assign({
      id: canonical.questionId,
      sourceSet: canonical.sourceSet,
      version: canonical.version,
      contentHash: canonical.contentHash,
      sequence: canonical.sequence
    }, refOverrides),
    selectedAnswer: canonical.correct,
    answeredAt: '2030-05-04T12:00:10.000Z',
    confidence: 'medium',
    hintUsed: false
  }, attemptOverrides);
}
