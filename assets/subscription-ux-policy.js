(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSubscriptionUxPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_SUBSCRIPTION_COPY_CATEGORIES = Object.freeze([
    'billing_material_terms',
    'billing_renewal_disclosure',
    'billing_cancellation',
    'billing_refund',
    'billing_one_time_access',
    'billing_failed_payment'
  ]);

  const DEFAULT_SUBSCRIPTION_UX_POLICY = Object.freeze({
    policyId: 'subscription-ux-v1',
    providerNeutral: true,
    nativeReady: true,
    requiredCopyCategories: REQUIRED_SUBSCRIPTION_COPY_CATEGORIES,
    surfaces: Object.freeze([
      Object.freeze({
        surface: 'subscription',
        purchaseType: 'recurring_subscription',
        pricingDisplay: { amountVisible: true, currencyVisible: true, intervalVisible: true },
        renewalDisclosure: { text: 'Renews automatically until canceled.', beforeBillingInfo: true },
        autoRenewConsent: { expressConsent: true, checkboxDefault: false },
        cancellation: { availableBeforePurchase: true, method: 'self_service', stepsComparedToSignup: 'same_or_easier' },
        taxFeeDisclosure: { visibleBeforeCheckout: true },
        copyTone: { shaming: false, text: 'Cancel anytime from account settings.' },
        ruleVerification: {
          status: 'verified_for_design',
          checkedAt: '2026-05-03',
          sources: ['docs/subscription-ux-standards.md']
        }
      }),
      Object.freeze({
        surface: 'one-time-access',
        purchaseType: 'one_time_access',
        pricingDisplay: { amountVisible: true, currencyVisible: true, intervalVisible: false },
        oneTimeAccess: { accessWindowVisible: true, text: '90 days of access. This does not renew automatically.' },
        autoRenewConsent: { expressConsent: false, checkboxDefault: false },
        cancellation: { availableBeforePurchase: true, method: 'self_service', stepsComparedToSignup: 'same_or_easier' },
        taxFeeDisclosure: { visibleBeforeCheckout: true },
        copyTone: { shaming: false, text: 'Access ends on the shown date.' },
        ruleVerification: {
          status: 'verified_for_design',
          checkedAt: '2026-05-03',
          sources: ['docs/subscription-ux-standards.md']
        }
      })
    ])
  });

  function validateSubscriptionUxPolicy(policy = DEFAULT_SUBSCRIPTION_UX_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const errors = [];
    const surfaces = Array.isArray(input.surfaces) ? input.surfaces : [];
    if (input.providerNeutral !== true) errors.push('subscription_ux_policy_must_be_provider_neutral');
    if (input.nativeReady !== true) errors.push('subscription_ux_policy_must_be_native_ready');
    REQUIRED_SUBSCRIPTION_COPY_CATEGORIES.forEach(category => {
      if (!Array.isArray(input.requiredCopyCategories) || !input.requiredCopyCategories.includes(category)) {
        errors.push(`missing subscription copy category ${category}`);
      }
    });
    surfaces.forEach(surface => {
      validateSubscriptionUxSurface(surface).errors.forEach(error => errors.push(`${safeString(surface.surface || 'surface')}: ${error}`));
    });
    return {
      valid: errors.length === 0,
      errors,
      policy: {
        providerNeutral: input.providerNeutral === true,
        nativeReady: input.nativeReady === true,
        requiredCopyCategories: Array.isArray(input.requiredCopyCategories) ? input.requiredCopyCategories.slice() : [],
        surfaces: surfaces.map(normalizeSurface)
      }
    };
  }

  function validateSubscriptionUxSurface(surface) {
    const normalized = normalizeSurface(surface);
    const errors = [];
    if (!normalized.pricingDisplay.amountVisible) errors.push('amount_must_be_visible_before_checkout');
    if (!normalized.pricingDisplay.currencyVisible) errors.push('currency_must_be_visible_before_checkout');
    if (normalized.purchaseType === 'recurring_subscription' && !normalized.pricingDisplay.intervalVisible) {
      errors.push('interval_must_be_visible_for_recurring_subscription');
    }
    if (normalized.purchaseType === 'recurring_subscription') {
      if (!normalized.renewalDisclosure.text || !normalized.renewalDisclosure.beforeBillingInfo) {
        errors.push('renewal_terms_required_before_billing_info');
      }
      if (!normalized.autoRenewConsent.expressConsent) errors.push('express_auto_renew_consent_required');
    }
    if (normalized.autoRenewConsent.checkboxDefault) errors.push('paid_options_must_not_be_prechecked');
    if (!normalized.cancellation.availableBeforePurchase) errors.push('cancellation_must_be_available_before_purchase');
    if (normalized.cancellation.stepsComparedToSignup !== 'same_or_easier') errors.push('cancellation_must_not_be_harder_than_signup');
    if (!normalized.taxFeeDisclosure.visibleBeforeCheckout) errors.push('tax_and_fee_disclosure_required');
    if (normalized.copyTone.shaming || /irresponsible|bad parent|give up|fail/i.test(normalized.copyTone.text)) errors.push('shaming_copy_forbidden');
    if (normalized.purchaseType === 'one_time_access') {
      if (!normalized.oneTimeAccess.accessWindowVisible) errors.push('one_time_access_window_required');
      if (/renews?\s+every|recurring|subscription|monthly|annual/i.test(normalized.oneTimeAccess.text)) {
        errors.push('one_time_access_must_not_use_renewal_language');
      }
    }
    if (normalized.ruleVerification.status !== 'verified_for_design' || !normalized.ruleVerification.checkedAt || normalized.ruleVerification.sources.length === 0) {
      errors.push('current_rule_verification_required_for_launch');
    }
    return { valid: errors.length === 0, errors, surface: normalized };
  }

  function normalizeSurface(surface) {
    const input = surface && typeof surface === 'object' ? surface : {};
    return {
      surface: safeString(input.surface),
      purchaseType: safeString(input.purchaseType),
      pricingDisplay: {
        amountVisible: Boolean(input.pricingDisplay && input.pricingDisplay.amountVisible),
        currencyVisible: Boolean(input.pricingDisplay && input.pricingDisplay.currencyVisible),
        intervalVisible: Boolean(input.pricingDisplay && input.pricingDisplay.intervalVisible)
      },
      renewalDisclosure: {
        text: safeString(input.renewalDisclosure && input.renewalDisclosure.text),
        beforeBillingInfo: Boolean(input.renewalDisclosure && input.renewalDisclosure.beforeBillingInfo)
      },
      autoRenewConsent: {
        expressConsent: Boolean(input.autoRenewConsent && input.autoRenewConsent.expressConsent),
        checkboxDefault: Boolean(input.autoRenewConsent && input.autoRenewConsent.checkboxDefault)
      },
      cancellation: {
        availableBeforePurchase: Boolean(input.cancellation && input.cancellation.availableBeforePurchase),
        method: safeString(input.cancellation && input.cancellation.method),
        stepsComparedToSignup: safeString(input.cancellation && input.cancellation.stepsComparedToSignup)
      },
      oneTimeAccess: {
        accessWindowVisible: Boolean(input.oneTimeAccess && input.oneTimeAccess.accessWindowVisible),
        text: safeString(input.oneTimeAccess && input.oneTimeAccess.text)
      },
      taxFeeDisclosure: {
        visibleBeforeCheckout: Boolean(input.taxFeeDisclosure && input.taxFeeDisclosure.visibleBeforeCheckout)
      },
      copyTone: {
        shaming: Boolean(input.copyTone && input.copyTone.shaming),
        text: safeString(input.copyTone && input.copyTone.text)
      },
      ruleVerification: {
        status: safeString(input.ruleVerification && input.ruleVerification.status),
        checkedAt: safeString(input.ruleVerification && input.ruleVerification.checkedAt),
        sources: Array.isArray(input.ruleVerification && input.ruleVerification.sources)
          ? input.ruleVerification.sources.map(safeString).filter(Boolean)
          : []
      }
    };
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_SUBSCRIPTION_UX_POLICY,
    REQUIRED_SUBSCRIPTION_COPY_CATEGORIES,
    validateSubscriptionUxPolicy,
    validateSubscriptionUxSurface
  };
});
