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
      const lesson = findMatchingLesson(matchingSets, context.storyLessonManifest);
      if (lesson) {
        return createTarget('lesson', {
          lessonRef: {
            setId: lesson.setId,
            title: lesson.title,
            route: lesson.route && lesson.route.webPath
          }
        });
      }
      return createTarget('subtopic', {
        domainId: matchingSets[0].domain,
        setIds: matchingSets.slice(0, 3).map(set => set.id)
      });
    }
    return createTarget('dashboard');
  }

  function findMatchingLesson(sets, storyLessonManifest) {
    const setIds = new Set((Array.isArray(sets) ? sets : []).map(set => safeString(set && (set.id || set.setId))).filter(Boolean));
    return (Array.isArray(storyLessonManifest && storyLessonManifest.lessons) ? storyLessonManifest.lessons : [])
      .map(lesson => ({
        setId: safeString(lesson && lesson.setId),
        title: safeString(lesson && lesson.title),
        route: lesson && lesson.route || {}
      }))
      .find(lesson => lesson.setId && setIds.has(lesson.setId)) || null;
  }

  function createTarget(type, overrides = {}) {
    const target = {
      type,
      reviewQueueId: safeString(overrides.reviewQueueId),
      domainId: safeString(overrides.domainId),
      setIds: normalizeStringArray(overrides.setIds),
      assignmentId: safeString(overrides.assignmentId)
    };
    if (overrides.lessonRef) target.lessonRef = {
      setId: safeString(overrides.lessonRef.setId),
      title: safeString(overrides.lessonRef.title),
      route: safeString(overrides.lessonRef.route)
    };
    return target;
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return { resolveRecommendationTarget };
});
