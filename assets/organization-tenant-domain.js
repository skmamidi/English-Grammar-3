(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestOrganizationTenantDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const TenantTypes = Object.freeze({
    DISTRICT: 'district',
    SCHOOL: 'school',
    CLASSROOM: 'classroom',
    FAMILY: 'family'
  });

  const DataOwnership = Object.freeze({
    INSTITUTION: 'institution',
    FAMILY: 'family'
  });

  const MembershipRoles = Object.freeze({
    DISTRICT_ADMIN: 'district_admin',
    SCHOOL_ADMIN: 'school_admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
    GUARDIAN: 'guardian',
    BILLING_OWNER: 'billing_owner',
    SUPPORT_OPERATOR: 'support_operator'
  });

  const PartitionResourceTypes = Object.freeze({
    LEARNER_STATE: 'learner_state',
    VERIFIED_ATTEMPT: 'verified_attempt',
    REPORT: 'report',
    ASSIGNMENT: 'assignment',
    BILLING_SUMMARY: 'billing_summary',
    AUDIT_RECORD: 'audit_record'
  });

  const PartitionOwnerTypes = Object.freeze({
    LEARNER: 'learner',
    CLASS: 'class',
    TENANT: 'tenant',
    BILLING_OWNER: 'billing_owner',
    AUDIT_SCOPE: 'audit_scope'
  });

  const AccessBoundaries = Object.freeze({
    INSTITUTION: 'institution',
    FAMILY: 'family'
  });

  const ACTIVE_STATUSES = new Set(['active']);
  const READ_OPERATIONS = new Set(['read']);
  const WRITE_OPERATIONS = new Set(['create', 'write', 'update']);

  function normalizeOrganizationTenant(raw) {
    const input = objectValue(raw);
    return {
      schemaVersion: Number(input.schemaVersion || 1),
      tenantId: safeString(input.tenantId || input.id),
      tenantType: safeString(input.tenantType || input.type),
      displayName: safeString(input.displayName || input.name),
      parentTenantId: safeString(input.parentTenantId),
      status: safeString(input.status || 'draft'),
      policy: normalizeTenantPolicy(input.policy)
    };
  }

  function validateOrganizationTenant(raw) {
    const tenant = normalizeOrganizationTenant(raw);
    const errors = [];
    if (tenant.schemaVersion !== 1) errors.push('tenant_schema_version_must_be_1');
    if (!tenant.tenantId) errors.push('tenant_id_required');
    if (!Object.values(TenantTypes).includes(tenant.tenantType)) errors.push('tenant_type_unknown');
    if (!tenant.displayName) errors.push('tenant_display_name_required');
    if (!['draft', 'active', 'suspended', 'archived'].includes(tenant.status)) errors.push('tenant_status_unknown');
    errors.push(...validateTenantPolicy(tenant.policy).errors);
    return { valid: errors.length === 0, errors };
  }

  function normalizeTenantPolicy(raw) {
    const input = objectValue(raw);
    return {
      dataOwnership: safeString(input.dataOwnership || DataOwnership.INSTITUTION),
      learnerAccessBoundary: safeString(input.learnerAccessBoundary || AccessBoundaries.INSTITUTION),
      allowFamilyLinks: input.allowFamilyLinks === true,
      allowCrossTenantReports: input.allowCrossTenantReports === true
    };
  }

  function validateTenantPolicy(raw) {
    const policy = normalizeTenantPolicy(raw);
    const errors = [];
    if (!Object.values(DataOwnership).includes(policy.dataOwnership)) errors.push('tenant_policy_data_ownership_unknown');
    if (!Object.values(AccessBoundaries).includes(policy.learnerAccessBoundary)) errors.push('tenant_policy_access_boundary_unknown');
    if (policy.allowCrossTenantReports) errors.push('tenant_policy_cross_tenant_reports_forbidden');
    return { valid: errors.length === 0, errors };
  }

  function normalizeTenantMembership(raw) {
    const input = objectValue(raw);
    return {
      schemaVersion: Number(input.schemaVersion || 1),
      membershipId: safeString(input.membershipId || input.id),
      tenantId: safeString(input.tenantId),
      tenantType: safeString(input.tenantType),
      actorId: safeString(input.actorId || input.userId || input.id),
      role: safeString(input.role),
      status: safeString(input.status || 'pending'),
      learnerIds: normalizeIdList(input.learnerIds || input.linkedLearnerIds || input.assignedLearnerIds),
      classIds: normalizeIdList(input.classIds || input.assignedClassIds),
      source: safeString(input.source || 'manual'),
      providerPayload: input.providerPayload
    };
  }

  function validateTenantMembership(raw) {
    const membership = normalizeTenantMembership(raw);
    const errors = [];
    if (membership.schemaVersion !== 1) errors.push('tenant_membership_schema_version_must_be_1');
    if (!membership.membershipId) errors.push('tenant_membership_id_required');
    if (!membership.tenantId) errors.push('tenant_membership_tenant_id_required');
    if (!Object.values(TenantTypes).includes(membership.tenantType)) errors.push('tenant_membership_tenant_type_unknown');
    if (!Object.values(MembershipRoles).includes(membership.role)) errors.push('tenant_membership_role_unknown');
    if (!['pending', 'active', 'suspended', 'revoked'].includes(membership.status)) errors.push('tenant_membership_status_unknown');
    if (membership.providerPayload !== undefined) errors.push('tenant_membership_provider_payload_forbidden');
    return { valid: errors.length === 0, errors };
  }

  function buildDataPartitionKey(raw) {
    const input = objectValue(raw);
    return {
      schemaVersion: Number(input.schemaVersion || 1),
      tenantId: safeString(input.tenantId),
      tenantType: safeString(input.tenantType),
      resourceType: safeString(input.resourceType),
      ownerType: safeString(input.ownerType),
      ownerId: safeString(input.ownerId),
      learnerId: safeString(input.learnerId),
      classId: safeString(input.classId),
      accessBoundary: safeString(input.accessBoundary || AccessBoundaries.INSTITUTION)
    };
  }

  function validateDataPartitionKey(raw) {
    const key = buildDataPartitionKey(raw);
    const errors = [];
    if (key.schemaVersion !== 1) errors.push('partition_schema_version_must_be_1');
    if (!key.tenantId) errors.push('partition_tenant_id_required');
    if (!Object.values(TenantTypes).includes(key.tenantType)) errors.push('partition_tenant_type_unknown');
    if (!Object.values(PartitionResourceTypes).includes(key.resourceType)) errors.push('partition_resource_type_unknown');
    if (!Object.values(PartitionOwnerTypes).includes(key.ownerType)) errors.push('partition_owner_type_unknown');
    if (!key.ownerId) errors.push('partition_owner_id_required');
    if (!Object.values(AccessBoundaries).includes(key.accessBoundary)) errors.push('partition_access_boundary_unknown');
    if (key.ownerType === PartitionOwnerTypes.LEARNER && key.learnerId && key.ownerId !== key.learnerId) {
      errors.push('partition_owner_must_match_learner');
    }
    if (key.ownerType === PartitionOwnerTypes.CLASS && key.classId && key.ownerId !== key.classId) {
      errors.push('partition_owner_must_match_class');
    }
    if (key.resourceType === PartitionResourceTypes.BILLING_SUMMARY && key.learnerId) {
      errors.push('billing_partition_must_not_include_learner');
    }
    return { valid: errors.length === 0, errors };
  }

  function buildTenantAuditScope(raw) {
    const input = objectValue(raw);
    return {
      schemaVersion: Number(input.schemaVersion || 1),
      tenantId: safeString(input.tenantId),
      tenantType: safeString(input.tenantType),
      scopeId: safeString(input.scopeId || input.id),
      purpose: safeString(input.purpose),
      reviewerRole: safeString(input.reviewerRole),
      includesLearnerContent: input.includesLearnerContent === true
    };
  }

  function validateTenantAuditScope(raw) {
    const scope = buildTenantAuditScope(raw);
    const errors = [];
    if (scope.schemaVersion !== 1) errors.push('tenant_audit_scope_schema_version_must_be_1');
    if (!scope.tenantId) errors.push('tenant_audit_scope_tenant_id_required');
    if (!Object.values(TenantTypes).includes(scope.tenantType)) errors.push('tenant_audit_scope_tenant_type_unknown');
    if (!scope.scopeId) errors.push('tenant_audit_scope_id_required');
    if (!scope.purpose) errors.push('tenant_audit_scope_purpose_required');
    if (!Object.values(MembershipRoles).includes(scope.reviewerRole)) errors.push('tenant_audit_scope_reviewer_role_unknown');
    if (scope.includesLearnerContent) errors.push('tenant_audit_scope_must_not_include_learner_content');
    return { valid: errors.length === 0, errors };
  }

  function evaluateTenantPartitionAccess(raw) {
    const input = objectValue(raw);
    const actor = objectValue(input.actor);
    const operation = safeString(input.operation || 'read');
    const partitionKey = buildDataPartitionKey(input.partitionKey || input.resource || {});
    const validation = validateDataPartitionKey(partitionKey);
    if (!validation.valid) return deny('partition_invalid');

    if (isServerOwnedActor(actor)) {
      return normalizeIdList(actor.serviceTenantIds).includes(partitionKey.tenantId)
        ? allow()
        : deny('tenant_membership_required');
    }

    const membership = findActiveMembership(actor, partitionKey);
    if (!membership) return deny('tenant_membership_required');
    if (READ_OPERATIONS.has(operation)) return readDecision(actor, membership, partitionKey);
    if (WRITE_OPERATIONS.has(operation)) return writeDecision(actor, membership, partitionKey);
    return deny('tenant_operation_denied');
  }

  function readDecision(actor, membership, partitionKey) {
    if ([MembershipRoles.DISTRICT_ADMIN, MembershipRoles.SCHOOL_ADMIN, MembershipRoles.SUPPORT_OPERATOR].includes(membership.role)) return allow();
    if (membership.role === MembershipRoles.TEACHER) {
      if (partitionKey.classId && membership.classIds.includes(partitionKey.classId)) return allow();
      if (partitionKey.learnerId && membership.learnerIds.includes(partitionKey.learnerId)) return allow();
      return deny('tenant_resource_not_assigned');
    }
    if (membership.role === MembershipRoles.STUDENT) {
      return partitionKey.learnerId && partitionKey.learnerId === safeString(actor.learnerId)
        ? allow()
        : deny('tenant_resource_not_assigned');
    }
    if (membership.role === MembershipRoles.GUARDIAN) {
      return partitionKey.learnerId &&
        (membership.learnerIds.includes(partitionKey.learnerId) || normalizeIdList(actor.linkedLearnerIds).includes(partitionKey.learnerId))
        ? allow()
        : deny('tenant_resource_not_assigned');
    }
    if (membership.role === MembershipRoles.BILLING_OWNER) {
      return partitionKey.resourceType === PartitionResourceTypes.BILLING_SUMMARY ? allow() : deny('tenant_resource_not_assigned');
    }
    return deny('tenant_role_denied');
  }

  function writeDecision(actor, membership, partitionKey) {
    if ([MembershipRoles.DISTRICT_ADMIN, MembershipRoles.SCHOOL_ADMIN].includes(membership.role)) return allow();
    if (membership.role === MembershipRoles.TEACHER && partitionKey.resourceType === PartitionResourceTypes.ASSIGNMENT) {
      if (partitionKey.classId && membership.classIds.includes(partitionKey.classId)) return allow();
      if (partitionKey.learnerId && membership.learnerIds.includes(partitionKey.learnerId)) return allow();
    }
    if (membership.role === MembershipRoles.STUDENT && partitionKey.resourceType === PartitionResourceTypes.LEARNER_STATE) {
      return partitionKey.learnerId === safeString(actor.learnerId) ? allow() : deny('tenant_resource_not_assigned');
    }
    return deny('tenant_write_denied');
  }

  function findActiveMembership(actor, partitionKey) {
    return normalizeTenantMemberships(actor.tenantMemberships).find(membership =>
      membership.tenantId === partitionKey.tenantId &&
      membership.tenantType === partitionKey.tenantType &&
      ACTIVE_STATUSES.has(membership.status)
    );
  }

  function normalizeTenantMemberships(value) {
    return (Array.isArray(value) ? value : []).map(normalizeTenantMembership);
  }

  function isServerOwnedActor(actor) {
    return actor && typeof actor === 'object' && (actor.serverOwned === true || actor.role === 'server_service');
  }

  function allow() {
    return { allow: true, reason: 'allowed' };
  }

  function deny(reason) {
    return { allow: false, reason };
  }

  function normalizeIdList(value) {
    return Array.from(new Set((Array.isArray(value) ? value : []).map(safeString).filter(Boolean)));
  }

  function objectValue(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    AccessBoundaries,
    DataOwnership,
    MembershipRoles,
    PartitionOwnerTypes,
    PartitionResourceTypes,
    TenantTypes,
    buildDataPartitionKey,
    buildTenantAuditScope,
    evaluateTenantPartitionAccess,
    normalizeOrganizationTenant,
    normalizeTenantMembership,
    normalizeTenantMemberships,
    normalizeTenantPolicy,
    validateDataPartitionKey,
    validateOrganizationTenant,
    validateTenantAuditScope,
    validateTenantMembership,
    validateTenantPolicy
  };
});
