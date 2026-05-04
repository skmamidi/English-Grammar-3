(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestBillingStatusPresentation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const learnerIdentityPattern = /learnerId|studentId|studentName|learnerProgress|sessions|reports|activeQuiz/i;
  const providerPattern = /provider|rawProvider|paymentCredential|walletCredential|cardNumber|cvv|cvc|secret|token|ledgerEvents|records|payload/i;

  function buildBillingStatusRows(projections = [], options = {}) {
    return (Array.isArray(projections) ? projections : []).map(projection => buildBillingStatusPresentation(projection, options));
  }

  function buildBillingStatusPresentation(projection = {}) {
    const input = projection && typeof projection === 'object' ? projection : {};
    const accessState = safeString(input.accessState || 'free');
    const targetDate = resolveTargetDate(input);
    const daysLeft = targetDate ? daysBetween(safeIso(input.evaluatedAt), targetDate) : 0;
    const statusConfig = statusPresentationFor(accessState, input);
    return {
      schemaVersion: 1,
      currentPlanId: safeString(input.activePlanId || 'free_practice'),
      accessState,
      statusLabel: statusConfig.statusLabel,
      renewalOrExpirationDate: targetDate,
      daysLeft,
      countdownLabel: buildCountdownLabel(accessState, daysLeft, targetDate, input),
      countdownSource: targetDate ? 'verified_projection_date' : 'not_applicable',
      autoRenewState: input.autoRenew === true ? 'on' : 'off',
      cancellationEffectiveDate: safeIso(input.cancellation && input.cancellation.effectiveAt),
      warningKeys: statusConfig.warningKeys,
      recoveryActionKeys: statusConfig.recoveryActionKeys,
      freePracticeAvailable: input.freePracticeAvailable === true,
      paidAccessPromise: statusConfig.paidAccessPromise,
      source: safeString(input.source),
      sourceLedgerEventId: safeString(input.sourceLedgerEventId),
      evaluatedAt: safeIso(input.evaluatedAt)
    };
  }

  function validateBillingStatusPresentation(status = {}) {
    const input = status && typeof status === 'object' ? status : {};
    const errors = [];
    if (input.schemaVersion && input.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    if (!safeString(input.currentPlanId)) errors.push('currentPlanId is required');
    if (!safeString(input.accessState)) errors.push('accessState is required');
    if (!safeString(input.statusLabel)) errors.push('statusLabel is required');
    if (Number.isNaN(Number(input.daysLeft)) || Number(input.daysLeft) < 0) errors.push('daysLeft must be a non-negative number');
    if (!safeString(input.countdownLabel)) errors.push('countdownLabel is required');
    if (safeString(input.countdownSource) !== 'verified_projection_date' && safeString(input.countdownSource) !== 'not_applicable') {
      errors.push('countdown source must be verified projection date');
    }
    if (!['on', 'off'].includes(safeString(input.autoRenewState))) errors.push('autoRenewState is required');
    if (!Array.isArray(input.warningKeys)) errors.push('warningKeys are required');
    if (!Array.isArray(input.recoveryActionKeys)) errors.push('recoveryActionKeys are required');
    if (input.freePracticeAvailable !== true) errors.push('free practice must remain available');
    if (containsKey(input, learnerIdentityPattern)) errors.push('billing status must not include learner identity');
    if (containsKey(input, providerPattern)) errors.push('billing status must not include provider payload or payment details');
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function resolveTargetDate(input) {
    const accessState = safeString(input.accessState);
    if (accessState === 'canceled_at_period_end') return safeIso(input.cancellation && input.cancellation.effectiveAt) || safeIso(input.currentPeriodEnd);
    if (accessState === 'past_due') return safeIso(input.pastDue && input.pastDue.retryEndsAt) || safeIso(input.currentPeriodEnd);
    if (accessState === 'grace' || accessState === 'billing_unavailable') return safeIso(input.gracePeriod && input.gracePeriod.endsAt) || safeIso(input.currentPeriodEnd);
    if (input.oneTimeAccessWindow && safeIso(input.oneTimeAccessWindow.endsAt)) return safeIso(input.oneTimeAccessWindow.endsAt);
    return safeIso(input.currentPeriodEnd);
  }

  function statusPresentationFor(accessState, projection) {
    const isOneTime = Boolean(projection.oneTimeAccessWindow && safeIso(projection.oneTimeAccessWindow.endsAt));
    switch (accessState) {
      case 'premium':
        return isOneTime ? config('One-time access', [], ['renew_one_time_access'], 'active') :
          config('Active', [], ['manage_subscription', 'view_payment_history'], 'active');
      case 'canceled_at_period_end':
        return config('Canceling', ['cancellation_effective_at_period_end'], ['reactivate_subscription', 'view_payment_history'], 'active_until_effective_date');
      case 'past_due':
        return config('Past due', ['payment_retry_window'], ['update_payment_method', 'contact_support'], 'active_during_retry_window');
      case 'grace':
        return config('Grace period', ['grace_period_ending'], ['update_payment_method', 'contact_support'], 'active_during_grace');
      case 'billing_unavailable':
        return config('Billing refreshing', ['billing_status_refreshing'], ['check_again', 'contact_support'], 'not_overpromised');
      case 'expired':
        return config('Expired', ['access_expired'], ['renew_access'], 'free_practice_only');
      case 'refunded':
        return config('Refunded', ['refund_processed'], ['contact_support'], 'free_practice_only');
      case 'disputed':
        return config('Disputed', ['dispute_opened'], ['contact_support'], 'free_practice_only');
      case 'free':
        return config('Free practice', [], ['compare_plans'], 'free_practice_only');
      default:
        return config('Unavailable', ['billing_status_refreshing'], ['check_again'], 'not_overpromised');
    }
  }

  function config(statusLabel, warningKeys, recoveryActionKeys, paidAccessPromise) {
    return {
      statusLabel,
      warningKeys: warningKeys.slice(),
      recoveryActionKeys: recoveryActionKeys.slice(),
      paidAccessPromise
    };
  }

  function buildCountdownLabel(accessState, daysLeft, targetDate, projection) {
    if (!targetDate) return 'No billing countdown available';
    if (accessState === 'canceled_at_period_end') return `${daysLeft} days until access ends`;
    if (accessState === 'past_due') return `${daysLeft} days left in the retry window`;
    if (accessState === 'grace' || accessState === 'billing_unavailable') return `${daysLeft} days left while billing refreshes`;
    if (projection.oneTimeAccessWindow && safeIso(projection.oneTimeAccessWindow.endsAt)) return `${daysLeft} days until access expires`;
    if (projection.autoRenew === true) return `${daysLeft} days until renewal`;
    return `${daysLeft} days until access expires`;
  }

  function daysBetween(now, target) {
    if (!safeIso(now) || !safeIso(target)) return 0;
    return Math.max(0, Math.ceil((new Date(target).getTime() - new Date(now).getTime()) / 86400000));
  }

  function containsKey(value, pattern) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => pattern.test(key) || containsKey(value[key], pattern));
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildBillingStatusPresentation,
    buildBillingStatusRows,
    validateBillingStatusPresentation
  };
});
