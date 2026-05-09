const access = require('../assets/access-control');
const tenantDomain = require('../assets/organization-tenant-domain');

const BACKEND_STORAGE_PATHS = Object.freeze({
  learnerState: learnerId => `learners/${learnerId}/state`,
  activeQuiz: learnerId => `learners/${learnerId}/activeQuiz`,
  savedSession: (learnerId, sessionId) => `learners/${learnerId}/sessions/${sessionId}`,
  xpAttemptSubmission: (learnerId, attemptId) => `learners/${learnerId}/xpAttempts/${attemptId}`,
  xpAwardEvent: (learnerId, awardEventId) => `learners/${learnerId}/xpAwards/${awardEventId}`,
  xpProjection: learnerId => `xpProjections/${learnerId}`,
  learningAttemptSubmission: (learnerId, attemptId) => `learners/${learnerId}/learningAttempts/${attemptId}`,
  verifiedLearningAttempt: (learnerId, eventId) => `verifiedLearningAttempts/${learnerId}/events/${eventId}`,
  learningProjection: learnerId => `learningProjections/${learnerId}`,
  institutionalLearningReport: classId => `institutionalLearningReports/classes/${classId}`,
  leaderboardEntry: (periodId, entryId) => `leaderboards/${periodId}/entries/${entryId}`,
  assignmentForLearner: (learnerId, assignmentId) => `learners/${learnerId}/assignments/${assignmentId}`,
  assignmentForClass: (classId, assignmentId) => `classes/${classId}/assignments/${assignmentId}`,
  tenantLearnerState: (tenantId, learnerId) => `tenants/${tenantId}/learners/${learnerId}/state`,
  tenantVerifiedLearningAttempt: (tenantId, learnerId, eventId) => `tenants/${tenantId}/verifiedLearningAttempts/${learnerId}/events/${eventId}`,
  tenantLearningProjection: (tenantId, learnerId) => `tenants/${tenantId}/learningProjections/${learnerId}`,
  tenantInstitutionalLearningReport: (tenantId, classId) => `tenants/${tenantId}/institutionalLearningReports/classes/${classId}`,
  tenantAssignmentForClass: (tenantId, classId, assignmentId) => `tenants/${tenantId}/classes/${classId}/assignments/${assignmentId}`,
  tenantBillingSummary: (tenantId, summaryId) => `tenants/${tenantId}/billingSummaries/${summaryId}`,
  tenantAuditEvent: (tenantId, eventId) => `tenants/${tenantId}/auditEvents/${eventId}`,
  questionReport: (learnerId, reportId) => `learners/${learnerId}/questionReports/${reportId}`,
  learnerDashboard: learnerId => `dashboards/learners/${learnerId}`,
  classDashboard: classId => `dashboards/classes/${classId}`,
  auditEvent: eventId => `auditEvents/${eventId}`,
  featureFlag: flagId => `config/featureFlags/${flagId}`,
  telemetrySummary: summaryId => `telemetrySummaries/${summaryId}`,
  releaseManifest: manifestId => `releaseManifests/${manifestId}`,
  contentPublication: publicationId => `contentPublications/${publicationId}`
});

const SECRET_FIELD_PATTERN = /(^|_|\b)(privateKey|privateKeyRef|authToken|sessionToken|accessToken|refreshToken|serviceAccount|client_email|clientEmail|secret|token)(\b|_|$)/i;
const XP_PROJECTION_FIELD_PATTERN = /(^|_|\b)(totalXp|currentWeeklyXp|currentMonthlyXp|xpProjection)(\b|_|$)/i;
const SENSITIVE_LEARNER_PAYLOAD_PATTERN = /(^|_|\b)(answerKey|correctAnswer|correctAnswers|question|questions|prompt|choices|explanation|selectedAnswers)(\b|_|$)/i;
const SECRET_PATH_PREFIXES = [
  'privateSigningKeys/',
  'serviceAccounts/',
  'authTokens/',
  'config/secrets/'
];

