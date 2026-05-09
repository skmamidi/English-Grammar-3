(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestInstitutionalRolloutGates = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const featureFlags = root.GrammarQuestFeatureFlagDomain ||
    (typeof require === 'function' ? require('./feature-flag-domain') : null);

  const REQUIRED_INSTITUTIONAL_LAUNCH_EVIDENCE = Object.freeze([
    'tenantIsolationVerified',
    'rosterImportBoundaryVerified',
    'ssoPolicyVerified',
    'verifiedReportingVerified',
    'institutionalExportVerified',
    'privacyEvidenceVerified',
    'supportOwnerAssigned',
    'productionSloVerified',
    'syntheticMonitorVerified',
    'rollbackRehearsalVerified'
  ]);

  const ENVIRONMENTS = new Set(['staging', 'production', 'synthetic']);

  function evaluateInstitutionalLaunchGates(input = {}) {
    const flags = normalizeFlags(input.flags || input.featureFlags);
    const evidence = objectOrEmpty(input.evidence || input.launchEvidence);
    const blockers = [];
    if (!safeString(input.tenantId)) blockers.push('tenant_id_missing');
    if (!ENVIRONMENTS.has(safeString(input.environment))) blockers.push('environment_invalid');
    if (!safeString(input.owner)) blockers.push('owner_missing');
    REQUIRED_INSTITUTIONAL_LAUNCH_EVIDENCE.forEach(key => {
      if (!hasCompleteEvidence(evidence[key])) blockers.push(`${toSnakeCase(key)}_missing`);
    });

    const ready = blockers.length === 0;
    return {
      ready,
      blockers,
      provisioningAvailable: ready && flags.institutionalTenantProvisioningEnabled === true,
      localPracticeAvailable: flags.coreLocalPracticeEnabled !== false,
      capabilities: {
        tenantProvisioning: flags.institutionalTenantProvisioningEnabled === true,
        rosterActivation: flags.institutionalRosterActivationEnabled === true,
        ssoLogin: flags.institutionalSsoLoginEnabled === true,
        institutionalReports: flags.institutionalReportsEnabled === true,
        institutionalExports: flags.institutionalExportsEnabled === true
      },
      rollback: rollbackLevers()
    };
  }

  function buildProvisioningRunbook(input = {}) {
    const rollbackPlan = normalizeRollbackPlan(input.rollbackPlan);
    return {
      schemaVersion: 1,
      tenantId: safeString(input.tenantId),
      environment: safeString(input.environment),
      owner: safeString(input.owner),
      steps: normalizeStringArray(input.steps),
      rollbackPlan,
      separatesProvisioningFromPractice: true,
      createdAt: safeIso(input.createdAt) || new Date().toISOString()
    };
  }

  function validateProvisioningRunbook(runbook = {}) {
    const input = objectOrEmpty(runbook);
    const errors = [];
    if (Number(input.schemaVersion) !== 1) errors.push('provisioning_runbook_schema_version_must_be_1');
    if (!safeString(input.tenantId)) errors.push('provisioning_runbook_tenant_id_required');
    if (!ENVIRONMENTS.has(safeString(input.environment))) errors.push('provisioning_runbook_environment_invalid');
    if (!safeString(input.owner)) errors.push('provisioning_runbook_owner_required');
    if (!Array.isArray(input.steps) || input.steps.length < 3) errors.push('provisioning_runbook_steps_required');
    if (!input.rollbackPlan || validateInstitutionalRollbackPlan(input.rollbackPlan).errors.length > 0) errors.push('provisioning_runbook_rollback_plan_required');
    if (input.separatesProvisioningFromPractice !== true) errors.push('provisioning_runbook_must_preserve_practice');
    return { valid: errors.length === 0, errors };
  }

  function buildInstitutionalRollbackPlan(input = {}) {
    return {
      schemaVersion: 1,
      tenantId: safeString(input.tenantId),
      environment: safeString(input.environment),
      owner: safeString(input.owner),
      reason: safeString(input.reason),
      rehearsedAt: safeIso(input.rehearsedAt),
      disablesInstitutionalOnboarding: true,
      preservesLocalPractice: true,
      preservesVerifiedLearningEvidence: true,
      preservesAuditHistory: true,
      flags: {
        tenantProvisioning: 'institutionalTenantProvisioningEnabled',
        rosterActivation: 'institutionalRosterActivationEnabled',
        ssoLogin: 'institutionalSsoLoginEnabled',
        reports: 'institutionalReportsEnabled',
        exports: 'institutionalExportsEnabled'
      }
    };
  }

  function validateInstitutionalRollbackPlan(plan = {}) {
    const input = objectOrEmpty(plan);
    const errors = [];
    if (Number(input.schemaVersion) !== 1) errors.push('rollback_plan_schema_version_must_be_1');
    if (!safeString(input.tenantId)) errors.push('rollback_plan_tenant_id_required');
    if (!ENVIRONMENTS.has(safeString(input.environment))) errors.push('rollback_plan_environment_invalid');
    if (!safeString(input.owner)) errors.push('rollback_plan_owner_required');
    if (!safeString(input.reason)) errors.push('rollback_plan_reason_required');
    if (!safeIso(input.rehearsedAt)) errors.push('rollback_plan_rehearsed_at_required');
    if (input.disablesInstitutionalOnboarding !== true) errors.push('rollback_plan_must_disable_onboarding');
    if (input.preservesLocalPractice !== true) errors.push('rollback_plan_must_preserve_local_practice');
    if (input.preservesVerifiedLearningEvidence !== true) errors.push('rollback_plan_must_preserve_verified_learning_evidence');
    if (input.preservesAuditHistory !== true) errors.push('rollback_plan_must_preserve_audit_history');
    return { valid: errors.length === 0, errors };
  }

  function normalizeRollbackPlan(value) {
    const input = objectOrEmpty(value);
    if (input.schemaVersion) return input;
    return buildInstitutionalRollbackPlan(input);
  }

  function rollbackLevers() {
    return {
      preserveLocalPractice: true,
      preserveVerifiedLearningEvidence: true,
      preserveAuditHistory: true,
      disableTenantProvisioningFlag: 'institutionalTenantProvisioningEnabled',
      disableRosterActivationFlag: 'institutionalRosterActivationEnabled',
      disableSsoLoginFlag: 'institutionalSsoLoginEnabled',
      disableReportsFlag: 'institutionalReportsEnabled',
      disableExportsFlag: 'institutionalExportsEnabled'
    };
  }

  function hasCompleteEvidence(value) {
    const item = objectOrEmpty(value);
    return item.verified === true &&
      safeString(item.owner) &&
      safeIso(item.reviewedAt) &&
      safeString(item.evidenceRef);
  }

  function normalizeFlags(value) {
    const raw = objectOrEmpty(value);
    if (featureFlags && typeof featureFlags.normalizeFeatureFlags === 'function') {
      return Object.assign(featureFlags.normalizeFeatureFlags(raw), raw);
    }
    return Object.assign({ coreLocalPracticeEnabled: true }, raw);
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeIso(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function toSnakeCase(value) {
    return safeString(value).replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function objectOrEmpty(value) {
    return value && typeof value === 'object' ? value : {};
  }

  return {
    REQUIRED_INSTITUTIONAL_LAUNCH_EVIDENCE,
    buildInstitutionalRollbackPlan,
    buildProvisioningRunbook,
    evaluateInstitutionalLaunchGates,
    validateInstitutionalRollbackPlan,
    validateProvisioningRunbook
  };
});
