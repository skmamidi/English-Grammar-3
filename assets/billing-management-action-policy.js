(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingManagementActionPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const BILLING_MANAGEMENT_ACTION_TYPES = Object.freeze([
    'payment_method_update',
    'cancel_at_period_end',
    'reactivate_subscription',
    'renew_one_time_access',
    'convert_one_time_to_recurring'
  ]);
  const providerOrPaymentPattern = /provider(Customer|Subscription|Payment|Order|Method|Event|Payload)|rawProvider|paymentCredential|walletCredential|cardNumber|cvv|cvc|secret|token|payload/i;

  const DEFAULT_BILLING_MANAGEMENT_ACTION_POLICY = Object.freeze({
    serverMediatedRequired: true,
    browserCannotMutateEntitlement: true,
    browserCannotMutateProviderRecord: true,
    actions: BILLING_MANAGEMENT_ACTION_TYPES,
    oneTimeRenewalMustRemainNonRenewing: true,
    convertToRecurringRequiresExplicitConfirmation: true
  });

  function validateBillingManagementActionPolicy(policy = DEFAULT_BILLING_MANAGEMENT_ACTION_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const errors = [];
    if (input.serverMediatedRequired !== true) errors.push('server-mediated billing management is required');
    if (input.browserCannotMutateEntitlement !== true) errors.push('browser entitlement mutation must be forbidden');
    if (input.browserCannotMutateProviderRecord !== true) errors.push('browser provider mutation must be forbidden');
    BILLING_MANAGEMENT_ACTION_TYPES.forEach(action => {
      if (!Array.isArray(input.actions) || !input.actions.includes(action)) errors.push(`missing billing management action: ${action}`);
    });
    if (input.oneTimeRenewalMustRemainNonRenewing !== true) errors.push('one-time renewal must remain non-renewing');
    if (input.convertToRecurringRequiresExplicitConfirmation !== true) errors.push('convert to recurring explicit confirmation is required');
    return { valid: errors.length === 0, errors };
  }

  function buildBillingManagementActionRequest(options = {}) {
    const input = options && typeof options === 'object' ? options : {};
    const actionType = safeString(input.actionType);
    const config = configFor(actionType);
    return {
      schemaVersion: 1,
      actionType,
      billingAccountId: safeString(input.billingAccountId),
      planId: safeString(input.planId),
      previousPlanId: safeString(input.previousPlanId),
      serverMediated: true,
      mediationSurface: config.mediationSurface,
      browserCanMutateProviderRecord: false,
      browserCanMutateEntitlement: false,
      confirmationAccepted: input.confirmationAccepted === true,
      recurringConfirmationAccepted: input.recurringConfirmationAccepted === true,
      requiresRecurringConfirmation: actionType === 'convert_one_time_to_recurring',
      autoRenewAfterAction: actionType === 'convert_one_time_to_recurring',
      checkoutIntent: actionType === 'renew_one_time_access' ? 'one_time_non_renewing' :
        actionType === 'convert_one_time_to_recurring' ? 'recurring_subscription' : 'management_action',
      confirmationCopyKey: `billing_management_${actionType}_confirmation`,
      auditAction: `billing_management:${actionType}`,
      recoveryCopyKey: `billing_management_${actionType}_recovery`,
      disabledStateCopyKey: `billing_management_${actionType}_disabled`
    };
  }

  function validateBillingManagementActionRequest(request = {}) {
    const input = request && typeof request === 'object' ? request : {};
    const errors = [];
    const actionType = safeString(input.actionType);
    if (!BILLING_MANAGEMENT_ACTION_TYPES.includes(actionType)) errors.push('billing management actionType is invalid');
    if (!safeString(input.billingAccountId)) errors.push('billingAccountId is required');
    if (!safeString(input.planId)) errors.push('planId is required');
    if (input.serverMediated !== true) errors.push('billing management action must be server-mediated');
    if (input.browserCanMutateProviderRecord !== false) errors.push('browser action must not mutate provider records');
    if (input.browserCanMutateEntitlement !== false) errors.push('browser action must not mutate entitlement');
    if (input.confirmationAccepted !== true) errors.push('billing management action requires explicit confirmation');
    if (!safeString(input.confirmationCopyKey)) errors.push('confirmation copy key is required');
    if (!safeString(input.auditAction)) errors.push('audit action is required');
    if (!safeString(input.recoveryCopyKey)) errors.push('recovery copy key is required');
    if (!safeString(input.disabledStateCopyKey)) errors.push('disabled-state copy key is required');
    if (actionType === 'renew_one_time_access' && input.autoRenewAfterAction === true) {
      errors.push('one-time renewal must not silently enable auto-renew');
    }
    if (actionType === 'convert_one_time_to_recurring' && input.recurringConfirmationAccepted !== true) {
      errors.push('converting one-time access to auto-renew requires explicit confirmation');
    }
    if (containsUnsafeManagementKey(input)) {
      errors.push('billing management action must not include provider payload or payment credentials');
    }
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function configFor(actionType) {
    if (actionType === 'payment_method_update') return { mediationSurface: 'provider_portal_or_server_flow' };
    if (actionType === 'cancel_at_period_end') return { mediationSurface: 'server_cancellation_request' };
    if (actionType === 'reactivate_subscription') return { mediationSurface: 'server_reactivation_request' };
    if (actionType === 'renew_one_time_access') return { mediationSurface: 'server_one_time_checkout_request' };
    if (actionType === 'convert_one_time_to_recurring') return { mediationSurface: 'server_recurring_checkout_request' };
    return { mediationSurface: 'server_management_request' };
  }

  function containsKey(value, pattern) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => pattern.test(key) || containsKey(value[key], pattern));
  }

  function containsUnsafeManagementKey(value) {
    return containsKey(value, providerOrPaymentPattern);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    BILLING_MANAGEMENT_ACTION_TYPES,
    DEFAULT_BILLING_MANAGEMENT_ACTION_POLICY,
    buildBillingManagementActionRequest,
    validateBillingManagementActionPolicy,
    validateBillingManagementActionRequest
  };
});
