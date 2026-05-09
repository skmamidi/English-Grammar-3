const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const org = require('../assets/organization-tenant-domain');
const exportPolicy = require('../assets/institutional-data-export-policy');

const repoRoot = path.resolve(__dirname, '..');

const schoolAdmin = {
  id: 'school-admin-a',
  role: 'system_admin',
  tenantMemberships: [{
    tenantId: 'school-a',
    tenantType: org.TenantTypes.SCHOOL,
    role: org.MembershipRoles.SCHOOL_ADMIN,
    status: 'active',
    classIds: ['class-a', 'class-b']
  }]
};

const districtAdmin = {
  id: 'district-admin-a',
  role: 'system_admin',
  tenantMemberships: [{
    tenantId: 'district-a',
    tenantType: org.TenantTypes.DISTRICT,
    role: org.MembershipRoles.DISTRICT_ADMIN,
    status: 'active'
  }]
};

const teacher = {
  id: 'teacher-a',
  role: 'teacher',
  tenantMemberships: [{
    tenantId: 'school-a',
    tenantType: org.TenantTypes.SCHOOL,
    role: org.MembershipRoles.TEACHER,
    status: 'active',
    classIds: ['class-a']
  }]
};

const guardian = {
  id: 'guardian-a',
  role: 'parent_guardian',
  tenantMemberships: [{
    tenantId: 'family-a',
    tenantType: org.TenantTypes.FAMILY,
    role: org.MembershipRoles.GUARDIAN,
    status: 'active',
    learnerIds: ['learner-a']
  }]
};

test('institutional export requests normalize tenant scope purpose expiration and redaction profile', () => {
  const request = exportPolicy.normalizeInstitutionalExportRequest({
    id: 'export-1',
    tenantId: 'school-a',
    tenantType: org.TenantTypes.SCHOOL,
    requester: teacher,
    purpose: exportPolicy.ExportPurposes.INSTITUTIONAL_REPORT_REVIEW,
    scope: {
      classIds: ['class-a', 'class-a'],
      categories: ['institutional_report_projection']
    },
    redactionProfile: exportPolicy.RedactionProfiles.AGGREGATE_REPORT,
    expiresAt: '2030-05-06T12:00:00.000Z',
    createdAt: '2030-05-05T12:00:00.000Z'
  });

  assert.equal(request.schemaVersion, 1);
  assert.equal(request.requester.actorId, 'teacher-a');
  assert.equal(request.requester.role, 'teacher');
  assert.deepEqual(request.scope.classIds, ['class-a']);
  assert.deepEqual(request.scope.categories, ['institutional_report_projection']);
  assert.equal(request.redactionProfile, exportPolicy.RedactionProfiles.AGGREGATE_REPORT);
  assert.deepEqual(exportPolicy.validateInstitutionalExportRequest(request).errors, []);
});

