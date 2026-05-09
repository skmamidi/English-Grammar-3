const tenantDomain = require('../assets/organization-tenant-domain');

const PROVIDER_CLASSES = Object.freeze(['sis', 'clever', 'classlink', 'google_workspace', 'csv']);
const BATCH_MODES = Object.freeze(['dry_run', 'staged', 'activate']);
const CHANGE_ACTIONS = Object.freeze(['upsert', 'drop']);
const ROSTER_ROLES = Object.freeze(['student', 'guardian', 'teacher', 'school_admin', 'district_admin']);
const LIVE_PROVIDER_FIELD_PATTERN = /(^|_|\b)(providerPayload|rawPayload|rawProvider|providerStudentId|providerUserId|providerGuardianId|providerTeacherId|accessToken|refreshToken|idToken|samlResponse|secret)(\b|_|$)/i;

function normalizeRosterImportBatch(raw = {}) {
  const input = objectValue(raw);
  return {
    schemaVersion: Number(input.schemaVersion || 1),
    batchId: safeString(input.batchId || input.id),
    tenantId: safeString(input.tenantId),
    tenantType: safeString(input.tenantType),
    providerClass: safeString(input.providerClass),
    mode: safeString(input.mode || 'dry_run'),
    idempotencyKey: safeString(input.idempotencyKey),
    receivedAt: safeString(input.receivedAt),
    identities: normalizeArray(input.identities).map(buildRosterIdentityMatch),
    membershipChanges: normalizeArray(input.membershipChanges).map(buildRosterMembershipChange),
    providerPayload: input.providerPayload
  };
}

function validateRosterImportBatch(raw = {}) {
  const batch = normalizeRosterImportBatch(raw);
  const errors = [];
  if (batch.schemaVersion !== 1) errors.push('roster_batch_schema_version_must_be_1');
  if (!batch.batchId) errors.push('roster_batch_id_required');
  if (!batch.tenantId) errors.push('roster_batch_tenant_id_required');
  if (!Object.values(tenantDomain.TenantTypes).includes(batch.tenantType)) errors.push('roster_batch_tenant_type_unknown');
  if (!PROVIDER_CLASSES.includes(batch.providerClass)) errors.push('roster_batch_provider_class_unknown');
  if (!BATCH_MODES.includes(batch.mode)) errors.push('roster_batch_mode_unknown');
  if (!batch.idempotencyKey) errors.push('roster_batch_idempotency_key_required');
  if (!safeIso(batch.receivedAt)) errors.push('roster_batch_received_at_required');
  if (batch.providerPayload !== undefined) errors.push('roster_batch_provider_payload_forbidden');
  batch.identities.forEach((identity, index) => {
    validateRosterIdentityMatch(identity).errors.forEach(error => errors.push(`identity_${index}_${error}`));
  });
  batch.membershipChanges.forEach((change, index) => {
    validateRosterMembershipChange(change).errors.forEach(error => errors.push(`membership_${index}_${error}`));
  });
  return { valid: errors.length === 0, errors };
}

function buildRosterIdentityMatch(raw = {}) {
  const input = objectValue(raw);
  return {
    schemaVersion: Number(input.schemaVersion || 1),
    matchId: safeString(input.matchId || input.id),
    tenantId: safeString(input.tenantId),
    appOwnedLearnerId: safeString(input.appOwnedLearnerId || input.learnerId),
    rosterRole: safeString(input.rosterRole || input.role),
    redactedProviderRef: safeString(input.redactedProviderRef || input.providerRef),
    confidence: Number(input.confidence || 0),
    providerStudentId: input.providerStudentId,
    providerPayload: input.providerPayload
  };
}

function validateRosterIdentityMatch(raw = {}) {
  const identity = buildRosterIdentityMatch(raw);
  const errors = [];
  if (identity.schemaVersion !== 1) errors.push('roster_identity_schema_version_must_be_1');
  if (!identity.matchId) errors.push('roster_identity_match_id_required');
  if (!identity.tenantId) errors.push('roster_identity_tenant_id_required');
  if (!identity.appOwnedLearnerId) errors.push('roster_identity_app_owned_learner_id_required');
  if (!ROSTER_ROLES.includes(identity.rosterRole)) errors.push('roster_identity_role_unknown');
  if (!identity.redactedProviderRef) errors.push('roster_identity_redacted_provider_ref_required');
  if (!Number.isFinite(identity.confidence) || identity.confidence < 0 || identity.confidence > 1) errors.push('roster_identity_confidence_out_of_range');
  if (identity.providerStudentId !== undefined) errors.push('roster_identity_provider_identifier_forbidden');
  if (identity.providerPayload !== undefined) errors.push('roster_identity_provider_payload_forbidden');
  return { valid: errors.length === 0, errors };
}

