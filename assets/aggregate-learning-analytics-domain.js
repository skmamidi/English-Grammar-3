(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAggregateLearningAnalyticsDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function buildAggregateLearningAnalyticsReport(input = {}) {
    const cohortSize = getCohortSize(input.cohort);
    const minCohortSize = Math.max(1, Number(input.minCohortSize) || 5);
    if (cohortSize < minCohortSize) {
      return {
        suppressed: true,
        reason: 'small_cohort',
        cohortSizeBucket: bucketCount(cohortSize, input.bucketSize),
        rows: []
      };
    }

    const assignments = Array.isArray(input.assignments) ? input.assignments : [];
    const completedAssignments = assignments.filter(item => safeString(item.status) === 'completed').length;
    const reviews = Array.isArray(input.reviewSchedules) ? input.reviewSchedules : [];
    const now = toTime(input.now) || Date.now();
    const quizSessions = Array.isArray(input.quizSessions) ? input.quizSessions : [];
    const featureFlagEvents = Array.isArray(input.featureFlagEvents) ? input.featureFlagEvents : [];

    return {
      suppressed: false,
      cohortSizeBucket: bucketCount(cohortSize, input.bucketSize),
      rows: [],
      assignment: {
        completionCount: completedAssignments,
        completionRate: assignments.length ? round(completedAssignments / assignments.length) : 0
      },
      review: {
        dueCount: reviews.filter(item => toTime(item.dueAt) <= now).length,
        completedCount: reviews.filter(item => toTime(item.lastReviewedAt)).length
      },
      recommendationReasonCounts: countBy(input.recommendations, 'reasonCode'),
      masteryBandCountsBySkill: countMasteryBands(input.masteryProjection),
      quizCompletionCountsByDomain: countQuizCompletions(quizSessions),
      featureFlagHealth: summarizeFeatureFlags(featureFlagEvents)
    };
  }

  function getCohortSize(cohort = {}) {
    if (Number.isFinite(Number(cohort.learnerCount))) return Number(cohort.learnerCount);
    if (Array.isArray(cohort.learnerIds)) return cohort.learnerIds.length;
    return 0;
  }

  function countMasteryBands(items) {
    return (Array.isArray(items) ? items : []).reduce((result, item) => {
      const skillId = safeString(item.skillId);
      const band = safeString(item.masteryBand);
      if (!skillId || !band) return result;
      if (!result[skillId]) result[skillId] = {};
      result[skillId][band] = (result[skillId][band] || 0) + 1;
      return result;
    }, {});
  }

  function countBy(items, field) {
    return (Array.isArray(items) ? items : []).reduce((result, item) => {
      const key = safeString(item && item[field]);
      if (key) result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
  }

  function countQuizCompletions(items) {
    return items.reduce((result, item) => {
      const domain = safeString(item.domain || 'unknown');
      if (!result[domain]) result[domain] = { completed: 0, started: 0 };
      result[domain].started += 1;
      if (item.completed === true) result[domain].completed += 1;
      return result;
    }, {});
  }

  function summarizeFeatureFlags(items) {
    const byFlag = {};
    items.forEach(item => {
      const flag = safeString(item.featureFlag || item.flag || 'unknown');
      if (!byFlag[flag]) byFlag[flag] = { eventCount: 0, fallbackCount: 0, errorCount: 0 };
      byFlag[flag].eventCount += 1;
      if (safeString(item.status) === 'fallback') byFlag[flag].fallbackCount += 1;
      if (safeString(item.status) === 'error') byFlag[flag].errorCount += 1;
    });
    return Object.keys(byFlag).sort().reduce((result, flag) => {
      const row = byFlag[flag];
      result[flag] = {
        eventCount: row.eventCount,
        fallbackRate: round(row.fallbackCount / row.eventCount),
        errorRate: round(row.errorCount / row.eventCount)
      };
      return result;
    }, {});
  }

  function bucketCount(count, bucketSizeInput) {
    const bucketSize = Math.max(1, Number(bucketSizeInput) || 5);
    const value = Math.max(0, Math.floor(Number(count) || 0));
    const lower = Math.floor(value / bucketSize) * bucketSize;
    return `${lower}-${lower + bucketSize - 1}`;
  }

  function toTime(value) {
    const time = new Date(value || '').getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function round(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildAggregateLearningAnalyticsReport
  };
});
