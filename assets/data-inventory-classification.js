(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestDataInventoryClassification = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_DATA_CATEGORIES = Object.freeze([
    'public_content',
    'generated_question_content',
    'learner_progress',
    'learner_answer_attempt',
    'guardian_relationship',
    'classroom_assignment',
    'privacy_preference',
    'telemetry_event',
    'audit_event',
    'content_governance',
    'release_artifact',
    'sync_metadata',
    'operational_config',
    'future_native_metadata',
    'future_billing_metadata'
  ]);

  const SENSITIVITY_LEVELS = Object.freeze([
    'public',
    'internal',
    'educational_record',
    'sensitive_personal',
    'operational'
  ]);

  const KNOWN_ACCESS_ROLES = Object.freeze([
    'anonymous',
    'student',
    'parent_guardian',
    'teacher',
    'system_admin',
    'content_reviewer',
    'automation',
    'provider_operator',
    'future_billing_provider',
    'native_platform_runtime'
  ]);

  const SENSITIVE_EXAMPLE_PATTERN = /\b(learnerId|studentId|token|secret|password|privateKey|customer_[A-Za-z0-9]+|subscription_[A-Za-z0-9]+)\s*=?|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i;

  const DATA_INVENTORY = Object.freeze([
    entry('public_content', 'Published learning content', 'public', 'versioned question manifest and generated public assets', ['question-manifest.json', 'assets/question-chunks', 'static HTML routes'], 'content_reviewer', ['anonymous', 'student', 'parent_guardian', 'teacher', 'system_admin', 'content_reviewer'], 'included in public content export only', 'removed through content publication rollback or replacement', 'eligible only as aggregate asset/version metadata', 'static host and future app package providers', ['docs/question-authoring.md', 'docs/release-checklist.md']),
    entry('generated_question_content', 'Generated question prompts and explanations', 'internal', 'human-reviewed content generation pipeline', ['source review records', 'generated question artifacts'], 'content_reviewer', ['content_reviewer', 'system_admin', 'automation'], 'exported as content provenance without learner answers', 'replaced through source remediation and publication workflow', 'not eligible for learner telemetry payloads', 'static host after approval; no raw draft provider exposure', ['docs/question-authoring.md', 'tests/app-telemetry-privacy.test.js']),
    entry('learner_progress', 'Learner progress and saved reports', 'educational_record', 'learner state repository', ['local storage learner state', 'saved session records', 'future backend learner documents'], 'learner_data_owner', ['student', 'parent_guardian', 'teacher'], 'exportable through learner progress export capabilities', 'deleted or transferred through learner lifecycle workflow', 'not eligible except anonymous aggregate summaries', 'future backend provider stores scoped learner records', ['docs/security/learner-data-lifecycle.md', 'tests/access-control.test.js']),
    entry('learner_answer_attempt', 'Learner answer attempts and review outcomes', 'educational_record', 'quiz runtime and saved session records', ['active quiz state', 'saved session answers', 'adaptive review projections'], 'learner_data_owner', ['student', 'parent_guardian', 'teacher'], 'exportable with learner progress backup', 'deleted with learner state and saved sessions', 'not eligible for app telemetry', 'future backend provider stores scoped learner records', ['tests/app-telemetry-privacy.test.js', 'tests/backend-policy-rules.test.js']),
    entry('guardian_relationship', 'Guardian learner relationship links', 'sensitive_personal', 'guardian access domain', ['guardian relationship records', 'privacy preference grants'], 'privacy_owner', ['parent_guardian', 'system_admin'], 'exportable as relationship metadata for linked learners', 'revoked or deleted through privacy and lifecycle workflows', 'not eligible for telemetry', 'future backend provider stores relationship records', ['docs/security/roles-and-permissions.md', 'docs/security/learner-data-lifecycle.md']),
    entry('classroom_assignment', 'Teacher classroom assignments', 'educational_record', 'assignment and classroom domains', ['class records', 'assignment records', 'class dashboard projections'], 'school_data_owner', ['student', 'parent_guardian', 'teacher'], 'exportable for assigned learners and classes', 'deleted or archived with class lifecycle owner approval', 'eligible only as aggregate assignment counts', 'future backend provider stores class-scoped records', ['tests/backend-policy-rules.test.js', 'docs/security/roles-and-permissions.md']),
    entry('privacy_preference', 'Learner privacy preferences', 'sensitive_personal', 'privacy preference domain', ['privacy preference records', 'guardian preference management grants'], 'privacy_owner', ['student', 'parent_guardian'], 'exportable with learner privacy record', 'deleted with learner account or reset by authorized owner', 'not eligible for telemetry except boolean opt-out state after sanitization', 'future backend provider stores learner-scoped preferences', ['tests/app-telemetry-privacy.test.js', 'docs/security/learner-data-lifecycle.md']),
    entry('telemetry_event', 'Privacy-safe app telemetry events', 'internal', 'app telemetry privacy guard', ['local event queue', 'aggregate telemetry summary records'], 'analytics_owner', ['automation', 'system_admin'], 'exported only as aggregate operational summaries', 'rotated by telemetry retention policy', 'eligible after privacy sanitizer removes learner content and identifiers', 'future analytics provider receives aggregate and sanitized events only', ['tests/app-telemetry-privacy.test.js', 'docs/release-checklist.md']),
    entry('audit_event', 'Operational and support audit events', 'operational', 'system admin audit domain', ['audit event log', 'admin summary projections'], 'security_owner', ['system_admin'], 'exported as operational audit trail without learner content bodies', 'append-only retention with security owner approval for pruning', 'not eligible for product telemetry', 'future backend provider stores append-only audit records', ['docs/security/system-admin-role.md', 'tests/backend-policy-rules.test.js']),
    entry('content_governance', 'Content review and authoring metadata', 'internal', 'content review workflow', ['content review allowlist', 'deferred remediation records', 'AI authoring records'], 'content_reviewer', ['content_reviewer', 'system_admin', 'automation'], 'exportable as review provenance', 'removed when content hash and review record expire', 'eligible only as aggregate review counts', 'static repository and CI artifacts', ['docs/question-authoring.md', 'docs/release-checklist.md']),
    entry('release_artifact', 'Release manifests and build attestations', 'internal', 'release pipeline', ['release manifest', 'generated artifact hashes', 'CI workflow artifacts'], 'release_owner', ['system_admin', 'automation'], 'exportable as release evidence', 'retained with release history and superseded by newer manifests', 'eligible as operational release metadata', 'CI and static host providers', ['docs/release-checklist.md', 'docs/operations/release-and-rollback.md']),
    entry('sync_metadata', 'Learner sync envelopes and conflict metadata', 'sensitive_personal', 'learner state sync domain', ['sync envelopes', 'merge conflict metadata', 'adapter contract records'], 'learner_data_owner', ['student', 'parent_guardian', 'teacher', 'native_platform_runtime'], 'exportable with learner data backup', 'deleted with learner state and sync envelope lifecycle', 'not eligible for telemetry', 'future backend and native platform providers', ['docs/security/learner-data-lifecycle.md', 'tests/learner-state-sync-domain.test.js']),
    entry('operational_config', 'Operational config and feature flags', 'operational', 'feature flag and environment parity domains', ['feature flag records', 'environment config summaries', 'runtime health metadata'], 'operations_owner', ['system_admin', 'automation', 'provider_operator'], 'exportable as operational configuration snapshot', 'rotated or retired through release checklist', 'eligible as operational health metadata only', 'CI, static host, and future backend provider control planes', ['docs/security/backend-storage-rules.md', 'docs/release-checklist.md']),
    entry('future_native_metadata', 'Future native platform package metadata', 'internal', 'future platform-neutral package contract', ['native asset package manifests', 'offline bundle metadata'], 'platform_owner', ['native_platform_runtime', 'system_admin'], 'exportable as platform package metadata', 'retired when package version is superseded', 'eligible as aggregate package version telemetry only', 'future iOS and iPadOS distribution providers', ['docs/performance/static-assets.md', 'docs/release-checklist.md']),
    entry('future_billing_metadata', 'Future billing metadata placeholders', 'sensitive_personal', 'future commerce policy owner', ['future entitlement summaries', 'future masked billing status records'], 'billing_policy_owner', ['future_billing_provider', 'system_admin'], 'exportable through future billing access workflow', 'deleted or retained under future tax and billing policy', 'not eligible for learner telemetry', 'future payment provider and entitlement backend only', ['docs/security/dependency-policy.md', 'docs/release-checklist.md'])
  ]);

  function entry(id, label, sensitivity, sourceOfTruth, storageLocations, retentionOwner, accessRoles, exportBehavior, deleteBehavior, telemetryEligibility, providerExposure, protectedBy) {
    return Object.freeze({
      id,
      label,
      sensitivity,
      sourceOfTruth,
      storageLocations: Object.freeze(storageLocations.slice()),
      retentionOwner,
      accessRoles: Object.freeze(accessRoles.slice()),
      exportBehavior,
      deleteBehavior,
      telemetryEligibility,
      providerExposure,
      protectedBy: Object.freeze(protectedBy.slice())
    });
  }

  function buildDataInventoryMap(entries) {
    return normalizeEntries(entries).reduce((result, item) => {
      result[item.id] = item;
      return result;
    }, {});
  }

  function validateDataInventory(entries) {
    const normalized = normalizeEntries(entries);
    const errors = [];
    const ids = new Set(normalized.map(item => item.id));
    REQUIRED_DATA_CATEGORIES.forEach(id => {
      if (!ids.has(id)) errors.push(`${id} classification is required`);
    });
    normalized.forEach(item => errors.push(...validateDataInventoryEntry(item).errors));
    return { valid: errors.length === 0, errors };
  }

  function validateDataInventoryEntry(raw) {
    const item = raw && typeof raw === 'object' ? raw : {};
    const id = safeString(item.id) || 'data_entry';
    const errors = [];
    if (!safeString(item.label)) errors.push(`${id} label is required`);
    if (!SENSITIVITY_LEVELS.includes(safeString(item.sensitivity))) errors.push(`${id} sensitivity is unknown`);
    if (!safeString(item.sourceOfTruth)) errors.push(`${id} sourceOfTruth is required`);
    if (!Array.isArray(item.storageLocations) || item.storageLocations.length === 0) errors.push(`${id} storageLocations must not be empty`);
    if (!safeString(item.retentionOwner)) errors.push(`${id} retentionOwner is required`);
    const roles = Array.isArray(item.accessRoles) ? item.accessRoles : [];
    if (roles.length === 0) errors.push(`${id} accessRoles must not be empty`);
    roles.forEach(role => {
      if (!KNOWN_ACCESS_ROLES.includes(safeString(role))) errors.push(`${id} accessRoles contains unknown role ${role}`);
    });
    if (!safeString(item.exportBehavior)) errors.push(`${id} exportBehavior is required`);
    if (!safeString(item.deleteBehavior)) errors.push(`${id} deleteBehavior is required`);
    if (!safeString(item.telemetryEligibility)) errors.push(`${id} telemetryEligibility is required`);
    if (!safeString(item.providerExposure)) errors.push(`${id} providerExposure is required`);
    if (!Array.isArray(item.protectedBy) || item.protectedBy.length < 2) errors.push(`${id} protectedBy must list at least two controls`);
    const sampleText = JSON.stringify(item.sampleValues || []);
    if (SENSITIVE_EXAMPLE_PATTERN.test(sampleText)) errors.push(`${id} sampleValues contains sensitive example material`);
    return { valid: errors.length === 0, errors };
  }

  function normalizeEntries(entries) {
    return Array.isArray(entries) ? entries : [];
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DATA_INVENTORY,
    REQUIRED_DATA_CATEGORIES,
    SENSITIVITY_LEVELS,
    buildDataInventoryMap,
    validateDataInventory,
    validateDataInventoryEntry
  };
});
