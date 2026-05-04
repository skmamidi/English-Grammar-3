(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSubscriptionPlanChoicePolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const catalogDomain = root.GrammarQuestCommerceCatalogDomain ||
    (typeof require === 'function' ? require('./commerce-catalog-domain') : null);

  const DEFAULT_SUBSCRIPTION_PLAN_CHOICE_POLICY = Object.freeze({
    requiredPlanIds: Object.freeze([
      'premium_monthly',
      'premium_annual',
      'premium_one_time_90_day'
    ]),
    checkoutEnabled: false,
    freePracticeAvailable: true,
    refundPolicyLink: 'docs/subscription-ux-standards.md',
    taxFeeDisclosure: 'Taxes and fees are shown before checkout when applicable.'
  });

  function validateSubscriptionPlanChoicePolicy(policy = DEFAULT_SUBSCRIPTION_PLAN_CHOICE_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const errors = [];
    DEFAULT_SUBSCRIPTION_PLAN_CHOICE_POLICY.requiredPlanIds.forEach(planId => {
      if (!Array.isArray(input.requiredPlanIds) || !input.requiredPlanIds.includes(planId)) errors.push(`missing plan choice ${planId}`);
    });
    if (input.checkoutEnabled !== false) errors.push('checkout must remain disabled');
    if (input.freePracticeAvailable !== true) errors.push('free practice must remain available');
    if (!safeString(input.refundPolicyLink)) errors.push('refund policy link is required');
    if (!safeString(input.taxFeeDisclosure)) errors.push('tax and fee disclosure is required');
    return { valid: errors.length === 0, errors };
  }

  function buildSubscriptionPlanChoices(catalog, policy = DEFAULT_SUBSCRIPTION_PLAN_CHOICE_POLICY) {
    const normalized = catalogDomain.normalizeCommerceCatalog(catalog || catalogDomain.DEFAULT_COMMERCE_CATALOG);
    return policy.requiredPlanIds.map(planId => {
      const plan = normalized.plans.find(item => item.planId === planId);
      return buildChoice(plan, policy);
    });
  }

  function buildChoice(plan, policy) {
    const selected = plan || {};
    const isOneTime = selected.planType === 'one_time';
    const isAnnual = selected.interval === 'year';
    const isMonthly = selected.interval === 'month';
    const title = isOneTime ? 'One-time' : isAnnual ? 'Annual' : 'Monthly';
    const price = selected.prices && selected.prices[0] || {};
    return {
      planId: safeString(selected.planId),
      title,
      purchaseType: isOneTime ? 'one_time_access' : 'recurring_subscription',
      priceDisplay: safeString(price.displayAmount || 'Pending approval'),
      billingIntervalLabel: isOneTime ? 'One-time access' : isAnnual ? 'Per year' : 'Per month',
      renewalBehavior: isOneTime ? `Does not renew. Access expires after ${selected.accessWindowDays} days.` : isAnnual ? 'Renews annually until canceled.' : 'Renews monthly until canceled.',
      cancellationTiming: isOneTime ? 'No renewal to cancel; access ends on the shown expiration date.' : 'Cancel before the next renewal; access continues through the paid period.',
      includedAccess: Array.isArray(selected.featureGates) ? selected.featureGates.slice() : [],
      taxFeeDisclosure: policy.taxFeeDisclosure,
      refundPolicyLink: policy.refundPolicyLink,
      autoRenew: !isOneTime,
      expiresAfterDays: isOneTime ? Number(selected.accessWindowDays) || 0 : 0,
      checkoutEnabled: false,
      freePracticeAvailable: true,
      copySummary: isOneTime ? `${title} access for ${selected.accessWindowDays} days. Does not renew.` : `${title} access. ${isAnnual ? 'Renews annually until canceled.' : 'Renews monthly until canceled.'}`
    };
  }

  function validateSubscriptionPlanChoice(choice = {}) {
    const input = choice && typeof choice === 'object' ? choice : {};
    const errors = [];
    if (!safeString(input.planId)) errors.push('planId is required');
    if (!['recurring_subscription', 'one_time_access'].includes(safeString(input.purchaseType))) errors.push('purchase type is required');
    if (!safeString(input.priceDisplay)) errors.push('price display is required');
    if (!safeString(input.billingIntervalLabel)) errors.push('billing interval label is required');
    if (!safeString(input.renewalBehavior)) errors.push('renewal behavior is required');
    if (!safeString(input.cancellationTiming)) errors.push('cancellation timing is required');
    if (!Array.isArray(input.includedAccess) || input.includedAccess.length === 0) errors.push('included access is required');
    if (!safeString(input.taxFeeDisclosure)) errors.push('tax and fee disclosure is required');
    if (!safeString(input.refundPolicyLink)) errors.push('refund policy link is required');
    if (input.checkoutEnabled !== false) errors.push('checkout must remain disabled');
    if (input.freePracticeAvailable !== true) errors.push('free practice must remain available');
    if (input.purchaseType === 'recurring_subscription' && input.autoRenew !== true) errors.push('recurring plans must disclose auto renew');
    if (input.purchaseType === 'one_time_access') {
      if (!Number.isInteger(input.expiresAfterDays) || input.expiresAfterDays <= 0) errors.push('one-time expiration days are required');
      if (/monthly|annual|subscription|renews every/i.test(safeString(input.copySummary))) errors.push('one-time copy must avoid recurring subscription language');
    }
    if (/bad parent|irresponsible|only today|last chance|shame/i.test(safeString(input.copySummary))) {
      errors.push('shaming or urgency copy is forbidden');
    }
    return { valid: errors.length === 0, errors };
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_SUBSCRIPTION_PLAN_CHOICE_POLICY,
    buildSubscriptionPlanChoices,
    validateSubscriptionPlanChoice,
    validateSubscriptionPlanChoicePolicy
  };
});
