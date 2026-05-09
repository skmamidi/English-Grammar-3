const tenantDomain = require('../assets/organization-tenant-domain');

const PROVIDER_CLASSES = Object.freeze(['identity_provider', 'google_workspace', 'saml', 'openid_connect']);
const ASSERTED_ROLES = Object.freeze(['student', 'guardian', 'teacher', 'school_admin', 'district_admin']);

function normalizeSsoIdentityAssertion(raw = {}) {
  const input = objectValue(raw);
  return {
    schemaVersion: Number(input.schemaVersion || 1),
    assertionId: safeString(input.assertionId || input.id),
    tenantId: safeString(input.tenantId),
    tenantType: safeString(input.tenantType),
    providerClass: safeString(input.providerClass),
    subjectRef: safeString(input.subjectRef),
    assertedRole: safeString(input.assertedRole || input.role),
    issuedAt: safeString(input.issuedAt),
    expiresAt: safeString(input.expiresAt),
    audience: safeString(input.audience),
    rawToken: input.rawToken,
    providerPayload: input.providerPayload
  };
}

function validateSsoIdentityAssertion(raw = {}) {
  const assertion = normalizeSsoIdentityAssertion(raw);
  const errors = [];
  if (assertion.schemaVersion !== 1) errors.push('sso_assertion_schema_version_must_be_1');
  if (!assertion.assertionId) errors.push('sso_assertion_id_required');
  if (!assertion.tenantId) errors.push('sso_tenant_id_required');
  if (!Object.values(tenantDomain.TenantTypes).includes(assertion.tenantType)) errors.push('sso_tenant_type_unknown');
  if (!PROVIDER_CLASSES.includes(assertion.providerClass)) errors.push('sso_provider_class_unknown');
  if (!assertion.subjectRef) errors.push('sso_subject_ref_required');
  if (!ASSERTED_ROLES.includes(assertion.assertedRole)) errors.push('sso_asserted_role_not_allowed');
  if (!safeIso(assertion.issuedAt)) errors.push('sso_issued_at_required');
  if (!safeIso(assertion.expiresAt)) errors.push('sso_expires_at_required');
  if (safeIso(assertion.issuedAt) && safeIso(assertion.expiresAt) && new Date(assertion.expiresAt).getTime() <= new Date(assertion.issuedAt).getTime()) {
    errors.push('sso_assertion_expired');
  }
  if (!assertion.audience) errors.push('sso_audience_required');
  if (assertion.rawToken !== undefined) errors.push('sso_raw_token_forbidden');
  if (assertion.providerPayload !== undefined) errors.push('sso_provider_payload_forbidden');
  return { valid: errors.length === 0, errors };
}

function evaluateProvisioningDecision(input = {}) {
  const assertion = normalizeSsoIdentityAssertion(input.assertion);
  const validation = validateSsoIdentityAssertion(assertion);
  if (validation.errors.includes('sso_asserted_role_not_allowed')) return deny('sso_asserted_role_not_allowed');
  if (!validation.valid) return deny(validation.errors[0] || 'sso_assertion_invalid');

  const match = normalizeArray(input.rosterIdentityMatches).map(normalizeRosterIdentityMatch).find(candidate =>
    candidate.subjectRef === assertion.subjectRef &&
    candidate.status === 'active'
  );
  if (!match) return deny('roster_identity_match_required');
  if (input.tenantPolicyApproved !== true) return deny('tenant_policy_approval_required');
  if (match.tenantId !== assertion.tenantId || match.tenantType !== assertion.tenantType) return deny('sso_tenant_mismatch');
  if (match.role !== assertion.assertedRole) return deny('sso_role_mismatch');

  return {
    allow: true,
    reason: 'allowed',
    membership: tenantDomain.normalizeTenantMembership({
      membershipId: `${assertion.tenantId}:${match.actorId}:${match.role}`,
      tenantId: assertion.tenantId,
      tenantType: assertion.tenantType,
      actorId: match.actorId,
      role: mapSsoRole(match.role),
      status: 'active',
      learnerIds: match.learnerIds,
      classIds: match.classIds,
      source: 'sso_roster_match'
    })
  };
}

function normalizeRosterIdentityMatch(raw = {}) {
  const input = objectValue(raw);
  return {
    subjectRef: safeString(input.subjectRef),
    actorId: safeString(input.actorId),
    tenantId: safeString(input.tenantId),
    tenantType: safeString(input.tenantType),
    role: safeString(input.role),
    status: safeString(input.status || 'pending'),
    learnerIds: normalizeIdList(input.learnerIds),
    classIds: normalizeIdList(input.classIds)
  };
}

function mapSsoRole(role) {
  if (role === 'student') return tenantDomain.MembershipRoles.STUDENT;
  if (role === 'guardian') return tenantDomain.MembershipRoles.GUARDIAN;
  if (role === 'teacher') return tenantDomain.MembershipRoles.TEACHER;
  if (role === 'school_admin') return tenantDomain.MembershipRoles.SCHOOL_ADMIN;
  if (role === 'district_admin') return tenantDomain.MembershipRoles.DISTRICT_ADMIN;
  return role;
}

function deny(reason) {
  return { allow: false, reason, membership: null };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeIdList(value) {
  return Array.from(new Set(normalizeArray(value).map(safeString).filter(Boolean))).sort();
}

function objectValue(value) {
  return value && typeof value === 'object' ? value : {};
}

function safeString(value) {
  return String(value || '').trim();
}

function safeIso(value) {
  const date = new Date(value);
  return typeof value === 'string' && value.trim() && !Number.isNaN(date.getTime());
}

module.exports = {
  ASSERTED_ROLES,
  PROVIDER_CLASSES,
  evaluateProvisioningDecision,
  normalizeRosterIdentityMatch,
  normalizeSsoIdentityAssertion,
  validateSsoIdentityAssertion
};
