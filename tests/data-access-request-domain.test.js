const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const access = require('../assets/access-control');
const {
  DATA_ACCESS_REQUEST_TYPES,
  DATA_ACCESS_STATUSES,
  createDataAccessRequest,
  sanitizeDataAccessRequestSummary,
  transitionDataAccessRequest,
  validateDataAccessRequest
} = require('../assets/data-access-request-domain');
const exportPolicy = require('../assets/institutional-data-export-policy');

const actors = require('./fixtures/backend-security/actors.json');
const repoRoot = path.resolve(__dirname, '..');

test('data access request domain defines request types and explicit statuses', () => {
  assert.deepEqual(DATA_ACCESS_REQUEST_TYPES, [
    'export',
    'correction',
    'deletion',
    'retention_review',
    'audit_review'
  ]);
  assert.deepEqual(DATA_ACCESS_STATUSES, [
    'submitted',
    'verified',
    'approved',
    'in_progress',
    'fulfilled',
    'rejected',
    'expired',
    'canceled'
  ]);
});

test('student export request is normalized with classification categories due date and evidence shell', () => {
  const request = createDataAccessRequest({
    type: 'export',
    requester: actors.student,
    learnerId: 'learner-a',
    categories: ['learner_progress', 'learner_answer_attempt', 'privacy_preference'],
    reason: 'family record request'
  }, { id: () => 'dar-1', now: () => '2030-04-29T12:00:00.000Z' });

  assert.equal(request.id, 'dar-1');
  assert.equal(request.type, 'export');
  assert.equal(request.status, 'submitted');
  assert.equal(request.requester.actorId, 'student-user-a');
  assert.equal(request.reviewerRole, access.Roles.SYSTEM_ADMIN);
  assert.equal(request.dueAt, '2030-05-29T12:00:00.000Z');
  assert.deepEqual(request.categories, ['learner_answer_attempt', 'learner_progress', 'privacy_preference']);
  assert.deepEqual(request.verificationEvidence, []);
  assert.deepEqual(validateDataAccessRequest(request), []);
});

test('actor scope denies unrelated guardians content reviewers support and system-admin learner browsing', () => {
  assert.throws(() => createDataAccessRequest({
    type: 'export',
    requester: actors.guardianUnrelated,
    learnerId: 'learner-a',
    categories: ['learner_progress']
  }), /data_access_request_denied/);

  assert.throws(() => createDataAccessRequest({
    type: 'deletion',
    requester: actors.teacherUnrelated,
    learnerId: 'learner-a',
    categories: ['learner_progress']
  }), /data_access_request_denied/);

  assert.throws(() => createDataAccessRequest({
    type: 'export',
    requester: actors.contentReviewer,
    learnerId: 'learner-a',
    categories: ['learner_progress']
  }), /data_access_request_denied/);

  assert.throws(() => createDataAccessRequest({
    type: 'export',
    requester: { ...actors.teacherAssigned, supportImpersonation: true },
    learnerId: 'learner-a',
    categories: ['learner_progress']
  }), /data_access_request_denied/);
});

test('retention and audit review requests are operational and never include learner payload categories', () => {
  const retention = createDataAccessRequest({
    type: 'retention_review',
    requester: actors.systemAdmin,
    categories: ['release_artifact', 'operational_config', 'audit_event'],
    reason: 'release evidence review'
  }, { id: () => 'dar-retention', now: () => '2030-04-29T12:00:00.000Z' });

  const audit = createDataAccessRequest({
    type: 'audit_review',
    requester: actors.systemAdmin,
    categories: ['audit_event'],
    reason: 'security review'
  }, { id: () => 'dar-audit', now: () => '2030-04-29T12:00:00.000Z' });

  assert.deepEqual(retention.categories, ['audit_event', 'operational_config', 'release_artifact']);
  assert.deepEqual(audit.categories, ['audit_event']);
  assert.deepEqual(validateDataAccessRequest(retention), []);
  assert.deepEqual(validateDataAccessRequest(audit), []);
});

