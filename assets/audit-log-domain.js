(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAuditLogDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REDACTED = '[REDACTED]';
  const sensitiveKeyPattern = /(private.*key|secret|token|password|credential|backupEnvelope|exportManifest|providerPayload|rawLearnerIds|learneranswer|selectedchoice|correctchoice|question|choices|explanation|snapshot|prompt|reviewerNotes)/i;

  function buildAuditEvent(actor, action, resource, metadata = {}, options = {}) {
    const normalizedActor = normalizeActor(actor);
    const normalizedResource = normalizeResource(resource);
    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
    const id = typeof options.id === 'function' ? options.id : () => `audit_${Date.now().toString(36)}`;
    return {
      id: String(id() || ''),
      actorId: normalizedActor.id,
      actorRole: normalizedActor.role,
      action: String(action || ''),
      resourceType: normalizedResource.type,
      resourceId: normalizedResource.id,
      createdAt: String(now() || ''),
      metadata: sanitizeAuditMetadata(metadata)
    };
  }

  function buildLearnerDataLifecycleAuditEvent(actor, action, resource, metadata = {}, options = {}) {
    return buildAuditEvent(actor, action, {
      type: 'learnerProgress',
      id: resource && resource.learnerId || resource && resource.id || '',
    }, metadata, options);
  }

  function buildFeatureFlagUpdateAuditEvent(actor, resource, metadata = {}, options = {}) {
    if (!String(metadata && metadata.reason || '').trim()) throw new Error('audit_reason_required');
    return buildAuditEvent(actor, 'feature-flag:update', {
      type: 'featureFlag',
      id: resource && resource.id || resource && resource.resourceId || 'feature-flags'
    }, metadata, options);
  }

  function sanitizeAuditMetadata(metadata) {
    if (Array.isArray(metadata)) return metadata.map(item => sanitizeAuditMetadata(item));
    if (!metadata || typeof metadata !== 'object') return metadata;
    return Object.keys(metadata).reduce((sanitized, key) => {
      sanitized[key] = sensitiveKeyPattern.test(key)
        ? REDACTED
        : sanitizeAuditMetadata(metadata[key]);
      return sanitized;
    }, {});
  }

  function validateAuditEvent(event) {
    const input = event && typeof event === 'object' ? event : {};
    const missing = [];
    ['id', 'actorId', 'actorRole', 'action', 'resourceType', 'createdAt'].forEach(field => {
      if (!String(input[field] || '').trim()) missing.push(field);
    });
    if (input.metadata && typeof input.metadata !== 'object') missing.push('metadata');
    return missing;
  }

  function canUseSupportAccess() {
    return false;
  }

  function normalizeActor(actor) {
    const input = actor && typeof actor === 'object' ? actor : {};
    return {
      id: String(input.id || input.actorId || input.userId || '').trim(),
      role: String(input.role || '').trim()
    };
  }

  function normalizeResource(resource) {
    const input = resource && typeof resource === 'object' ? resource : {};
    return {
      type: String(input.type || input.resourceType || '').trim(),
      id: String(input.id || input.resourceId || '').trim()
    };
  }

  return {
    buildAuditEvent,
    buildFeatureFlagUpdateAuditEvent,
    buildLearnerDataLifecycleAuditEvent,
    canUseSupportAccess,
    sanitizeAuditMetadata,
    validateAuditEvent
  };
});
