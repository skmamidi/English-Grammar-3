(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestQuestionReportDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STATUS = Object.freeze({
    OPEN: 'open',
    NEEDS_REVIEW: 'needs_review',
    ASSIGNED: 'assigned',
    RESOLVED: 'resolved',
    DUPLICATE: 'duplicate',
    DEFERRED: 'deferred',
    CLOSED_NO_CHANGE: 'closed_no_change'
  });
  const CATEGORIES = new Set([
    'incorrect_answer',
    'unclear_prompt',
    'weak_explanation',
    'visual_issue',
    'age_level',
    'technical_issue',
    'other'
  ]);

  function normalizeQuestionReport(report, options = {}) {
    const input = report && typeof report === 'object' ? report : {};
    const now = safeString(options.now) || new Date().toISOString();
    const identity = input.questionIdentity || {};
    return {
      id: safeString(input.id || input.reportId),
      learnerId: safeString(input.learnerId || input.studentId || input.ownerLearnerId),
      questionIdentity: {
        questionId: safeString(identity.questionId || input.questionId),
        version: Number(identity.version || input.questionVersion) || 0,
        contentHash: safeString(identity.contentHash || input.questionHash || input.contentHash),
        sourceSet: safeString(identity.sourceSet || input.sourceSet || input.setId),
        sequence: Number(identity.sequence || input.sequence) || 0
      },
      reporter: normalizeReporter(input.reporter),
      category: CATEGORIES.has(input.category) ? input.category : 'other',
      status: normalizeStatus(input.status),
      priority: normalizePriority(input.priority),
      createdAt: safeString(input.createdAt) || now,
      updatedAt: safeString(input.updatedAt) || now,
      triage: normalizeTriage(input.triage)
    };
  }

  function assignQuestionReport(report, options = {}) {
    const normalized = normalizeQuestionReport(report, options);
    requireCapability(options.actor, 'question-report:assign');
    requireTransition(normalized.status, [STATUS.OPEN, STATUS.NEEDS_REVIEW, STATUS.DEFERRED]);
    return updateReport(normalized, STATUS.ASSIGNED, options, {
      assignedTo: safeString(options.assignedTo),
      resolution: '',
      duplicateOf: ''
    });
  }

  function resolveQuestionReport(report, options = {}) {
    const normalized = normalizeQuestionReport(report, options);
    requireCapability(options.actor, 'question-report:resolve');
    requireTransition(normalized.status, [STATUS.ASSIGNED, STATUS.NEEDS_REVIEW]);
    return updateReport(normalized, STATUS.RESOLVED, options, {
      resolution: safeString(options.resolution || 'resolved')
    });
  }

  function markDuplicateQuestionReport(report, options = {}) {
    const normalized = normalizeQuestionReport(report, options);
    requireCapability(options.actor, 'question-report:triage');
    requireTransition(normalized.status, [STATUS.OPEN, STATUS.NEEDS_REVIEW, STATUS.ASSIGNED, STATUS.DEFERRED]);
    return updateReport(normalized, STATUS.DUPLICATE, options, {
      duplicateOf: safeString(options.duplicateOf)
    });
  }

  function deferQuestionReport(report, options = {}) {
    const normalized = normalizeQuestionReport(report, options);
    requireCapability(options.actor, 'question-report:triage');
    requireTransition(normalized.status, [STATUS.OPEN, STATUS.NEEDS_REVIEW, STATUS.ASSIGNED]);
    return updateReport(normalized, STATUS.DEFERRED, options, {
      resolution: safeString(options.resolution || 'deferred')
    });
  }

  function reopenQuestionReport(report, options = {}) {
    const normalized = normalizeQuestionReport(report, options);
    requireCapability(options.actor, 'question-report:triage');
    requireTransition(normalized.status, [STATUS.RESOLVED, STATUS.DUPLICATE, STATUS.DEFERRED, STATUS.CLOSED_NO_CHANGE]);
    return updateReport(normalized, STATUS.NEEDS_REVIEW, options, {
      resolution: '',
      duplicateOf: ''
    });
  }

  function createExplanationReviewSignalFromReport(report, options = {}) {
    const normalized = normalizeQuestionReport(report, options);
    if (normalized.category !== 'weak_explanation') return null;
    const now = safeString(options.now) || new Date().toISOString();
    return {
      id: `explanation-review-${normalized.questionIdentity.questionId}`,
      questionIdentity: normalized.questionIdentity,
      sourceLocation: { file: '', jsonPointer: '' },
      signals: [{
        type: 'human_weak_explanation_report',
        severity: normalized.priority === 'urgent' ? 'error' : 'warning',
        message: 'A human report flagged this explanation as unclear or weak.',
        source: 'question-report',
        reportId: normalized.id
      }],
      status: 'needs_review',
      assignedTo: '',
      resolution: '',
      createdAt: now,
      updatedAt: now
    };
  }

  function updateReport(report, status, options, triagePatch) {
    return Object.assign({}, report, {
      status,
      updatedAt: safeString(options.now) || new Date().toISOString(),
      triage: Object.assign({}, report.triage, triagePatch, {
        notes: safeString(options.notes || report.triage.notes)
      })
    });
  }

  function requireTransition(status, allowed) {
    if (!allowed.includes(status)) throw new Error(`invalid_report_transition:${status}`);
  }

  function requireCapability(actor, capability) {
    const capabilities = Array.isArray(actor && actor.capabilities) ? actor.capabilities : [];
    if (!capabilities.includes(capability) && !capabilities.includes('question-report:triage')) {
      throw new Error(`question_report_access_denied:${capability}`);
    }
  }

  function normalizeReporter(reporter) {
    const input = reporter && typeof reporter === 'object' ? reporter : {};
    return {
      role: safeString(input.role),
      linkedLearnerId: safeString(input.linkedLearnerId || input.learnerId)
    };
  }

  function normalizeTriage(triage) {
    const input = triage && typeof triage === 'object' ? triage : {};
    return {
      assignedTo: safeString(input.assignedTo),
      resolution: safeString(input.resolution),
      duplicateOf: safeString(input.duplicateOf),
      notes: safeString(input.notes)
    };
  }

  function normalizeStatus(status) {
    const value = safeString(status) || STATUS.OPEN;
    return Object.values(STATUS).includes(value) ? value : STATUS.OPEN;
  }

  function normalizePriority(priority) {
    const value = safeString(priority || 'normal');
    return ['low', 'normal', 'high', 'urgent'].includes(value) ? value : 'normal';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    STATUS,
    assignQuestionReport,
    createExplanationReviewSignalFromReport,
    deferQuestionReport,
    markDuplicateQuestionReport,
    normalizeQuestionReport,
    reopenQuestionReport,
    resolveQuestionReport
  };
});
