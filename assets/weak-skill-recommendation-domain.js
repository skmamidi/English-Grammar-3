(function (root, factory) {
  'use strict';

  const policyApi = root.GrammarQuestWeakSkillRecommendationPolicy ||
    (typeof require === 'function' ? require('./weak-skill-recommendation-policy') : null);
  const masteryApi = root.GrammarQuestMasteryModelPolicy ||
    (typeof require === 'function' ? require('./mastery-model-policy') : null);
  const resolverApi = root.GrammarQuestRecommendationRouteResolver ||
    (typeof require === 'function' ? require('./recommendation-route-resolver') : null);
  const api = factory(policyApi, masteryApi, resolverApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestWeakSkillRecommendationDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (policyApi, masteryApi, resolverApi) {
  'use strict';

  const DEFAULT_POLICY = policyApi.DEFAULT_WEAK_SKILL_POLICY;
  const REASON_LABELS = Object.freeze({
    low_recent_accuracy: 'Recent accuracy is below target.',
    missed_recently: 'Recent missed questions point to this skill.',
    overdue_review: 'Review items for this skill are due.',
    assignment_struggle: 'An active assignment shows struggle on this skill.',
    low_attempt_count: 'This skill needs more practice evidence.'
  });

  function generateWeakSkillRecommendations(input = {}) {
    const policy = masteryApi.normalizeMasteryModelPolicy(Object.assign({}, DEFAULT_POLICY, input.policy || {}));
    const generatedAt = safeIso(input.now) || new Date().toISOString();
    const evidence = collectEvidence(input, generatedAt);
    const context = {
      assignments: input.assignmentSummaries || input.assignments || [],
      reviewQueue: input.reviewQueue || { queueId: input.reviewQueueId || 'review' },
      manifest: input.manifest || {}
    };
    const recommendations = Object.keys(evidence)
      .map(skillId => buildRecommendation(evidence[skillId], input.taxonomy || {}, policy, context))
      .filter(Boolean)
      .sort((a, b) => b.priority - a.priority || a.skillId.localeCompare(b.skillId))
      .slice(0, policy.maxRecommendations);
    return { generatedAt, recommendations };
  }

  function collectEvidence(input, nowIso) {
    const bySkill = {};
    normalizeSessions(input.recentSessions).forEach(session => {
      session.attempts.forEach(attempt => {
        const skillIds = attempt.skillIds.length ? attempt.skillIds : ['practice.mixed'];
        skillIds.forEach(skillId => {
          const item = ensureEvidence(bySkill, skillId);
          item.attempts += 1;
          if (attempt.correct) item.correct += 1;
          else if (attempt.questionId) item.missedQuestionRefs.add(attempt.questionId);
          const score = masteryApi.scoreAttempt(attempt, input.policy || DEFAULT_POLICY);
          item.weightedScores.push(score);
          item.difficultyExposure[score.difficulty] += 1;
          if (attempt.gradeLevel > 0 && !item.gradeLevels.includes(attempt.gradeLevel)) item.gradeLevels.push(attempt.gradeLevel);
          const attemptedAt = safeIso(attempt.attemptedAt || session.completedAt);
          if (attemptedAt && isRecent(attemptedAt, nowIso, input.policy || DEFAULT_POLICY)) {
            item.recentAttempts += 1;
            if (attempt.correct) item.recentCorrect += 1;
          }
        });
      });
    });
    normalizeSchedules(input.reviewSchedule || input.reviewSchedules).forEach(schedule => {
      if (!isDue(schedule.dueAt, nowIso)) return;
      schedule.skillIds.forEach(skillId => {
        const item = ensureEvidence(bySkill, skillId);
        item.overdueReviewCount += 1;
        if (schedule.ref.id) item.missedQuestionRefs.add(schedule.ref.id);
      });
    });
    normalizeAssignments(input.assignmentSummaries || input.assignments).forEach(assignment => {
      assignment.skillIds.forEach(skillId => {
        const item = ensureEvidence(bySkill, skillId);
        if (assignment.struggling || (assignment.accuracy > 0 && assignment.accuracy < 0.7)) {
          item.assignmentStruggleCount += 1;
        }
      });
    });
    return bySkill;
  }

  function buildRecommendation(evidence, taxonomy, policy, context) {
    const recentAccuracy = evidence.attempts ? round(evidence.correct / evidence.attempts) : 0;
    const weightedAccuracy = masteryApi.calculateWeightedAccuracy(evidence.weightedScores);
    const recoveryAccuracy = evidence.recentAttempts ? round(evidence.recentCorrect / evidence.recentAttempts) : recentAccuracy;
    const reasonCode = chooseReason(evidence, recentAccuracy, weightedAccuracy, recoveryAccuracy, policy);
    if (!reasonCode) return null;
    const skill = taxonomy.skills && taxonomy.skills[evidence.skillId] || {};
    const recommendation = {
      id: `weak-skill-${evidence.skillId}`,
      skillId: evidence.skillId,
      standardIds: normalizeStringArray(skill.standardIds || skill.standards),
      priority: scoreReason(reasonCode, policy) + evidence.missedQuestionRefs.size + evidence.overdueReviewCount,
      reasonCode,
      reasonLabel: REASON_LABELS[reasonCode],
      evidence: {
        recentAccuracy,
        weightedAccuracy,
        attempts: evidence.attempts,
        missedQuestionRefCount: evidence.missedQuestionRefs.size,
        overdueReviewCount: evidence.overdueReviewCount,
        difficultyExposure: evidence.difficultyExposure,
        gradeLevels: evidence.gradeLevels.slice().sort((a, b) => a - b)
      },
      target: { type: 'dashboard', domainId: '', setIds: [], assignmentId: '', reviewQueueId: '' }
    };
    recommendation.target = resolverApi.resolveRecommendationTarget(recommendation, context);
    return recommendation;
  }

  function chooseReason(evidence, accuracy, weightedAccuracy, recoveryAccuracy, policy) {
    if (evidence.overdueReviewCount > 0) return 'overdue_review';
    if (evidence.assignmentStruggleCount > 0) return 'assignment_struggle';
    if (evidence.recentAttempts >= policy.minimumAttempts && recoveryAccuracy >= policy.recoveryAccuracyThreshold) return '';
    if (evidence.attempts >= policy.minimumAttempts && weightedAccuracy < policy.lowAccuracyThreshold) return 'low_recent_accuracy';
    if (evidence.attempts >= policy.minimumAttempts && evidence.missedQuestionRefs.size > 0) return 'missed_recently';
    return '';
  }

  function ensureEvidence(bySkill, skillId) {
    if (!bySkill[skillId]) {
      bySkill[skillId] = {
        skillId,
        attempts: 0,
        correct: 0,
        weightedScores: [],
        recentAttempts: 0,
        recentCorrect: 0,
        missedQuestionRefs: new Set(),
        difficultyExposure: { easy: 0, medium: 0, hard: 0 },
        gradeLevels: [],
        overdueReviewCount: 0,
        assignmentStruggleCount: 0
      };
    }
    return bySkill[skillId];
  }

  function scoreReason(reasonCode, policy) {
    const index = policy.reasonPriority.indexOf(reasonCode);
    return index < 0 ? 0 : (policy.reasonPriority.length - index) * 100;
  }

  function normalizeSessions(sessions) {
    return (Array.isArray(sessions) ? sessions : []).map(session => ({
      completedAt: safeString(session && session.completedAt),
      attempts: (Array.isArray(session && session.attempts) ? session.attempts : []).map(attempt => ({
        questionId: safeString(attempt && (attempt.questionId || attempt.id)),
        correct: attempt && attempt.correct === true,
        skillIds: normalizeStringArray(attempt && attempt.skillIds),
        difficulty: masteryApi.normalizeDifficulty(attempt && attempt.difficulty),
        gradeLevel: Math.max(0, Math.round(Number(attempt && (attempt.gradeLevel || attempt.grade)) || 0)),
        attemptedAt: safeString(attempt && attempt.attemptedAt)
      }))
    }));
  }

  function normalizeSchedules(schedules) {
    return (Array.isArray(schedules) ? schedules : []).map(schedule => {
      const ref = schedule && (schedule.ref || schedule.questionRef) || {};
      return {
        ref: { id: safeString(ref.id || ref.questionId) },
        skillIds: normalizeStringArray(schedule && schedule.skillIds),
        dueAt: safeString(schedule && schedule.dueAt)
      };
    });
  }

  function normalizeAssignments(assignments) {
    return (Array.isArray(assignments) ? assignments : []).map(assignment => {
      const scope = assignment && assignment.scope || {};
      return {
        skillIds: normalizeStringArray(scope.skillIds || assignment && assignment.skillIds),
        accuracy: Number(assignment && assignment.accuracy) || 0,
        struggling: assignment && assignment.struggling === true
      };
    });
  }

  function isDue(dueAt, nowIso) {
    const due = new Date(dueAt || '').getTime();
    const now = new Date(nowIso || '').getTime();
    return Number.isFinite(due) && Number.isFinite(now) && due <= now;
  }

  function isRecent(value, nowIso, policyInput) {
    const policy = masteryApi.normalizeMasteryModelPolicy(policyInput);
    const time = new Date(value || '').getTime();
    const now = new Date(nowIso || '').getTime();
    return Number.isFinite(time) && Number.isFinite(now) &&
      now - time <= policy.recoveryWindowDays * 24 * 60 * 60 * 1000;
  }

  function safeIso(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return { generateWeakSkillRecommendations };
});
