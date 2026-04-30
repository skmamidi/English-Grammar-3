#!/usr/bin/env node

function validateExplanationReviewItems(items, options = {}) {
  const currentIdentities = options.currentIdentities || {};
  const errors = [];
  (Array.isArray(items) ? items : []).forEach(item => {
    const id = item && item.id || '';
    const identity = item && item.questionIdentity || {};
    const current = currentIdentities[identity.questionId] || {};
    if (item.status === 'fixed_pending_generation' && current.contentHash && current.contentHash !== identity.contentHash) {
      errors.push({ id, code: 'stale_generated_artifact', message: 'Fixed explanation review points at stale generated identity.' });
    }
    if (item.status === 'dismissed' && !String(item.resolution || '').trim()) {
      errors.push({ id, code: 'dismissal_reason_required', message: 'Dismissed explanation review item requires a rationale.' });
    }
    if (!identity.questionId) {
      errors.push({ id, code: 'missing_question_identity', message: 'Review item must reference a stable question id.' });
    }
  });
  return { valid: errors.length === 0, errors };
}

module.exports = { validateExplanationReviewItems };