function evaluateBackendPolicy(input = {}) {
  const actor = access.normalizeActor(input.actor);
  const serverOwnedActor = isServerOwnedActor(input.actor);
  const operation = normalizeOperation(input.operation);
  const path = normalizePath(input.path);
  const resource = resolveBackendResource(path);
  const tenantDecision = evaluateTenantBoundary(input.actor, operation, resource);

  if (resource.type === 'secret' || resource.type === 'unknown') {
    return deny(resource, 'backend_path_denied');
  }
  if (!tenantDecision.allow) {
    return deny(resource, tenantDecision.reason);
  }
  if (operation === 'read') {
    return decision(resource, canRead(actor, resource, serverOwnedActor), 'read_denied');
  }
  if (operation === 'create') {
    return decision(resource, canCreate(actor, resource, serverOwnedActor), 'create_denied');
  }
  if (operation === 'write' || operation === 'update') {
    return decision(resource, canWrite(actor, resource, operation, serverOwnedActor), 'write_denied');
  }
  if (operation === 'delete') {
    return decision(resource, canDelete(actor, resource), 'delete_denied');
  }
  return deny(resource, 'operation_denied');
}

function evaluateBackendStoragePolicy(input = {}) {
  const path = normalizePath(input.path);
  const operation = normalizeOperation(input.operation);
  const baseDecision = evaluateBackendPolicy(input);

  if (!baseDecision.allow) return baseDecision;
  if (['read', 'create', 'write', 'update'].includes(operation) && input.document && typeof input.document === 'object') {
    try {
      assertBackendReadableDocumentSafe(path, input.document);
    } catch (error) {
      if (/^backend_readable_secret_field/.test(error.message)) {
        return deny(baseDecision.resource, 'backend_document_secret_field');
      }
      return deny(baseDecision.resource, error.message || 'backend_document_denied');
    }
  }
  return baseDecision;
}

