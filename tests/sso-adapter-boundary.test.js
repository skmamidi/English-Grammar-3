const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sso = require('../server/sso-adapter-boundary');

const repoRoot = path.resolve(__dirname, '..');

test('SSO assertions validate sanitized identity claims without provider payloads', () => {
  const assertion = sso.normalizeSsoIdentityAssertion({
    schemaVersion: 1,
    assertionId: 'assertion-1',
    tenantId: 'school-a',
    tenantType: 'school',
    providerClass: 'identity_provider',
    subjectRef: 'idp:subject:hash-a',
    assertedRole: 'teacher',
    issuedAt: '2026-05-04T14:30:00.000Z',
    expiresAt: '2026-05-04T14:35:00.000Z',
    audience: 'grammar-quest-school-a'
  });

  assert.deepEqual(sso.validateSsoIdentityAssertion(assertion).errors, []);
  assert.deepEqual(sso.validateSsoIdentityAssertion(Object.assign({}, assertion, {
    rawToken: 'header.payload.signature'
  })).errors, ['sso_raw_token_forbidden']);
  assert.deepEqual(sso.validateSsoIdentityAssertion(Object.assign({}, assertion, {
    providerPayload: { groups: ['teachers'] }
  })).errors, ['sso_provider_payload_forbidden']);
});

test('SSO provisioning requires roster identity match tenant membership and role policy', () => {
  const assertion = sso.normalizeSsoIdentityAssertion({
    schemaVersion: 1,
    assertionId: 'assertion-teacher-a',
    tenantId: 'school-a',
    tenantType: 'school',
    providerClass: 'google_workspace',
    subjectRef: 'google:subject:hash-a',
    assertedRole: 'teacher',
    issuedAt: '2026-05-04T14:30:00.000Z',
    expiresAt: '2026-05-04T14:35:00.000Z',
    audience: 'grammar-quest-school-a'
  });
  const noMatch = sso.evaluateProvisioningDecision({ assertion, rosterIdentityMatches: [] });
  const matched = sso.evaluateProvisioningDecision({
    assertion,
    rosterIdentityMatches: [{
      subjectRef: 'google:subject:hash-a',
      actorId: 'teacher-a',
      tenantId: 'school-a',
      tenantType: 'school',
      role: 'teacher',
      status: 'active',
      learnerIds: ['learner-a'],
      classIds: ['class-a']
    }],
    tenantPolicyApproved: true
  });

  assert.deepEqual(noMatch, {
    allow: false,
    reason: 'roster_identity_match_required',
    membership: null
  });
  assert.equal(matched.allow, true);
  assert.equal(matched.membership.actorId, 'teacher-a');
  assert.equal(matched.membership.tenantId, 'school-a');
  assert.equal(matched.membership.role, 'teacher');
  assert.deepEqual(matched.membership.classIds, ['class-a']);
});

test('SSO does not grant learner data access for unsafe roles or cross-tenant claims', () => {
  const unsafeRole = sso.evaluateProvisioningDecision({
    assertion: {
      schemaVersion: 1,
      assertionId: 'assertion-admin',
      tenantId: 'school-a',
      tenantType: 'school',
      providerClass: 'identity_provider',
      subjectRef: 'idp:subject:hash-admin',
      assertedRole: 'super_admin',
      issuedAt: '2026-05-04T14:30:00.000Z',
      expiresAt: '2026-05-04T14:35:00.000Z',
      audience: 'grammar-quest-school-a'
    },
    rosterIdentityMatches: [{ subjectRef: 'idp:subject:hash-admin', actorId: 'admin-a', tenantId: 'school-a', tenantType: 'school', role: 'super_admin', status: 'active' }],
    tenantPolicyApproved: true
  });
  const crossTenant = sso.evaluateProvisioningDecision({
    assertion: {
      schemaVersion: 1,
      assertionId: 'assertion-cross',
      tenantId: 'school-a',
      tenantType: 'school',
      providerClass: 'identity_provider',
      subjectRef: 'idp:subject:hash-teacher',
      assertedRole: 'teacher',
      issuedAt: '2026-05-04T14:30:00.000Z',
      expiresAt: '2026-05-04T14:35:00.000Z',
      audience: 'grammar-quest-school-a'
    },
    rosterIdentityMatches: [{ subjectRef: 'idp:subject:hash-teacher', actorId: 'teacher-a', tenantId: 'school-b', tenantType: 'school', role: 'teacher', status: 'active' }],
    tenantPolicyApproved: true
  });

  assert.equal(unsafeRole.allow, false);
  assert.equal(unsafeRole.reason, 'sso_asserted_role_not_allowed');
  assert.equal(crossTenant.allow, false);
  assert.equal(crossTenant.reason, 'sso_tenant_mismatch');
});

test('SSO adapter boundary docs and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'roster-and-sso-boundaries.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /SsoIdentityAssertion/);
  assert.match(docs, /SSO proves identity/i);
  assert.match(docs, /not automatically authorization/i);
  assert.match(pkg.scripts['test:unit'], /tests\/sso-adapter-boundary\.test\.js/);
});
