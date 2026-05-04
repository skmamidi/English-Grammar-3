const assert = require('node:assert/strict');
const test = require('node:test');

const xp = require('../assets/xp-domain');

test('XP domain maps difficulty to deterministic base XP', () => {
  assert.equal(xp.getBaseQuestionXp('easy'), 10);
  assert.equal(xp.getBaseQuestionXp('medium'), 20);
  assert.equal(xp.getBaseQuestionXp('hard'), 30);
  assert.throws(() => xp.getBaseQuestionXp('expert'), /xp_difficulty_invalid/);
});

test('XP domain applies integer-safe grade stretch multipliers', () => {
  assert.equal(xp.getStretchMultiplierBps({ assignedGrade: 4, quizGrade: 3 }), 10000);
  assert.equal(xp.getStretchMultiplierBps({ assignedGrade: 4, quizGrade: 4 }), 10000);
  assert.equal(xp.getStretchMultiplierBps({ assignedGrade: 4, quizGrade: 5 }), 15000);
  assert.equal(xp.getStretchMultiplierBps({ assignedGrade: 4, quizGrade: 6 }), 20000);
  assert.throws(() => xp.getStretchMultiplierBps({ assignedGrade: 2, quizGrade: 5 }), /xp_stretch_gap_unsupported/);
  assert.throws(() => xp.getStretchMultiplierBps({ assignedGrade: 1, quizGrade: 4 }), /xp_grade_invalid/);
});

test('XP domain covers completion multiplier thresholds exactly', () => {
  assert.equal(xp.getCompletionMultiplierBps({ correctCount: 20, totalQuestions: 20 }), 30000);
  assert.equal(xp.getCompletionMultiplierBps({ correctCount: 19, totalQuestions: 20 }), 20000);
  assert.equal(xp.getCompletionMultiplierBps({ correctCount: 17, totalQuestions: 20 }), 12000);
  assert.equal(xp.getCompletionMultiplierBps({ correctCount: 15, totalQuestions: 20 }), 11000);
  assert.equal(xp.getCompletionMultiplierBps({ correctCount: 14, totalQuestions: 20 }), 10000);
  assert.throws(() => xp.getCompletionMultiplierBps({ correctCount: 21, totalQuestions: 20 }), /xp_accuracy_invalid/);
});

test('XP award summary uses deterministic rounding with integer basis points', () => {
  const summary = xp.calculateXpAwardSummary({
    assignedGrade: 4,
    quizGrade: 5,
    questions: [
      { id: 'q1', difficulty: 'easy', correct: true },
      { id: 'q2', difficulty: 'easy', correct: true },
      { id: 'q3', difficulty: 'easy', correct: true },
      { id: 'q4', difficulty: 'hard', correct: false }
    ]
  });

  assert.equal(summary.correctCount, 3);
  assert.equal(summary.totalQuestions, 4);
  assert.equal(summary.baseCorrectXp, 45);
  assert.equal(summary.completionMultiplierBps, 11000);
  assert.equal(summary.rawAwardXp, 50);
  assert.equal(summary.awardedXp, 50);
  assert.equal(summary.eligibility.eligible, true);
});

test('XP repeat and stale attempts are explicit eligibility outcomes', () => {
  const fresh = xp.evaluateXpEligibility({ attemptNumber: 1, duplicateAttempt: false, staleContent: false });
  const repeat = xp.calculateXpAwardSummary({
    assignedGrade: 4,
    quizGrade: 4,
    attemptNumber: 2,
    questions: [{ id: 'q1', difficulty: 'hard', correct: true }]
  });
  const stale = xp.evaluateXpEligibility({ staleContent: true });

  assert.equal(fresh.eligible, true);
  assert.equal(fresh.leaderboardEligible, true);
  assert.equal(repeat.awardedXp, 0);
  assert.equal(repeat.eligibility.eligible, false);
  assert.deepEqual(repeat.eligibility.reasons, ['repeat_attempt']);
  assert.equal(stale.eligible, false);
  assert.ok(stale.reasons.includes('stale_content'));
});

test('XP summaries reject copied question payloads and client-awarded totals', () => {
  assert.throws(() => xp.calculateXpAwardSummary({
    assignedGrade: 4,
    quizGrade: 4,
    clientAwardedXp: 999999,
    questions: [{ id: 'q1', difficulty: 'easy', correct: true }]
  }), /xp_client_award_not_accepted/);
  assert.throws(() => xp.calculateXpAwardSummary({
    assignedGrade: 4,
    quizGrade: 4,
    questions: [{ id: 'q1', difficulty: 'easy', correct: true, question: 'Raw prompt' }]
  }), /xp_question_payload_forbidden/);
});