function canRead(actor, resource, serverOwnedActor) {
  if (serverOwnedActor && ['xpAwardEvent', 'xpProjection', 'verifiedLearningAttempt', 'learningProjection', 'institutionalLearningReport'].includes(resource.type)) return true;
  if (resource.type === access.ResourceTypes.AUDIT_LOG) {
    return access.canAccess(actor, access.Capabilities.viewAuditLogs, resource);
  }
  if (resource.type === access.ResourceTypes.FEATURE_FLAG) {
    return access.canAccess(actor, access.Capabilities.manageFeatureFlags, resource);
  }
  if (resource.type === access.ResourceTypes.RELEASE_MANIFEST) {
    return access.canAccess(actor, access.Capabilities.viewReleaseManifest, resource);
  }
  if (resource.type === access.ResourceTypes.TELEMETRY_SUMMARY) {
    return access.canAccess(actor, access.Capabilities.viewTelemetrySummary, resource);
  }
  if (resource.type === access.ResourceTypes.CONTENT_ARTIFACT) {
    return access.canAccess(actor, access.Capabilities.manageContentArtifacts, resource) ||
      access.canAccess(actor, access.Capabilities.manageContent, resource);
  }
  if (resource.type === access.ResourceTypes.CONTENT_PUBLICATION) {
    return access.canAccess(actor, access.Capabilities.reviewContentPublication, resource);
  }
  if (resource.type === access.ResourceTypes.CLASS_SUMMARY) {
    return access.canAccess(actor, access.Capabilities.viewClassDashboardSummary, resource);
  }
  if (resource.type === access.ResourceTypes.ASSIGNMENT) {
    return access.canAccess(actor, access.Capabilities.viewAssignments, resource) ||
      access.canAccess(actor, access.Capabilities.manageAssignments, resource);
  }
  if (resource.type === access.ResourceTypes.ACTIVE_QUIZ) {
    return access.canAccess(actor, access.Capabilities.resumeOwnQuiz, resource) ||
      access.canAccess(actor, access.Capabilities.viewLinkedLearnerReports, resource);
  }
  if (resource.type === access.ResourceTypes.LEARNER_PROGRESS) {
    return access.canAccess(actor, access.Capabilities.viewOwnProgress, resource) ||
      access.canAccess(actor, access.Capabilities.viewLinkedLearnerReports, resource) ||
      access.canAccess(actor, access.Capabilities.viewAssignedLearnerReports, resource) ||
      access.canAccess(actor, access.Capabilities.viewLinkedLearnerDashboard, resource) ||
      access.canAccess(actor, access.Capabilities.viewAssignedLearnerDashboard, resource);
  }
  if (resource.type === access.ResourceTypes.SAVED_SESSION) {
    return access.canAccess(actor, access.Capabilities.viewOwnProgress, toLearnerProgress(resource)) ||
      access.canAccess(actor, access.Capabilities.viewLinkedLearnerReports, resource) ||
      access.canAccess(actor, access.Capabilities.viewAssignedLearnerReports, resource);
  }
  if (resource.type === 'xpAttemptSubmission') {
    return access.canAccess(actor, access.Capabilities.viewOwnProgress, toLearnerProgress(resource));
  }
  if (resource.type === 'learningAttemptSubmission') {
    return access.canAccess(actor, access.Capabilities.viewOwnProgress, toLearnerProgress(resource));
  }
  if (resource.type === 'xpProjection') {
    return access.canAccess(actor, access.Capabilities.viewOwnProgress, toLearnerProgress(resource)) ||
      access.canAccess(actor, access.Capabilities.viewLinkedLearnerReports, resource) ||
      access.canAccess(actor, access.Capabilities.viewAssignedLearnerReports, resource);
  }
  if (resource.type === access.ResourceTypes.QUESTION_REPORT) {
    return access.canAccess(actor, access.Capabilities.viewOwnQuestionReportStatus, resource) ||
      access.canAccess(actor, access.Capabilities.viewLinkedLearnerReports, resource) ||
      access.canAccess(actor, access.Capabilities.viewAssignedLearnerReports, resource) ||
      access.canAccess(actor, access.Capabilities.triageQuestionReport, resource);
  }
  if (resource.type === 'learningProjection') {
    return access.canAccess(actor, access.Capabilities.viewOwnProgress, toLearnerProgress(resource)) ||
      access.canAccess(actor, access.Capabilities.viewLinkedLearnerReports, resource) ||
      access.canAccess(actor, access.Capabilities.viewAssignedLearnerReports, resource);
  }
  if (resource.type === 'institutionalLearningReport') {
    return access.canAccess(actor, access.Capabilities.viewClassDashboardSummary, {
      type: access.ResourceTypes.CLASS_SUMMARY,
      id: resource.id,
      classId: resource.classId
    });
  }
  return false;
}

function canCreate(actor, resource, serverOwnedActor) {
  if (resource.type === 'xpAwardEvent') return serverOwnedActor;
  if (resource.type === 'verifiedLearningAttempt') return serverOwnedActor;
  if (resource.type === access.ResourceTypes.AUDIT_LOG) {
    return actor.role === access.Roles.SYSTEM_ADMIN;
  }
  return canWrite(actor, resource, 'create', serverOwnedActor);
}

