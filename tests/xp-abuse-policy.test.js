const assert = require('node:assert/strict');
const test = require('node:test');

const abuse = require('../assets/xp-abuse-policy');

test('XP abuse policy flags duplicates and impossible cadence without blocking practice', () => {
  const decision = abuse.evaluateXpAttemptAbuse({
    attemptId: 'attempt-1',
    previousAttemptIds: ['attempt-1'],
    startedAt: '2026-05-04T08:00:00.000Z',
    completedAt: '2026-05-04T08:00:04.000Z',
    totalQuestions: 8,
    correctCount: 8,
    repeatCount: 6,
    awardedXp: 480
  });

  assert.equal(decision.decision, 'review');
  assert.equal(decision.practiceAllowed, true);
  assert.equal(decision.awardEligible, false);
  assert.equal(decision.leaderboardEligible, false);
  assert.deepEqual(decision.reasonCodes.sort(), [
    'duplicate_attempt',
    'excessive_repeats',
    'impossible_cadence',
    'unusual_award_spike'
  ]);
});

test('XP abuse policy flags stale content and unsupported stretch gaps', () => {
  const decision = abuse.evaluateXpAttemptAbuse({
    attemptId: 'attempt-2',
    contentVersion: 2,
    latestContentVersion: 5,
    stretchGap: 4,
    durationSeconds: 120,
    totalQuestions: 6,
    awardedXp: 42
  });

  assert.equal(decision.decision, 'review');
  assert.equal(decision.practiceAllowed, true);
  assert.equal(decision.awardEligible, false);
  assert.equal(decision.leaderboardEligible, false);
  assert.deepEqual(decision.reasonCodes.sort(), ['stale_content', 'unsupported_stretch_gap']);
});

test('XP fairness reports are aggregate-only and omit learner identifiers', () => {
  const report = abuse.buildAggregateXpFairnessReport([
    { learnerId: 'learner-a', grade: 3, awardedXp: 20, durationSeconds: 60 },
    { learnerId: 'learner-b', grade: 3, awardedXp: 240, durationSeconds: 8 },
    { learnerId: 'learner-c', grade: 5, awardedXp: 60, durationSeconds: 90 }
  ]);

  assert.equal(report.totalAttempts, 3);
  assert.deepEqual(report.gradeBuckets, { grade_3: 2, grade_5: 1 });
  assert.equal(report.awardBuckets.high, 1);
  assert.equal(report.cadenceBuckets.fast, 1);
  assert.equal(JSON.stringify(report).includes('learner-'), false);
});

test('XP abuse policy reviews duplicate and suspicious mission reward events', () => {
  const decision = abuse.evaluateMissionRewardAbuse({
    missionId: 'mission-sentence-detectives',
    priorMissionAwardIds: ['mission-sentence-detectives'],
    completedAt: '2030-05-01T12:00:00.000Z',
    previousCompletedAt: '2030-05-01T11:59:30.000Z',
    awardedXp: 500,
    leaderboardEligible: true,
    clientAwardedXp: 999999
  });

  assert.equal(decision.decision, 'review');
  assert.equal(decision.practiceAllowed, true);
  assert.equal(decision.awardEligible, false);
  assert.equal(decision.leaderboardEligible, false);
  assert.deepEqual(decision.reasonCodes.sort(), [
    'client_mission_bonus_submitted',
    'duplicate_mission_completion',
    'mission_leaderboard_bonus_blocked',
    'rapid_mission_repeat',
    'unusual_mission_award_spike'
  ]);
});

test('mission engagement abuse flags grinding, impossible cadence, spam, and reminder fatigue', () => {
  const decision = abuse.evaluateMissionEngagementAbuse({
    missionCompletionCount: 12,
    distinctMissionCount: 2,
    stepsCompleted: 8,
    durationSeconds: 80,
    assignmentCreatesIn24h: 9,
    reminderAttemptsIn24h: 6,
    reminderDismissalsIn7d: 4
  });

  assert.equal(decision.decision, 'review');
  assert.equal(decision.practiceAllowed, true);
  assert.equal(decision.assignmentEligible, false);
  assert.equal(decision.reminderEligible, false);
  assert.deepEqual(decision.reasonCodes.sort(), [
    'assignment_spam',
    'impossible_mission_cadence',
    'mission_grinding',
    'reminder_fatigue'
  ]);
});

test('mission fairness reports grade skew from aggregate-only mission observations', () => {
  const report = abuse.buildAggregateMissionFairnessReport([
    { learnerId: 'learner-a', grade: 3, missionStarts: 9, completions: 8 },
    { learnerId: 'learner-b', grade: 3, missionStarts: 7, completions: 7 },
    { learnerId: 'learner-c', grade: 5, missionStarts: 1, completions: 0 }
  ]);

  assert.equal(report.totalObservations, 3);
  assert.deepEqual(report.gradeBuckets, {
    grade_3: { observations: 2, missionStarts: 16, completions: 15 },
    grade_5: { observations: 1, missionStarts: 1, completions: 0 }
  });
  assert.deepEqual(report.riskSignals, ['grade_skew']);
  assert.equal(JSON.stringify(report).includes('learner-'), false);
});
