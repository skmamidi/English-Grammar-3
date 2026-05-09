(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestMissionRewardPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const MISSION_REWARD_SCHEMA_VERSION = 1;
  const DEFAULT_COMPLETION_BONUS_XP = 25;
  const MAX_COMPLETION_BONUS_XP = 100;
  const CLIENT_TOTAL_FIELDS = new Set([
    'awardedXp',
    'clientAwardedXp',
    'clientMissionBonusXp',
    'leaderboardXp',
    'missionBonusXp',
    'provisionalXp',
    'submittedMissionBonusXp',
    'totalXp'
  ]);
  const PAYLOAD_KEYS = new Set([
    'answer',
    'answerKey',
    'answers',
    'choices',
    'commonMistakes',
    'correct',
    'correctAnswer',
    'email',
    'examples',
    'explanation',
    'explanations',
    'guidedChecks',
    'learnerDisplayName',
    'learnerName',
    'prompt',
    'providerPayload',
    'question',
    'questionSnapshots',
    'rawProviderPayload',
    'storyBeats'
  ]);
  const VERIFIED_EVIDENCE_TYPES = new Set([
    'active_quiz',
    'assignment_completion',
    'lesson_progress',
    'review_item',
    'saved_session'
  ]);

  function evaluateMissionRewardEligibility(input = {}) {
    rejectClientAwardTotals(input);
    const mission = normalizeMission(input.mission);
    const progress = normalizeMissionProgress(input.missionProgress);
    const priorAwardEvents = normalizePriorAwardEvents(input.priorAwardEvents);
    const reasonCodes = [];

    if (!mission.missionId || !progress.missionId || mission.missionId !== progress.missionId) {
      reasonCodes.push('mission_ref_mismatch');
    }
    if (mission.awardMode !== 'verified_attempts_only') {
      reasonCodes.push('mission_xp_policy_unsupported');
    }
    if (mission.sourceHash && progress.catalogHash && mission.sourceHash !== progress.catalogHash) {
      reasonCodes.push('stale_mission_catalog');
    }
    if (!hasCompletedRequiredSteps(mission.requiredStepIds, progress.completedStepIds)) {
      reasonCodes.push('mission_required_steps_incomplete');
    }
    if (!hasVerifiedEvidenceForRequiredSteps(mission.requiredStepIds, progress.stepEvidence)) {
      reasonCodes.push('mission_evidence_incomplete');
    }
    if (!hasPrerequisiteEvidence(mission.prerequisites, progress.prerequisiteEvidence)) {
      reasonCodes.push('prerequisite_incomplete');
    }
    if (hasPriorMissionAward(mission.missionId, priorAwardEvents)) {
      reasonCodes.push('duplicate_mission_completion_award');
    }

    const uniqueReasons = Array.from(new Set(reasonCodes));
    const eligible = uniqueReasons.length === 0;
    return {
      schemaVersion: MISSION_REWARD_SCHEMA_VERSION,
      status: eligible ? 'eligible' : 'ineligible',
      awardType: 'mission_completion_bonus',
      missionRef: {
        missionId: mission.missionId,
        sourceHash: mission.sourceHash,
        policyId: mission.policyId
      },
      evidenceRef: {
        catalogHash: progress.catalogHash,
        completedStepIds: mission.requiredStepIds.filter(stepId => progress.completedStepIds.includes(stepId)),
        evidenceTypes: Array.from(new Set(progress.stepEvidence.map(evidence => evidence.type))).sort()
      },
      awardedXp: eligible ? mission.completionBonusXp : 0,
      provisional: false,
      serverAuthoritative: false,
      leaderboardEligible: false,
      reasonCodes: uniqueReasons
    };
  }

  function createMissionRewardAwardEvent(decision = {}, input = {}) {
    if (decision.status !== 'eligible') throw new Error('mission_reward_not_eligible');
    const awardedXp = normalizeRewardXp(decision.awardedXp, 'mission_reward_xp_invalid');
    const awardedAt = safeIso(input.now || input.awardedAt) || currentIso();
    const missionRef = normalizeMissionRef(decision.missionRef);
    return {
      schemaVersion: MISSION_REWARD_SCHEMA_VERSION,
      status: 'awarded',
      awardType: 'mission_completion_bonus',
      awardEventId: safeString(input.awardEventId) || buildStableId('mission-award', {
        missionRef,
        awardedAt,
        awardedXp
      }),
      idempotencyKey: safeString(input.idempotencyKey || decision.idempotencyKey),
      missionRef,
      evidenceRef: sanitizeFlatRef(decision.evidenceRef),
      awardedXp,
      serverAuthoritative: true,
      provisional: false,
      leaderboardEligible: false,
      awardedAt
    };
  }

  function createProvisionalMissionReward(input = {}) {
    const mission = normalizeMission(input.mission || input);
    const progress = normalizeMissionProgress(input.missionProgress || input);
    const queuedAt = safeIso(input.queuedAt || input.createdAt) || currentIso();
    return {
      schemaVersion: MISSION_REWARD_SCHEMA_VERSION,
      status: 'provisional',
      awardType: 'mission_completion_bonus',
      missionRef: {
        missionId: mission.missionId || progress.missionId,
        sourceHash: mission.sourceHash || progress.catalogHash,
        policyId: mission.policyId
      },
      evidenceRef: {
        catalogHash: progress.catalogHash,
        completedStepIds: normalizeStringArray(progress.completedStepIds),
        evidenceTypes: Array.from(new Set(progress.stepEvidence.map(evidence => evidence.type))).sort()
      },
      awardedXp: 0,
      provisionalXp: mission.completionBonusXp,
      serverAuthoritative: false,
      leaderboardEligible: false,
      syncState: 'provisional',
      queuedAt
    };
  }

  function normalizeMission(input) {
    const mission = stripPayloadKeys(input && typeof input === 'object' ? input : {});
    const policy = mission.xpPolicyRef && typeof mission.xpPolicyRef === 'object' ? mission.xpPolicyRef : {};
    const completionPolicy = mission.completionPolicy && typeof mission.completionPolicy === 'object' ? mission.completionPolicy : {};
    return {
      missionId: safeString(mission.missionId || mission.id),
      sourceHash: safeString(mission.sourceHash || mission.catalogHash),
      policyId: safeString(policy.policyId),
      awardMode: safeString(policy.awardMode || 'verified_attempts_only'),
      completionBonusXp: normalizeRewardXp(policy.completionBonusXp || policy.bonusXp || DEFAULT_COMPLETION_BONUS_XP, 'mission_reward_xp_invalid'),
      requiredStepIds: normalizeStringArray(completionPolicy.requiredStepIds || mission.requiredStepIds),
      prerequisites: normalizePrerequisites(mission.prerequisites)
    };
  }

  function normalizeMissionProgress(input) {
    const progress = stripPayloadKeys(input && typeof input === 'object' ? input : {});
    return {
      missionId: safeString(progress.missionId || progress.id),
      catalogHash: safeString(progress.catalogHash || progress.sourceHash),
      completedStepIds: normalizeStringArray(progress.completedStepIds),
      stepEvidence: normalizeStepEvidence(progress.stepEvidence),
      prerequisiteEvidence: normalizePrerequisiteEvidence(progress.prerequisiteEvidence || progress.prerequisites)
    };
  }

  function normalizeMissionRef(ref) {
    const input = stripPayloadKeys(ref && typeof ref === 'object' ? ref : {});
    return {
      missionId: safeString(input.missionId || input.id),
      sourceHash: safeString(input.sourceHash || input.catalogHash),
      policyId: safeString(input.policyId)
    };
  }

  function normalizeStepEvidence(records) {
    return (Array.isArray(records) ? records : []).map(record => {
      const input = stripPayloadKeys(record && typeof record === 'object' ? record : {});
      return {
        stepId: safeString(input.stepId),
        type: safeString(input.type),
        ref: sanitizeFlatRef(input.ref)
      };
    }).filter(record => record.stepId && record.type);
  }

  function normalizePrerequisites(records) {
    return (Array.isArray(records) ? records : []).map(record => {
      const input = stripPayloadKeys(record && typeof record === 'object' ? record : {});
      return {
        type: safeString(input.type),
        setId: safeString(input.setId),
        lessonId: safeString(input.lessonId),
        skillId: safeString(input.skillId),
        optional: input.optional === true
      };
    }).filter(record => record.type && !record.optional);
  }

  function normalizePrerequisiteEvidence(records) {
    return (Array.isArray(records) ? records : []).map(record => {
      const input = stripPayloadKeys(record && typeof record === 'object' ? record : {});
      return {
        type: safeString(input.type),
        setId: safeString(input.setId),
        lessonId: safeString(input.lessonId),
        skillId: safeString(input.skillId),
        refId: safeString(input.refId || input.id)
      };
    }).filter(record => record.type);
  }

  function normalizePriorAwardEvents(records) {
    return (Array.isArray(records) ? records : []).map(record => stripPayloadKeys(record && typeof record === 'object' ? record : {}));
  }

  function hasCompletedRequiredSteps(requiredStepIds, completedStepIds) {
    if (!requiredStepIds.length) return false;
    const completed = new Set(completedStepIds);
    return requiredStepIds.every(stepId => completed.has(stepId));
  }

  function hasVerifiedEvidenceForRequiredSteps(requiredStepIds, stepEvidence) {
    if (!requiredStepIds.length) return false;
    const verifiedByStep = new Set(stepEvidence
      .filter(evidence => VERIFIED_EVIDENCE_TYPES.has(evidence.type))
      .map(evidence => evidence.stepId));
    return requiredStepIds.every(stepId => verifiedByStep.has(stepId));
  }

  function hasPrerequisiteEvidence(prerequisites, evidenceRecords) {
    return prerequisites.every(prerequisite => evidenceRecords.some(evidence => {
      if (evidence.type !== prerequisite.type) return false;
      if (prerequisite.setId && evidence.setId !== prerequisite.setId) return false;
      if (prerequisite.lessonId && evidence.lessonId !== prerequisite.lessonId) return false;
      if (prerequisite.skillId && evidence.skillId !== prerequisite.skillId) return false;
      return true;
    }));
  }

  function hasPriorMissionAward(missionId, priorAwardEvents) {
    const targetMissionId = safeString(missionId);
    return priorAwardEvents.some(event => {
      const missionRef = event.missionRef && typeof event.missionRef === 'object' ? event.missionRef : {};
      const eventMissionId = safeString(event.missionId || missionRef.missionId);
      const awardType = safeString(event.awardType || (event.award && event.award.awardType));
      return eventMissionId === targetMissionId && awardType === 'mission_completion_bonus';
    });
  }

  function rejectClientAwardTotals(input) {
    const source = input && typeof input === 'object' ? input : {};
    const hasClientTotal = Object.keys(source).some(key => CLIENT_TOTAL_FIELDS.has(key));
    if (hasClientTotal) throw new Error('mission_reward_client_total_not_accepted');
  }

  function stripPayloadKeys(value) {
    if (Array.isArray(value)) return value.map(stripPayloadKeys);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((result, key) => {
      if (PAYLOAD_KEYS.has(key) || CLIENT_TOTAL_FIELDS.has(key)) return result;
      result[key] = stripPayloadKeys(value[key]);
      return result;
    }, {});
  }

  function sanitizeFlatRef(ref) {
    const input = stripPayloadKeys(ref && typeof ref === 'object' ? ref : {});
    return Object.keys(input).sort().reduce((result, key) => {
      const value = input[key];
      if (Array.isArray(value)) {
        result[key] = normalizeStringArray(value);
      } else if (!value || typeof value !== 'object') {
        result[key] = value;
      }
      return result;
    }, {});
  }

  function normalizeRewardXp(value, errorCode) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0 || number > MAX_COMPLETION_BONUS_XP) throw new Error(errorCode);
    return number;
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function buildStableId(prefix, value) {
    return `${prefix}:${simpleHash(stableStringify(value))}`;
  }

  function simpleHash(text) {
    let hash = 5381;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (!value || typeof value !== 'object') return JSON.stringify(value);
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function safeIso(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function currentIso() {
    return new Date().toISOString();
  }

  return {
    DEFAULT_COMPLETION_BONUS_XP,
    MAX_COMPLETION_BONUS_XP,
    MISSION_REWARD_SCHEMA_VERSION,
    createMissionRewardAwardEvent,
    createProvisionalMissionReward,
    evaluateMissionRewardEligibility,
    normalizeMission,
    normalizeMissionProgress,
    normalizeMissionRef
  };
});
