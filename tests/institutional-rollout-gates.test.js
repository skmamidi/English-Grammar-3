const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const gates = require('../assets/institutional-rollout-gates');

const repoRoot = path.resolve(__dirname, '..');

test('institutional rollout gates block launch until every required evidence domain is dated and owned', () => {
  const decision = gates.evaluateInstitutionalLaunchGates({
    tenantId: 'school-a',
    environment: 'staging',
    owner: 'school_success_owner',
    flags: {
      institutionalTenantProvisioningEnabled: true,
      institutionalRosterActivationEnabled: true,
      institutionalSsoLoginEnabled: true,
      institutionalReportsEnabled: true,
      institutionalExportsEnabled: true
    },
    evidence: {
      tenantIsolationVerified: evidence('security_owner'),
      rosterImportBoundaryVerified: evidence('school_data_owner'),
      ssoPolicyVerified: evidence('identity_owner'),
      verifiedReportingVerified: evidence('school_data_owner'),
      institutionalExportVerified: evidence('security_owner'),
      privacyEvidenceVerified: evidence('privacy_owner'),
      supportOwnerAssigned: evidence('support_owner'),
      productionSloVerified: evidence('operations_owner'),
      syntheticMonitorVerified: evidence('operations_owner')
    }
  });

  assert.equal(decision.ready, false);
  assert.equal(decision.provisioningAvailable, false);
  assert.deepEqual(decision.blockers, ['rollback_rehearsal_verified_missing']);
  assert.equal(decision.localPracticeAvailable, true);
});

test('institutional rollout gates expose independent provisioning kill switches while preserving practice', () => {
  const launchEvidence = gates.REQUIRED_INSTITUTIONAL_LAUNCH_EVIDENCE.reduce((result, key) => {
    result[key] = evidence('launch_owner');
    return result;
  }, {});
  const decision = gates.evaluateInstitutionalLaunchGates({
    tenantId: 'school-a',
    environment: 'production',
    owner: 'school_success_owner',
    flags: {
      institutionalTenantProvisioningEnabled: true,
      institutionalRosterActivationEnabled: false,
      institutionalSsoLoginEnabled: false,
      institutionalReportsEnabled: true,
      institutionalExportsEnabled: false,
      coreLocalPracticeEnabled: true
    },
    evidence: launchEvidence
  });

  assert.equal(decision.ready, true);
  assert.equal(decision.provisioningAvailable, true);
  assert.equal(decision.localPracticeAvailable, true);
  assert.deepEqual(decision.capabilities, {
    tenantProvisioning: true,
    rosterActivation: false,
    ssoLogin: false,
    institutionalReports: true,
    institutionalExports: false
  });
  assert.deepEqual(decision.rollback, {
    preserveLocalPractice: true,
    preserveVerifiedLearningEvidence: true,
    preserveAuditHistory: true,
    disableTenantProvisioningFlag: 'institutionalTenantProvisioningEnabled',
    disableRosterActivationFlag: 'institutionalRosterActivationEnabled',
    disableSsoLoginFlag: 'institutionalSsoLoginEnabled',
    disableReportsFlag: 'institutionalReportsEnabled',
    disableExportsFlag: 'institutionalExportsEnabled'
  });
});

test('provisioning runbook and rollback plan keep onboarding separate from learner practice', () => {
  const rollbackPlan = gates.buildInstitutionalRollbackPlan({
    tenantId: 'school-a',
    environment: 'staging',
    owner: 'operations_owner',
    reason: 'Roster activation drift exceeded launch threshold',
    rehearsedAt: '2030-05-05T12:00:00.000Z'
  });
  const runbook = gates.buildProvisioningRunbook({
    tenantId: 'school-a',
    environment: 'staging',
    owner: 'school_success_owner',
    steps: ['verify tenant isolation', 'stage roster import', 'enable SSO policy'],
    rollbackPlan
  });

  assert.deepEqual(gates.validateInstitutionalRollbackPlan(rollbackPlan).errors, []);
  assert.deepEqual(gates.validateProvisioningRunbook(runbook).errors, []);
  assert.equal(rollbackPlan.disablesInstitutionalOnboarding, true);
  assert.equal(rollbackPlan.preservesLocalPractice, true);
  assert.equal(rollbackPlan.preservesVerifiedLearningEvidence, true);
  assert.equal(rollbackPlan.preservesAuditHistory, true);
});

test('institutional rollout docs describe launch evidence support ownership SLOs monitors and rollback', () => {
  const doc = fs.readFileSync(path.join(repoRoot, 'docs', 'institutional-rollout-and-provisioning.md'), 'utf8');
  [
    'InstitutionalLaunchGate',
    'ProvisioningRunbook',
    'TenantHealthSummary',
    'RosterDriftSignal',
    'InstitutionalRollbackPlan',
    'tenant isolation',
    'roster',
    'SSO',
    'verified reporting',
    'export policy',
    'support owner',
    'SLO',
    'synthetic monitor',
    'local practice remains available'
  ].forEach(required => assert.match(doc, new RegExp(escapeRegex(required), 'i')));
});

test('ci contract wires institutional rollout gates into the unit gate', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.match(pkg.scripts['test:unit'], /tests\/institutional-rollout-gates\.test\.js/);
});

function evidence(owner) {
  return { verified: true, owner, reviewedAt: '2030-05-05T12:00:00.000Z', evidenceRef: 'evidence:synthetic-tenant' };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
