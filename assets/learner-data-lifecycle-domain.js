(function (root, factory) {
  'use strict';

  const access = root.GrammarQuestAccessControl ||
    (typeof require === 'function' ? require('./access-control') : null);
  const api = factory(access);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearnerDataLifecycleDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (access) {
  'use strict';

  function createLearnerDataDeletionRequest(input = {}, options = {}) {
    const learnerId = safeString(input.learnerId);
    const actor = access.normalizeActor(input.requestedBy);
    const resource = { type: access.ResourceTypes.LEARNER_PROGRESS, learnerId };
    if (!access.canAccess(actor, access.Capabilities.requestLearnerDataDeletion, resource)) {
      throw new Error('learner_data_delete_denied');
    }
    return normalizeDeletionRequest({
      deletionRequestId: call(options.id, `delete_${Date.now().toString(36)}`),
      learnerId,
      requestedBy: { actorId: actor.id, role: actor.role },
      status: 'requested',
      scope: input.scope || 'learner_state',
      reason: input.reason,
      createdAt: now(options),
      completedAt: '',
      tombstone: null
    });
  }

  function approveLearnerDataDeletion(request, actor, options = {}) {
    const normalized = normalizeDeletionRequest(request);
    const approver = access.normalizeActor(actor);
    const resource = { type: access.ResourceTypes.LEARNER_PROGRESS, learnerId: normalized.learnerId };
    if (!access.canAccess(approver, access.Capabilities.approveLearnerDataDeletion, resource)) {
      throw new Error('learner_data_delete_approval_denied');
    }
    return normalizeDeletionRequest(Object.assign({}, normalized, {
      status: 'approved',
      approvedBy: { actorId: approver.id, role: approver.role },
      approvedAt: now(options)
    }));
  }

  function completeLearnerDataDeletion(request, options = {}) {
    const normalized = normalizeDeletionRequest(request);
    if (normalized.status !== 'approved') throw new Error('learner_data_delete_not_approved');
    const completedAt = now(options);
    return normalizeDeletionRequest(Object.assign({}, normalized, {
      status: 'completed',
      completedAt,
      tombstone: createDeletionTombstone({
        learnerId: normalized.learnerId,
        deletionRequestId: normalized.deletionRequestId
      }, { now: () => completedAt })
    }));
  }

  function createDeletionTombstone(input = {}, options = {}) {
    return {
      learnerId: safeString(input.learnerId),
      deletionRequestId: safeString(input.deletionRequestId),
      deletedAt: safeIso(input.deletedAt) || now(options),
      reason: safeString(input.reason)
    };
  }

  function canRestoreBackup(input = {}) {
    const backupExportedAt = safeIso(input.backupExportedAt);
    const tombstone = input.tombstone || null;
    if (tombstone && safeIso(tombstone.deletedAt) && compareIso(tombstone.deletedAt, backupExportedAt) > 0) {
      return { allowed: false, warnings: ['backup_older_than_deletion_tombstone'] };
    }
    return { allowed: true, warnings: [] };
  }

  function normalizeDeletionRequest(request = {}) {
    const input = request && typeof request === 'object' ? request : {};
    return {
      deletionRequestId: safeString(input.deletionRequestId),
      learnerId: safeString(input.learnerId),
      requestedBy: {
        actorId: safeString(input.requestedBy && (input.requestedBy.actorId || input.requestedBy.id)),
        role: safeString(input.requestedBy && input.requestedBy.role)
      },
      status: ['requested', 'approved', 'rejected', 'completed', 'restored'].includes(input.status) ? input.status : 'requested',
      scope: safeString(input.scope || 'learner_state'),
      reason: safeString(input.reason),
      createdAt: safeIso(input.createdAt) || '',
      approvedAt: safeIso(input.approvedAt) || '',
      approvedBy: input.approvedBy || null,
      completedAt: safeIso(input.completedAt) || '',
      tombstone: input.tombstone ? createDeletionTombstone(input.tombstone) : null
    };
  }

  function now(options = {}) {
    return safeIso(call(options.now, '')) || new Date().toISOString();
  }

  function call(value, fallback) {
    return typeof value === 'function' ? value() : (value || fallback);
  }

  function compareIso(left, right) {
    return (Date.parse(left || '') || 0) - (Date.parse(right || '') || 0);
  }

  function safeIso(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    approveLearnerDataDeletion,
    canRestoreBackup,
    completeLearnerDataDeletion,
    createDeletionTombstone,
    createLearnerDataDeletionRequest,
    normalizeDeletionRequest
  };
});
