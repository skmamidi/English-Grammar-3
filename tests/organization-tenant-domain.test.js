const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const tenant = require('../assets/organization-tenant-domain');

const repoRoot = path.resolve(__dirname, '..');

test('organization tenants normalize school district classroom and family ownership', () => {
  const school = tenant.normalizeOrganizationTenant({
    schemaVersion: 1,
    tenantId: 'school-a',
    tenantType: tenant.TenantTypes.SCHOOL,
    displayName: 'School A',
    parentTenantId: 'district-a',
    status: 'active',
    policy: {
      dataOwnership: tenant.DataOwnership.INSTITUTION,
      learnerAccessBoundary: 'institution',
      allowFamilyLinks: true,
      allowCrossTenantReports: false
    }
  });
  const family = tenant.normalizeOrganizationTenant({
    schemaVersion: 1,
    tenantId: 'family-a',
    tenantType: tenant.TenantTypes.FAMILY,
    displayName: 'Family A',
    status: 'active',
    policy: {
      dataOwnership: tenant.DataOwnership.FAMILY,
      learnerAccessBoundary: 'family',
      allowFamilyLinks: true
    }
  });

  assert.deepEqual(tenant.validateOrganizationTenant(school).errors, []);
  assert.deepEqual(tenant.validateOrganizationTenant(family).errors, []);
  assert.equal(school.policy.dataOwnership, 'institution');
  assert.equal(family.policy.dataOwnership, 'family');
  assert.deepEqual(tenant.validateOrganizationTenant({
    schemaVersion: 1,
    tenantId: 'school-provider',
    tenantType: tenant.TenantTypes.SCHOOL,
    displayName: 'Unsafe School',
    status: 'active',
    policy: { dataOwnership: 'provider_payload' }
  }).errors, ['tenant_policy_data_ownership_unknown']);
});

test('memberships are explicit role grants and never infer access from provider payloads', () => {
  const teacher = tenant.normalizeTenantMembership({
    schemaVersion: 1,
    membershipId: 'mem-teacher-a',
    tenantId: 'school-a',
    tenantType: tenant.TenantTypes.SCHOOL,
    actorId: 'teacher-a',
    role: tenant.MembershipRoles.TEACHER,
    status: 'active',
    learnerIds: ['learner-a'],
    classIds: ['class-a'],
    source: 'roster_import'
  });
  const guardian = tenant.normalizeTenantMembership({
    schemaVersion: 1,
    membershipId: 'mem-guardian-family-a',
    tenantId: 'family-a',
    tenantType: tenant.TenantTypes.FAMILY,
    actorId: 'guardian-a',
    role: tenant.MembershipRoles.GUARDIAN,
    status: 'active',
    learnerIds: ['learner-a'],
    source: 'guardian_invite',
    providerPayload: { email: 'unsafe@example.test' }
  });

  assert.deepEqual(tenant.validateTenantMembership(teacher).errors, []);
  assert.deepEqual(tenant.validateTenantMembership(guardian).errors, ['tenant_membership_provider_payload_forbidden']);
  assert.equal(teacher.role, 'teacher');
  assert.deepEqual(teacher.learnerIds, ['learner-a']);
});

test('roster and SSO memberships normalize into the tenant membership contract', () => {
  const stagedMembership = tenant.normalizeTenantMembership({
    membershipId: 'mem-sso-teacher-a',
    tenantId: 'school-a',
    tenantType: tenant.TenantTypes.SCHOOL,
    actorId: 'teacher-a',
    role: tenant.MembershipRoles.TEACHER,
    status: 'active',
    learnerIds: ['learner-a'],
    classIds: ['class-a'],
    source: 'sso_roster_match'
  });

  assert.deepEqual(tenant.validateTenantMembership(stagedMembership).errors, []);
  assert.equal(stagedMembership.source, 'sso_roster_match');
});

test('data partition keys cover learner state attempts reports assignments billing summaries and audits', () => {
  const learnerState = tenant.buildDataPartitionKey({
    tenantId: 'school-a',
    tenantType: tenant.TenantTypes.SCHOOL,
    resourceType: tenant.PartitionResourceTypes.LEARNER_STATE,
    ownerType: tenant.PartitionOwnerTypes.LEARNER,
    ownerId: 'learner-a',
    learnerId: 'learner-a',
    accessBoundary: tenant.AccessBoundaries.INSTITUTION
  });
  const report = tenant.buildDataPartitionKey({
    tenantId: 'school-a',
    tenantType: tenant.TenantTypes.SCHOOL,
    resourceType: tenant.PartitionResourceTypes.REPORT,
    ownerType: tenant.PartitionOwnerTypes.CLASS,
    ownerId: 'class-a',
    classId: 'class-a',
    accessBoundary: tenant.AccessBoundaries.INSTITUTION
  });
  const billing = tenant.buildDataPartitionKey({
    tenantId: 'district-a',
    tenantType: tenant.TenantTypes.DISTRICT,
    resourceType: tenant.PartitionResourceTypes.BILLING_SUMMARY,
    ownerType: tenant.PartitionOwnerTypes.TENANT,
    ownerId: 'district-a',
    accessBoundary: tenant.AccessBoundaries.INSTITUTION
  });
  const audit = tenant.buildTenantAuditScope({
    tenantId: 'school-a',
    tenantType: tenant.TenantTypes.SCHOOL,
    scopeId: 'audit-school-a-2026-05',
    purpose: 'access_review',
    reviewerRole: tenant.MembershipRoles.SCHOOL_ADMIN,
    includesLearnerContent: false
  });

  assert.deepEqual(tenant.validateDataPartitionKey(learnerState).errors, []);
  assert.deepEqual(tenant.validateDataPartitionKey(report).errors, []);
  assert.deepEqual(tenant.validateDataPartitionKey(billing).errors, []);
  assert.deepEqual(tenant.validateTenantAuditScope(audit).errors, []);
  assert.deepEqual(tenant.validateDataPartitionKey({
    tenantId: 'school-a',
    tenantType: tenant.TenantTypes.SCHOOL,
    resourceType: tenant.PartitionResourceTypes.VERIFIED_ATTEMPT,
    ownerType: tenant.PartitionOwnerTypes.LEARNER,
    ownerId: 'learner-a',
    learnerId: 'learner-b',
    accessBoundary: tenant.AccessBoundaries.INSTITUTION
  }).errors, ['partition_owner_must_match_learner']);
  assert.deepEqual(tenant.validateTenantAuditScope(Object.assign({}, audit, {
    includesLearnerContent: true
  })).errors, ['tenant_audit_scope_must_not_include_learner_content']);
});

