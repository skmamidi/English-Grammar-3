(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestContentReviewPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STATUSES = new Set(['allowed', 'deferred', 'blocking']);

  function classifyReviewIssue(input = {}) {
    return {
      questionId: safeString(input.questionId),
      sourceSet: safeString(input.sourceSet),
      ruleId: safeString(input.ruleId),
      contentHash: safeString(input.contentHash || input.sourceHash),
      reviewer: safeString(input.reviewer),
      rationale: safeString(input.rationale),
      status: STATUSES.has(input.status) ? input.status : 'deferred',
      expiresAt: safeString(input.expiresAt)
    };
  }

  function validateReviewClassification(input) {
    const item = classifyReviewIssue(input);
    const errors = [];
    if (!item.questionId && !item.sourceSet) errors.push('stable identity is required');
    if (!item.ruleId) errors.push('ruleId is required');
    if (!safeString(input && input.reviewer)) errors.push('reviewer is required');
    if (!safeString(input && input.rationale)) errors.push('rationale is required');
    if (!STATUSES.has(input && input.status)) errors.push('status is invalid');
    return errors;
  }

  function isReviewClassificationStale(classification, current = {}) {
    const item = classifyReviewIssue(classification);
    if (item.expiresAt && Date.parse(item.expiresAt) <= Date.parse(current.now || new Date().toISOString())) return true;
    const currentHash = safeString(current.contentHash || current.sourceHash);
    return !!(item.contentHash && currentHash && item.contentHash !== currentHash);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    classifyReviewIssue,
    isReviewClassificationStale,
    validateReviewClassification
  };
});