function canWrite(actor, resource, operation, serverOwnedActor) {
  if (resource.type === 'xpAwardEvent') return false;
  if (resource.type === 'xpProjection') return serverOwnedActor && (operation === 'write' || operation === 'update');
  if (resource.type === 'verifiedLearningAttempt') return false;
  if (resource.type === 'learningProjection') return serverOwnedActor && (operation === 'write' || operation === 'update');
  if (resource.type === 'institutionalLearningReport') return serverOwnedActor && (operation === 'write' || operation === 'update');
  if (resource.type === 'leaderboardEntry') return serverOwnedActor && (operation === 'write' || operation === 'update');
  if (resource.type === access.ResourceTypes.AUDIT_LOG) return false;
  if (resource.type === access.ResourceTypes.FEATURE_FLAG) {
    return access.canAccess(actor, access.Capabilities.manageFeatureFlags, resource);
  }
  if (resource.type === access.ResourceTypes.CONTENT_ARTIFACT) {
    return access.canAccess(actor, access.Capabilities.manageContentArtifacts, resource);
  }
  if (resource.type === access.ResourceTypes.CONTENT_PUBLICATION) {
    return access.canAccess(actor, access.Capabilities.reviewContentPublication, resource) ||
      access.canAccess(actor, access.Capabilities.approveContentPublication, resource) ||
      access.canAccess(actor, access.Capabilities.publishContentPublication, resource);
  }
  if (resource.type === access.ResourceTypes.ASSIGNMENT) {
    return access.canAccess(actor, access.Capabilities.manageAssignments, resource);
  }
  if (resource.type === access.ResourceTypes.QUESTION_REPORT) {
    return access.canAccess(actor, access.Capabilities.triageQuestionReport, resource) ||
      access.canAccess(actor, access.Capabilities.assignQuestionReport, resource) ||
      access.canAccess(actor, access.Capabilities.resolveQuestionReport, resource);
  }
  if (resource.type === access.ResourceTypes.ACTIVE_QUIZ) {
    return access.canAccess(actor, access.Capabilities.resumeOwnQuiz, resource) ||
      access.canAccess(actor, access.Capabilities.takeQuiz, resource);
  }
  if (resource.type === access.ResourceTypes.SAVED_SESSION) {
    return operation === 'create' && access.canAccess(actor, access.Capabilities.takeQuiz, {
      type: access.ResourceTypes.ACTIVE_QUIZ,
      ownerLearnerId: resource.learnerId
    });
  }
  if (resource.type === 'xpAttemptSubmission') {
    return operation === 'create' && actor.learnerId === resource.learnerId && access.canAccess(actor, access.Capabilities.takeQuiz, {
      type: access.ResourceTypes.ACTIVE_QUIZ,
      ownerLearnerId: resource.learnerId
    });
  }
  if (resource.type === 'learningAttemptSubmission') {
    return operation === 'create' && actor.learnerId === resource.learnerId && access.canAccess(actor, access.Capabilities.takeQuiz, {
      type: access.ResourceTypes.ACTIVE_QUIZ,
      ownerLearnerId: resource.learnerId
    });
  }
  if (resource.type === access.ResourceTypes.LEARNER_PROGRESS) {
    return access.canAccess(actor, access.Capabilities.importOwnLearnerProgress, resource);
  }
  return false;
}

function canDelete() {
  return false;
}

