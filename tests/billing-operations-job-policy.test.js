const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BILLING_OPERATIONS_FORBIDDEN_PATTERN,
  DEFAULT_BILLING_OPERATIONS_JOB_POLICY,
  REQUIRED_BILLING_OPERATIONS_JOBS,
  assertBillingOperationsPrivacy,
  buildBillingOperationsJobMap,
  buildDunningProjection,
  buildProviderHealthSummary,
  buildReconciliationResult,
  classifyBillingRetry,
  validateBillingOperationsJobPolicy
} = require('../assets/billing-operations-job-policy');
const {
  DEFAULT_PRODUCTION_SLO_POLICY,
  validateProductionSloPolicy
} = require('../assets/production-slo-policy');
const {
  DEFAULT_SYNTHETIC_MONITOR_POLICY,
  validateSyntheticMonitorPolicy
} = require('../assets/synthetic-monitor-policy');

const repoRoot = path.resolve(__dirname, '..');

test('billing operations job policy defines provider-neutral reconciliation dunning retry and health jobs', () => {
  assert.deepEqual(REQUIRED_BILLING_OPERATIONS_JOBS, [
    'reconciliation',
    'missed_webhook_detection',
    'dunning',
    'retry_classification',
    'provider_health'
  ]);

  const result = validateBillingOperationsJobPolicy(DEFAULT_BILLING_OPERATIONS_JOB_POLICY);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(Object.keys(buildBillingOperationsJobMap(DEFAULT_BILLING_OPERATIONS_JOB_POLICY)), REQUIRED_BILLING_OPERATIONS_JOBS);

  result.policy.jobs.forEach(job => {
    assert.equal(job.serverOwned, true, `${job.id} is server owned`);
    assert.equal(job.entitlementMutationAllowed, false, `${job.id} cannot mutate entitlements directly`);
    assert.equal(job.privacySafeSummaryOnly, true, `${job.id} emits privacy-safe summaries only`);
    assert.ok(job.cadence, `${job.id} cadence is required`);
    assert.ok(job.owner, `${job.id} owner is required`);
  });
});

test('reconciliation and missed-webhook results require verified ledger evidence before entitlement change', () => {
  const result = buildReconciliationResult({
    appLedger: [
      { redactedReference: 'sub_ref_01', status: 'active', ledgerEventId: 'ledger-1' },
      { redactedReference: 'sub_ref_02', status: 'active', ledgerEventId: 'ledger-2' }
    ],
    providerConfirmed: [
      { redactedReference: 'sub_ref_01', status: 'active', providerEventDigest: 'sha256:ok' },
      { redactedReference: 'sub_ref_02', status: 'past_due', providerEventDigest: 'sha256:late' },
      { redactedReference: 'sub_ref_03', status: 'active', providerEventDigest: 'sha256:missing' }
    ]
  });

  assert.equal(result.jobId, 'reconciliation');
  assert.deepEqual(result.summary, {
    matched: 1,
    mismatched: 1,
    missingLedgerEvents: 1,
    requiresLedgerEvidence: true,
    entitlementMutationAllowed: false
  });
  assert.deepEqual(result.actions.map(action => action.type), [
    'queue_missed_webhook_review',
    'queue_reconciliation_review'
  ]);
  assert.doesNotThrow(() => assertBillingOperationsPrivacy(result));
});

test('dunning and retry classification stay non-destructive and idempotent', () => {
  const dunning = buildDunningProjection({
    billingState: 'past_due',
    renewalFailureCount: 2,
    freePracticeAvailable: true,
    nextAction: 'send_parent_safe_failed_payment_notice',
    providerCustomerId: 'unsafe-provider-ref',
    learnerId: 'unsafe-learner'
  });

  assert.equal(dunning.entitlementMutationAllowed, false);
  assert.equal(dunning.freePracticeAvailable, true);
  assert.equal(dunning.noticeType, 'failed_payment_recovery');
  assert.doesNotMatch(JSON.stringify(dunning), /unsafe-provider-ref|unsafe-learner/);

  assert.deepEqual(classifyBillingRetry({ errorCategory: 'provider_timeout', attempt: 1 }), {
    retryClass: 'transient',
    shouldRetry: true,
    idempotencyRequired: true,
    nextDelayMinutes: 15
  });
  assert.equal(classifyBillingRetry({ errorCategory: 'invalid_request', attempt: 1 }).retryClass, 'permanent');
  assert.equal(classifyBillingRetry({ errorCategory: 'provider_timeout', attempt: 5 }).retryClass, 'exhausted');
});

test('provider health summary is aggregate and privacy-safe', () => {
  const summary = buildProviderHealthSummary({
    windowMinutes: 15,
    attempts: 120,
    successes: 108,
    webhookLagP95Minutes: 9,
    providerCustomerId: 'unsafe-provider-ref',
    rawProviderPayload: { nested: true },
    paymentCredential: 'unsafe-payment'
  });

  assert.equal(summary.jobId, 'provider_health');
  assert.equal(summary.status, 'degraded');
  assert.equal(summary.successRate, 0.9);
  assert.equal(summary.entitlementMutationAllowed, false);
  assert.doesNotMatch(JSON.stringify(summary), /unsafe-provider-ref|rawProviderPayload|unsafe-payment/);
});

test('billing operations privacy rejects raw provider payment learner and mutation outputs', () => {
  [
    { providerCustomerId: 'provider-ref' },
    { rawProviderPayload: { nested: true } },
    { paymentCredential: 'payment' },
    { learnerId: 'learner-one' },
    { studentName: 'Maya' },
    { token: 'unsafe' },
    { entitlementMutation: { grant: true } }
  ].forEach(payload => {
    assert.throws(() => assertBillingOperationsPrivacy(payload), /unsafe_billing_operations_output/);
  });

  assert.doesNotThrow(() => assertBillingOperationsPrivacy({
    jobId: 'provider_health',
    status: 'healthy',
    aggregateCounts: { attempts: 10, failures: 0 },
    entitlementMutationAllowed: false
  }));
});

test('billing operations docs SLO synthetic monitor compliance and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-operations-jobs.md'), 'utf8');
  const webhookDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-webhook-ledger-policy.md'), 'utf8');
  const entitlementDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-entitlement-projection.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'reconciliation',
    'missed webhook detection',
    'dunning',
    'retry classification',
    'provider health',
    'privacy-safe summaries',
    'do not grant or revoke entitlement'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(webhookDocs, /billing-operations-jobs\.md/);
  assert.match(entitlementDocs, /billing operations jobs/i);
  assert.match(checklist, /billing-operations-jobs\.md/);
  assert.match(checklist, /billing-operations-job-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-operations-job-policy\.test\.js/);
  assert.doesNotMatch(docs + webhookDocs + entitlementDocs + checklist, BILLING_OPERATIONS_FORBIDDEN_PATTERN);

  const slo = validateProductionSloPolicy(DEFAULT_PRODUCTION_SLO_POLICY);
  assert.deepEqual(slo.errors, []);
  assert.ok(slo.policy.objectives.some(objective => objective.id === 'billing_operations_health'));

  const monitors = validateSyntheticMonitorPolicy(DEFAULT_SYNTHETIC_MONITOR_POLICY);
  assert.deepEqual(monitors.errors, []);
  assert.ok(monitors.policy.monitors.some(monitor => monitor.id === 'billing_operations_health'));
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