test('tenant partition access denies cross-tenant access by default', () => {
  const teacher = {
    id: 'teacher-a',
    role: 'teacher',
    assignedLearnerIds: ['learner-a'],
    assignedClassIds: ['class-a'],
    tenantMemberships: [{
      tenantId: 'school-a',
      tenantType: tenant.TenantTypes.SCHOOL,
      role: tenant.MembershipRoles.TEACHER,
      status: 'active',
      learnerIds: ['learner-a'],
      classIds: ['class-a']
    }]
  };
  const schoolAState = tenant.buildDataPartitionKey({
    tenantId: 'school-a',
    tenantType: tenant.TenantTypes.SCHOOL,
    resourceType: tenant.PartitionResourceTypes.LEARNER_STATE,
    ownerType: tenant.PartitionOwnerTypes.LEARNER,
    ownerId: 'learner-a',
    learnerId: 'learner-a',
    accessBoundary: tenant.AccessBoundaries.INSTITUTION
  });
  const schoolBState = Object.assign({}, schoolAState, { tenantId: 'school-b' });

  assert.equal(tenant.evaluateTenantPartitionAccess({ actor: teacher, operation: 'read', partitionKey: schoolAState }).allow, true);
  assert.deepEqual(tenant.evaluateTenantPartitionAccess({ actor: teacher, operation: 'read', partitionKey: schoolBState }), {
    allow: false,
    reason: 'tenant_membership_required'
  });
  assert.equal(tenant.evaluateTenantPartitionAccess({
    actor: Object.assign({}, teacher, { role: 'server_service', serverOwned: true, serviceTenantIds: ['school-a'] }),
    operation: 'write',
    partitionKey: schoolAState
  }).allow, true);
  assert.equal(tenant.evaluateTenantPartitionAccess({
    actor: Object.assign({}, teacher, { role: 'server_service', serverOwned: true, serviceTenantIds: ['school-b'] }),
    operation: 'write',
    partitionKey: schoolAState
  }).allow, false);
});

test('family-owned learner links do not grant institutional access without same-tenant policy', () => {
  const guardian = {
    id: 'guardian-a',
    role: 'parent_guardian',
    linkedLearnerIds: ['learner-a'],
    tenantMemberships: [{
      tenantId: 'family-a',
      tenantType: tenant.TenantTypes.FAMILY,
      role: tenant.MembershipRoles.GUARDIAN,
      status: 'active',
      learnerIds: ['learner-a']
    }]
  };
  const familyPartition = tenant.buildDataPartitionKey({
    tenantId: 'family-a',
    tenantType: tenant.TenantTypes.FAMILY,
    resourceType: tenant.PartitionResourceTypes.LEARNER_STATE,
    ownerType: tenant.PartitionOwnerTypes.LEARNER,
    ownerId: 'learner-a',
    learnerId: 'learner-a',
    accessBoundary: tenant.AccessBoundaries.FAMILY
  });
  const schoolPartition = Object.assign({}, familyPartition, {
    tenantId: 'school-a',
    tenantType: tenant.TenantTypes.SCHOOL,
    accessBoundary: tenant.AccessBoundaries.INSTITUTION
  });

  assert.equal(tenant.evaluateTenantPartitionAccess({ actor: guardian, operation: 'read', partitionKey: familyPartition }).allow, true);
  assert.equal(tenant.evaluateTenantPartitionAccess({ actor: guardian, operation: 'read', partitionKey: schoolPartition }).allow, false);
});

test('organization tenancy docs and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'organization-tenancy.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /OrganizationTenant/);
  assert.match(docs, /TenantMembership/);
  assert.match(docs, /DataPartitionKey/);
  assert.match(docs, /family-owned/i);
  assert.match(docs, /institution-owned/i);
  assert.match(docs, /deny-by-default/i);
  assert.match(pkg.scripts['test:unit'], /tests\/organization-tenant-domain\.test\.js/);
});