function resolveBackendResource(path) {
  const normalized = normalizePath(path);
  if (SECRET_PATH_PREFIXES.some(prefix => normalized.startsWith(prefix))) {
    return resource('secret', '', '', '');
  }
  let match = normalized.match(/^learners\/([^/]+)\/state$/);
  if (match) return resource(access.ResourceTypes.LEARNER_PROGRESS, match[1], match[1], '');
  match = normalized.match(/^learners\/([^/]+)\/activeQuiz$/);
  if (match) return resource(access.ResourceTypes.ACTIVE_QUIZ, 'activeQuiz', match[1], '');
  match = normalized.match(/^learners\/([^/]+)\/sessions\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.SAVED_SESSION, match[2], match[1], '');
  match = normalized.match(/^learners\/([^/]+)\/xpAttempts\/([^/]+)$/);
  if (match) return resource('xpAttemptSubmission', match[2], match[1], '');
  match = normalized.match(/^learners\/([^/]+)\/learningAttempts\/([^/]+)$/);
  if (match) return resource('learningAttemptSubmission', match[2], match[1], '');
  match = normalized.match(/^learners\/([^/]+)\/xpAwards\/([^/]+)$/);
  if (match) return resource('xpAwardEvent', match[2], match[1], '');
  match = normalized.match(/^xpProjections\/([^/]+)$/);
  if (match) return resource('xpProjection', match[1], match[1], '');
  match = normalized.match(/^verifiedLearningAttempts\/([^/]+)\/events\/([^/]+)$/);
  if (match) return resource('verifiedLearningAttempt', match[2], match[1], '');
  match = normalized.match(/^learningProjections\/([^/]+)$/);
  if (match) return resource('learningProjection', match[1], match[1], '');
  match = normalized.match(/^institutionalLearningReports\/classes\/([^/]+)$/);
  if (match) return resource('institutionalLearningReport', match[1], '', match[1]);
  match = normalized.match(/^leaderboards\/([^/]+)\/entries\/([^/]+)$/);
  if (match) return resource('leaderboardEntry', match[2], '', '');
  match = normalized.match(/^learners\/([^/]+)\/assignments\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.ASSIGNMENT, match[2], match[1], '');
  match = normalized.match(/^learners\/([^/]+)\/questionReports\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.QUESTION_REPORT, match[2], match[1], '');
  match = normalized.match(/^classes\/([^/]+)\/assignments\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.ASSIGNMENT, match[2], '', match[1]);
  match = normalized.match(/^tenants\/([^/]+)\/learners\/([^/]+)\/state$/);
  if (match) return resource(access.ResourceTypes.LEARNER_PROGRESS, match[2], match[2], '', tenantMeta(match[1], tenantDomain.PartitionResourceTypes.LEARNER_STATE, tenantDomain.PartitionOwnerTypes.LEARNER, match[2], match[2], ''));
  match = normalized.match(/^tenants\/([^/]+)\/verifiedLearningAttempts\/([^/]+)\/events\/([^/]+)$/);
  if (match) return resource('verifiedLearningAttempt', match[3], match[2], '', tenantMeta(match[1], tenantDomain.PartitionResourceTypes.VERIFIED_ATTEMPT, tenantDomain.PartitionOwnerTypes.LEARNER, match[2], match[2], ''));
  match = normalized.match(/^tenants\/([^/]+)\/learningProjections\/([^/]+)$/);
  if (match) return resource('learningProjection', match[2], match[2], '', tenantMeta(match[1], tenantDomain.PartitionResourceTypes.REPORT, tenantDomain.PartitionOwnerTypes.LEARNER, match[2], match[2], ''));
  match = normalized.match(/^tenants\/([^/]+)\/institutionalLearningReports\/classes\/([^/]+)$/);
  if (match) return resource('institutionalLearningReport', match[2], '', match[2], tenantMeta(match[1], tenantDomain.PartitionResourceTypes.REPORT, tenantDomain.PartitionOwnerTypes.CLASS, match[2], '', match[2]));
  match = normalized.match(/^tenants\/([^/]+)\/classes\/([^/]+)\/assignments\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.ASSIGNMENT, match[3], '', match[2], tenantMeta(match[1], tenantDomain.PartitionResourceTypes.ASSIGNMENT, tenantDomain.PartitionOwnerTypes.CLASS, match[2], '', match[2]));
  match = normalized.match(/^tenants\/([^/]+)\/billingSummaries\/([^/]+)$/);
  if (match) return resource('billingSummary', match[2], '', '', tenantMeta(match[1], tenantDomain.PartitionResourceTypes.BILLING_SUMMARY, tenantDomain.PartitionOwnerTypes.TENANT, match[1], '', ''));
  match = normalized.match(/^tenants\/([^/]+)\/auditEvents\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.AUDIT_LOG, match[2], '', '', tenantMeta(match[1], tenantDomain.PartitionResourceTypes.AUDIT_RECORD, tenantDomain.PartitionOwnerTypes.AUDIT_SCOPE, match[2], '', ''));
  match = normalized.match(/^dashboards\/learners\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.LEARNER_PROGRESS, match[1], match[1], '');
  match = normalized.match(/^dashboards\/classes\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.CLASS_SUMMARY, match[1], '', match[1]);
  match = normalized.match(/^auditEvents\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.AUDIT_LOG, match[1], '', '');
  match = normalized.match(/^config\/featureFlags\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.FEATURE_FLAG, match[1], '', '');
  match = normalized.match(/^telemetrySummaries\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.TELEMETRY_SUMMARY, match[1], '', '');
  match = normalized.match(/^releaseManifests\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.RELEASE_MANIFEST, match[1], '', '');
  match = normalized.match(/^contentPublications\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.CONTENT_PUBLICATION, match[1], '', '');
  return resource('unknown', '', '', '');
}

