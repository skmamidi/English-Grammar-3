(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearnerGoalsDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DEFAULT_GOALS = Object.freeze({
    schemaVersion: 1,
    enabled: true,
    dailyQuestionTarget: 10,
    weeklySessionTarget: 4,
    reviewStreakTargetDays: 3,
    assignmentCompletionTargetPercent: 75,
    activeDays: Object.freeze([1, 2, 3, 4, 5]),
    updatedAt: '',
    updatedBy: ''
  });

  function normalizeLearnerGoals(goals) {
    const input = goals && typeof goals === 'object' ? goals : {};
    return {
      schemaVersion: 1,
      enabled: input.enabled !== false,
      dailyQuestionTarget: clampWhole(input.dailyQuestionTarget, 1, 25, DEFAULT_GOALS.dailyQuestionTarget),
      weeklySessionTarget: clampWhole(input.weeklySessionTarget, 1, 7, DEFAULT_GOALS.weeklySessionTarget),
      reviewStreakTargetDays: clampWhole(input.reviewStreakTargetDays, 1, 30, DEFAULT_GOALS.reviewStreakTargetDays),
      assignmentCompletionTargetPercent: clampWhole(input.assignmentCompletionTargetPercent, 0, 100, DEFAULT_GOALS.assignmentCompletionTargetPercent),
      activeDays: normalizeActiveDays(input.activeDays),
      updatedAt: safeIso(input.updatedAt),
      updatedBy: safeString(input.updatedBy)
    };
  }

  function buildLearnerGoalProgress(input = {}) {
    const goals = normalizeLearnerGoals(input.goals);
    const now = safeDate(input.now) || new Date();
    const sessions = normalizeSessions(input.sessions);
    const assignments = normalizeAssignments(input.assignments);
    const reviewQueue = normalizeReviewQueue(input.reviewQueue);
    const reviewSchedules = normalizeReviewSchedules(input.reviewSchedules);
    const todayKey = dayKey(now);
    const currentWeekStart = weekStartKey(now);
    const practicedDayKeys = new Set(sessions.filter(session => session.attemptCount > 0).map(session => session.dayKey));
    const dailyQuestionCount = sessions
      .filter(session => session.dayKey === todayKey)
      .reduce((total, session) => total + session.attemptCount, 0);
    const weeklySessionCount = sessions.filter(session => session.weekStartKey === currentWeekStart).length;
    const assignmentStats = countAssignments(assignments);
    const sessionStreakDays = calculateActiveDayStreak(practicedDayKeys, now, goals.activeDays);
    const scheduleStreakDays = reviewSchedules
      .filter(schedule => isRecentReviewSchedule(schedule, now, goals.reviewStreakTargetDays))
      .reduce((max, schedule) => Math.max(max, schedule.streak), 0);
    const currentStreakDays = Math.max(sessionStreakDays, scheduleStreakDays);
    const dueReviewCount = reviewQueue.items.filter(item => isDue(item, now)).length;
    const masteredTodayCount = reviewQueue.items.filter(item => item.status === 'mastered' && dayKey(item.masteredAt) === todayKey).length;
    const missedActiveDayCount = countMissedActiveDays(practicedDayKeys, now, goals.activeDays);

    const dailyQuestions = goalStatus('daily-questions', dailyQuestionCount, goals.dailyQuestionTarget);
    const weeklySessions = goalStatus('weekly-sessions', weeklySessionCount, goals.weeklySessionTarget);
    const review = Object.assign(goalStatus('review-streak', currentStreakDays, goals.reviewStreakTargetDays), {
      dueCount: dueReviewCount,
      masteredTodayCount,
      missedActiveDayCount,
      currentStreakDays
    });
    const assignmentsProgress = {
      id: 'assignment-completion',
      current: Math.round(assignmentStats.completionRate * 100),
      target: goals.assignmentCompletionTargetPercent,
      completionRate: assignmentStats.completionRate,
      completedCount: assignmentStats.completed,
      totalCount: assignmentStats.total,
      met: assignmentStats.total === 0 || Math.round(assignmentStats.completionRate * 100) >= goals.assignmentCompletionTargetPercent
    };
    const goalResults = [dailyQuestions, weeklySessions, review, assignmentsProgress];

    return {
      schemaVersion: 1,
      goals,
      generatedAt: now.toISOString(),
      dailyQuestions,
      weeklySessions,
      review,
      assignments: assignmentsProgress,
      overall: {
        metCount: goalResults.filter(goal => goal.met).length,
        totalCount: goalResults.length,
        allMet: goalResults.every(goal => goal.met)
      }
    };
  }

  function goalStatus(id, current, target) {
    const safeCurrent = Math.max(0, Math.round(Number(current) || 0));
    const safeTarget = Math.max(0, Math.round(Number(target) || 0));
    return {
      id,
      current: safeCurrent,
      target: safeTarget,
      met: safeCurrent >= safeTarget
    };
  }

  function normalizeSessions(sessions) {
    return (Array.isArray(sessions) ? sessions : []).map(session => {
      const completedAt = safeDate(session && (session.completedAt || session.updatedAt || session.createdAt));
      const attempts = Array.isArray(session && session.attempts) ? session.attempts : [];
      return {
        id: safeString(session && session.id),
        completedAt: completedAt ? completedAt.toISOString() : '',
        dayKey: dayKey(completedAt),
        weekStartKey: weekStartKey(completedAt),
        attemptCount: attempts.length
      };
    }).filter(session => session.completedAt);
  }

  function normalizeAssignments(assignments) {
    return (Array.isArray(assignments) ? assignments : []).map(assignment => ({
      id: safeString(assignment && assignment.id),
      status: safeString(assignment && assignment.status || 'active')
    })).filter(assignment => assignment.id);
  }

  function normalizeReviewQueue(queue) {
    return {
      items: (Array.isArray(queue && queue.items) ? queue.items : []).map(item => ({
        questionId: safeString(item && (item.id || item.questionId || item.questionRef && item.questionRef.id)),
        status: safeString(item && item.status || 'queued'),
        dueAt: safeDate(item && item.dueAt),
        masteredAt: safeDate(item && item.masteredAt)
      })).filter(item => item.questionId)
    };
  }

  function normalizeReviewSchedules(schedules) {
    return (Array.isArray(schedules) ? schedules : []).map(schedule => ({
      questionId: safeString(schedule && (schedule.id || schedule.questionId || schedule.ref && schedule.ref.id || schedule.questionRef && schedule.questionRef.id)),
      lastReviewedAt: safeDate(schedule && schedule.lastReviewedAt),
      streak: Math.max(0, Math.round(Number(schedule && schedule.streak) || 0))
    })).filter(schedule => schedule.questionId);
  }

  function countAssignments(assignments) {
    const total = assignments.length;
    const completed = assignments.filter(assignment => assignment.status === 'completed').length;
    const completionRate = total ? Math.round((completed / total) * 100) / 100 : 1;
    return { total, completed, completionRate };
  }

  function calculateActiveDayStreak(dayKeys, now, activeDays) {
    let cursor = startOfDay(now);
    let streak = 0;
    for (let index = 0; index < 370; index += 1) {
      if (!activeDays.includes(cursor.getUTCDay())) {
        cursor = addUtcDays(cursor, -1);
        continue;
      }
      if (!dayKeys.has(dayKey(cursor))) break;
      streak += 1;
      cursor = addUtcDays(cursor, -1);
    }
    return streak;
  }

  function countMissedActiveDays(dayKeys, now, activeDays) {
    const practicedKeys = Array.from(dayKeys).sort();
    const latestPracticeKey = practicedKeys[practicedKeys.length - 1];
    if (!latestPracticeKey) return activeDays.includes(now.getUTCDay()) && !dayKeys.has(dayKey(now)) ? 1 : 0;
    let missed = 0;
    let cursor = addUtcDays(new Date(`${latestPracticeKey}T00:00:00.000Z`), 1);
    const today = startOfDay(now);
    for (let index = 0; cursor <= today && index < 370; index += 1) {
      if (activeDays.includes(cursor.getUTCDay()) && !dayKeys.has(dayKey(cursor))) missed += 1;
      cursor = addUtcDays(cursor, 1);
    }
    return missed;
  }

  function isDue(item, now) {
    if (!['', 'queued', 'due'].includes(item.status)) return false;
    return !item.dueAt || item.dueAt.getTime() <= now.getTime();
  }

  function isRecentReviewSchedule(schedule, now, targetDays) {
    if (!schedule.lastReviewedAt) return false;
    const windowDays = Math.max(1, Number(targetDays) || 1);
    return now.getTime() - schedule.lastReviewedAt.getTime() <= windowDays * 24 * 60 * 60 * 1000;
  }

  function normalizeActiveDays(value) {
    if (!Array.isArray(value)) return DEFAULT_GOALS.activeDays.slice();
    const invalid = value.some(day => !Number.isInteger(Number(day)) || Number(day) < 0 || Number(day) > 6);
    if (invalid) return DEFAULT_GOALS.activeDays.slice();
    const days = Array.from(new Set(value.map(day => Number(day)))).sort((a, b) => a - b);
    return days.length ? days : DEFAULT_GOALS.activeDays.slice();
  }

  function clampWhole(value, min, max, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function weekStartKey(value) {
    const date = safeDate(value);
    if (!date) return '';
    const start = startOfDay(date);
    const day = start.getUTCDay();
    const distanceFromMonday = day === 0 ? 6 : day - 1;
    return dayKey(addUtcDays(start, -distanceFromMonday));
  }

  function dayKey(value) {
    const date = safeDate(value);
    return date ? date.toISOString().slice(0, 10) : '';
  }

  function startOfDay(value) {
    const date = safeDate(value) || new Date(0);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  function addUtcDays(value, days) {
    const date = new Date(value.getTime());
    date.setUTCDate(date.getUTCDate() + days);
    return date;
  }

  function safeIso(value) {
    const date = safeDate(value);
    return date ? date.toISOString() : '';
  }

  function safeDate(value) {
    if (!value) return null;
    if (value instanceof Date && Number.isFinite(value.getTime())) return value;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_GOALS,
    buildLearnerGoalProgress,
    normalizeLearnerGoals
  };
});
