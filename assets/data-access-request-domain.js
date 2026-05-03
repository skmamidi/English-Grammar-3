(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestDataAccessRequestDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const access = root.GrammarQuestAccessControl ||
    (typeof require === 'function' ? require('./access-control') : null);
  const inventory = root.GrammarQuestDataInventoryClassification ||
    (typeof require === 'function' ? require('./data-inventory-classification') : null);
  const audit = root.GrammarQuestAuditLogDomain ||
    (typeof require === 'function' ? require('./audit-log-domain') : null);

  const DATA_ACCESS_REQUEST_TYPES = Object.freeze([
    'export',
    'correction',
    'deletion',
    'retention_review',
    'audit_review'
  ]);

  const DATA_ACCESS_STATUSES = Object.freeze([
    'submitted',
    'verified',
    'approved',
    'in_progress',
    'fulfilled',
    'rejected',
    'expired',
    'canceled'
  ]);

  const TRANSITIONS = Object.freeze({
    submitted: Object.freeze(['verified', 'rejected', 'expired', 'canceled']),
    verified: Object.freeze(['approved', 'rejected', 'expired', 'canceled']),
    approved: Object.freeze(['in_progress', 'rejected', 'expired', 'canceled']),
    in_progress: Object.freeze(['fulfilled', 'rejected', 'expired', 'canceled']),
    fulfilled: Object.freeze([]),
    rejected: Object.freeze([]),
    expired: Object.freeze([]),
    canceled: Object.freeze([])
  });

  const learnerCategories = new Set(['learner_progress', 'learner_answer_attempt', 'guardian_relationship', 'classroom_assignment', 'privacy_preference', 'sync_metadata']);
  const operationalCategories = new Set(['audit_event', 'release_artifact', 'operational_config', 'telemetry_event', 'content_governance']);

  function createDataAccessRequest(input = {}, options = {}) {
    const type = safeString(input.type || input.requestType);
    const rawRequester = input.requester || input.actor || {};
    const actor = access.normalizeActor(rawRequester);
    const learnerId = safeString(input.learnerId || input.targetLearnerId);
    const categories = normalizeCategories(input.categories || input.allowedDataCategories);
    if (!DATA_ACCESS_REQUEST_TYPES.includes(type)) throw new Error('data_access_request_type_invalid');
    if (rawRequester && rawRequester.supportImpersonation === true) throw new Error('data_access_request_denied');
    if (!isAuthorized(type, actor, learnerId, safeString(input.classId), categories)) throw new Error('data_access_request_denied');
    const createdAt = now(options);
    return {
      id: call(options.id, `dar_${Date.now().toString(36)}`),
      type,
      status: 'submitted',
      requester: { actorId: actor.id, role: actor.role },
      learnerId,
      accountScope: safeString(input.accountScope || (learnerId ? 'learner' : 'operational')),
      categories,
      reviewerRole: access.Roles.SYSTEM_ADMIN,
      reason: safeString(input.reason),
      createdAt,
      dueAt: safeIso(input.dueAt) || addDays(createdAt, 30),
      verificationEvidence: [],
      auditTrail: [],
      metadata: audit.sanitizeAuditMetadata(input.metadata || {})
    };
  }

  function transitionDataAccessRequest(request, nextStatus, input = {}, options = {}) {
    const current = normalizeDataAccessRequest(request);
    const status = safeString(nextStatus);
    if (!DATA_ACCESS_STATUSES.includes(status) || !TRANSITIONS[current.status].includes(status)) {
      throw new Error('data_access_invalid_transition');
    }
    const evidence = normalizeEvidence(input.evidence);
    if (['verified', 'approved', 'in_progress', 'fulfilled'].includes(status) && evidence.length === 0) {
      throw new Error('data_access_evidence_required');
    }
    const actor = access.normalizeActor(input.actor || {});
    const changedAt = now(options);
    return normalizeDataAccessRequest(Object.assign({}, current, {
      status,
      verificationEvidence: current.verificationEvidence.concat(evidence),
      auditTrail: current.auditTrail.concat({
        status,
        actorId: actor.id,
        actorRole: actor.role,
        changedAt,
        evidenceTypes: evidence.map(item => item.type)
      })
    }));
  }

  function validateDataAccessRequest(request) {
    const input = request && typeof request === 'object' ? request : {};
    const errors = [];
    ['id', 'type', 'status', 'createdAt', 'dueAt', 'reviewerRole'].forEach(field => {
      if (!safeString(input[field])) errors.push(field);
    });
    if (!DATA_ACCESS_REQUEST_TYPES.includes(safeString(input.type))) errors.push('type_known');
    if (!DATA_ACCESS_STATUSES.includes(safeString(input.status))) errors.push('status_known');
    if (!Array.isArray(input.categories) || input.categories.length === 0) errors.push('categories');
    normalizeCategories(input.categories || []).forEach(category => {
      if (!inventory.REQUIRED_DATA_CATEGORIES.includes(category)) errors.push(`category:${category}`);
    });
    if (!input.requester || !safeString(input.requester.actorId) || !safeString(input.requester.role)) errors.push('requester');
    if (requiresLearner(input.type) && !safeString(input.learnerId)) errors.push('learnerId');
    return Array.from(new Set(errors));
  }

  function sanitizeDataAccessRequestSummary(request) {
    const normalized = normalizeDataAccessRequest(request);
    return {
      id: normalized.id,
      type: normalized.type,
      status: normalized.status,
      requester: normalized.requester,
      learnerId: normalized.learnerId,
      accountScope: normalized.accountScope,
      categories: normalized.categories,
      reviewerRole: normalized.reviewerRole,
      createdAt: normalized.createdAt,
      dueAt: normalized.dueAt,
      verificationEvidence: normalized.verificationEvidence,
      auditTrail: normalized.auditTrail,
      metadata: audit.sanitizeAuditMetadata(normalized.metadata)
    };
  }

  function normalizeDataAccessRequest(request) {
    const input = request && typeof request === 'object' ? request : {};
    return {
      id: safeString(input.id),
      type: safeString(input.type),
      status: DATA_ACCESS_STATUSES.includes(safeString(input.status)) ? safeString(input.status) : 'submitted',
      requester: {
        actorId: safeString(input.requester && (input.requester.actorId || input.requester.id)),
        role: safeString(input.requester && input.requester.role)
      },
      learnerId: safeString(input.learnerId),
      accountScope: safeString(input.accountScope),
      categories: normalizeCategories(input.categories),
      reviewerRole: safeString(input.reviewerRole || access.Roles.SYSTEM_ADMIN),
      reason: safeString(input.reason),
      createdAt: safeIso(input.createdAt),
      dueAt: safeIso(input.dueAt),
      verificationEvidence: normalizeEvidence(input.verificationEvidence),
      auditTrail: Array.isArray(input.auditTrail) ? input.auditTrail.map(item => audit.sanitizeAuditMetadata(item)) : [],
      metadata: audit.sanitizeAuditMetadata(input.metadata || {})
    };
  }

  function isAuthorized(type, actor, learnerId, classId, categories) {
    if (actor.supportImpersonation === true) return false;
    if (type === 'retention_review') {
      return actor.role === access.Roles.SYSTEM_ADMIN && categories.every(category => operationalCategories.has(category));
    }
    if (type === 'audit_review') {
      return actor.role === access.Roles.SYSTEM_ADMIN && categories.every(category => category === 'audit_event');
    }
    if (!learnerId || categories.some(category => !learnerCategories.has(category))) return false;
    const resource = { type: access.ResourceTypes.LEARNER_PROGRESS, learnerId, classId };
    if (type === 'export' || type === 'correction') {
      return access.canAccess(actor, exportCapability(actor.role), resource);
    }
    if (type === 'deletion') {
      return access.canAccess(actor, access.Capabilities.requestLearnerDataDeletion, resource);
    }
    return false;
  }

  function exportCapability(role) {
    if (role === access.Roles.STUDENT) return access.Capabilities.exportOwnLearnerProgress;
    if (role === access.Roles.PARENT_GUARDIAN) return access.Capabilities.exportLinkedLearnerProgress;
    if (role === access.Roles.TEACHER) return access.Capabilities.exportAssignedLearnerProgress;
    return 'data-access:denied';
  }

  function normalizeCategories(categories) {
    return Array.from(new Set((Array.isArray(categories) ? categories : [])
      .map(safeString)
      .filter(Boolean)))
      .sort();
  }

  function normalizeEvidence(evidence) {
    return (Array.isArray(evidence) ? evidence : []).map(item => {
      const input = item && typeof item === 'object' ? item : {};
      return audit.sanitizeAuditMetadata({
        type: safeString(input.type),
        reference: safeString(input.reference),
        verifiedAt: safeIso(input.verifiedAt)
      });
    }).filter(item => item.type && item.reference);
  }

  function requiresLearner(type) {
    return ['export', 'correction', 'deletion'].includes(safeString(type));
  }

  function now(options = {}) {
    return safeIso(call(options.now, '')) || new Date().toISOString();
  }

  function addDays(iso, days) {
    const time = Date.parse(iso);
    return new Date(time + days * 24 * 60 * 60 * 1000).toISOString();
  }

  function call(value, fallback) {
    return typeof value === 'function' ? value() : (value || fallback);
  }

  function safeIso(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DATA_ACCESS_REQUEST_TYPES,
    DATA_ACCESS_STATUSES,
    createDataAccessRequest,
    normalizeDataAccessRequest,
    sanitizeDataAccessRequestSummary,
    transitionDataAccessRequest,
    validateDataAccessRequest
  };
});
