const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_PRODUCTION_SLO_POLICY,
  buildErrorBudgetSummary,
  validateProductionSloPolicy
} = require('../assets/production-slo-policy');

test('production SLO policy defines required critical objectives', () => {
  const result = validateProductionSloPolicy(DEFAULT_PRODUCTION_SLO_POLICY);
  const objectiveIds = result.policy.objectives.map(objective => objective.id);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(objectiveIds, [
    'quiz_start_success',
    'chunk_hydration_success',
    'selection_api_readiness',
    'offline_recovery_success',
    'learner_sync_success',
    'content_publication_freshness',
    'billing_operations_health',
    'billing_checkout_start_success',
    'billing_checkout_completion_webhook_latency',
    'billing_entitlement_update_latency',
    'billing_renewal_success',
    'billing_provider_api_error_rate',
    'billing_page_render_health',
    'billing_webhook_failure_rate',
    'billing_refund_dispute_queue_age',
    'leaderboard_materialization_freshness',
    'mission_route_success',
    'mission_completion_projection_freshness',
    'mission_reminder_delivery_safety',
    'personalization_assembly_health',
    'personalization_fallback_safety',
    'personalization_fairness_gate_health',
    'institutional_login_success',
    'roster_sync_freshness',
    'assignment_provisioning_success',
    'verified_report_projection_freshness',
    'institutional_export_request_success',
    'institutional_rollback_rehearsal_success'
  ]);
});

test('production SLO policy includes institutional provisioning objectives', () => {
  const result = validateProductionSloPolicy(DEFAULT_PRODUCTION_SLO_POLICY);
  const objectives = new Map(result.policy.objectives.map(objective => [objective.id, objective]));

  assert.deepEqual(objectives.get('institutional_login_success').telemetrySignals.sort(), [
    'institutional_login_failed',
    'institutional_login_succeeded'
  ]);
  assert.match(objectives.get('institutional_login_success').rollback, /institutionalSsoLoginEnabled/);
  assert.match(objectives.get('roster_sync_freshness').rollback, /institutionalRosterActivationEnabled/);
  assert.match(objectives.get('institutional_export_request_success').rollback, /institutionalExportsEnabled/);
  assert.match(objectives.get('institutional_rollback_rehearsal_success').rollback, /institutionalTenantProvisioningEnabled/);
});

test('production SLO policy includes mission rollout observability objectives', () => {
  const result = validateProductionSloPolicy(DEFAULT_PRODUCTION_SLO_POLICY);
  const objectives = new Map(result.policy.objectives.map(objective => [objective.id, objective]));

  assert.deepEqual(objectives.get('mission_route_success').telemetrySignals.sort(), [
    'mission_start',
    'mission_step_completed',
    'route_load_failed'
  ]);
  assert.match(objectives.get('mission_route_success').rollback, /missionLearnerRouteEnabled/);
  assert.deepEqual(objectives.get('mission_completion_projection_freshness').telemetrySignals.sort(), [
    'mission_completion_outcome',
    'mission_reward_reconciled',
    'mission_sync_failed'
  ]);
  assert.match(objectives.get('mission_reminder_delivery_safety').rollback, /missionRemindersEnabled/);
});

test('production SLO policy includes personalization observability objectives', () => {
  const result = validateProductionSloPolicy(DEFAULT_PRODUCTION_SLO_POLICY);
  const objectives = new Map(result.policy.objectives.map(objective => [objective.id, objective]));

  assert.deepEqual(objectives.get('personalization_assembly_health').telemetrySignals.sort(), [
    'personalization_assembly_completed',
    'personalization_feature_store_read'
  ]);
  assert.match(objectives.get('personalization_assembly_health').rollback, /dynamicQuizAssemblyPilot/);
  assert.match(objectives.get('personalization_fallback_safety').rollback, /personalizationDisplayEnabled/);
  assert.match(objectives.get('personalization_fairness_gate_health').rollback, /learningExperimentPilot/);
});

test('production SLO policy requires owners windows thresholds budgets and runbooks', () => {
  const result = validateProductionSloPolicy({
    objectives: [{
      id: 'quiz_start_success',
      owner: '',
      measurementWindow: 'daily',
      target: 1.5,
      errorBudget: 0,
      telemetrySignals: [],
      runbook: 'docs/operations/runbook-stale-question-artifacts.md',
      rollback: ''
    }]
  });

  assert.deepEqual(result.errors, [
    'quiz_start_success owner is required',
    'quiz_start_success measurementWindow must be one of 7d, 14d, 30d',
    'quiz_start_success target must be between 0.9 and 0.9999',
    'quiz_start_success errorBudget must be greater than 0 and less than or equal to 0.1',
    'quiz_start_success telemetrySignals are required',
    'quiz_start_success rollback is required'
  ]);
});

test('SLO policy stays aggregate and privacy-safe', () => {
  const unsafeKeys = [
    'learnerId',
    'studentId',
    'question',
    'choices',
    'answer',
    'explanation',
    'prompt',
    'email',
    'token'
  ];

  assert.deepEqual(findUnsafeKeys(DEFAULT_PRODUCTION_SLO_POLICY, unsafeKeys), []);
});

test('error budget summary classifies aggregate observations deterministically', () => {
  const summary = buildErrorBudgetSummary(DEFAULT_PRODUCTION_SLO_POLICY, {
    quiz_start_success: { totalEvents: 10000, successfulEvents: 9988 },
    chunk_hydration_success: { totalEvents: 5000, successfulEvents: 4930 },
    selection_api_readiness: { totalEvents: 1200, successfulEvents: 1100 }
  });

  assert.equal(summary.objectives.find(item => item.id === 'quiz_start_success').status, 'healthy');
  assert.equal(summary.objectives.find(item => item.id === 'chunk_hydration_success').status, 'burning');
  assert.equal(summary.objectives.find(item => item.id === 'selection_api_readiness').status, 'exhausted');
  assert.deepEqual(findUnsafeKeys(summary, ['learnerId', 'studentId', 'question', 'answer', 'prompt']), []);
});

function findUnsafeKeys(value, unsafeKeys, path = []) {
  if (!value || typeof value !== 'object') return [];
  return Object.keys(value).flatMap(key => {
    const currentPath = path.concat(key);
    const keyFinding = unsafeKeys.includes(key) ? [currentPath.join('.')] : [];
    return keyFinding.concat(findUnsafeKeys(value[key], unsafeKeys, currentPath));
  });
}
