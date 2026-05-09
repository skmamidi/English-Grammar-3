const assert = require('node:assert/strict');
const test = require('node:test');

const {
  adjudicateMissionReward,
  adjudicateXpAttempt,
  createMemoryXpAwardStore
} = require('../server/xp-attempt-service');

const canonicalQuestions = [
  {
    id: 'grammar-sentence-types-q0001',
    sourceSet: 'grammar-sentence-types',
    version: 1,
    contentHash: 'sha256:q1',
    correct: 2,
    difficulty: 'easy'
  },
  {
    id: 'grammar-sentence-types-q0002',
    sourceSet: 'grammar-sentence-types',
    version: 1,
    contentHash: 'sha256:q2',
    correct: 0,
    difficulty: 'medium'
  },
  {
    id: 'grammar-sentence-types-q0003',
    sourceSet: 'grammar-sentence-types',
    version: 1,
    contentHash: 'sha256:q3',
    correct: 1,
    difficulty: 'hard'
  }
];

test('XP attempt service ignores submitted XP and recalculates from canonical answers', () => {
  const result = adjudicateXpAttempt(buildSubmission({
    submittedXp: 999999,
    clientAccuracyPercent: 100,
    questionAttempts: [
      attemptFor(canonicalQuestions[0], 2),
      attemptFor(canonicalQuestions[1], 3),
      attemptFor(canonicalQuestions[2], 1)
    ]
  }), {
    actor: { learnerId: 'learner-a' },
    canonicalQuestions,
    now: () => new Date('2030-04-29T12:00:08.000Z')
  });

  assert.equal(result.status, 'awarded');
  assert.equal(result.award.awardedXp, 40);
  assert.equal(result.award.correctCount, 2);
  assert.equal(result.award.serverAuthoritative, true);
  assert.equal(result.award.provisional, false);
  assert.equal(JSON.stringify(result).includes('999999'), false);
  assert.equal(JSON.stringify(result).includes('learner-a'), false);
  assert.equal(JSON.stringify(result).includes('"correct":'), false);
});

test('XP attempt service returns the original decision for duplicate idempotency keys', () => {
  const store = createMemoryXpAwardStore();
  const first = adjudicateXpAttempt(buildSubmission({
    idempotencyKey: 'attempt-duplicate',
    questionAttempts: [attemptFor(canonicalQuestions[0], 2)]
  }), {
    actor: { learnerId: 'learner-a' },
    canonicalQuestions,
    store,
    now: () => new Date('2030-04-29T12:00:08.000Z')
  });
  const second = adjudicateXpAttempt(buildSubmission({
    idempotencyKey: 'attempt-duplicate',
    submittedXp: 999999,
    questionAttempts: [attemptFor(canonicalQuestions[0], 0)]
  }), {
    actor: { learnerId: 'learner-a' },
    canonicalQuestions,
    store,
    now: () => new Date('2030-04-29T12:00:12.000Z')
  });

  assert.equal(first.status, 'awarded');
  assert.equal(second.status, 'duplicate');
  assert.deepEqual(second.originalDecision.award, first.award);
});

test('XP attempt service rejects stale, unauthorized, replayed, over-stretch, and impossible-cadence attempts', () => {
  const stale = adjudicateXpAttempt(buildSubmission({
    questionAttempts: [attemptFor(Object.assign({}, canonicalQuestions[0], { contentHash: 'sha256:stale' }), 2)]
  }), { actor: { learnerId: 'learner-a' }, canonicalQuestions });
  const unauthorized = adjudicateXpAttempt(buildSubmission({
    learnerId: 'learner-b',
    questionAttempts: [attemptFor(canonicalQuestions[0], 2)]
  }), { actor: { learnerId: 'learner-a' }, canonicalQuestions });
  const replayed = adjudicateXpAttempt(buildSubmission({
    questionAttempts: [attemptFor(canonicalQuestions[0], 2), attemptFor(canonicalQuestions[0], 2)]
  }), { actor: { learnerId: 'learner-a' }, canonicalQuestions });
  const stretch = adjudicateXpAttempt(buildSubmission({
    assignedGrade: 2,
    quizGrade: 5,
    questionAttempts: [attemptFor(canonicalQuestions[0], 2)]
  }), { actor: { learnerId: 'learner-a' }, canonicalQuestions });
  const cadence = adjudicateXpAttempt(buildSubmission({
    startedAt: '2030-04-29T12:00:00.000Z',
    submittedAt: '2030-04-29T12:00:01.000Z',
    questionAttempts: [
      attemptFor(canonicalQuestions[0], 2),
      attemptFor(canonicalQuestions[1], 0),
      attemptFor(canonicalQuestions[2], 1)
    ]
  }), { actor: { learnerId: 'learner-a' }, canonicalQuestions });

  assert.equal(stale.status, 'rejected');
  assert.equal(stale.reason, 'stale_content');
  assert.equal(unauthorized.reason, 'unauthorized_learner');
  assert.equal(replayed.reason, 'replayed_question_ref');
  assert.equal(stretch.reason, 'over_stretch_rejected');
  assert.equal(cadence.reason, 'cadence_rejected');
});