test('institutional export authorization requires active tenant membership role scope and non-expired request', () => {
  const teacherRequest = exportPolicy.normalizeInstitutionalExportRequest({
    id: 'export-teacher',
    tenantId: 'school-a',
    tenantType: org.TenantTypes.SCHOOL,
    requester: teacher,
    purpose: exportPolicy.ExportPurposes.INSTITUTIONAL_REPORT_REVIEW,
    scope: { classIds: ['class-a'], categories: ['institutional_report_projection'] },
    redactionProfile: exportPolicy.RedactionProfiles.AGGREGATE_REPORT,
    expiresAt: '2030-05-06T12:00:00.000Z',
    createdAt: '2030-05-05T12:00:00.000Z'
  });

  assert.deepEqual(
    exportPolicy.evaluateInstitutionalExportAuthorization({ request: teacherRequest, actor: teacher, now: '2030-05-05T12:30:00.000Z' }),
    { allow: true, reason: 'allowed', accessLevel: 'class_aggregate_export' }
  );

  const crossClass = exportPolicy.normalizeInstitutionalExportRequest({
    ...teacherRequest,
    id: 'export-cross-class',
    scope: { classIds: ['class-b'], categories: ['institutional_report_projection'] }
  });
  assert.deepEqual(
    exportPolicy.evaluateInstitutionalExportAuthorization({ request: crossClass, actor: teacher, now: '2030-05-05T12:30:00.000Z' }),
    { allow: false, reason: 'class_scope_denied', accessLevel: 'none' }
  );

  const adminRequest = exportPolicy.normalizeInstitutionalExportRequest({
    ...teacherRequest,
    id: 'export-admin',
    requester: schoolAdmin,
    scope: { classIds: ['class-a', 'class-b'], categories: ['institutional_report_projection', 'organization_tenant_metadata'] },
    redactionProfile: exportPolicy.RedactionProfiles.TENANT_METADATA
  });
  assert.equal(
    exportPolicy.evaluateInstitutionalExportAuthorization({ request: adminRequest, actor: schoolAdmin, now: '2030-05-05T12:30:00.000Z' }).allow,
    true
  );

  assert.deepEqual(
    exportPolicy.evaluateInstitutionalExportAuthorization({ request: teacherRequest, actor: guardian, now: '2030-05-05T12:30:00.000Z' }),
    { allow: false, reason: 'tenant_membership_required', accessLevel: 'none' }
  );
  assert.deepEqual(
    exportPolicy.evaluateInstitutionalExportAuthorization({ request: teacherRequest, actor: teacher, now: '2030-05-07T12:30:00.000Z' }),
    { allow: false, reason: 'export_request_expired', accessLevel: 'none' }
  );
});

test('export approvals and manifests include tenant role purpose filters retention deadline and audit references', () => {
  const request = exportPolicy.normalizeInstitutionalExportRequest({
    id: 'export-approval',
    tenantId: 'district-a',
    tenantType: org.TenantTypes.DISTRICT,
    requester: districtAdmin,
    purpose: exportPolicy.ExportPurposes.COMPLIANCE_REVIEW,
    scope: {
      filters: { schoolIds: ['school-a'], from: '2030-04-01', to: '2030-04-30' },
      categories: ['institutional_report_projection', 'audit_event']
    },
    redactionProfile: exportPolicy.RedactionProfiles.AUDIT_SUMMARY,
    expiresAt: '2030-05-06T12:00:00.000Z',
    createdAt: '2030-05-05T12:00:00.000Z'
  });
  const approval = exportPolicy.buildExportApproval({
    request,
    approver: districtAdmin,
    decision: 'approved',
    approvedAt: '2030-05-05T13:00:00.000Z',
    expiresAt: '2030-05-06T13:00:00.000Z',
    auditEventId: 'audit-approval-1'
  });
  const manifest = exportPolicy.buildExportManifest({
    request,
    approval,
    generatedAt: '2030-05-05T14:00:00.000Z',
    retentionDays: 7,
    deletionDeadline: '2030-05-12T14:00:00.000Z',
    rowCount: 12,
    auditEventIds: ['audit-approval-1', 'audit-export-1']
  });

  assert.equal(approval.schemaVersion, 1);
  assert.equal(approval.decision, 'approved');
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.tenantId, 'district-a');
  assert.equal(manifest.requesterRole, 'system_admin');
  assert.equal(manifest.purpose, exportPolicy.ExportPurposes.COMPLIANCE_REVIEW);
  assert.deepEqual(manifest.filters, { from: '2030-04-01', schoolIds: ['school-a'], to: '2030-04-30' });
  assert.equal(manifest.retention.days, 7);
  assert.equal(manifest.retention.deletionDeadline, '2030-05-12T14:00:00.000Z');
  assert.deepEqual(manifest.auditEventIds, ['audit-approval-1', 'audit-export-1']);
  assert.deepEqual(exportPolicy.validateExportManifest(manifest).errors, []);
});

