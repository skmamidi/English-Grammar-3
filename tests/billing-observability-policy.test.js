const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_BILLING_OBSERVABILITY_POLICY,
  REQUIRED_BILLING_OBSERVABILITY_SIGNALS,
  validateBillingObservabilityPolicy
} = require('../assets/billing-observability-policy');
const {
  DEFAULT_PRODUCTION_SLO_POLICY,
  validateProductionSloPolicy
} = require('../assets/production-slo-policy');
const {
  DEFAULT_SYNTHETIC_MONITOR_POLICY,
  validateSyntheticMonitorPolicy
} = require('../assets/synthetic-monitor-policy');
const {
  DEFAULT_OPERATIONAL_COST_BUDGET_POLICY,
  evaluateOperationalCostBudget,
  validateOperationalCostBudgetPolicy
} = require('../assets/operational-cost-budget');

const repoRoot = path.resolve(__dirname, '..');

test('billing observability policy defines required SLO monitor and cost signals', () => {
  assert.deepEqual(REQUIRED_BILLING_OBSERVABILITY_SIGNALS, [
    'checkout_start_success',
    'checkout_completion_webhook_latency',
    'entitlement_update_latency',
    'renewal_success',
    'provider_api_error_rate',
    'billing_page_render_health',
    'webhook_failure_rate',
    'refund_dispute_queue_age',
    'provider_fee_budget',
    'failed_payment_recovery_cost'
  ]);

  const result = validateBillingObservabilityPolicy(DEFAULT_BILLING_OBSERVABILITY_POLICY);
  assert.deepEqual(result.errors, []);
  result.policy.signals.forEach(signal => {
    assert.ok(signal.owner, `${signal.id} owner is required`);
    assert.ok(signal.alertPath, `${signal.id} alert path is required`);
    assert.equal(signal.privacySafe, true, `${signal.id} is privacy-safe`);
    assert.equal(signal.launchBlocking, true, `${signal.id} is launch-blocking evidence`);
  });
});

test('production SLOs and synthetic monitors include billing launch coverage', () => {
  const slo = validateProductionSloPolicy(DEFAULT_PRODUCTION_SLO_POLICY);
  const monitors = validateSyntheticMonitorPolicy(DEFAULT_SYNTHETIC_MONITOR_POLICY);
  const objectiveIds = new Set(slo.policy.objectives.map(objective => objective.id));
  const monitorIds = new Set(monitors.policy.monitors.map(monitor => monitor.id));

  assert.deepEqual(slo.errors, []);
  assert.deepEqual(monitors.errors, []);
  [
    'billing_checkout_start_success',
    'billing_checkout_completion_webhook_latency',
    'billing_entitlement_update_latency',
    'billing_renewal_success',
    'billing_provider_api_error_rate',
    'billing_page_render_health',
    'billing_webhook_failure_rate',
    'billing_refund_dispute_queue_age'
  ].forEach(id => assert.ok(objectiveIds.has(id), `missing billing SLO ${id}`));

  [
    'billing_page_render_health',
    'billing_checkout_start_test_mode',
    'billing_webhook_health_test_mode'
  ].forEach(id => assert.ok(monitorIds.has(id), `missing billing synthetic monitor ${id}`));

  monitors.policy.monitors
    .filter(monitor => monitor.id.startsWith('billing_'))
    .forEach(monitor => {
      assert.equal(monitor.mutatesState, false);
      assert.equal(monitor.requiresCredentials, false);
      assert.equal(monitor.capturesPayload, false);
      assert.doesNotMatch(monitor.targetPath, /\?/);
    });
});

test('billing cost budgets define provider fees recovery costs queue age and monitor traffic', () => {
  const validation = validateOperationalCostBudgetPolicy(DEFAULT_OPERATIONAL_COST_BUDGET_POLICY);
  const ids = new Set(validation.policy.budgets.map(budget => budget.id));

  assert.deepEqual(validation.errors, []);
  [
    'provider_fees_minor',
    'failed_payment_recovery_minor',
    'refund_dispute_queue_age_hours',
    'billing_monitor_requests'
  ].forEach(id => assert.ok(ids.has(id), `missing billing cost budget ${id}`));

  const result = evaluateOperationalCostBudget(DEFAULT_OPERATIONAL_COST_BUDGET_POLICY, {
    route: '/subscription.html?provider=unsafe',
    providerFeesMinor: 175000,
    failedPaymentRecoveryMinor: 70000,
    refundDisputeQueueAgeHours: 80,
    billingMonitorRequests: 700,
    learnerId: 'learner-one',
    rawProviderPayload: { nested: true },
    paymentCredential: 'payment'
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors.map(error => error.id), [
    'provider_fees_minor',
    'failed_payment_recovery_minor',
    'refund_dispute_queue_age_hours',
    'billing_monitor_requests'
  ]);
  assert.doesNotMatch(JSON.stringify(result), /learner-one|rawProviderPayload|paymentCredential|provider=unsafe/);
});

test('billing observability docs compliance and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'billing-observability.md'), 'utf8');
  const slos = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'production-slos.md'), 'utf8');
  const monitors = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'synthetic-monitors.md'), 'utf8');
  const costs = fs.readFileSync(path.join(repoRoot, 'docs', 'performance', 'operational-cost-budgets.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  REQUIRED_BILLING_OBSERVABILITY_SIGNALS.forEach(signal => {
    assert.match(docs, new RegExp(escapeRegex(signal), 'i'));
  });
  assert.match(slos, /billing checkout start/i);
  assert.match(monitors, /billing checkout start test mode/i);
  assert.match(costs, /Provider fees/i);
  assert.match(checklist, /billing-observability-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-observability-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
