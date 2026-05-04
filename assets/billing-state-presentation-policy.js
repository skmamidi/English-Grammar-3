(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingStatePresentationPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const BILLING_PRESENTATION_STATES = Object.freeze([
    'no_subscription',
    'checkout_pending',
    'payment_processing',
    'payment_failed',
    'provider_unavailable',
    'webhook_delayed',
    'renewal_failed',
    'expired',
    'refunded',
    'disputed',
    'canceled_at_period_end'
  ]);
  const learnerIdentityPattern = /learnerId|studentId|studentName|learnerEmail|learnerProgress/i;
  const providerPattern = /provider|rawProvider|paymentCredential|walletCredential|cardNumber|cvv|cvc|secret|token|payload/i;
  const unsafeCopyPattern = /blame|fault|guaranteed|definitely|only today|last chance|shame|provider payload/i;

  function buildBillingPresentationState(options = {}) {
    const state = BILLING_PRESENTATION_STATES.includes(safeString(options.state)) ? safeString(options.state) : 'no_subscription';
    const copy = copyFor(state);
    return {
      schemaVersion: 1,
      state,
      title: copy.title,
      message: copy.message,
      severity: copy.severity,
      recoveryActionKeys: copy.recoveryActionKeys,
      recoveryMediation: 'server_mediated',
      paidAccessPromise: copy.paidAccessPromise,
      freePracticeAvailable: true,
      parentDashboardAvailable: true
    };
  }

  function validateBillingPresentationState(view = {}) {
    const input = view && typeof view === 'object' ? view : {};
    const errors = [];
    if (!BILLING_PRESENTATION_STATES.includes(safeString(input.state))) errors.push('billing presentation state is invalid');
    if (!safeString(input.title)) errors.push('billing state title is required');
    if (!safeString(input.message)) errors.push('billing state message is required');
    if (!Array.isArray(input.recoveryActionKeys)) errors.push('recovery action keys are required');
    if (safeString(input.recoveryMediation) !== 'server_mediated') errors.push('recovery actions must be server-mediated');
    if (input.freePracticeAvailable !== true) errors.push('free practice must remain available');
    if (input.parentDashboardAvailable !== true) errors.push('parent dashboard must remain available');
    if (unsafeCopyPattern.test(`${safeString(input.title)} ${safeString(input.message)} ${safeString(input.paidAccessPromise)}`)) {
      errors.push('billing state copy must avoid blame pressure and overpromise');
    }
    if (containsKey(input, learnerIdentityPattern)) errors.push('billing state must not include learner identity');
    if (containsKey(input, providerPattern)) errors.push('billing state must not include provider payload or payment details');
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function copyFor(state) {
    const rows = {
      no_subscription: ['No subscription yet', 'You can keep using free practice while you compare options.', 'info', ['compare_plans'], 'free_practice_only'],
      checkout_pending: ['Checkout pending', 'Checkout has started. We will update billing after confirmation arrives.', 'info', ['check_again'], 'not_overpromised'],
      payment_processing: ['Payment processing', 'Payment is still processing. Free practice remains available while billing refreshes.', 'info', ['check_again'], 'not_overpromised'],
      payment_failed: ['Payment failed', 'The payment did not complete. You can update payment method through the secure billing flow.', 'error', ['update_payment_method_server_mediated', 'contact_support'], 'free_practice_only'],
      provider_unavailable: ['Billing temporarily unavailable', 'Billing is temporarily unavailable. Free practice remains available while we recover.', 'warning', ['check_again', 'contact_support'], 'not_overpromised'],
      webhook_delayed: ['Billing confirmation delayed', 'Billing confirmation is delayed. We will refresh status when the verified event arrives.', 'info', ['check_again'], 'not_overpromised'],
      renewal_failed: ['Renewal failed', 'The renewal did not complete. You can update payment method through the secure billing flow.', 'warning', ['update_payment_method_server_mediated', 'contact_support'], 'active_during_retry_window'],
      expired: ['Access expired', 'Paid access has ended. Free practice remains available.', 'info', ['renew_access'], 'free_practice_only'],
      refunded: ['Refund processed', 'A refund was processed. Contact support if you have questions.', 'info', ['contact_support'], 'free_practice_only'],
      disputed: ['Dispute opened', 'A billing dispute is open. Contact support for next steps.', 'warning', ['contact_support'], 'free_practice_only'],
      canceled_at_period_end: ['Canceling at period end', 'Auto-renew is off and access continues until the cancellation effective date.', 'info', ['reactivate_subscription'], 'active_until_effective_date']
    };
    const row = rows[state] || rows.no_subscription;
    return {
      title: row[0],
      message: row[1],
      severity: row[2],
      recoveryActionKeys: row[3].slice(),
      paidAccessPromise: row[4]
    };
  }

  function containsKey(value, pattern) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => pattern.test(key) || containsKey(value[key], pattern));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    BILLING_PRESENTATION_STATES,
    buildBillingPresentationState,
    validateBillingPresentationState
  };
});