test('export payload redaction removes forbidden prompts learner ids payment provider payloads and secrets', () => {
  const redacted = exportPolicy.redactInstitutionalExportRecord({
    learnerId: 'learner-a',
    learnerIds: ['learner-a', 'learner-b'],
    classId: 'class-a',
    skillId: 'commas',
    promptText: 'Raw question prompt',
    answerKey: 'A',
    paymentCredential: 'pm_secret',
    providerPayload: { token: 'provider-token' },
    signingSecret: 'secret',
    aggregateMasteryBand: 'developing'
  }, exportPolicy.RedactionProfiles.AGGREGATE_REPORT);

  assert.equal(JSON.stringify(redacted).includes('learner-a'), false);
  assert.equal(JSON.stringify(redacted).includes('Raw question prompt'), false);
  assert.equal(JSON.stringify(redacted).includes('pm_secret'), false);
  assert.equal(redacted.learnerId, '[REDACTED]');
  assert.equal(redacted.learnerIds, '[REDACTED]');
  assert.equal(redacted.promptText, '[REDACTED]');
  assert.equal(redacted.answerKey, '[REDACTED]');
  assert.equal(redacted.paymentCredential, '[REDACTED]');
  assert.equal(redacted.providerPayload, '[REDACTED]');
  assert.equal(redacted.signingSecret, '[REDACTED]');
  assert.equal(redacted.aggregateMasteryBand, 'developing');
  assert.deepEqual(exportPolicy.validateExportPayloadSafety([redacted]).errors, []);
  assert.deepEqual(exportPolicy.validateExportPayloadSafety([{ learnerId: 'learner-a' }]).errors, ['forbidden_export_field:learnerId']);
});

test('audit review records are append-only privacy safe and separate from support impersonation', () => {
  const first = exportPolicy.buildAuditReviewRecord({
    id: 'review-1',
    tenantId: 'school-a',
    tenantType: org.TenantTypes.SCHOOL,
    actionCategory: 'institutional_export_approval',
    reviewer: schoolAdmin,
    decision: 'approved',
    evidenceRefs: ['manifest:export-1'],
    metadata: {
      promptText: 'Raw prompt should not survive',
      providerPayload: { token: 'provider-token' },
      reviewerNotes: 'Approval rationale without learner detail'
    },
    reviewedAt: '2030-05-05T13:00:00.000Z'
  });
  const trail = exportPolicy.appendAuditReviewRecord([], first);

  assert.equal(first.schemaVersion, 1);
  assert.equal(first.reviewer.actorId, 'school-admin-a');
  assert.equal(first.metadata.promptText, '[REDACTED]');
  assert.equal(first.metadata.providerPayload, '[REDACTED]');
  assert.equal(first.metadata.reviewerNotes, '[REDACTED]');
  assert.deepEqual(trail, [first]);
  assert.deepEqual(exportPolicy.appendAuditReviewRecord(trail, { ...first, id: 'review-2' }).map(item => item.id), ['review-1', 'review-2']);
  assert.deepEqual(trail.map(item => item.id), ['review-1']);
  assert.throws(() => exportPolicy.buildAuditReviewRecord({
    ...first,
    id: 'review-support',
    reviewer: { ...schoolAdmin, supportImpersonation: true }
  }), /audit_review_support_impersonation_denied/);
});

test('institutional export docs describe compliance release review and forbidden data classes', () => {
  const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'institutional-data-export-and-audit.md'), 'utf8');
  [
    'InstitutionalExportRequest',
    'ExportScope',
    'ExportApproval',
    'ExportManifest',
    'AuditReviewRecord',
    'institutional_report_projection',
    'institutional_export_manifest',
    'answer keys',
    'raw learner identifiers',
    'payment credentials',
    'provider payloads',
    'compliance release review',
    'append-only'
  ].forEach(required => assert.match(doc, new RegExp(escapeRegex(required), 'i')));
});

test('ci contract wires institutional export policy into the unit gate', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['test:unit'], /tests\/institutional-data-export-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
