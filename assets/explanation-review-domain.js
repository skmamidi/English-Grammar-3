(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestExplanationReviewDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STATUSES = Object.freeze({
    CANDIDATE: 'candidate',
    NEEDS_REVIEW: 'needs_review',
    IN_PROGRESS: 'in_progress',
    FIXED_PENDING_GENERATION: 'fixed_pending_generation',
    VERIFIED: 'verified',
    DEFERRED: 'deferred',
    DISMISSED: 'dismissed'
  });

  function normalizeExplanationReviewItem(item, options = {}) {
    const input = item && typeof item === 'object' ? item : {};
    const now = safeString(options.now) || new Date().toISOString();
    const identity = input.questionIdentity || {};
    const location = input.sourceLocation || {};
    return {
      id: safeString(input.id || `explanation-review-${identity.questionId || input.questionId || ''}`),
      questionIdentity: {
        questionId: safeString(identity.questionId || input.questionId),
        version: Number(identity.version || input.questionVersion) || 0,
        contentHash: safeString(identity.contentHash || input.contentHash || input.questionHash),
        sourceSet: safeString(identity.sourceSet || input.sourceSet || input.setId),
        sequence: Number(identity.sequence || input.sequence) || 0
      },
      sourceLocation: {
        file: repoRelativePath(location.file),
        jsonPointer: safeString(location.jsonPointer)
      },
      signals: normalizeSignals(input.signals),
      status: normalizeStatus(input.status),
      assignedTo: safeString(input.assignedTo),
      resolution: safeString(input.resolution),
      createdAt: safeString(input.createdAt) || now,
      updatedAt: safeString(input.updatedAt) || now
    };
  }

  function startExplanationReview(item, options = {}) {
    const normalized = normalizeExplanationReviewItem(item, options);
    requireCapability(options.actor, 'explanation-review:triage');
    requireTransition(normalized.status, [STATUSES.CANDIDATE, STATUSES.NEEDS_REVIEW, STATUSES.DEFERRED]);
    return update(normalized, STATUSES.IN_PROGRESS, options, { assignedTo: options.assignedTo || normalized.assignedTo });
  }

  function markExplanationFixedPendingGeneration(item, options = {}) {
    const normalized = normalizeExplanationReviewItem(item, options);
    requireCapability(options.actor, 'explanation-review:triage');
    requireTransition(normalized.status, [STATUSES.IN_PROGRESS]);
    return update(normalized, STATUSES.FIXED_PENDING_GENERATION, options, { resolution: options.resolution || 'fixed' });
  }

  function verifyExplanationReview(item, options = {}) {
    const normalized = normalizeExplanationReviewItem(item, options);
    requireCapability(options.actor, 'explanation-review:verify');
    requireTransition(normalized.status, [STATUSES.FIXED_PENDING_GENERATION]);
    return update(normalized, STATUSES.VERIFIED, options, { resolution: options.resolution || normalized.resolution || 'verified' });
  }

  function dismissExplanationReview(item, options = {}) {
    const normalized = normalizeExplanationReviewItem(item, options);
    requireCapability(options.actor, 'explanation-review:triage');
    if (!safeString(options.reason || options.resolution)) throw new Error('dismissal_reason_required');
    requireTransition(normalized.status, [STATUSES.CANDIDATE, STATUSES.NEEDS_REVIEW, STATUSES.IN_PROGRESS]);
    return update(normalized, STATUSES.DISMISSED, options, { resolution: options.reason || options.resolution });
  }

  function update(item, status, options, patch) {
    return Object.assign({}, item, patch, {
      status,
      updatedAt: safeString(options.now) || new Date().toISOString()
    });
  }

  function normalizeSignals(signals) {
    return (Array.isArray(signals) ? signals : []).map(signal => ({
      type: safeString(signal && signal.type),
      severity: safeString(signal && signal.severity || 'warning'),
      message: safeString(signal && signal.message),
      source: safeString(signal && signal.source)
    })).filter(signal => signal.type);
  }

  function normalizeStatus(status) {
    const value = safeString(status) || STATUSES.CANDIDATE;
    return Object.values(STATUSES).includes(value) ? value : STATUSES.CANDIDATE;
  }

  function requireTransition(status, allowed) {
    if (!allowed.includes(status)) throw new Error(`invalid_explanation_review_transition:${status}`);
  }

  function requireCapability(actor, capability) {
    const capabilities = Array.isArray(actor && actor.capabilities) ? actor.capabilities : [];
    if (!capabilities.includes(capability) && !capabilities.includes('explanation-review:triage')) {
      throw new Error(`explanation_review_access_denied:${capability}`);
    }
  }

  function repoRelativePath(file) {
    const value = safeString(file).replace(/\\/g, '/');
    const marker = '/assets/question-bank-source/';
    if (value.includes(marker)) return `assets/question-bank-source/${value.split(marker).pop()}`;
    if (value.startsWith('assets/question-bank-source/')) return value;
    return value;
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    STATUSES,
    dismissExplanationReview,
    markExplanationFixedPendingGeneration,
    normalizeExplanationReviewItem,
    startExplanationReview,
    verifyExplanationReview
  };
});
