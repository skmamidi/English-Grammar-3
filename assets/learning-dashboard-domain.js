(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearningDashboardDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const RECENT_DAYS = 14;
  const CLOSED_REPORT_STATUSES = new Set(['resolved', 'dismissed', 'closed_no_change']);
  const goalsDomain = root.GrammarQuestLearnerGoalsDomain ||
    (typeof require === 'function' ? require('./learner-goals-domain') : null);
  const goalProjectionDomain = root.GrammarQuestLearnerGoalProjectionDomain ||
    (typeof require === 'function' ? require('./learner-goal-projection-domain') : null);

  function buildLearningDashboardProjection(input = {}) {
    const learner = input.learner && typeof input.learner === 'object' ? input.learner : {};
    const roleView = safeString(input.roleView || 'parent_guardian');
    const now = toTime(input.now) || Date.now();
    const sessions = normalizeSessions(getInputSessions(input));
    const assignments = normalizeAssignments(input.assignments);
    const reviewItems = normalizeReviewItems(input.reviewQueue);
    const questionReports = normalizeQuestionReports(input.questionReports);
    const skillStats = buildSkillStats(sessions, input.taxonomy);
    const goalProgress = buildGoalProgress(input, now);
    const goalProjection = buildGoalProjection(input, now);
    const summary = {
      recentPracticeCount: sessions.filter(session => isRecent(session.completedAt, now)).length,
      accuracy: calculateAccuracy(sessions),
      activeAssignmentCount: assignments.filter(item => ['active', 'in_progress'].includes(item.status)).length,
      lateAssignmentCount: assignments.filter(item => ['active', 'in_progress'].includes(item.status) && isLate(item, now)).length,
      assignmentCompletionRate: calculateAssignmentCompletionRate(assignments),
      dueReviewCount: reviewItems.filter(item => isDue(item, now)).length,
      openQuestionReportCount: questionReports.filter(report => !CLOSED_REPORT_STATUSES.has(report.status)).length
    };
    if (goalProgress) summary.goalMetCount = goalProgress.overall.metCount;

    return {
      learnerId: safeString(learner.id || input.learnerId),
      roleView,
      summary,
      skillHighlights: buildSkillHighlights(skillStats, roleView),
      goalProjection,
      nextGoalAction: goalProjection ? goalProjection.nextSuggestedAction : null,
      goalNotificationCandidates: goalProjection ? goalProjection.notificationCandidates : [],
      goalHighlights: goalProjection ? buildProjectedGoalHighlights(goalProjection) : goalProgress ? buildGoalHighlights(goalProgress) : [],
      assignmentHighlights: assignments
        .filter(item => ['active', 'in_progress'].includes(item.status))
        .slice(0, 5)
        .map(item => ({
          assignmentId: item.id,
          title: item.title || item.id,
          status: item.status,
          skillIds: normalizeStringArray(item.skillIds)
        })),
      reviewHighlights: buildReviewHighlights(reviewItems, sessions, now),
      questionReportHighlights: questionReports
        .filter(report => !CLOSED_REPORT_STATUSES.has(report.status))
        .slice(0, 5)
        .map(report => ({
          reportId: report.id,
          questionId: report.questionId,
          status: report.status,
          category: report.category
        })),
      recommendationHighlights: normalizeRecommendations(input.recommendations).slice(0, 3)
    };
  }

  function getInputSessions(input) {
    if (Array.isArray(input.sessions)) return input.sessions;
    const reports = input && input.progress && input.progress.reports;
    return reports && Array.isArray(reports.sessions) ? reports.sessions : [];
  }

  function buildSkillStats(sessions, taxonomy = {}) {
    const labels = (taxonomy && taxonomy.skills) || {};
    const stats = {};
    sessions.forEach(session => {
      session.attempts.forEach(attempt => {
        const skillIds = attempt.skillIds.length ? attempt.skillIds : ['practice.mixed'];
        skillIds.forEach(skillId => {
          if (!stats[skillId]) {
            stats[skillId] = {
              skillId,
              label: labels[skillId] && labels[skillId].label || titleCase(skillId),
              attempts: 0,
              correct: 0,
              missedQuestionRefs: []
            };
          }
          stats[skillId].attempts += 1;
          if (attempt.correct) stats[skillId].correct += 1;
          else if (attempt.questionId) stats[skillId].missedQuestionRefs.push(attempt.questionId);
        });
      });
    });
    return Object.keys(stats).map(key => Object.assign(stats[key], {
      accuracy: stats[key].attempts ? round(stats[key].correct / stats[key].attempts) : 0
    })).sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts || a.skillId.localeCompare(b.skillId));
  }

  function buildGoalProgress(input, now) {
    if (!input.goals || !goalsDomain || typeof goalsDomain.buildLearnerGoalProgress !== 'function') return null;
    return goalsDomain.buildLearnerGoalProgress({
      now: new Date(now).toISOString(),
      goals: input.goals,
      sessions: getInputSessions(input),
      assignments: input.assignments,
      reviewQueue: input.reviewQueue,
      reviewSchedules: input.reviewSchedules
    });
  }

  function buildGoalProjection(input, now) {
    if (!input.goals || !goalProjectionDomain || typeof goalProjectionDomain.buildLearnerGoalProjection !== 'function') return null;
    return goalProjectionDomain.buildLearnerGoalProjection({
      now: new Date(now).toISOString(),
      learner: input.learner,
      goals: input.goals,
      sessions: getInputSessions(input),
      assignments: input.assignments,
      reviewQueue: input.reviewQueue,
      reviewSchedules: input.reviewSchedules
    });
  }

  function buildProjectedGoalHighlights(projection) {
    const cards = {
      today_progress: goalCard('daily-questions', 'Daily questions', projection.todayProgress),
      weekly_progress: goalCard('weekly-sessions', 'Weekly sessions', projection.weeklyProgress),
      streak_status: goalCard('review-streak', 'Review streak', projection.streakStatus),
      assignment_status: goalCard('assignment-completion', 'Assignment completion', projection.assignmentStatus)
    };
    return [
      cards.today_progress,
      cards.weekly_progress,
      cards.streak_status,
      cards.assignment_status
    ];
  }

  function buildGoalHighlights(progress) {
    return [
      goalCard('daily-questions', 'Daily questions', progress.dailyQuestions),
      goalCard('weekly-sessions', 'Weekly sessions', progress.weeklySessions),
      goalCard('review-streak', 'Review streak', progress.review),
      goalCard('assignment-completion', 'Assignment completion', progress.assignments)
    ];
  }

  function goalCard(id, label, source = {}) {
    return {
      id,
      label,
      current: Number(source.current) || 0,
      target: Number(source.target) || 0,
      met: source.met === true,
      band: safeString(source.band || (source.met === true ? 'on_track' : 'behind_target')),
      message: safeString(source.message)
    };
  }

  function buildSkillHighlights(skillStats, roleView) {
    return skillStats.slice(0, 5).map(skill => ({
      skillId: skill.skillId,
      label: skill.label,
      accuracy: skill.accuracy,
      attempts: skill.attempts,
      missedQuestionRefs: skill.missedQuestionRefs.slice(0, 10),
      message: roleView === 'teacher'
        ? `Intervention priority: ${skill.label} is below target accuracy.`
        : `Practice at home: ${skill.label} needs gentle review.`
    }));
  }

  function normalizeSessions(sessions) {
    return (Array.isArray(sessions) ? sessions : []).map(session => ({
      id: safeString(session && session.id),
      mode: safeString(session && (session.mode || session.quizMode)),
      completedAt: safeString(session && session.completedAt),
      attempts: (Array.isArray(session && session.attempts) ? session.attempts : []).map(attempt => ({
        questionId: safeString(attempt && (attempt.questionId || attempt.id)),
        correct: (attempt && attempt.correct) === true,
        skillIds: normalizeStringArray(attempt && attempt.skillIds),
        standardIds: normalizeStringArray(attempt && attempt.standardIds)
      }))
    }));
  }

  function buildReviewHighlights(reviewItems, sessions, now) {
    const highlights = [];
    const seen = new Set();
    reviewItems
      .filter(item => isDue(item, now))
      .forEach(item => {
        if (!item.questionRef.id || seen.has(item.questionRef.id)) return;
        seen.add(item.questionRef.id);
        highlights.push({
          questionRef: item.questionRef,
          skillIds: item.skillIds,
          dueAt: item.dueAt,
          reason: item.reason || 'due'
        });
      });

    sessions.forEach(session => {
      session.attempts.forEach(attempt => {
        if (attempt.correct || !attempt.questionId || seen.has(attempt.questionId)) return;
        seen.add(attempt.questionId);
        highlights.push({
          questionRef: { id: attempt.questionId, sourceSet: '', version: 0, contentHash: '', sequence: 0 },
          skillIds: attempt.skillIds.length ? attempt.skillIds : ['practice.mixed'],
          dueAt: session.completedAt,
          reason: session.mode === 'mixed' ? 'missed_mixed_quiz' : 'missed_practice'
        });
      });
    });

    return highlights.slice(0, 5);
  }

  function normalizeAssignments(assignments) {
    return (Array.isArray(assignments) ? assignments : []).map(assignment => {
      const scope = assignment && assignment.scope || {};
      return {
        id: safeString(assignment && assignment.id),
        title: safeString(assignment && assignment.title),
        status: safeString(assignment && assignment.status || 'active'),
        dueAt: safeString(assignment && assignment.dueAt),
        skillIds: normalizeStringArray(scope.skillIds || assignment && assignment.skillIds),
        assignmentId: safeString(assignment && assignment.id)
      };
    }).filter(item => item.id);
  }

  function normalizeReviewItems(queue) {
    return (Array.isArray(queue && queue.items) ? queue.items : []).map(item => ({
      questionRef: normalizeQuestionRef(item && item.questionRef),
      skillIds: normalizeStringArray(item && item.skillIds),
      dueAt: safeString(item && item.dueAt),
      status: safeString(item && item.status || 'queued'),
      reason: safeString(item && item.reason)
    })).filter(item => item.questionRef.id);
  }

  function normalizeQuestionReports(reports) {
    return (Array.isArray(reports) ? reports : []).map(report => ({
      id: safeString(report && report.id),
      questionId: safeString(report && report.questionId),
      status: safeString(report && report.status || 'open'),
      category: safeString(report && report.category || 'other')
    })).filter(report => report.id);
  }

  function normalizeRecommendations(recommendations) {
    return (Array.isArray(recommendations) ? recommendations : []).map(recommendation => ({
      id: safeString(recommendation && recommendation.id),
      skillId: safeString(recommendation && recommendation.skillId),
      reasonCode: safeString(recommendation && recommendation.reasonCode),
      reasonLabel: safeString(recommendation && recommendation.reasonLabel),
      target: {
        type: safeString(recommendation && recommendation.target && recommendation.target.type),
        setIds: normalizeStringArray(recommendation && recommendation.target && recommendation.target.setIds)
      }
    })).filter(recommendation => recommendation.id && recommendation.skillId);
  }

  function normalizeQuestionRef(ref) {
    const input = ref && typeof ref === 'object' ? ref : {};
    return {
      id: safeString(input.id || input.questionId),
      sourceSet: safeString(input.sourceSet || input.setId),
      version: Number(input.version || input.questionVersion) || 0,
      contentHash: safeString(input.contentHash || input.questionHash),
      sequence: Number(input.sequence) || 0
    };
  }

  function calculateAccuracy(sessions) {
    const attempts = sessions.flatMap(session => session.attempts);
    if (!attempts.length) return 0;
    return round(attempts.filter(attempt => attempt.correct).length / attempts.length);
  }

  function isDue(item, now) {
    if (!['queued', 'due', ''].includes(item.status)) return false;
    const due = toTime(item.dueAt);
    return !due || due <= now;
  }

  function isLate(item, now) {
    const due = toTime(item.dueAt);
    return due > 0 && due < now;
  }

  function calculateAssignmentCompletionRate(assignments) {
    if (!assignments.length) return 0;
    return round(assignments.filter(item => item.status === 'completed').length / assignments.length);
  }

  function isRecent(value, now) {
    const time = toTime(value);
    if (!time) return false;
    return now - time <= RECENT_DAYS * 24 * 60 * 60 * 1000;
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function toTime(value) {
    const time = new Date(value || '').getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function titleCase(value) {
    return safeString(value).split(/[._-]+/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Mixed practice';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildLearningDashboardProjection,
    buildSkillStats,
    normalizeSessions
  };
});
