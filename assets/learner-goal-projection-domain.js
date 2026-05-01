(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearnerGoalProjectionDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const goalsDomain = root.GrammarQuestLearnerGoalsDomain ||
    (typeof require === 'function' ? require('./learner-goals-domain') : null);

  const EMPTY_COUNTS = Object.freeze({
    empty: 0,
    on_track: 0,
    near_target: 0,
    behind_target: 0,
    review_due: 0
  });

  function buildLearnerGoalProjection(input = {}) {
    const now = safeDate(input.now) || new Date();
    const progress = buildGoalProgress(input, now);
    const assignments = normalizeAssignments(input.assignments);
    const activeAssignmentCount = assignments.filter(item => ['active', 'in_progress'].includes(item.status)).length;
    const lateAssignmentCount = assignments.filter(item => ['active', 'in_progress'].includes(item.status) && isPast(item.dueAt, now)).length;
    const todayProgress = progressCard('today_progress', 'Today', progress.dailyQuestions, {
      met: 'Today\'s practice target is met.',
      open: 'A short practice session can move today\'s target forward.'
    });
    const weeklyProgress = progressCard('weekly_progress', 'This week', progress.weeklySessions, {
      met: 'Weekly practice is on track.',
      open: 'One practice round can help this week keep building.'
    });
    const streakStatus = Object.assign(progressCard('streak_status', 'Practice rhythm', progress.review, {
      met: 'Practice rhythm is steady.',
      open: 'A gentle review round can restart the rhythm.'
    }), {
      currentStreakDays: progress.review.currentStreakDays,
      missedActiveDayCount: progress.review.missedActiveDayCount
    });
    const reviewStatus = {
      id: 'review_status',
      label: 'Review due',
      dueCount: progress.review.dueCount,
      masteredTodayCount: progress.review.masteredTodayCount,
      band: progress.review.dueCount > 0 ? 'review_due' : 'on_track',
      message: progress.review.dueCount > 0
        ? 'A review set is ready when there is time.'
        : 'No review set is waiting right now.'
    };
    const assignmentStatus = {
      id: 'assignment_status',
      label: 'Assignments',
      current: progress.assignments.current,
      target: progress.assignments.target,
      completedCount: progress.assignments.completedCount,
      totalCount: progress.assignments.totalCount,
      activeCount: activeAssignmentCount,
      lateCount: lateAssignmentCount,
      band: lateAssignmentCount > 0 ? 'behind_target' : progress.assignments.met ? 'on_track' : 'near_target',
      message: lateAssignmentCount > 0
        ? 'An assignment can use attention soon.'
        : progress.assignments.met
          ? 'Assignment progress is on track.'
          : 'An assignment step would help progress continue.'
    };
    const dashboardCards = [todayProgress, weeklyProgress, streakStatus, reviewStatus, assignmentStatus];
    const summaryBand = chooseSummaryBand({ progress, dashboardCards });
    const nextSuggestedAction = chooseNextAction({ progress, activeAssignmentCount, lateAssignmentCount, summaryBand });
    const notificationCandidates = buildNotificationCandidates({
      progress,
      nextSuggestedAction,
      activeAssignmentCount,
      lateAssignmentCount
    });

    return {
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      summaryBand,
      summary: summaryForBand(summaryBand),
      todayProgress,
      weeklyProgress,
      streakStatus,
      reviewStatus,
      assignmentStatus,
      dashboardCards,
      nextSuggestedAction,
      notificationCandidates
    };
  }

  function buildGuardianGoalSummary(input = {}) {
    const projections = normalizeLearnerSources(input.learnerSources)
      .map(source => buildLearnerGoalProjection(Object.assign({}, source, { now: input.now })));
    return buildAggregateSummary('parent_guardian', projections);
  }

  function buildTeacherGoalAggregate(input = {}) {
    const assigned = new Set(normalizeStringArray(input.assignedLearnerIds));
    const sources = normalizeLearnerSources(input.learnerSources)
      .filter(source => {
        const id = safeString(source.learner && source.learner.id || source.learnerId);
        return !assigned.size || assigned.has(id);
      });
    const projections = sources.map(source => buildLearnerGoalProjection(Object.assign({}, source, { now: input.now })));
    return buildAggregateSummary('teacher', projections);
  }

  function buildAggregateSummary(roleView, projections) {
    const bandCounts = projections.reduce((counts, projection) => {
      counts[projection.summaryBand] = (counts[projection.summaryBand] || 0) + 1;
      return counts;
    }, Object.assign({}, EMPTY_COUNTS));
    return {
      schemaVersion: 1,
      roleView,
      learnerCount: projections.length,
      bandCounts,
      actionCounts: projections.reduce((counts, projection) => {
        const type = projection.nextSuggestedAction.type;
        counts[type] = (counts[type] || 0) + 1;
        return counts;
      }, {}),
      cards: projections.map((projection, index) => ({
        label: `Learner ${index + 1}`,
        band: projection.summaryBand,
        nextActionType: projection.nextSuggestedAction.type,
        message: projection.summary
      }))
    };
  }

  function buildGoalProgress(input, now) {
    if (goalsDomain && typeof goalsDomain.buildLearnerGoalProgress === 'function') {
      return goalsDomain.buildLearnerGoalProgress({
        now: now.toISOString(),
        goals: input.goals,
        sessions: input.sessions,
        assignments: input.assignments,
        reviewQueue: input.reviewQueue,
        reviewSchedules: input.reviewSchedules
      });
    }
    return {
      generatedAt: now.toISOString(),
      dailyQuestions: { current: 0, target: 10, met: false },
      weeklySessions: { current: 0, target: 4, met: false },
      review: { current: 0, target: 3, met: false, dueCount: 0, masteredTodayCount: 0, missedActiveDayCount: 0, currentStreakDays: 0 },
      assignments: { current: 100, target: 75, met: true, completedCount: 0, totalCount: 0 },
      overall: { metCount: 1, totalCount: 4, allMet: false }
    };
  }

  function progressCard(id, label, source = {}, messages) {
    const current = whole(source.current);
    const target = whole(source.target);
    const remaining = Math.max(0, target - current);
    const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 100;
    const met = source.met === true || remaining === 0;
    return {
      id,
      label,
      current,
      target,
      remaining,
      percent,
      met,
      band: met ? 'on_track' : percent >= 50 ? 'near_target' : 'behind_target',
      message: met ? messages.met : messages.open
    };
  }

  function chooseSummaryBand({ progress, dashboardCards }) {
    if (progress.review.dueCount > 0) return 'review_due';
    if (dashboardCards.every(card => card.band === 'on_track')) return 'on_track';
    if (dashboardCards.some(card => card.band === 'near_target')) return 'near_target';
    return 'behind_target';
  }

  function chooseNextAction({ progress, activeAssignmentCount, lateAssignmentCount }) {
    if (progress.review.dueCount > 0) {
      return action('review_due', 1, 'Start review', 'A review set is ready.');
    }
    if (lateAssignmentCount > 0) {
      return action('assignment_due', 2, 'Open assignments', 'An assignment can use attention soon.');
    }
    if (!progress.dailyQuestions.met) {
      return action('practice_today', 3, 'Practice today', 'A short practice round can help today.');
    }
    if (activeAssignmentCount > 0 && !progress.assignments.met) {
      return action('assignment_progress', 4, 'Continue assignment', 'An assignment step would help progress continue.');
    }
    if (!progress.weeklySessions.met) {
      return action('weekly_practice', 5, 'Plan practice', 'One more practice session supports the weekly target.');
    }
    if (!progress.review.met && progress.review.missedActiveDayCount > 0) {
      return action('streak_resume', 6, 'Resume review', 'A gentle review round can restart the rhythm.');
    }
    return action('keep_going', 9, 'Keep going', 'Practice is on track.');
  }

  function buildNotificationCandidates({ progress, nextSuggestedAction, activeAssignmentCount, lateAssignmentCount }) {
    const candidates = [];
    if (progress.review.dueCount > 0) {
      candidates.push(candidate('review_due', 1, 'Review is ready', 'A short review set is ready when there is time.', 'Start review'));
    }
    if (!progress.dailyQuestions.met) {
      candidates.push(candidate('practice_today', 2, 'Practice today', 'A brief practice round can move today\'s target forward.', 'Practice'));
    }
    if (progress.review.missedActiveDayCount > 0 && !progress.review.met) {
      candidates.push(candidate('streak_resume', 3, 'Resume practice', 'A gentle review round can restart the rhythm.', 'Review'));
    }
    if (lateAssignmentCount > 0 || activeAssignmentCount > 0 && !progress.assignments.met) {
      candidates.push(candidate('assignment_progress', 4, 'Assignment step', 'One assignment step would help progress continue.', 'Open assignments'));
    }
    if (!candidates.length && nextSuggestedAction.type === 'keep_going') {
      candidates.push(candidate('keep_going', 9, 'Practice is on track', 'Everything looks steady for now.', 'Keep practicing'));
    }
    return candidates;
  }

  function action(type, priority, label, reason) {
    return {
      type,
      priority,
      label,
      reasonCode: type,
      reason
    };
  }

  function candidate(type, priority, title, body, actionLabel) {
    return {
      id: type,
      type,
      priority,
      title,
      body,
      actionLabel,
      reasonCode: type
    };
  }

  function summaryForBand(band) {
    if (band === 'review_due') return 'A review set is ready when there is time.';
    if (band === 'on_track') return 'Practice is on track.';
    if (band === 'near_target') return 'A small practice step can keep momentum going.';
    return 'A short practice session can move the goal forward.';
  }

  function normalizeLearnerSources(sources) {
    return (Array.isArray(sources) ? sources : []).filter(source => source && typeof source === 'object');
  }

  function normalizeAssignments(assignments) {
    return (Array.isArray(assignments) ? assignments : []).map(item => ({
      id: safeString(item && item.id),
      status: safeString(item && item.status || 'active'),
      dueAt: safeDate(item && item.dueAt)
    })).filter(item => item.id);
  }

  function isPast(date, now) {
    return !!date && date.getTime() < now.getTime();
  }

  function whole(value) {
    return Math.max(0, Math.round(Number(value) || 0));
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
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
    buildGuardianGoalSummary,
    buildLearnerGoalProjection,
    buildTeacherGoalAggregate
  };
});