test('institutional exports use the tenant export policy instead of learner data access requests', () => {
  assert.throws(() => createDataAccessRequest({
    type: 'export',
    requester: actors.systemAdmin,
    categories: ['institutional_report_projection']
  }), /data_access_request_denied/);

  const request = exportPolicy.normalizeInstitutionalExportRequest({
    id: 'school-export-1',
    tenantId: 'school-a',
    tenantType: 'school',
    requester: {
      id: 'school-admin-a',
      role: 'system_admin',
      tenantMemberships: [{
        tenantId: 'school-a',
        tenantType: 'school',
        role: 'school_admin',
        status: 'active'
      }]
    },
    purpose: exportPolicy.ExportPurposes.COMPLIANCE_REVIEW,
    scope: { categories: ['institutional_report_projection'] },
    redactionProfile: exportPolicy.RedactionProfiles.AGGREGATE_REPORT,
    expiresAt: '2030-05-06T12:00:00.000Z',
    createdAt: '2030-05-05T12:00:00.000Z'
  });

  assert.deepEqual(exportPolicy.validateInstitutionalExportRequest(request).errors, []);
});

test('workflow transitions require evidence and reject invalid order', () => {
  const submitted = createDataAccessRequest({
    type: 'deletion',
    requester: actors.guardianLinked,
    learnerId: 'learner-a',
    categories: ['learner_progress', 'learner_answer_attempt'],
    reason: 'guardian deletion request'
  }, { id: () => 'dar-delete', now: () => '2030-04-29T12:00:00.000Z' });

  assert.throws(() => transitionDataAccessRequest(submitted, 'fulfilled'), /data_access_invalid_transition/);
  assert.throws(() => transitionDataAccessRequest(submitted, 'verified'), /data_access_evidence_required/);

  const verified = transitionDataAccessRequest(submitted, 'verified', {
    actor: actors.systemAdmin,
    evidence: [{ type: 'identity_check', reference: 'case-note', verifiedAt: '2030-04-29T12:05:00.000Z' }]
  }, { now: () => '2030-04-29T12:05:00.000Z' });
  const approved = transitionDataAccessRequest(verified, 'approved', {
    actor: actors.systemAdmin,
    evidence: [{ type: 'scope_review', reference: 'classification-map' }]
  }, { now: () => '2030-04-29T12:10:00.000Z' });
  const inProgress = transitionDataAccessRequest(approved, 'in_progress', {
    actor: actors.systemAdmin,
    evidence: [{ type: 'job_started', reference: 'provider-neutral-workflow' }]
  }, { now: () => '2030-04-29T12:15:00.000Z' });
  const fulfilled = transitionDataAccessRequest(inProgress, 'fulfilled', {
    actor: actors.systemAdmin,
    evidence: [{ type: 'sanitized_delivery', reference: 'export-envelope-digest' }]
  }, { now: () => '2030-04-29T12:20:00.000Z' });

  assert.equal(fulfilled.status, 'fulfilled');
  assert.equal(fulfilled.auditTrail.length, 4);
  assert.equal(fulfilled.verificationEvidence.length, 4);
});

test('request summaries and evidence are sanitized', () => {
  const request = createDataAccessRequest({
    type: 'correction',
    requester: actors.student,
    learnerId: 'learner-a',
    categories: ['learner_progress'],
    reason: 'wrong saved progress',
    metadata: {
      question: 'Raw prompt should not appear',
      learnerAnswer: 'A',
      authToken: 'secret'
    }
  }, { id: () => 'dar-correction', now: () => '2030-04-29T12:00:00.000Z' });
  const summary = sanitizeDataAccessRequestSummary(request);

  assert.equal(JSON.stringify(summary).includes('Raw prompt'), false);
  assert.equal(JSON.stringify(summary).includes('secret'), false);
  assert.equal(summary.metadata.question, '[REDACTED]');
  assert.equal(summary.metadata.learnerAnswer, '[REDACTED]');
  assert.equal(summary.metadata.authToken, '[REDACTED]');
});

test('data access request docs link lifecycle retention backup and audit workflows', () => {
  const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'data-access-requests.md'), 'utf8');
  [
    'export',
    'correction',
    'deletion',
    'retention review',
    'audit review',
    'learner-data-lifecycle.md',
    'backup-restore.md',
    'learner-data-retention-policy',
    'audit-log-domain.test.js',
    'data-inventory.md',
    'institutional-data-export-and-audit.md'
  ].forEach(required => assert.match(doc, new RegExp(escapeRegex(required), 'i')));
});

test('ci contract wires the data access request test into the unit gate', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['test:unit'], /tests\/data-access-request-domain\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