function buildRosterMembershipChange(raw = {}) {
  const input = objectValue(raw);
  return {
    schemaVersion: Number(input.schemaVersion || 1),
    changeId: safeString(input.changeId || input.id),
    tenantId: safeString(input.tenantId),
    actorId: safeString(input.actorId || input.userId),
    role: safeString(input.role),
    action: safeString(input.action || 'upsert'),
    learnerIds: normalizeIdList(input.learnerIds),
    classIds: normalizeIdList(input.classIds),
    redactedProviderRef: safeString(input.redactedProviderRef || input.providerRef),
    providerPayload: input.providerPayload
  };
}

function validateRosterMembershipChange(raw = {}) {
  const change = buildRosterMembershipChange(raw);
  const errors = [];
  if (change.schemaVersion !== 1) errors.push('roster_membership_schema_version_must_be_1');
  if (!change.changeId) errors.push('roster_membership_change_id_required');
  if (!change.tenantId) errors.push('roster_membership_tenant_id_required');
  if (!change.actorId) errors.push('roster_membership_actor_id_required');
  if (!ROSTER_ROLES.includes(change.role)) errors.push('roster_membership_role_unknown');
  if (!CHANGE_ACTIONS.includes(change.action)) errors.push('roster_membership_action_unknown');
  if (!change.redactedProviderRef) errors.push('roster_membership_redacted_provider_ref_required');
  if (change.providerPayload !== undefined) errors.push('roster_membership_provider_payload_forbidden');
  return { valid: errors.length === 0, errors };
}

function createRosterState(raw = {}) {
  const input = objectValue(raw);
  return {
    memberships: normalizeArray(input.memberships).map(normalizeExistingMembership),
    appliedBatchIds: normalizeIdList(input.appliedBatchIds),
    appliedIdempotencyKeys: normalizeIdList(input.appliedIdempotencyKeys)
  };
}

function stageRosterImportBatch(rawState, rawBatch) {
  const state = createRosterState(rawState);
  const batch = normalizeRosterImportBatch(rawBatch);
  const blockers = validateRosterImportBatch(batch).errors.slice();
  const warnings = [];

  batch.membershipChanges.forEach(change => {
    validateRosterMembershipChange(change).errors.forEach(error => {
      if (error === 'roster_membership_provider_payload_forbidden') blockers.push(`${error}:${change.changeId}`);
    });
  });

  if (state.appliedBatchIds.includes(batch.batchId) || state.appliedIdempotencyKeys.includes(batch.idempotencyKey)) {
    return buildStageResult(batch, [], ['roster_batch_already_staged'], blockers, []);
  }

  findDuplicateLearners(batch.identities).forEach(learnerId => blockers.push(`duplicate_student_identity:${learnerId}`));
  findGuardianConflicts(state, batch).forEach(actorId => blockers.push(`guardian_conflict:${actorId}`));

  const changes = [];
  batch.membershipChanges.forEach(change => {
    const existing = state.memberships.find(item =>
      item.tenantId === batch.tenantId &&
      item.actorId === change.actorId &&
      item.role === change.role &&
      item.status === 'active'
    );
    if (change.action === 'drop') {
      changes.push(changeRecord('drop_membership', change, existing));
    } else if (existing && change.role === 'teacher' && !sameSet(existing.classIds, change.classIds)) {
      changes.push(Object.assign(changeRecord('teacher_transfer', change, existing), {
        fromClassIds: existing.classIds,
        toClassIds: change.classIds
      }));
    } else if (!existing || !sameSet(existing.learnerIds, change.learnerIds) || !sameSet(existing.classIds, change.classIds)) {
      changes.push(changeRecord(existing ? 'update_membership' : 'create_membership', change, existing));
    }
  });

  const represented = new Set(batch.membershipChanges.map(change => `${change.actorId}:${change.role}`));
  state.memberships
    .filter(item => item.tenantId === batch.tenantId && item.status === 'active')
    .filter(item => !represented.has(`${item.actorId}:${item.role}`))
    .forEach(item => changes.push({
      type: 'drop_membership',
      actorId: item.actorId,
      role: item.role,
      tenantId: item.tenantId,
      previous: item,
      next: null
    }));

  return buildStageResult(batch, changes, warnings, blockers, changes.map(change => auditRecord(batch, change)));
}