test('XP attempt service adjudicates mission rewards server-side and suppresses duplicates', () => {
  const store = createMemoryXpAwardStore();
  const first = adjudicateMissionReward(buildMissionRewardSubmission(), {
    actor: { learnerId: 'learner-a' },
    store,
    now: () => new Date('2030-05-01T12:00:00.000Z')
  });
  const second = adjudicateMissionReward(buildMissionRewardSubmission({
    idempotencyKey: 'mission-award-1',
    missionProgress: buildMissionProgress({
      completedStepIds: ['lesson-sentence-types']
    })
  }), {
    actor: { learnerId: 'learner-a' },
    store,
    now: () => new Date('2030-05-01T12:01:00.000Z')
  });

  assert.equal(first.status, 'awarded');
  assert.equal(first.award.awardedXp, 35);
  assert.equal(first.award.serverAuthoritative, true);
  assert.equal(first.award.leaderboardEligible, false);
  assert.equal(JSON.stringify(first).includes('Raw prompt'), false);
  assert.equal(JSON.stringify(first).includes('learner-a'), false);
  assert.equal(second.status, 'duplicate');
  assert.deepEqual(second.originalDecision.award, first.award);
});

test('XP attempt service rejects invalid mission reward submissions without awarding XP', () => {
  const clientTotal = adjudicateMissionReward(buildMissionRewardSubmission({
    idempotencyKey: 'mission-award-client-total',
    clientAwardedXp: 999999
  }), {
    actor: { learnerId: 'learner-a' }
  });
  const incomplete = adjudicateMissionReward(buildMissionRewardSubmission({
    idempotencyKey: 'mission-award-incomplete',
    missionProgress: buildMissionProgress({
      completedStepIds: ['lesson-sentence-types']
    })
  }), {
    actor: { learnerId: 'learner-a' }
  });

  assert.equal(clientTotal.status, 'rejected');
  assert.equal(clientTotal.reason, 'client_mission_bonus_not_accepted');
  assert.equal(incomplete.status, 'rejected');
  assert.equal(incomplete.reason, 'mission_required_steps_incomplete');
});

function buildSubmission(overrides = {}) {
  return Object.assign({
    learnerId: 'learner-a',
    idempotencyKey: 'attempt-1',
    assignedGrade: 4,
    quizGrade: 4,
    startedAt: '2030-04-29T12:00:00.000Z',
    submittedAt: '2030-04-29T12:00:08.000Z',
    quizContext: { setId: 'grammar-sentence-types', mode: 'practice' },
    questionAttempts: [attemptFor(canonicalQuestions[0], 2)]
  }, overrides);
}

function attemptFor(question, selectedAnswer) {
  return {
    questionRef: {
      id: question.id,
      sourceSet: question.sourceSet,
      version: question.version,
      contentHash: question.contentHash
    },
    selectedAnswer
  };
}

function buildMissionRewardSubmission(overrides = {}) {
  return Object.assign({
    learnerId: 'learner-a',
    idempotencyKey: 'mission-award-1',
    mission: {
      missionId: 'mission-sentence-detectives',
      sourceHash: 'sha256:mission-catalog',
      completionPolicy: {
        type: 'all_required_steps',
        requiredStepIds: ['lesson-sentence-types', 'practice-sentence-types']
      },
      xpPolicyRef: {
        policyId: 'xp-guided-mission-v1',
        awardMode: 'verified_attempts_only',
        completionBonusXp: 35
      }
    },
    missionProgress: buildMissionProgress()
  }, overrides);
}

function buildMissionProgress(overrides = {}) {
  return Object.assign({
    missionId: 'mission-sentence-detectives',
    catalogHash: 'sha256:mission-catalog',
    completedStepIds: ['lesson-sentence-types', 'practice-sentence-types'],
    stepEvidence: [
      { stepId: 'lesson-sentence-types', type: 'lesson_progress', ref: { lessonId: 'lesson-sentence-types' } },
      { stepId: 'practice-sentence-types', type: 'saved_session', ref: { sessionId: 'session-1', question: 'Raw prompt' } }
    ]
  }, overrides);
}
