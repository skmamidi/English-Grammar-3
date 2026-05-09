(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestInstitutionalDataExportPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const audit = root.GrammarQuestAuditLogDomain ||
    (typeof require === 'function' ? require('./audit-log-domain') : null);
  const org = root.GrammarQuestOrganizationTenantDomain ||
    (typeof require === 'function' ? require('./organization-tenant-domain') : null);

  const SCHEMA_VERSION = 1;
  const REDACTED = '[REDACTED]';

  const ExportPurposes = Object.freeze({
    INSTITUTIONAL_REPORT_REVIEW: 'institutional_report_review',
    COMPLIANCE_REVIEW: 'compliance_review',
    TENANT_AUDIT_REVIEW: 'tenant_audit_review',
    ROSTER_RECONCILIATION: 'roster_reconciliation'
  });

  const RedactionProfiles = Object.freeze({
    AGGREGATE_REPORT: 'aggregate_report',
    TENANT_METADATA: 'tenant_metadata',
    AUDIT_SUMMARY: 'audit_summary'
  });

  const ApprovalDecisions = Object.freeze(['approved', 'rejected']);
  const AuditReviewDecisions = Object.freeze(['approved', 'rejected', 'needs_follow_up']);

  const EXPORTABLE_CATEGORIES = Object.freeze([
    'institutional_report_projection',
    'organization_tenant_metadata',
    'audit_event',
    'institutional_export_manifest'
  ]);

  const FORBIDDEN_EXPORT_FIELD_PATTERN = /(answer.*key|correct.*answer|correct.*choice|prompt|question|explanation|learner.*id|student.*id|raw.*learner|payment|credential|provider.*payload|provider.*token|private.*key|secret|token|password)/i;

  function normalizeInstitutionalExportRequest(raw) {
    const input = objectValue(raw);
    const createdAt = safeIso(input.createdAt) || new Date().toISOString();
    return {
      schemaVersion: Number(input.schemaVersion || SCHEMA_VERSION),
      id: safeString(input.id || input.requestId),
      tenantId: safeString(input.tenantId),
      tenantType: safeString(input.tenantType),
      requester: normalizeActor(input.requester || input.actor),
      purpose: safeString(input.purpose),
      scope: normalizeExportScope(input.scope || input.exportScope || input),
      redactionProfile: safeString(input.redactionProfile || RedactionProfiles.AGGREGATE_REPORT),
      status: safeString(input.status || 'submitted'),
      createdAt,
      expiresAt: safeIso(input.expiresAt) || addHours(createdAt, 24),
      metadata: sanitize(input.metadata || {})
    };
  }

  function normalizeExportScope(raw) {
    const input = objectValue(raw);
    return {
      tenantId: safeString(input.tenantId),
      tenantType: safeString(input.tenantType),
      classIds: normalizeIdList(input.classIds),
      schoolIds: normalizeIdList(input.schoolIds),
      categories: normalizeCategories(input.categories || input.dataCategories),
      filters: normalizeFilters(input.filters),
      timeWindow: normalizeTimeWindow(input.timeWindow || input.filters)
    };
  }

  function validateInstitutionalExportRequest(raw) {
    const request = normalizeInstitutionalExportRequest(raw);
    const errors = [];
    if (request.schemaVersion !== SCHEMA_VERSION) errors.push('export_request_schema_version_must_be_1');
    if (!request.id) errors.push('export_request_id_required');
    if (!request.tenantId) errors.push('export_request_tenant_id_required');
    if (!Object.values(org.TenantTypes).includes(request.tenantType)) errors.push('export_request_tenant_type_unknown');
    if (!request.requester.actorId || !request.requester.role) errors.push('export_request_requester_required');
    if (!Object.values(ExportPurposes).includes(request.purpose)) errors.push('export_request_purpose_unknown');
    errors.push(...validateExportScope(request.scope).errors);
    if (!Object.values(RedactionProfiles).includes(request.redactionProfile)) errors.push('export_request_redaction_profile_unknown');
    if (!request.createdAt) errors.push('export_request_created_at_required');
    if (!request.expiresAt) errors.push('export_request_expires_at_required');
    if (request.createdAt && request.expiresAt && Date.parse(request.expiresAt) <= Date.parse(request.createdAt)) {
      errors.push('export_request_expiration_must_follow_creation');
    }
    return { valid: errors.length === 0, errors };
  }

  function validateExportScope(raw) {
    const scope = normalizeExportScope(raw);
    const errors = [];
    if (!Array.isArray(scope.categories) || scope.categories.length === 0) errors.push('export_scope_categories_required');
    scope.categories.forEach(category => {
      if (!EXPORTABLE_CATEGORIES.includes(category)) errors.push(`export_scope_category_forbidden:${category}`);
    });
    return { valid: errors.length === 0, errors };
  }

  function evaluateInstitutionalExportAuthorization(raw) {
    const input = objectValue(raw);
    const request = normalizeInstitutionalExportRequest(input.request);
    const validation = validateInstitutionalExportRequest(request);
    if (!validation.valid) return deny('export_request_invalid');
    if (Date.parse(safeIso(input.now) || new Date().toISOString()) > Date.parse(request.expiresAt)) return deny('export_request_expired');

    const actor = objectValue(input.actor);
    if (actor.supportImpersonation === true) return deny('support_impersonation_denied');
    const membership = findActiveMembership(actor, request.tenantId, request.tenantType);
    if (!membership) return deny('tenant_membership_required');

    if ([org.MembershipRoles.SCHOOL_ADMIN, org.MembershipRoles.DISTRICT_ADMIN].includes(membership.role)) {
      return allow('tenant_export');
    }
    if (membership.role === org.MembershipRoles.TEACHER) {
      if (!request.scope.categories.every(category => category === 'institutional_report_projection')) return deny('teacher_category_denied');
      if (request.scope.classIds.length === 0) return deny('class_scope_required');
      if (!request.scope.classIds.every(classId => membership.classIds.includes(classId))) return deny('class_scope_denied');
      return allow('class_aggregate_export');
    }
    return deny('tenant_role_denied');
  }

  function buildExportApproval(raw) {
    const input = objectValue(raw);
    const request = normalizeInstitutionalExportRequest(input.request);
    const approver = normalizeActor(input.approver || input.actor);
    const decision = safeString(input.decision || 'rejected');
    if (!ApprovalDecisions.includes(decision)) throw new Error('export_approval_decision_invalid');
    if (objectValue(input.approver || input.actor).supportImpersonation === true) throw new Error('export_approval_support_impersonation_denied');
    const approvedAt = safeIso(input.approvedAt) || new Date().toISOString();
    return {
      schemaVersion: SCHEMA_VERSION,
      id: safeString(input.id || input.approvalId || `approval_${request.id}`),
      requestId: request.id,
      tenantId: request.tenantId,
      tenantType: request.tenantType,
      approver,
      decision,
      approvedAt,
      expiresAt: safeIso(input.expiresAt) || request.expiresAt,
      auditEventId: safeString(input.auditEventId),
      metadata: sanitize(input.metadata || {})
    };
  }

  function buildExportManifest(raw) {
    const input = objectValue(raw);
    const request = normalizeInstitutionalExportRequest(input.request);
    const approval = normalizeExportApproval(input.approval);
    const generatedAt = safeIso(input.generatedAt) || new Date().toISOString();
    const retentionDays = positiveInteger(input.retentionDays, 7);
    const deletionDeadline = safeIso(input.deletionDeadline) || addDays(generatedAt, retentionDays);
    return {
      schemaVersion: SCHEMA_VERSION,
      id: safeString(input.id || input.manifestId || `manifest_${request.id}`),
      requestId: request.id,
      approvalId: approval.id,
      tenantId: request.tenantId,
      tenantType: request.tenantType,
      requesterRole: request.requester.role,
      purpose: request.purpose,
      categories: request.scope.categories.slice(),
      filters: normalizeFilters(request.scope.filters),
      redactionProfile: request.redactionProfile,
      generatedAt,
      retention: {
        days: retentionDays,
        deletionDeadline
      },
      rowCount: Math.max(0, Number(input.rowCount || 0)),
      auditEventIds: normalizeIdList(input.auditEventIds || [approval.auditEventId]),
      forbiddenFields: forbiddenFieldLabels(),
      metadata: sanitize(input.metadata || {})
    };
  }

  function validateExportManifest(raw) {
    const manifest = normalizeExportManifest(raw);
    const errors = [];
    if (manifest.schemaVersion !== SCHEMA_VERSION) errors.push('export_manifest_schema_version_must_be_1');
    ['id', 'requestId', 'approvalId', 'tenantId', 'tenantType', 'requesterRole', 'purpose', 'redactionProfile', 'generatedAt'].forEach(field => {
      if (!safeString(manifest[field])) errors.push(`export_manifest_${field}_required`);
    });
    if (!Array.isArray(manifest.categories) || manifest.categories.length === 0) errors.push('export_manifest_categories_required');
    if (!manifest.retention || !manifest.retention.days || !safeIso(manifest.retention.deletionDeadline)) errors.push('export_manifest_retention_required');
    if (!Array.isArray(manifest.auditEventIds) || manifest.auditEventIds.length === 0) errors.push('export_manifest_audit_event_required');
    return { valid: errors.length === 0, errors };
  }

  function redactInstitutionalExportRecord(record, redactionProfile) {
    const profile = Object.values(RedactionProfiles).includes(safeString(redactionProfile))
      ? safeString(redactionProfile)
      : RedactionProfiles.AGGREGATE_REPORT;
    return redactValue(record, profile);
  }

  function validateExportPayloadSafety(records) {
    const errors = [];
    walk(records, (key, value) => {
      if (key && FORBIDDEN_EXPORT_FIELD_PATTERN.test(key) && value !== REDACTED) errors.push(`forbidden_export_field:${key}`);
    });
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)).sort() };
  }

  function buildAuditReviewRecord(raw) {
    const input = objectValue(raw);
    const reviewerInput = objectValue(input.reviewer || input.actor);
    if (reviewerInput.supportImpersonation === true) throw new Error('audit_review_support_impersonation_denied');
    const decision = safeString(input.decision);
    if (!AuditReviewDecisions.includes(decision)) throw new Error('audit_review_decision_invalid');
    const record = {
      schemaVersion: SCHEMA_VERSION,
      id: safeString(input.id || input.recordId),
      tenantId: safeString(input.tenantId),
      tenantType: safeString(input.tenantType),
      actionCategory: safeString(input.actionCategory),
      reviewer: normalizeActor(reviewerInput),
      decision,
      evidenceRefs: normalizeIdList(input.evidenceRefs),
      reviewedAt: safeIso(input.reviewedAt) || new Date().toISOString(),
      metadata: sanitize(input.metadata || {})
    };
    const errors = validateAuditReviewRecord(record).errors;
    if (errors.length > 0) throw new Error(`audit_review_invalid:${errors.join(',')}`);
    return Object.freeze(record);
  }

  function validateAuditReviewRecord(raw) {
    const record = objectValue(raw);
    const errors = [];
    if (Number(record.schemaVersion) !== SCHEMA_VERSION) errors.push('audit_review_schema_version_must_be_1');
    ['id', 'tenantId', 'tenantType', 'actionCategory', 'decision', 'reviewedAt'].forEach(field => {
      if (!safeString(record[field])) errors.push(`audit_review_${field}_required`);
    });
    if (!Object.values(org.TenantTypes).includes(safeString(record.tenantType))) errors.push('audit_review_tenant_type_unknown');
    if (!AuditReviewDecisions.includes(safeString(record.decision))) errors.push('audit_review_decision_unknown');
    if (!record.reviewer || !safeString(record.reviewer.actorId) || !safeString(record.reviewer.role)) errors.push('audit_review_reviewer_required');
    if (!Array.isArray(record.evidenceRefs) || record.evidenceRefs.length === 0) errors.push('audit_review_evidence_required');
    return { valid: errors.length === 0, errors };
  }

  function appendAuditReviewRecord(existing, record) {
    const trail = Array.isArray(existing) ? existing.slice() : [];
    const normalized = buildAuditReviewRecord(record);
    if (trail.some(item => safeString(item.id) === normalized.id)) throw new Error('audit_review_duplicate_record');
    return Object.freeze(trail.concat(normalized));
  }

  function normalizeExportApproval(raw) {
    const input = objectValue(raw);
    return {
      schemaVersion: Number(input.schemaVersion || SCHEMA_VERSION),
      id: safeString(input.id || input.approvalId),
      requestId: safeString(input.requestId),
      tenantId: safeString(input.tenantId),
      tenantType: safeString(input.tenantType),
      approver: normalizeActor(input.approver),
      decision: safeString(input.decision),
      approvedAt: safeIso(input.approvedAt),
      expiresAt: safeIso(input.expiresAt),
      auditEventId: safeString(input.auditEventId),
      metadata: sanitize(input.metadata || {})
    };
  }

  function normalizeExportManifest(raw) {
    const input = objectValue(raw);
    return {
      schemaVersion: Number(input.schemaVersion || SCHEMA_VERSION),
      id: safeString(input.id),
      requestId: safeString(input.requestId),
      approvalId: safeString(input.approvalId),
      tenantId: safeString(input.tenantId),
      tenantType: safeString(input.tenantType),
      requesterRole: safeString(input.requesterRole),
      purpose: safeString(input.purpose),
      categories: normalizeCategories(input.categories),
      filters: normalizeFilters(input.filters),
      redactionProfile: safeString(input.redactionProfile),
      generatedAt: safeIso(input.generatedAt),
      retention: {
        days: positiveInteger(input.retention && input.retention.days, 0),
        deletionDeadline: safeIso(input.retention && input.retention.deletionDeadline)
      },
      rowCount: Math.max(0, Number(input.rowCount || 0)),
      auditEventIds: normalizeIdList(input.auditEventIds),
      forbiddenFields: normalizeIdList(input.forbiddenFields),
      metadata: sanitize(input.metadata || {})
    };
  }

  function redactValue(value, profile, key) {
    if (key && FORBIDDEN_EXPORT_FIELD_PATTERN.test(key)) return REDACTED;
    if (Array.isArray(value)) return value.map(item => redactValue(item, profile));
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce((result, itemKey) => {
      result[itemKey] = redactValue(value[itemKey], profile, itemKey);
      return result;
    }, {});
  }

  function walk(value, visit, key) {
    if (key) visit(key, value);
    if (Array.isArray(value)) {
      value.forEach(item => walk(item, visit));
      return;
    }
    if (!value || typeof value !== 'object') return;
    Object.keys(value).forEach(childKey => walk(value[childKey], visit, childKey));
  }

  function findActiveMembership(actor, tenantId, tenantType) {
    return (Array.isArray(actor.tenantMemberships) ? actor.tenantMemberships : [])
      .map(org.normalizeTenantMembership)
      .find(membership =>
        membership.tenantId === tenantId &&
        membership.tenantType === tenantType &&
        membership.status === 'active'
      );
  }

  function allow(accessLevel) {
    return { allow: true, reason: 'allowed', accessLevel };
  }

  function deny(reason) {
    return { allow: false, reason, accessLevel: 'none' };
  }

  function normalizeActor(raw) {
    const input = objectValue(raw);
    return {
      actorId: safeString(input.actorId || input.id || input.userId),
      role: safeString(input.role)
    };
  }

  function normalizeCategories(categories) {
    return normalizeIdList(categories).sort();
  }

  function normalizeFilters(raw) {
    const input = objectValue(raw);
    return Object.keys(input).sort().reduce((result, key) => {
      const value = input[key];
      if (Array.isArray(value)) result[key] = normalizeIdList(value);
      else if (value && typeof value === 'object') result[key] = normalizeFilters(value);
      else if (value !== undefined && value !== null && safeString(value)) result[key] = safeString(value);
      return result;
    }, {});
  }

  function normalizeTimeWindow(raw) {
    const input = objectValue(raw);
    return {
      from: safeString(input.from || input.start || input.startsAt),
      to: safeString(input.to || input.end || input.endsAt)
    };
  }

  function normalizeIdList(value) {
    return Array.from(new Set((Array.isArray(value) ? value : [])
      .map(safeString)
      .filter(Boolean)))
      .sort();
  }

  function forbiddenFieldLabels() {
    return Object.freeze([
      'answer keys',
      'raw prompts',
      'raw learner identifiers',
      'payment credentials',
      'provider payloads',
      'secrets'
    ]);
  }

  function positiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
  }

  function addHours(iso, hours) {
    return new Date(Date.parse(iso) + hours * 60 * 60 * 1000).toISOString();
  }

  function addDays(iso, days) {
    return new Date(Date.parse(iso) + days * 24 * 60 * 60 * 1000).toISOString();
  }

  function safeIso(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function objectValue(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function sanitize(value) {
    return audit && typeof audit.sanitizeAuditMetadata === 'function'
      ? audit.sanitizeAuditMetadata(value)
      : value;
  }

  return {
    EXPORTABLE_CATEGORIES,
    ExportPurposes,
    RedactionProfiles,
    appendAuditReviewRecord,
    buildAuditReviewRecord,
    buildExportApproval,
    buildExportManifest,
    evaluateInstitutionalExportAuthorization,
    normalizeExportScope,
    normalizeInstitutionalExportRequest,
    redactInstitutionalExportRecord,
    validateAuditReviewRecord,
    validateExportManifest,
    validateExportPayloadSafety,
    validateExportScope,
    validateInstitutionalExportRequest
  };
});
