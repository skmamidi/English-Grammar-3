(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSubscriptionRouteContract = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const billingOwner = root.GrammarQuestBillingOwnerProfileDomain ||
    (typeof require === 'function' ? require('./billing-owner-profile-domain') : null);

  const REDACTED = '[REDACTED]';
  const sensitivePattern = /learnerId|studentId|studentName|learnerProgress|sessions|reports|activeQuiz|provider|rawProvider|paymentCredential|walletCredential|cardNumber|cvv|cvc|secret|token|ledgerEvents|records/i;

  const SUBSCRIPTION_ROUTE_CONTRACT = Object.freeze({
    path: 'subscription.html',
    routeType: 'subscription',
    ownerDomain: 'parent_account_billing',
    requiresAuthenticatedParentGuardian: true,
    parentPreviewReadOnly: true,
    checkoutEnabled: false,
    consumes: Object.freeze([
      'billing_entitlement_projection',
      'redacted_billing_summary'
    ]),
    forbiddenSources: Object.freeze([
      'learner_progress',
      'raw_provider_payload',
      'payment_credentials',
      'provider_identifiers'
    ])
  });

  function validateSubscriptionRouteContract(contract = SUBSCRIPTION_ROUTE_CONTRACT) {
    const input = contract && typeof contract === 'object' ? contract : {};
    const errors = [];
    if (input.path !== 'subscription.html') errors.push('subscription route path is required');
    if (input.routeType !== 'subscription') errors.push('subscription route type is required');
    if (input.ownerDomain !== 'parent_account_billing') errors.push('parent account billing owner domain is required');
    if (input.requiresAuthenticatedParentGuardian !== true) errors.push('authenticated parent guardian is required');
    if (input.parentPreviewReadOnly !== true) errors.push('parent preview must be read only');
    if (input.checkoutEnabled !== false) errors.push('checkout must remain disabled');
    if (!Array.isArray(input.consumes) || !input.consumes.includes('billing_entitlement_projection') || !input.consumes.includes('redacted_billing_summary')) {
      errors.push('route must consume redacted billing and entitlement projections');
    }
    if (!Array.isArray(input.forbiddenSources) || !input.forbiddenSources.includes('learner_progress')) {
      errors.push('route must forbid learner progress as billing source');
    }
    return { valid: errors.length === 0, errors };
  }

  function evaluateSubscriptionRouteAccess(options = {}) {
    const input = options && typeof options === 'object' ? options : {};
    const eligibility = billingOwner.evaluateBillingOwnerEligibility(input.profile || {});
    const parentPreview = input.parentPreview === true || eligibility.profile.parentPreview === true;
    const blockers = Array.from(eligibility.blockers);

    if (parentPreview && !blockers.includes('parent_preview_cannot_manage_billing')) {
      blockers.push('parent_preview_cannot_manage_billing');
    }

    const canView = parentPreview || eligibility.eligible;
    return {
      canView,
      readOnly: parentPreview || SUBSCRIPTION_ROUTE_CONTRACT.checkoutEnabled === false,
      canManageBilling: false,
      reason: SUBSCRIPTION_ROUTE_CONTRACT.checkoutEnabled === false ? 'checkout_not_implemented' : '',
      blockers,
      profile: eligibility.profile
    };
  }

  function sanitizeSubscriptionRouteProjection(value) {
    if (Array.isArray(value)) return value.map(item => sanitizeSubscriptionRouteProjection(item));
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((sanitized, key) => {
      sanitized[key] = sensitivePattern.test(key) ? REDACTED : sanitizeSubscriptionRouteProjection(value[key]);
      return sanitized;
    }, {});
  }

  return {
    SUBSCRIPTION_ROUTE_CONTRACT,
    evaluateSubscriptionRouteAccess,
    sanitizeSubscriptionRouteProjection,
    validateSubscriptionRouteContract
  };
});
