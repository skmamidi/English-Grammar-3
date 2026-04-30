const assert = require('node:assert/strict');
const test = require('node:test');

const access = require('../assets/access-control');
const audit = require('../assets/audit-log-domain');

test('audit event builder creates valid operational events', () => {
  const event = audit.buildAuditEvent(
    { id: 'admin-1', role: access.Roles.SYSTEM_ADMIN },
    access.Capabilities.manageFeatureFlags,
    { type: access.ResourceTypes.FEATURE_FLAG, id: 'server-selection' },
    { enabled: true },
    { now: () => '2030-04-29T12:00:00.000Z', id: () => 'audit-fixed' }
  );

  assert.deepEqual(audit.validateAuditEvent(event), []);
  assert.equal(event.id, 'audit-fixed');
  assert.equal(event.actorId, 'admin-1');
  assert.equal(event.actorRole, access.Roles.SYSTEM_ADMIN);
  assert.equal(event.action, access.Capabilities.manageFeatureFlags);
  assert.equal(event.resourceType, access.ResourceTypes.FEATURE_FLAG);
});

test('audit metadata redacts secrets private keys tokens and learner answers', () => {
  const sanitized = audit.sanitizeAuditMetadata({
    privateKey: 'PRIVATE KEY MATERIAL',
    authToken: 'token-123',
    learnerAnswer: 'A',
    question: 'Full question body',
    nested: {
      signingSecret: 'secret',
      responseDigest: 'sha256:abc'
    }
  });

  assert.equal(JSON.stringify(sanitized).includes('PRIVATE KEY MATERIAL'), false);
  assert.equal(JSON.stringify(sanitized).includes('token-123'), false);
  assert.equal(JSON.stringify(sanitized).includes('Full question body'), false);
  assert.equal(sanitized.privateKey, '[REDACTED]');
  assert.equal(sanitized.authToken, '[REDACTED]');
  assert.equal(sanitized.learnerAnswer, '[REDACTED]');
  assert.equal(sanitized.question, '[REDACTED]');
  assert.equal(sanitized.nested.signingSecret, '[REDACTED]');
  assert.equal(sanitized.nested.responseDigest, 'sha256:abc');
});

test('audit event validation requires actor action resource and timestamp', () => {
  assert.deepEqual(audit.validateAuditEvent({}), [
    'id',
    'actorId',
    'actorRole',
    'action',
    'resourceType',
    'createdAt'
  ]);
});

test('support impersonation policy denies by default and requires explicit controls', () => {
  assert.equal(audit.canUseSupportAccess({
    actor: { id: 'admin-1', role: access.Roles.SYSTEM_ADMIN },
    learnerId: 'learner-1',
    reason: 'Debug support ticket',
    expiresAt: '2030-04-29T13:00:00.000Z'
  }), false);
});

test('question report triage audit events redact report notes and question payloads', () => {
  const event = audit.buildAuditEvent(
    { id: 'reviewer-1', role: access.Roles.TEACHER },
    'question_report_resolved',
    { type: access.ResourceTypes.QUESTION_REPORT, id: 'report-1' },
    { notes: 'Fixed typo', questionText: 'Raw prompt', explanation: 'Raw explanation' },
    { id: () => 'audit-1', now: () => '2030-04-29T12:00:00.000Z' }
  );

  assert.equal(event.action, 'question_report_resolved');
  assert.equal(event.metadata.notes, 'Fixed typo');
  assert.equal(event.metadata.questionText, '[REDACTED]');
  assert.equal(event.metadata.explanation, '[REDACTED]');
});

test('learner data lifecycle audit events redact backup and tombstone details', () => {
  const event = audit.buildLearnerDataLifecycleAuditEvent(
    { id: 'admin-1', role: access.Roles.SYSTEM_ADMIN },
    'learner_data_deleted',
    { learnerId: 'learner-1', deletionRequestId: 'delete-1' },
    { backupEnvelope: { authToken: 'secret' }, tombstone: { learnerId: 'learner-1' } },
    { id: () => 'audit-delete-1', now: () => '2030-04-29T12:00:00.000Z' }
  );

  assert.equal(event.action, 'learner_data_deleted');
  assert.equal(event.resourceType, access.ResourceTypes.LEARNER_PROGRESS);
  assert.equal(event.resourceId, 'learner-1');
  assert.equal(JSON.stringify(event).includes('secret'), false);
  assert.equal(event.metadata.backupEnvelope, '[REDACTED]');
});
