const access = require('../assets/access-control');

const BACKEND_STORAGE_PATHS = Object.freeze({
  learnerState: learnerId => `learners/${learnerId}/state`,
  activeQuiz: learnerId => `learners/${learnerId}/activeQuiz`,
  savedSession: (learnerId, sessionId) => `learners/${learnerId}/sessions/${sessionId}`,
  assignmentForLearner: (learnerId, assignmentId) => `learners/${learnerId}/assignments/${assignmentId}`,
  assignmentForClass: (classId, assignmentId) => `classes/${classId}/assignments/${assignmentId}`,
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
const SECRET_PATH_PREFIXES = [
  'privateSigningKeys/',
  'serviceAccounts/',
  'authTokens/',
  'config/secrets/'
];

function evaluateBackendPolicy(input = {}) {
  const actor = access.normalizeActor(input.actor);
  const operation = normalizeOperation(input.operation);
  const path = normalizePath(input.path);
  const resource = resolveBackendResource(path);

  if (resource.type === 'secret' || resource.type === 'unknown') {
    return deny(resource, 'backend_path_denied');
  }
  if (operation === 'read') {
    return decision(resource, canRead(actor, resource), 'read_denied');
  }
  if (operation === 'create') {
    return decision(resource, canCreate(actor, resource), 'create_denied');
  }
  if (operation === 'write' || operation === 'update') {
    return decision(resource, canWrite(actor, resource, operation), 'write_denied');
  }
  if (operation === 'delete') {
    return decision(resource, canDelete(actor, resource), 'delete_denied');
  }
  return deny(resource, 'operation_denied');
}

function canRead(actor, resource) {
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
  if (resource.type === access.ResourceTypes.QUESTION_REPORT) {
    return access.canAccess(actor, access.Capabilities.viewOwnQuestionReportStatus, resource) ||
      access.canAccess(actor, access.Capabilities.viewLinkedLearnerReports, resource) ||
      access.canAccess(actor, access.Capabilities.viewAssignedLearnerReports, resource) ||
      access.canAccess(actor, access.Capabilities.triageQuestionReport, resource);
  }
  return false;
}

function canCreate(actor, resource) {
  if (resource.type === access.ResourceTypes.AUDIT_LOG) {
    return actor.role === access.Roles.SYSTEM_ADMIN;
  }
  return canWrite(actor, resource, 'create');
}

function canWrite(actor, resource, operation) {
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
  match = normalized.match(/^learners\/([^/]+)\/assignments\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.ASSIGNMENT, match[2], match[1], '');
  match = normalized.match(/^learners\/([^/]+)\/questionReports\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.QUESTION_REPORT, match[2], match[1], '');
  match = normalized.match(/^classes\/([^/]+)\/assignments\/([^/]+)$/);
  if (match) return resource(access.ResourceTypes.ASSIGNMENT, match[2], '', match[1]);
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

function resource(type, id, learnerId, classId) {
  return {
    type,
    id: String(id || ''),
    learnerId: String(learnerId || ''),
    ownerLearnerId: String(learnerId || ''),
    classId: String(classId || '')
  };
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
  resolveBackendResource
};
