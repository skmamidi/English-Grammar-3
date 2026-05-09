const assert = require('node:assert/strict');
const test = require('node:test');

const rewards = require('../assets/mission-reward-policy');

test('mission reward policy awards completion bonuses from verified mission evidence only', () => {
  const decision = rewards.evaluateMissionRewardEligibility({
    learnerId: 'learner-a',
    idempotencyKey: 'mission-award-1',
    mission: buildMission(),
    missionProgress: buildProgress(),
    priorAwardEvents: [],
    now: '2030-05-01T10:00:00.000Z'
  });
  const event = rewards.createMissionRewardAwardEvent(decision, {
    now: '2030-05-01T10:00:05.000Z'
  });

  assert.equal(decision.status, 'eligible');
  assert.equal(decision.awardedXp, 35);
  assert.equal(decision.serverAuthoritative, false);
  assert.equal(decision.leaderboardEligible, false);
  assert.deepEqual(decision.reasonCodes, []);
  assert.equal(event.status, 'awarded');
  assert.equal(event.awardType, 'mission_completion_bonus');
  assert.equal(event.awardedXp, 35);
  assert.equal(event.serverAuthoritative, true);
  assert.equal(event.leaderboardEligible, false);
  assert.equal(event.missionRef.missionId, 'mission-sentence-detectives');
  assert.equal(JSON.stringify(event).includes('learner-a'), false);
  assert.equal(JSON.stringify(event).includes('Raw prompt'), false);
  assert.equal(JSON.stringify(event).includes('answerKey'), false);
});

test('mission reward policy blocks missing prerequisites and incomplete required steps', () => {
  const missingPrerequisite = rewards.evaluateMissionRewardEligibility({
    learnerId: 'learner-a',
    mission: buildMission({
      prerequisites: [{ type: 'lesson_completed', setId: 'grammar-basics' }]
    }),
    missionProgress: buildProgress({ prerequisiteEvidence: [] })
  });
  const incomplete = rewards.evaluateMissionRewardEligibility({
    learnerId: 'learner-a',
    mission: buildMission(),
    missionProgress: buildProgress({ completedStepIds: ['lesson-sentence-types'] })
  });

  assert.equal(missingPrerequisite.status, 'ineligible');
  assert.deepEqual(missingPrerequisite.reasonCodes, ['prerequisite_incomplete']);
  assert.equal(incomplete.status, 'ineligible');
  assert.deepEqual(incomplete.reasonCodes, ['mission_required_steps_incomplete']);
});

test('mission reward policy suppresses repeated completion awards and rejects client totals', () => {
  const duplicate = rewards.evaluateMissionRewardEligibility({
    learnerId: 'learner-a',
    idempotencyKey: 'mission-award-duplicate',
    mission: buildMission(),
    missionProgress: buildProgress(),
    priorAwardEvents: [{
      awardType: 'mission_completion_bonus',
      missionRef: { missionId: 'mission-sentence-detectives' },
      awardEventId: 'award-1',
      awardedXp: 35
    }]
  });

  assert.equal(duplicate.status, 'ineligible');
  assert.equal(duplicate.awardedXp, 0);
  assert.deepEqual(duplicate.reasonCodes, ['duplicate_mission_completion_award']);
  assert.throws(() => rewards.evaluateMissionRewardEligibility({
    learnerId: 'learner-a',
    mission: buildMission(),
    missionProgress: buildProgress(),
    submittedMissionBonusXp: 999999
  }), /mission_reward_client_total_not_accepted/);
});

test('mission reward provisional copy is local-only and metadata-only', () => {
  const provisional = rewards.createProvisionalMissionReward({
    mission: buildMission(),
    missionProgress: buildProgress({
      stepEvidence: [{
        stepId: 'practice-sentence-types',
        type: 'saved_session',
        ref: { sessionId: 'session-1', question: 'Raw prompt', answerKey: 2 }
      }]
    }),
    queuedAt: '2030-05-01T10:00:00.000Z',
    clientAwardedXp: 999999
  });

  assert.equal(provisional.status, 'provisional');
  assert.equal(provisional.awardedXp, 0);
  assert.equal(provisional.provisionalXp, 35);
  assert.equal(provisional.serverAuthoritative, false);
  assert.equal(provisional.leaderboardEligible, false);
  assert.equal(JSON.stringify(provisional).includes('999999'), false);
  assert.equal(JSON.stringify(provisional).includes('Raw prompt'), false);
  assert.equal(JSON.stringify(provisional).includes('answerKey'), false);
});

function buildMission(overrides = {}) {
  return Object.assign({
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
  }, overrides);
}

function buildProgress(overrides = {}) {
  return Object.assign({
    missionId: 'mission-sentence-detectives',
    catalogHash: 'sha256:mission-catalog',
    completedStepIds: ['lesson-sentence-types', 'practice-sentence-types'],
    prerequisiteEvidence: [{ type: 'lesson_completed', setId: 'grammar-basics', refId: 'lesson-progress-1' }],
    stepEvidence: [
      { stepId: 'lesson-sentence-types', type: 'lesson_progress', ref: { lessonId: 'lesson-sentence-types', status: 'completed' } },
      { stepId: 'practice-sentence-types', type: 'saved_session', ref: { sessionId: 'session-1', questionRefCount: 6 } }
    ]
  }, overrides);
}
