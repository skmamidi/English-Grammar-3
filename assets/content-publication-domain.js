(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestContentPublicationDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STATUSES = new Set(['draft', 'qa_failed', 'needs_review', 'approved', 'published', 'rejected', 'superseded']);

  function createPublication(input = {}) {
    return normalizePublication(Object.assign({
      status: 'draft',
      qaResults: [],
      reviewItems: [],
      approvals: []
    }, input));
  }

  function normalizePublication(input = {}) {
    const status = STATUSES.has(input.status) ? input.status : 'draft';
    return {
      id: safeString(input.id),
      status,
      sourceHash: safeString(input.sourceHash),
      artifactHash: safeString(input.artifactHash),
      changedFiles: normalizeStringArray(input.changedFiles),
      qaResults: normalizeQaResults(input.qaResults),
      reviewItems: normalizeReviewItems(input.reviewItems),
      approvals: normalizeApprovals(input.approvals),
      createdAt: safeString(input.createdAt),
      updatedAt: safeString(input.updatedAt || input.createdAt)
    };
  }

  function validatePublication(publication) {
    const normalized = normalizePublication(publication);
    const errors = [];
    if (!normalized.id) errors.push('id is required');
    if (!normalized.sourceHash) errors.push('sourceHash is required');
    if (!normalized.artifactHash) errors.push('artifactHash is required');
    if (!normalized.changedFiles.length) errors.push('changedFiles are required');
    normalized.qaResults.filter(result => result.blocking && result.status !== 'passed').forEach(result => {
      errors.push(`blocking QA failed: ${result.id}`);
    });
    return errors;
  }

  function approvePublication(publication, approval = {}) {
    const normalized = normalizePublication(publication);
    return normalizePublication(Object.assign({}, normalized, {
      status: 'approved',
      approvals: normalized.approvals.concat({
        actorId: safeString(approval.actorId || approval.id),
        role: safeString(approval.role),
        approvedAt: safeString(approval.approvedAt || approval.now || new Date().toISOString())
      }),
      updatedAt: safeString(approval.approvedAt || new Date().toISOString())
    }));
  }

  function publishPublication(publication, options = {}) {
    const normalized = normalizePublication(publication);
    const blocking = normalized.qaResults.filter(result => result.blocking && result.status !== 'passed');
    if (blocking.length) throw new Error('publication_qa_blocking');
    if (!normalized.approvals.length) throw new Error('publication_requires_approval');
    if (!normalized.sourceHash || !normalized.artifactHash) throw new Error('publication_requires_hashes');
    return normalizePublication(Object.assign({}, normalized, {
      status: 'published',
      updatedAt: safeString(options.publishedAt || new Date().toISOString())
    }));
  }

  function normalizeQaResults(results) {
    return (Array.isArray(results) ? results : []).map(result => ({
      id: safeString(result && result.id),
      status: safeString(result && result.status || 'passed'),
      blocking: result && result.blocking === true,
      errorCount: Math.max(0, Number(result && result.errorCount) || 0),
      warningCount: Math.max(0, Number(result && result.warningCount) || 0)
    })).filter(result => result.id);
  }

  function normalizeReviewItems(items) {
    return (Array.isArray(items) ? items : []).map(item => ({
      questionId: safeString(item && item.questionId),
      sourceSet: safeString(item && item.sourceSet),
      ruleId: safeString(item && item.ruleId),
      status: safeString(item && item.status || 'needs_review'),
      rationale: safeString(item && item.rationale)
    })).filter(item => item.questionId || item.sourceSet || item.ruleId);
  }

  function normalizeApprovals(approvals) {
    return (Array.isArray(approvals) ? approvals : []).map(approval => ({
      actorId: safeString(approval && approval.actorId),
      role: safeString(approval && approval.role),
      approvedAt: safeString(approval && approval.approvedAt)
    })).filter(approval => approval.actorId);
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    approvePublication,
    createPublication,
    normalizePublication,
    publishPublication,
    validatePublication
  };
});
