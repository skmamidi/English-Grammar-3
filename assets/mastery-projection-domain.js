(function (root, factory) {
  'use strict';

  const policyApi = root.GrammarQuestMasteryModelPolicy ||
    (typeof require === 'function' ? require('./mastery-model-policy') : null);
  const api = factory(policyApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestMasteryProjectionDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (policyApi) {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;

  function projectMasteryBySkill(input = {}) {
    const policy = policyApi.normalizeMasteryModelPolicy(input.policy);
    const now = toTime(input.now) || Date.now();
    const bySkill = {};
    normalizeSessions(input.sessions || input.recentSessions).forEach(session => {
      session.attempts.forEach(attempt => {
        const skillIds = attempt.skillIds.length ? attempt.skillIds : ['practice.mixed'];
        skillIds.forEach(skillId => recordAttempt(ensureSkill(bySkill, skillId), attempt, session.completedAt, now, policy));
      });
    });
    normalizeSchedules(input.reviewSchedules || input.reviewSchedule).forEach(schedule => {
      if (!isDue(schedule.dueAt, now)) return;
      schedule.skillIds.forEach(skillId => {
        ensureSkill(bySkill, skillId).overdueReviewCount += 1;
      });
    });
    normalizeAssignments(input.assignments || input.assignmentSummaries).forEach(assignment => {
      assignment.skillIds.forEach(skillId => {
        if (assignment.struggling || (assignment.accuracy > 0 && assignment.accuracy < policy.lowAccuracyThreshold)) {
          ensureSkill(bySkill, skillId).assignmentStruggleCount += 1;
        }
      });
    });
    return Object.keys(bySkill).sort().map(skillId => finalizeSkill(bySkill[skillId], policy));
  }

  function recordAttempt(skill, attempt, completedAt, now, policy) {
    const score = policyApi.scoreAttempt(attempt, policy);
    skill.attempts += 1;
    if (attempt.correct) skill.correct += 1;
    skill.weightedScores.push(score);
    skill.difficultyExposure[score.difficulty] += 1;
    if (attempt.gradeLevel > 0 && !skill.gradeLevels.includes(attempt.gradeLevel)) skill.gradeLevels.push(attempt.gradeLevel);
    if (!attempt.correct && attempt.questionId) skill.missedQuestionRefs.add(attempt.questionId);
    const completedTime = toTime(attempt.attemptedAt) || toTime(completedAt);
    if (completedTime) {
      if (!skill.lastPracticedTime || completedTime > skill.lastPracticedTime) skill.lastPracticedTime = completedTime;
      if (now - completedTime <= policy.recoveryWindowDays * DAY_MS) {
        skill.recentAttempts += 1;
        if (attempt.correct) skill.recentCorrect += 1;
      }
    }
  }

  function finalizeSkill(skill, policy) {
    const weightedAccuracy = policyApi.calculateWeightedAccuracy(skill.weightedScores);
    const recentAccuracy = skill.recentAttempts ? round(skill.recentCorrect / skill.recentAttempts) : round(skill.correct / Math.max(1, skill.attempts));
    const masteryBand = skill.recentAttempts >= policy.minimumAttempts && recentAccuracy >= policy.recoveryAccuracyThreshold
      ? 'secure'
      : policyApi.classifyMasteryBand({ attempts: skill.attempts, weightedAccuracy }, policy);
    return {
      skillId: skill.skillId,
      attempts: skill.attempts,
      recentAccuracy,
      weightedAccuracy,
      lastPracticedAt: skill.lastPracticedTime ? new Date(skill.lastPracticedTime).toISOString() : '',
      evidenceLevel: policyApi.classifyEvidenceLevel({ attempts: skill.attempts }, policy),
      masteryBand,
      gradeLevels: skill.gradeLevels.sort((a, b) => a - b),
      difficultyExposure: skill.difficultyExposure,
      overdueReviewCount: skill.overdueReviewCount,
      assignmentStruggleCount: skill.assignmentStruggleCount
    };
  }

  function ensureSkill(bySkill, skillId) {
    if (!bySkill[skillId]) {
      bySkill[skillId] = {
        skillId,
        attempts: 0,
        correct: 0,
        recentAttempts: 0,
        recentCorrect: 0,
        weightedScores: [],
        missedQuestionRefs: new Set(),
        difficultyExposure: { easy: 0, medium: 0, hard: 0 },
        gradeLevels: [],
        lastPracticedTime: 0,
        overdueReviewCount: 0,
        assignmentStruggleCount: 0
      };
    }
    return bySkill[skillId];
  }

  function normalizeSessions(sessions) {
    return (Array.isArray(sessions) ? sessions : []).map(session => ({
      completedAt: safeString(session && session.completedAt),
      attempts: (Array.isArray(session && session.attempts) ? session.attempts : []).map(attempt => ({
        questionId: safeString(attempt && (attempt.questionId || attempt.id)),
        correct: attempt && attempt.correct === true,
        skillIds: normalizeStringArray(attempt && attempt.skillIds),
        difficulty: policyApi.normalizeDifficulty(attempt && attempt.difficulty),
        gradeLevel: positiveInt(attempt && (attempt.gradeLevel || attempt.grade), 0),
        attemptedAt: safeString(attempt && attempt.attemptedAt)
      }))
    }));
  }

  function normalizeSchedules(schedules) {
    return (Array.isArray(schedules) ? schedules : []).map(schedule => ({
      skillIds: normalizeStringArray(schedule && schedule.skillIds),
      dueAt: safeString(schedule && schedule.dueAt)
    }));
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

  function isDue(dueAt, now) {
    const due = toTime(dueAt);
    return due > 0 && due <= now;
  }

  function toTime(value) {
    const time = new Date(value || '').getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function positiveInt(value, fallback) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    projectMasteryBySkill
  };
});
