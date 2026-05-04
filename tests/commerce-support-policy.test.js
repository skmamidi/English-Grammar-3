const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const access = require('../assets/access-control');
const audit = require('../assets/audit-log-domain');
const {
  COMMERCE_SUPPORT_ACTIONS,
  DEFAULT_COMMERCE_SUPPORT_POLICY,
  buildCommerceSupportAuditEvent,
  canPerformCommerceSupportAction,
  sanitizeCommerceSupportRecord,
  validateCommerceSupportAction,
  validateCommerceSupportPolicy
} = require('../assets/commerce-support-policy');

const repoRoot = path.resolve(__dirname, '..');

test('commerce support policy defines bounded support abuse and manual adjustment actions', () => {
  assert.deepEqual(COMMERCE_SUPPORT_ACTIONS, [
    'view_billing_summary',
    'verify_account_ownership',
    'resend_receipt',
    'explain_billing_status',
    'grant_complimentary_access',
    'revoke_complimentary_access',
    'flag_abuse',
    'escalate_refund_or_dispute'
  ]);

  const result = validateCommerceSupportPolicy(DEFAULT_COMMERCE_SUPPORT_POLICY);

  assert.deepEqual(result.errors, []);
  assert.equal(DEFAULT_COMMERCE_SUPPORT_POLICY.denyByDefault, true);
  assert.equal(DEFAULT_COMMERCE_SUPPORT_POLICY.impersonationAllowed, false);
});

test('support actions require capability, parent ownership verification, evidence, and relationship scope', () => {
  const supportActor = {
    id: 'support-1',
    role: 'commerce_support',
    capabilities: ['commerce_support:billing_summary', 'commerce_support:verify_owner']
  };
  const action = {
    action: 'view_billing_summary',
    billingOwnerId: 'guardian-1',
    verifiedParentGuardianId: 'guardian-1',
    evidence: ['support_ticket_verified_contact'],
    reason: 'Parent asked for renewal status.'
  };

  assert.equal(canPerformCommerceSupportAction(supportActor, action).allowed, true);

  assert.equal(canPerformCommerceSupportAction({ ...supportActor, capabilities: [] }, action).allowed, false);
  assert.ok(validateCommerceSupportAction({ ...action, verifiedParentGuardianId: 'guardian-2' }).errors.includes('parent ownership verification must match billing owner'));
  assert.ok(validateCommerceSupportAction({ ...action, evidence: [] }).errors.includes('support evidence is required'));

  [
    access.Roles.SYSTEM_ADMIN,
    access.Roles.TEACHER,
    access.Roles.CONTENT_REVIEWER,
    access.Roles.PARENT_GUARDIAN
  ].forEach(role => {
    assert.equal(canPerformCommerceSupportAction({ id: `${role}-1`, role }, action).allowed, false);
  });
});

test('manual complimentary access requires expiration evidence and audited reason', () => {
  const action = {
    action: 'grant_complimentary_access',
    billingOwnerId: 'guardian-1',
    verifiedParentGuardianId: 'guardian-1',
    evidence: ['support_ticket_manual_access'],
    reason: 'Compensatory access after verified billing outage.',
    manualAccess: {
      accessLevel: 'premium',
      expiresAt: '2030-05-03T00:00:00.000Z',
      source: 'support_adjustment'
    }
  };

  assert.deepEqual(validateCommerceSupportAction(action).errors, []);
  assert.ok(validateCommerceSupportAction({
    ...action,
    manualAccess: { ...action.manualAccess, expiresAt: '' }
  }).errors.includes('manual access expiration is required'));
  assert.ok(validateCommerceSupportAction({
    ...action,
    manualAccess: { ...action.manualAccess, source: 'provider_portal' }
  }).errors.includes('manual access source must be support_adjustment'));
});

test('abuse flags limit checkout without exposing learner content or issuing billing changes', () => {
  const action = {
    action: 'flag_abuse',
    billingOwnerId: 'guardian-1',
    verifiedParentGuardianId: 'guardian-1',
    evidence: ['chargeback_pattern_reviewed'],
    reason: 'Provider-neutral abuse review requires checkout hold.',
    abuseFlag: {
      status: 'checkout_blocked',
      expiresAt: '2030-05-10T00:00:00.000Z',
      escalationOwner: 'billing_policy_owner'
    }
  };

  assert.deepEqual(validateCommerceSupportAction(action).errors, []);
  assert.ok(validateCommerceSupportAction({
    ...action,
    abuseFlag: { ...action.abuseFlag, status: 'entitlement_revoked' }
  }).errors.includes('abuse flag cannot directly change entitlements'));
});

test('support audit events redact learner content provider payloads and payment credentials', () => {
  const event = buildCommerceSupportAuditEvent(
    { id: 'support-1', role: 'commerce_support' },
    {
      action: 'resend_receipt',
      billingOwnerId: 'guardian-1',
      verifiedParentGuardianId: 'guardian-1',
      evidence: ['support_ticket_verified_contact'],
      reason: 'Parent requested a receipt resend.'
    },
    {
      id: () => 'audit-commerce-support-1',
      now: () => '2030-05-03T12:00:00.000Z'
    }
  );

  assert.deepEqual(audit.validateAuditEvent(event), []);
  assert.equal(event.resourceType, 'commerceSupportAction');
  assert.equal(event.metadata.billingOwnerId, 'guardian-1');

  const sanitized = sanitizeCommerceSupportRecord({
    billingOwnerId: 'guardian-1',
    learnerId: 'learner-1',
    studentName: 'Student Name',
    questionPrompt: 'Raw question prompt',
    providerCustomerId: 'provider-customer-placeholder',
    rawProviderPayload: { type: 'checkout.session.completed' },
    cardNumber: 'forbidden-card-placeholder',
    supportNote: 'Receipt resend approved.'
  });

  assert.equal(JSON.stringify(sanitized).includes('learner-1'), false);
  assert.equal(JSON.stringify(sanitized).includes('Student Name'), false);
  assert.equal(JSON.stringify(sanitized).includes('Raw question prompt'), false);
  assert.equal(JSON.stringify(sanitized).includes('provider-customer-placeholder'), false);
  assert.equal(JSON.stringify(sanitized).includes('forbidden-card-placeholder'), false);
  assert.equal(sanitized.supportNote, 'Receipt resend approved.');
});

test('commerce support docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'commerce-support-policy.md'), 'utf8');
  const roles = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'roles-and-permissions.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'verify account ownership',
    'manual access expiration',
    'complimentary access',
    'abuse flag',
    'refund or dispute escalation',
    'no impersonation',
    'learner-content isolation',
    'raw provider payload'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(roles, /commerce_support/);
  assert.match(pkg.scripts['test:unit'], /tests\/commerce-support-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