function assertBackendReadableDocumentSafe(path, document) {
  const resource = resolveBackendResource(path);
  if (resource.type === 'secret' || resource.type === 'unknown') {
    throw new Error('backend_readable_path_denied');
  }
  const secretPath = findSecretField(document);
  if (secretPath) throw new Error(`backend_readable_secret_field:${secretPath}`);
  if (resource.type === access.ResourceTypes.LEARNER_PROGRESS && findClientOwnedXpProjectionField(document)) {
    throw new Error('backend_document_client_xp_projection_denied');
  }
  if (['xpAwardEvent', 'xpProjection', 'leaderboardEntry', 'verifiedLearningAttempt', 'learningProjection', 'institutionalLearningReport'].includes(resource.type) && findSensitiveLearnerPayloadField(document)) {
    throw new Error('backend_document_sensitive_learner_payload');
  }
  return true;
}

function findSecretField(value, trail = []) {
  if (!value || typeof value !== 'object') return '';
  return Object.keys(value).find(key => SECRET_FIELD_PATTERN.test(key)) ||
    Object.keys(value).map(key => findSecretField(value[key], trail.concat(key))).find(Boolean) || '';
}

function toLearnerProgress(resourceValue) {
  return Object.assign({}, resourceValue, { type: access.ResourceTypes.LEARNER_PROGRESS });
}

function isServerOwnedActor(actor) {
  return actor && typeof actor === 'object' && (actor.serverOwned === true || actor.role === 'server_service');
}

function findClientOwnedXpProjectionField(value) {
  if (!value || typeof value !== 'object') return '';
  return Object.keys(value).find(key => XP_PROJECTION_FIELD_PATTERN.test(key)) ||
    Object.keys(value).map(key => findClientOwnedXpProjectionField(value[key])).find(Boolean) || '';
}

function findSensitiveLearnerPayloadField(value) {
  if (!value || typeof value !== 'object') return '';
  return Object.keys(value).find(key => SENSITIVE_LEARNER_PAYLOAD_PATTERN.test(key)) ||
    Object.keys(value).map(key => findSensitiveLearnerPayloadField(value[key])).find(Boolean) || '';
}

function tenantMeta(tenantId, resourceType, ownerType, ownerId, learnerId, classId) {
  return {
    tenantId: String(tenantId || ''),
    tenantType: tenantDomain.TenantTypes.SCHOOL,
    partitionKey: tenantDomain.buildDataPartitionKey({
      tenantId,
      tenantType: tenantDomain.TenantTypes.SCHOOL,
      resourceType,
      ownerType,
      ownerId,
      learnerId,
      classId,
      accessBoundary: tenantDomain.AccessBoundaries.INSTITUTION
    })
  };
}

function evaluateTenantBoundary(actor, operation, resourceValue) {
  if (!resourceValue || !resourceValue.partitionKey) return { allow: true, reason: 'allowed' };
  return tenantDomain.evaluateTenantPartitionAccess({
    actor,
    operation,
    partitionKey: resourceValue.partitionKey
  });
}

function resource(type, id, learnerId, classId, extra) {
  return Object.assign({
    type,
    id: String(id || ''),
    learnerId: String(learnerId || ''),
    ownerLearnerId: String(learnerId || ''),
    classId: String(classId || '')
  }, extra || {});
}

function decision(resourceValue, allow, deniedReason) {
  return allow ? { allow: true, resource: resourceValue, reason: 'allowed' } : deny(resourceValue, deniedReason);
}

function deny(resourceValue, reason) {
  return { allow: false, resource: resourceValue, reason };
}

function normalizeOperation(operation) {
  return String(operation || '').trim();
}

function normalizePath(path) {
  return String(path || '').trim().replace(/^\/+|\/+$/g, '');
}

module.exports = {
  BACKEND_STORAGE_PATHS,
  assertBackendReadableDocumentSafe,
  evaluateBackendPolicy,
  evaluateBackendStoragePolicy,
  resolveBackendResource
};
