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
