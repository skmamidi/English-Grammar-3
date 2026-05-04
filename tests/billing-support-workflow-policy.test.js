const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BILLING_SUPPORT_FORBIDDEN_PATTERN,
  DEFAULT_BILLING_SUPPORT_WORKFLOW_POLICY,
  REQUIRED_BILLING_SUPPORT_WORKFLOWS,
  assertBillingSupportWorkflowPrivacy,
  buildBillingSupportWorkflowMap,
  buildManualAdjustmentWorkflow,
  buildSupportVisibilityProjection,
  validateBillingSupportWorkflowPolicy,
  validateBillingSupportWorkflowRequest
} = require('../assets/billing-support-workflow-policy');

const repoRoot = path.resolve(__dirname, '..');

test('billing support workflow policy defines required audited workflows', () => {
  assert.deepEqual(REQUIRED_BILLING_SUPPORT_WORKFLOWS, [
    'refund_escalation',
    'cancellation_handling',
    'chargeback_dispute',
    'support_visibility',
    'manual_adjustment'
  ]);

  const result = validateBillingSupportWorkflowPolicy(DEFAULT_BILLING_SUPPORT_WORKFLOW_POLICY);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(Object.keys(buildBillingSupportWorkflowMap(DEFAULT_BILLING_SUPPORT_WORKFLOW_POLICY)), REQUIRED_BILLING_SUPPORT_WORKFLOWS);
  result.policy.workflows.forEach(workflow => {
    assert.equal(workflow.auditRequired, true, `${workflow.id} requires audit`);
    assert.equal(workflow.providerMutationAllowed, false, `${workflow.id} cannot mutate provider records`);
    assert.equal(workflow.directEntitlementChangeAllowed, false, `${workflow.id} cannot change entitlement directly`);
    assert.ok(workflow.owner, `${workflow.id} owner is required`);
  });
});

test('support visibility projection excludes learner content and provider payment details', () => {
  const projection = buildSupportVisibilityProjection({
    billingOwnerId: 'guardian-1',
    status: 'past_due',
    planFamily: 'premium',
    renewalDisplay: 'Retry pending',
    learnerId: 'learner-unsafe',
    studentName: 'Maya Unsafe',
    rawProviderPayload: { nested: true },
    providerCustomerId: 'provider-unsafe',
    paymentCredential: 'credential-unsafe',
    questionPrompt: 'raw learner content'
  });

  assert.deepEqual(projection, {
    billingOwnerId: 'guardian-1',
    status: 'past_due',
    planFamily: 'premium',
    renewalDisplay: 'Retry pending',
    visibility: 'billing_summary_only'
  });
  assert.doesNotThrow(() => assertBillingSupportWorkflowPrivacy(projection));
});

test('refund cancellation and chargeback requests are escalations not direct mutations', () => {
  [
    'refund_escalation',
    'cancellation_handling',
    'chargeback_dispute'
  ].forEach(workflow => {
    const result = validateBillingSupportWorkflowRequest({
      workflow,
      billingOwnerId: 'guardian-1',
      verifiedParentGuardianId: 'guardian-1',
      evidence: ['support_ticket_verified_contact'],
      reason: 'Parent requested help.',
      issuesRefund: false,
      providerMutation: false,
      directEntitlementChange: false
    });
    assert.deepEqual(result.errors, []);
  });

  const unsafe = validateBillingSupportWorkflowRequest({
    workflow: 'refund_escalation',
    billingOwnerId: 'guardian-1',
    verifiedParentGuardianId: 'guardian-1',
    evidence: ['support_ticket_verified_contact'],
    reason: 'Unsafe request.',
    issuesRefund: true,
    providerMutation: true,
    directEntitlementChange: true
  });
  assert.ok(unsafe.errors.includes('support workflow cannot directly issue refunds'));
  assert.ok(unsafe.errors.includes('support workflow cannot mutate provider records'));
  assert.ok(unsafe.errors.includes('support workflow cannot directly change entitlements'));
});

test('manual adjustments require source evidence expiration and remain temporary', () => {
  const adjustment = buildManualAdjustmentWorkflow({
    billingOwnerId: 'guardian-1',
    verifiedParentGuardianId: 'guardian-1',
    evidence: ['support_ticket_verified_outage'],
    reason: 'Temporary access while billing provider health is degraded.',
    accessLevel: 'premium',
    sourceEvidence: 'billing_operations_health_degraded',
    expiresAt: '2030-05-10T00:00:00.000Z'
  });

  assert.equal(adjustment.workflow, 'manual_adjustment');
  assert.equal(adjustment.permanentAccessAllowed, false);
  assert.equal(adjustment.directEntitlementChangeAllowed, false);
  assert.equal(adjustment.expiresAt, '2030-05-10T00:00:00.000Z');

  const missingExpiry = validateBillingSupportWorkflowRequest({
    ...adjustment,
    expiresAt: ''
  });
  assert.ok(missingExpiry.errors.includes('manual adjustment expiration is required'));
  assert.ok(validateBillingSupportWorkflowRequest({
    ...adjustment,
    sourceEvidence: ''
  }).errors.includes('manual adjustment source evidence is required'));
});

test('billing support workflow privacy rejects learner provider credential and permanent access outputs', () => {
  [
    { learnerId: 'learner-one' },
    { studentName: 'Maya' },
    { questionPrompt: 'raw prompt' },
    { providerCustomerId: 'provider-ref' },
    { rawProviderPayload: { nested: true } },
    { paymentCredential: 'payment' },
    { cardNumber: 'full-card' },
    { token: 'unsafe' },
    { permanentAccessAllowed: true }
  ].forEach(payload => {
    assert.throws(() => assertBillingSupportWorkflowPrivacy(payload), /unsafe_billing_support_workflow/);
  });
});

test('billing support workflow docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-support-workflows.md'), 'utf8');
  const support = fs.readFileSync(path.join(repoRoot, 'docs', 'commerce-support-policy.md'), 'utf8');
  const management = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-management-actions.md'), 'utf8');
  const webhook = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-webhook-ledger-policy.md'), 'utf8');
  const history = fs.readFileSync(path.join(repoRoot, 'docs', 'payment-history-presentation.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'refund escalation',
    'cancellation handling',
    'chargeback',
    'support visibility',
    'manual adjustment',
    'expiration',
    'source evidence',
    'do not expose learner content'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(support, /billing-support-workflows\.md/);
  assert.match(management, /billing-support-workflows\.md/);
  assert.match(webhook, /billing-support-workflows\.md/);
  assert.match(history, /billing-support-workflows\.md/);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-support-workflow-policy\.test\.js/);
  assert.doesNotMatch(docs + support + management + webhook + history, BILLING_SUPPORT_FORBIDDEN_PATTERN);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
