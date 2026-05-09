(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestInstitutionalProvisioningSloPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const VALID_WINDOWS = new Set(['7d', '14d', '30d']);

  const DEFAULT_INSTITUTIONAL_PROVISIONING_SLO_POLICY = Object.freeze({
    schemaVersion: 1,
    objectives: Object.freeze([
      objective('institutional_login_success', 'Institutional login success', 'identity-platform', '7d', 0.995, 0.02, ['institutional_login_succeeded', 'institutional_login_failed'], 'docs/institutional-rollout-and-provisioning.md', 'Disable institutionalSsoLoginEnabled while preserving local learner practice.'),
      objective('roster_sync_freshness', 'Roster sync freshness', 'school-data-platform', '7d', 0.98, 0.05, ['roster_sync_completed', 'roster_sync_stale', 'roster_drift_blocked'], 'docs/institutional-rollout-and-provisioning.md', 'Disable institutionalRosterActivationEnabled and continue using the last approved roster snapshot.'),
      objective('assignment_provisioning_success', 'Assignment provisioning success', 'learning-platform', '7d', 0.99, 0.04, ['institutional_assignment_created', 'institutional_assignment_failed'], 'docs/institutional-rollout-and-provisioning.md', 'Pause institutional assignment provisioning and keep direct practice routes available.'),
      objective('verified_report_projection_freshness', 'Verified report projection freshness', 'school-data-platform', '14d', 0.99, 0.03, ['institutional_report_projected', 'institutional_report_projection_late'], 'docs/institutional-rollout-and-provisioning.md', 'Disable institutionalReportsEnabled and preserve verified learning evidence.'),
      objective('institutional_export_request_success', 'Institutional export request success', 'security-owner', '14d', 0.99, 0.03, ['institutional_export_request_accepted', 'institutional_export_request_rejected'], 'docs/institutional-rollout-and-provisioning.md', 'Disable institutionalExportsEnabled and retain export manifest audit history.'),
      objective('institutional_rollback_rehearsal_success', 'Institutional rollback rehearsal success', 'operations-owner', '30d', 0.99, 0.03, ['institutional_rollback_rehearsed', 'institutional_rollback_failed'], 'docs/institutional-rollout-and-provisioning.md', 'Disable institutionalTenantProvisioningEnabled until rollback rehearsal evidence passes.')
    ])
  });

  function validateInstitutionalProvisioningSloPolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const objectives = (Array.isArray(input.objectives) ? input.objectives : []).map(normalizeObjective);
    const errors = [];
    const ids = new Set();
    objectives.forEach(item => {
      if (!item.id) errors.push('objective id is required');
      if (ids.has(item.id)) errors.push(`${item.id} id must be unique`);
      ids.add(item.id);
      if (!item.owner) errors.push(`${item.id} owner is required`);
      if (!VALID_WINDOWS.has(item.measurementWindow)) errors.push(`${item.id} measurementWindow must be one of 7d, 14d, 30d`);
      if (!(item.target >= 0.9 && item.target <= 0.9999)) errors.push(`${item.id} target must be between 0.9 and 0.9999`);
      if (!(item.errorBudget > 0 && item.errorBudget <= 0.1)) errors.push(`${item.id} errorBudget must be greater than 0 and less than or equal to 0.1`);
      if (!item.telemetrySignals.length) errors.push(`${item.id} telemetrySignals are required`);
      if (!item.runbook) errors.push(`${item.id} runbook is required`);
      if (!item.rollback) errors.push(`${item.id} rollback is required`);
    });
    return { valid: errors.length === 0, errors, policy: { schemaVersion: 1, objectives } };
  }

  function buildTenantHealthSummary(policy, input = {}) {
    const validation = validateInstitutionalProvisioningSloPolicy(policy);
    const observations = input.observations || {};
    const objectives = validation.policy.objectives.map(item => {
      const observation = observations[item.id] || {};
      const totalEvents = Math.max(0, Math.round(Number(observation.totalEvents) || 0));
      const successfulEvents = Math.max(0, Math.min(totalEvents, Math.round(Number(observation.successfulEvents) || 0)));
      const successRate = totalEvents ? round(successfulEvents / totalEvents) : null;
      const floor = round(item.target - item.errorBudget);
      const status = successRate === null
        ? 'unknown'
        : successRate >= item.target
          ? 'healthy'
          : successRate >= floor
            ? 'burning'
            : 'exhausted';
      return {
        id: item.id,
        owner: item.owner,
        measurementWindow: item.measurementWindow,
        target: item.target,
        errorBudget: item.errorBudget,
        totalEvents,
        successfulEvents,
        successRate,
        status,
        rollback: item.rollback
      };
    });
    const observed = objectives.filter(item => item.status !== 'unknown');
    const hasExhausted = observed.some(item => item.status === 'exhausted');
    const hasBurning = observed.some(item => item.status === 'burning');
    return {
      schemaVersion: 1,
      tenantId: safeString(input.tenantId),
      environment: safeString(input.environment),
      generatedAt: safeIso(input.generatedAt) || new Date().toISOString(),
      status: hasExhausted ? 'degraded' : hasBurning ? 'watch' : observed.length ? 'healthy' : 'unknown',
      objectives
    };
  }

  function buildRosterDriftSignal(input = {}) {
    const expected = nonNegative(input.expectedActiveMemberships);
    const staged = nonNegative(input.stagedActiveMemberships);
    const dropped = nonNegative(input.droppedMemberships);
    const guardianConflicts = nonNegative(input.guardianConflicts);
    const duplicateStudentMatches = nonNegative(input.duplicateStudentMatches);
    const activeMembershipDriftRate = expected ? round(Math.abs(expected - staged) / expected) : 0;
    const droppedMembershipRate = expected ? round(dropped / expected) : 0;
    const reasons = [];
    if (activeMembershipDriftRate > 0.05) reasons.push('active_membership_drift_exceeds_threshold');
    if (droppedMembershipRate > 0.05) reasons.push('dropped_memberships_exceed_threshold');
    if (guardianConflicts > 0) reasons.push('guardian_conflicts_present');
    if (duplicateStudentMatches > 0) reasons.push('duplicate_student_matches_present');
    return {
      schemaVersion: 1,
      tenantId: safeString(input.tenantId),
      environment: safeString(input.environment),
      generatedAt: safeIso(input.generatedAt) || new Date().toISOString(),
      expectedActiveMemberships: expected,
      stagedActiveMemberships: staged,
      droppedMemberships: dropped,
      guardianConflicts,
      teacherTransfers: nonNegative(input.teacherTransfers),
      duplicateStudentMatches,
      activeMembershipDriftRate,
      droppedMembershipRate,
      status: reasons.length > 0 ? 'blocking' : activeMembershipDriftRate > 0.03 || droppedMembershipRate > 0.03 ? 'warning' : 'healthy',
      reasons
    };
  }

  function objective(id, label, owner, measurementWindow, target, errorBudget, telemetrySignals, runbook, rollback) {
    return Object.freeze({ id, label, owner, measurementWindow, target, errorBudget, telemetrySignals: Object.freeze(telemetrySignals.slice()), runbook, rollback });
  }

  function normalizeObjective(objective) {
    const input = objective && typeof objective === 'object' ? objective : {};
    return {
      id: safeString(input.id),
      label: safeString(input.label || input.id),
      owner: safeString(input.owner),
      measurementWindow: safeString(input.measurementWindow),
      target: Number(input.target),
      errorBudget: Number(input.errorBudget),
      telemetrySignals: normalizeStringArray(input.telemetrySignals),
      runbook: safeString(input.runbook),
      rollback: safeString(input.rollback)
    };
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function nonNegative(value) {
    return Math.max(0, Math.round(Number(value) || 0));
  }

  function round(value) {
    return Math.round(value * 10000) / 10000;
  }

  function safeIso(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_INSTITUTIONAL_PROVISIONING_SLO_POLICY,
    buildRosterDriftSignal,
    buildTenantHealthSummary,
    validateInstitutionalProvisioningSloPolicy
  };
});
