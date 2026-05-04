(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingSupportWorkflowPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_BILLING_SUPPORT_WORKFLOWS = Object.freeze([
    'refund_escalation',
    'cancellation_handling',
    'chargeback_dispute',
    'support_visibility',
    'manual_adjustment'
  ]);

  const BILLING_SUPPORT_FORBIDDEN_PATTERN = /"?(learnerId|studentId|studentName|questionPrompt|questionText|answer|learnerAnswer|providerCustomerId|providerPaymentMethodId|rawProviderPayload|paymentCredential|walletCredential|cardNumber|cvv|cvc|authToken|token|secret)"?\s*:|provider_live_[A-Za-z0-9_-]+|customer_live_[A-Za-z0-9_-]+/i;

  const DEFAULT_BILLING_SUPPORT_WORKFLOW_POLICY = Object.freeze({
    schemaVersion: 1,
    workflows: Object.freeze([
      workflow('refund_escalation', 'billing_policy_owner', 'Escalate refund requests with parent ownership evidence and no direct refund issuance.'),
      workflow('cancellation_handling', 'billing_policy_owner', 'Handle cancellation timing and parent copy without mutating provider records from support UI.'),
      workflow('chargeback_dispute', 'billing_policy_owner', 'Escalate chargeback and dispute effects through verified billing ledger events.'),
      workflow('support_visibility', 'commerce_support', 'Show billing status summary only, separate from learner content.'),
      workflow('manual_adjustment', 'billing_policy_owner', 'Allow temporary manual adjustments only with source evidence, audit, and expiration.')
    ])
  });

  function workflow(id, owner, purpose) {
    return Object.freeze({
      id,
      owner,
      purpose,
      auditRequired: true,
      providerMutationAllowed: false,
      directEntitlementChangeAllowed: false
    });
  }

  function validateBillingSupportWorkflowPolicy(policy = DEFAULT_BILLING_SUPPORT_WORKFLOW_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const workflows = (Array.isArray(input.workflows) ? input.workflows : []).map(normalizeWorkflow);
    const errors = [];
    const ids = new Set(workflows.map(item => item.id));

    REQUIRED_BILLING_SUPPORT_WORKFLOWS.forEach(id => {
      if (!ids.has(id)) errors.push(`${id} billing support workflow is required`);
    });
    workflows.forEach(item => {
      if (!item.id) errors.push('workflow id is required');
      if (!item.owner) errors.push(`${item.id} owner is required`);
      if (item.auditRequired !== true) errors.push(`${item.id} audit is required`);
      if (item.providerMutationAllowed !== false) errors.push(`${item.id} cannot mutate provider records`);
      if (item.directEntitlementChangeAllowed !== false) errors.push(`${item.id} cannot directly change entitlements`);
    });

    return {
      valid: errors.length === 0,
      errors,
      policy: { schemaVersion: 1, workflows }
    };
  }

  function buildBillingSupportWorkflowMap(policy = DEFAULT_BILLING_SUPPORT_WORKFLOW_POLICY) {
    return validateBillingSupportWorkflowPolicy(policy).policy.workflows.reduce((result, item) => {
      result[item.id] = item;
      return result;
    }, {});
  }

  function buildSupportVisibilityProjection(input = {}) {
    const projection = {
      billingOwnerId: safeString(input.billingOwnerId),
      status: safeString(input.status),
      planFamily: safeString(input.planFamily),
      renewalDisplay: safeString(input.renewalDisplay),
      visibility: 'billing_summary_only'
    };
    assertBillingSupportWorkflowPrivacy(projection);
    return projection;
  }

  function buildManualAdjustmentWorkflow(input = {}) {
    const adjustment = {
      workflow: 'manual_adjustment',
      billingOwnerId: safeString(input.billingOwnerId),
      verifiedParentGuardianId: safeString(input.verifiedParentGuardianId),
      evidence: normalizeStringArray(input.evidence),
      reason: safeString(input.reason),
      accessLevel: safeString(input.accessLevel),
      sourceEvidence: safeString(input.sourceEvidence),
      expiresAt: safeString(input.expiresAt),
      permanentAccessAllowed: false,
      directEntitlementChangeAllowed: false
    };
    assertBillingSupportWorkflowPrivacy(adjustment);
    return adjustment;
  }

  function validateBillingSupportWorkflowRequest(request = {}) {
    const input = request && typeof request === 'object' ? request : {};
    const workflowId = safeString(input.workflow);
    const errors = [];
    if (!REQUIRED_BILLING_SUPPORT_WORKFLOWS.includes(workflowId)) errors.push('unknown billing support workflow');
    if (!safeString(input.billingOwnerId)) errors.push('billingOwnerId is required');
    if (!safeString(input.verifiedParentGuardianId)) errors.push('verified parent guardian is required');
    if (safeString(input.billingOwnerId) && safeString(input.verifiedParentGuardianId) && input.billingOwnerId !== input.verifiedParentGuardianId) {
      errors.push('parent ownership verification must match billing owner');
    }
    if (!normalizeStringArray(input.evidence).length) errors.push('support evidence is required');
    if (!safeString(input.reason)) errors.push('support reason is required');
    if (input.issuesRefund === true) errors.push('support workflow cannot directly issue refunds');
    if (input.providerMutation === true) errors.push('support workflow cannot mutate provider records');
    if (input.directEntitlementChange === true) errors.push('support workflow cannot directly change entitlements');
    if (workflowId === 'manual_adjustment') {
      if (!safeString(input.expiresAt)) errors.push('manual adjustment expiration is required');
      if (!safeString(input.sourceEvidence)) errors.push('manual adjustment source evidence is required');
      if (input.permanentAccessAllowed === true) errors.push('manual adjustment cannot grant permanent access');
    }
    return { valid: errors.length === 0, errors };
  }

  function assertBillingSupportWorkflowPrivacy(output) {
    if (BILLING_SUPPORT_FORBIDDEN_PATTERN.test(JSON.stringify(output || {}))) {
      throw new Error('unsafe_billing_support_workflow');
    }
    if (output && output.permanentAccessAllowed === true) {
      throw new Error('unsafe_billing_support_workflow');
    }
    return true;
  }

  function normalizeWorkflow(input) {
    const value = input && typeof input === 'object' ? input : {};
    return {
      id: safeString(value.id),
      owner: safeString(value.owner),
      purpose: safeString(value.purpose),
      auditRequired: value.auditRequired === true,
      providerMutationAllowed: value.providerMutationAllowed === true,
      directEntitlementChangeAllowed: value.directEntitlementChangeAllowed === true
    };
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    BILLING_SUPPORT_FORBIDDEN_PATTERN,
    DEFAULT_BILLING_SUPPORT_WORKFLOW_POLICY,
    REQUIRED_BILLING_SUPPORT_WORKFLOWS,
    assertBillingSupportWorkflowPrivacy,
    buildBillingSupportWorkflowMap,
    buildManualAdjustmentWorkflow,
    buildSupportVisibilityProjection,
    validateBillingSupportWorkflowPolicy,
    validateBillingSupportWorkflowRequest
  };
});
