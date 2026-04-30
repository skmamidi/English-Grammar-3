(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestRecommendationRouteResolver = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function resolveRecommendationTarget(recommendation, context = {}) {
    const skillId = safeString(recommendation && recommendation.skillId);
    const evidence = recommendation && recommendation.evidence || {};
    const reviewQueue = context.reviewQueue || {};
    if ((Number(evidence.overdueReviewCount) || 0) > 0 && safeString(reviewQueue.queueId)) {
      return createTarget('review', { reviewQueueId: reviewQueue.queueId });
    }
    const assignment = (Array.isArray(context.assignments) ? context.assignments : []).find(item => {
      const status = safeString(item && item.status || 'active');
      const scope = item && item.scope || {};
      const skillIds = normalizeStringArray(scope.skillIds || item && item.skillIds);
      return ['active', 'in_progress'].includes(status) && skillIds.includes(skillId);
    });
    if (assignment) return createTarget('assignment', { assignmentId: assignment.id });
    const sets = context.manifest && Array.isArray(context.manifest.sets) ? context.manifest.sets : [];
    const matchingSets = sets.filter(set => (Array.isArray(set.skillCoverage) ? set.skillCoverage : [])
      .some(coverage => safeString(coverage && coverage.skillId) === skillId));
    if (matchingSets.length) {
      return createTarget('subtopic', {
        domainId: matchingSets[0].domain,
        setIds: matchingSets.slice(0, 3).map(set => set.id)
      });
    }
    return createTarget('dashboard');
  }

  function createTarget(type, overrides = {}) {
    return {
      type,
      reviewQueueId: safeString(overrides.reviewQueueId),
      domainId: safeString(overrides.domainId),
      setIds: normalizeStringArray(overrides.setIds),
      assignmentId: safeString(overrides.assignmentId)
    };
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return { resolveRecommendationTarget };
});
