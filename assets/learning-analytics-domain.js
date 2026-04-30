(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearningAnalyticsDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function buildAggregateLearningAnalytics(input = {}) {
    const now = toTime(input.now) || Date.now();
    const assignments = normalizeAssignments(input.assignments);
    const reviews = normalizeReviewSchedules(input.reviewSchedules || input.reviewSchedule);
    return {
      masteryBandCountsBySkill: countMasteryBands(input.masteryProjection || input.mastery || []),
      assignmentCompletionRate: assignments.length
        ? round(assignments.filter(item => item.status === 'completed').length / assignments.length)
        : 0,
      reviewCounts: {
        due: reviews.filter(item => item.dueAt && item.dueAt <= now).length,
        completed: reviews.filter(item => item.lastReviewedAt).length
      },
      recommendationReasonCounts: countRecommendationReasons(input.recommendations)
    };
  }

  function countMasteryBands(projection) {
    return (Array.isArray(projection) ? projection : []).reduce((acc, item) => {
      const skillId = safeString(item && item.skillId);
      const band = safeString(item && item.masteryBand);
      if (!skillId || !band) return acc;
      if (!acc[skillId]) acc[skillId] = {};
      acc[skillId][band] = (acc[skillId][band] || 0) + 1;
      return acc;
    }, {});
  }

  function countRecommendationReasons(recommendations) {
    return (Array.isArray(recommendations) ? recommendations : []).reduce((acc, item) => {
      const reasonCode = safeString(item && item.reasonCode);
      if (!reasonCode) return acc;
      acc[reasonCode] = (acc[reasonCode] || 0) + 1;
      return acc;
    }, {});
  }

  function normalizeAssignments(assignments) {
    return (Array.isArray(assignments) ? assignments : []).map(assignment => ({
      status: safeString(assignment && assignment.status || 'active')
    }));
  }

  function normalizeReviewSchedules(schedules) {
    return (Array.isArray(schedules) ? schedules : []).map(schedule => ({
      dueAt: toTime(schedule && schedule.dueAt),
      lastReviewedAt: toTime(schedule && schedule.lastReviewedAt)
    }));
  }

  function toTime(value) {
    const time = new Date(value || '').getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildAggregateLearningAnalytics
  };
});
