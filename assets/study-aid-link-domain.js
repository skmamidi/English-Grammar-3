(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestStudyAidLinks = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SAFE_SET_ID = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
  const DEFAULT_LIMIT = 3;

  function normalizeStudyAidInternalLinks(options = {}) {
    const validation = validateStudyAidInternalLinks(options);
    const sourceSet = safeString(options.sourceSet);
    const studyAid = options.studyAid && typeof options.studyAid === 'object' ? options.studyAid : {};
    const questionManifest = options.questionManifest || {};
    const lessonManifest = options.lessonManifest || {};
    const limit = Math.max(1, Math.min(5, Number(options.limit) || DEFAULT_LIMIT));
    const requested = Array.isArray(studyAid.internalLinks) && studyAid.internalLinks.length
      ? studyAid.internalLinks
      : [{ targetSetId: sourceSet, reason: 'primary' }];
    const seen = new Set();

    return requested
      .map(item => normalizeLinkCandidate(item, { sourceSet, questionManifest, lessonManifest }))
      .filter(link => link.targetSetId && !validation.errors.includes(`study_aid_internal_link_target_unsafe:${link.targetSetId}`))
      .filter(link => {
        if (seen.has(link.targetSetId)) return false;
        seen.add(link.targetSetId);
        return true;
      })
      .filter(link => hasManifestSet(questionManifest, link.targetSetId))
      .slice(0, limit);
  }

  function validateStudyAidInternalLinks(options = {}) {
    const errors = [];
    const studyAid = options.studyAid && typeof options.studyAid === 'object' ? options.studyAid : {};
    const sourceSet = safeString(options.sourceSet);
    const questionManifest = options.questionManifest || {};
    const requested = Array.isArray(studyAid.internalLinks) && studyAid.internalLinks.length
      ? studyAid.internalLinks
      : sourceSet ? [{ targetSetId: sourceSet, reason: 'primary' }] : [];
    const seen = new Set();

    requested.forEach(item => {
      const targetSetId = safeString(item && (item.targetSetId || item.setId));
      if (!targetSetId) errors.push('study_aid_internal_link_target_required');
      else if (!SAFE_SET_ID.test(targetSetId)) errors.push(`study_aid_internal_link_target_unsafe:${targetSetId}`);
      else if (!hasManifestSet(questionManifest, targetSetId)) errors.push(`study_aid_internal_link_target_unknown:${targetSetId}`);
      if (seen.has(targetSetId)) errors.push(`study_aid_internal_link_duplicate:${targetSetId}`);
      seen.add(targetSetId);
    });

    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function normalizeLinkCandidate(item, context) {
    const targetSetId = safeString(item && (item.targetSetId || item.setId)) || context.sourceSet;
    const set = getManifestSet(context.questionManifest, targetSetId);
    const lessonSummary = getLessonSummary(context.lessonManifest, targetSetId);
    const reason = safeString(item && item.reason) || (targetSetId === context.sourceSet ? 'primary' : 'related');
    return {
      targetSetId,
      sourceSet: context.sourceSet,
      reason,
      label: safeString(item && item.label) || (targetSetId === context.sourceSet ? 'Review this lesson' : `Review ${set.title || targetSetId}`),
      route: lessonSummary && lessonSummary.route || buildRoute(set || { id: targetSetId })
    };
  }

  function buildRoute(set) {
    const setId = safeString(set.id || set.setId);
    const domain = safeString(set.domain || setId.split('-')[0]);
    const prefix = `${domain}-`;
    const subtopic = setId.startsWith(prefix) ? setId.slice(prefix.length) : setId;
    return {
      type: 'story_lesson',
      webPath: `topics/${domain}/subtopics/${subtopic}.html?learn=1`,
      params: { domain, learn: '1', setId, subtopic }
    };
  }

  function getManifestSet(manifest, setId) {
    return (Array.isArray(manifest && manifest.sets) ? manifest.sets : []).find(set => safeString(set.id || set.setId) === setId) || null;
  }

  function hasManifestSet(manifest, setId) {
    return !!getManifestSet(manifest, setId);
  }

  function getLessonSummary(manifest, setId) {
    return (Array.isArray(manifest && manifest.lessons) ? manifest.lessons : []).find(lesson => lesson.setId === setId) || null;
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    normalizeStudyAidInternalLinks,
    validateStudyAidInternalLinks
  };
});