function buildRosterRollbackPlan(stageResult = {}) {
  const changes = normalizeArray(stageResult.changes);
  return {
    batchId: safeString(stageResult.batchId),
    tenantId: safeString(stageResult.tenantId),
    reversible: changes.every(change => !!change.previous || change.type === 'create_membership'),
    rollbackActions: changes.map(change => ({
      type: `rollback_${change.type}`,
      actorId: change.actorId,
      restoreMembership: change.previous || null,
      removeMembership: change.type === 'create_membership' ? change.next : null
    }))
  };
}

function findDuplicateLearners(identities) {
  const counts = new Map();
  identities.forEach(identity => {
    if (!identity.appOwnedLearnerId) return;
    counts.set(identity.appOwnedLearnerId, (counts.get(identity.appOwnedLearnerId) || 0) + 1);
  });
  return Array.from(counts.entries()).filter(([, count]) => count > 1).map(([learnerId]) => learnerId);
}

function findGuardianConflicts(state, batch) {
  return batch.membershipChanges
    .filter(change => change.role === 'guardian' && change.action === 'upsert')
    .filter(change => state.memberships.some(existing =>
      existing.role === 'guardian' &&
      existing.actorId === change.actorId &&
      existing.status === 'active' &&
      !sameSet(existing.learnerIds, change.learnerIds)
    ))
    .map(change => change.actorId);
}

function buildStageResult(batch, changes, warnings, blockers, auditRecords) {
  return {
    batchId: batch.batchId,
    tenantId: batch.tenantId,
    dryRun: batch.mode === 'dry_run',
    activationAllowed: batch.mode === 'activate' && blockers.length === 0,
    changes,
    warnings,
    blockers: Array.from(new Set(blockers)),
    auditRecords
  };
}

function changeRecord(type, change, existing) {
  return {
    type,
    actorId: change.actorId,
    role: change.role,
    tenantId: change.tenantId,
    previous: existing || null,
    next: tenantDomain.normalizeTenantMembership({
      membershipId: `${change.tenantId}:${change.actorId}:${change.role}`,
      tenantId: change.tenantId,
      tenantType: tenantDomain.TenantTypes.SCHOOL,
      actorId: change.actorId,
      role: mapRosterRole(change.role),
      status: change.action === 'drop' ? 'revoked' : 'active',
      learnerIds: change.learnerIds,
      classIds: change.classIds,
      source: 'roster_import'
    })
  };
}

function auditRecord(batch, change) {
  return {
    type: 'roster_import_change',
    batchId: batch.batchId,
    tenantId: batch.tenantId,
    changeType: change.type,
    actorRef: `actor:${change.actorId}`,
    membershipRole: change.role
  };
}

function normalizeExistingMembership(raw = {}) {
  const input = objectValue(raw);
  return {
    membershipId: safeString(input.membershipId || input.id),
    tenantId: safeString(input.tenantId),
    tenantType: safeString(input.tenantType || tenantDomain.TenantTypes.SCHOOL),
    actorId: safeString(input.actorId),
    role: safeString(input.role),
    status: safeString(input.status || 'active'),
    learnerIds: normalizeIdList(input.learnerIds),
    classIds: normalizeIdList(input.classIds)
  };
}

function mapRosterRole(role) {
  if (role === 'student') return tenantDomain.MembershipRoles.STUDENT;
  if (role === 'guardian') return tenantDomain.MembershipRoles.GUARDIAN;
  if (role === 'teacher') return tenantDomain.MembershipRoles.TEACHER;
  if (role === 'school_admin') return tenantDomain.MembershipRoles.SCHOOL_ADMIN;
  if (role === 'district_admin') return tenantDomain.MembershipRoles.DISTRICT_ADMIN;
  return role;
}

function sameSet(left, right) {
  const leftList = normalizeIdList(left);
  const rightList = normalizeIdList(right);
  return leftList.length === rightList.length && leftList.every(item => rightList.includes(item));
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
  BATCH_MODES,
  PROVIDER_CLASSES,
  buildRosterIdentityMatch,
  buildRosterMembershipChange,
  buildRosterRollbackPlan,
  createRosterState,
  normalizeRosterImportBatch,
  stageRosterImportBatch,
  validateRosterIdentityMatch,
  validateRosterImportBatch,
  validateRosterMembershipChange
};
