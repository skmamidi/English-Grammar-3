(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestCheckoutLaunchAvailabilityPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const catalogDomain = root.GrammarQuestCommerceCatalogDomain ||
    (typeof require === 'function' ? require('./commerce-catalog-domain') : null);
  const checkoutMethodPolicy = root.GrammarQuestCheckoutMethodPolicy ||
    (typeof require === 'function' ? require('./checkout-method-policy') : null);

  const REQUIRED_PAYMENT_METHODS = Object.freeze([
    'major_cards',
    'apple_pay',
    'paypal',
    'venmo'
  ]);
  const CHECKOUT_UNAVAILABLE_REASONS = Object.freeze([
    'unsupported_plan',
    'unsupported_browser',
    'unsupported_device',
    'unsupported_region',
    'unsupported_recurrence_type',
    'provider_outage',
    'checkout_readiness_failed'
  ]);
  const CHECKOUT_AVAILABILITY_STATUSES = Object.freeze([
    'available',
    'unavailable',
    'fallback_only'
  ]);
  const BROWSER_SAFE_RESPONSE_FIELDS = Object.freeze([
    'selectedPlanId',
    'selectedPaymentMethod',
    'hostedCheckoutUrl',
    'clientSafeSessionRef',
    'providerElementConfigRef',
    'redactedSessionStatus',
    'methodAvailability',
    'fallbackPaymentMethods',
    'freePracticeAvailable'
  ]);
  const UNSAFE_RESPONSE_FIELD_PATTERN = /provider.*Id|rawProvider|apiKey|secret|token|credential|paymentMethodId/i;

  const DEFAULT_CHECKOUT_LAUNCH_AVAILABILITY_POLICY = Object.freeze({
    serverOwnedCheckoutLaunch: true,
    requiredPaymentMethods: REQUIRED_PAYMENT_METHODS,
    statuses: CHECKOUT_AVAILABILITY_STATUSES,
    unavailableReasons: CHECKOUT_UNAVAILABLE_REASONS,
    browserSafeResponseFields: BROWSER_SAFE_RESPONSE_FIELDS,
    freePracticeAvailable: true,
    preserveSelectedPlanOnFallback: true,
    defaultMethodRecurrenceSupport: Object.freeze({
      major_cards: Object.freeze(['month', 'year', 'one_time']),
      apple_pay: Object.freeze(['month', 'year', 'one_time']),
      paypal: Object.freeze(['month', 'year', 'one_time']),
      venmo: Object.freeze(['one_time'])
    })
  });

  function validateCheckoutLaunchAvailabilityPolicy(policy = DEFAULT_CHECKOUT_LAUNCH_AVAILABILITY_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const errors = [];
    if (input.serverOwnedCheckoutLaunch !== true) errors.push('checkout launch must be server-owned');
    if (input.freePracticeAvailable !== true) errors.push('free practice must remain available');
    if (input.preserveSelectedPlanOnFallback !== true) errors.push('selected plan must be preserved on fallback');
    REQUIRED_PAYMENT_METHODS.forEach(method => {
      if (!Array.isArray(input.requiredPaymentMethods) || !input.requiredPaymentMethods.includes(method)) {
        errors.push(`missing checkout launch payment method: ${method}`);
      }
    });
    CHECKOUT_UNAVAILABLE_REASONS.forEach(reason => {
      if (!Array.isArray(input.unavailableReasons) || !input.unavailableReasons.includes(reason)) {
        errors.push(`missing checkout unavailable reason: ${reason}`);
      }
    });
    BROWSER_SAFE_RESPONSE_FIELDS.forEach(field => {
      if (!Array.isArray(input.browserSafeResponseFields) || !input.browserSafeResponseFields.includes(field)) {
        errors.push(`missing browser-safe checkout response field: ${field}`);
      }
    });
    return { valid: errors.length === 0, errors };
  }

  function buildCheckoutLaunchAvailability(options = {}) {
    const input = options && typeof options === 'object' ? options : {};
    const normalizedCatalog = catalogDomain.normalizeCommerceCatalog(input.catalog || catalogDomain.DEFAULT_COMMERCE_CATALOG);
    const selectedPlanId = safeString(input.selectedPlanId);
    const requestedPaymentMethod = safeString(input.requestedPaymentMethod);
    const selectedPlan = normalizedCatalog.plans.find(plan => plan.planId === selectedPlanId && plan.status === 'active');
    const methods = REQUIRED_PAYMENT_METHODS.map(method => methodAvailability(method, selectedPlan, input));
    const availableMethods = methods
      .filter(method => method.status === 'available')
      .map(method => method.method);

    return {
      schemaVersion: 1,
      selectedPlanId,
      selectedPaymentMethod: requestedPaymentMethod,
      selectedPlanPreserved: true,
      checkoutLaunchOwnedBy: 'server',
      browserSafeResponseFields: BROWSER_SAFE_RESPONSE_FIELDS.slice(),
      freePracticeAvailable: true,
      methods: methods.map(method => Object.assign({}, method, {
        fallbackPaymentMethods: method.status === 'available' ? [] : availableMethods.filter(candidate => candidate !== method.method)
      }))
    };
  }

  function methodAvailability(method, selectedPlan, input) {
    const reason = firstUnavailableReason(method, selectedPlan, input);
    const status = reason ? statusForReason(reason) : 'available';
    const surface = checkoutMethodPolicy.DEFAULT_CHECKOUT_METHOD_POLICY.paymentMethods
      .find(row => row.method === method);
    return {
      method,
      label: labelForMethod(method),
      status,
      reason,
      requiredSurface: surface ? surface.requiredSurface : '',
      parentMessage: messageFor(method, selectedPlan, status, reason)
    };
  }

  function firstUnavailableReason(method, selectedPlan, input) {
    if (!selectedPlan) return 'unsupported_plan';
    if (safeString(input.checkoutReadiness || 'ready') !== 'ready') return 'checkout_readiness_failed';
    if (input.providerAvailable === false) return 'provider_outage';
    if (isRegionBlocked(method, input.region)) return 'unsupported_region';
    if (method === 'apple_pay' && input.browser && input.browser.supportsApplePay === false) return 'unsupported_browser';
    if (method === 'apple_pay' && input.device && input.device.supportsApplePay === false) return 'unsupported_device';
    if (method === 'venmo' && input.device && input.device.supportsVenmo === false) return 'unsupported_device';
    if (isRecurrenceBlocked(method, selectedPlan.interval, input.methodRecurrenceSupport)) return 'unsupported_recurrence_type';
    return '';
  }

  function isRegionBlocked(method, region) {
    if (!region || typeof region !== 'object' || !Array.isArray(region.supportedPaymentMethods)) return false;
    return !region.supportedPaymentMethods.map(safeString).includes(method);
  }

  function isRecurrenceBlocked(method, interval, support) {
    const matrix = support && typeof support === 'object'
      ? support
      : DEFAULT_CHECKOUT_LAUNCH_AVAILABILITY_POLICY.defaultMethodRecurrenceSupport;
    const supportedIntervals = Array.isArray(matrix[method]) ? matrix[method].map(safeString) : [];
    return supportedIntervals.length > 0 && !supportedIntervals.includes(safeString(interval));
  }

  function statusForReason(reason) {
    return reason === 'unsupported_recurrence_type' ? 'fallback_only' : 'unavailable';
  }

  function validateCheckoutLaunchResponse(response = {}) {
    const input = response && typeof response === 'object' ? response : {};
    const errors = [];
    Object.keys(input).forEach(key => {
      if (!BROWSER_SAFE_RESPONSE_FIELDS.includes(key) || UNSAFE_RESPONSE_FIELD_PATTERN.test(key)) {
        errors.push(`checkout launch response includes unsafe field: ${key}`);
      }
    });
    if (input.hostedCheckoutUrl && !/^https:\/\//.test(String(input.hostedCheckoutUrl))) {
      errors.push('hosted checkout url must be https');
    }
    normalizeStringArray(input.fallbackPaymentMethods).forEach(method => {
      if (!REQUIRED_PAYMENT_METHODS.includes(method)) errors.push(`unsupported fallback payment method: ${method}`);
    });
    normalizeMethodAvailability(input.methodAvailability).forEach(row => {
      if (!REQUIRED_PAYMENT_METHODS.includes(row.method)) errors.push(`unsupported availability payment method: ${row.method}`);
      if (!CHECKOUT_AVAILABILITY_STATUSES.includes(row.status)) errors.push(`invalid availability status for ${row.method}`);
      if (row.reason && !CHECKOUT_UNAVAILABLE_REASONS.includes(row.reason)) errors.push(`invalid unavailable reason for ${row.method}`);
    });
    if (input.freePracticeAvailable !== true) errors.push('free practice must remain available');
    return { valid: errors.length === 0, errors };
  }

  function normalizeMethodAvailability(value) {
    return (Array.isArray(value) ? value : []).map(row => ({
      method: safeString(row && row.method),
      status: safeString(row && row.status),
      reason: safeString(row && row.reason)
    }));
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function labelForMethod(method) {
    return {
      major_cards: 'Major cards',
      apple_pay: 'Apple Pay',
      paypal: 'PayPal',
      venmo: 'Venmo'
    }[method] || method;
  }

  function messageFor(method, selectedPlan, status, reason) {
    if (status === 'available') return `${labelForMethod(method)} can be used when checkout launch is approved.`;
    if (reason === 'unsupported_plan') return 'This plan is not available for checkout. Choose an active plan and try again.';
    if (reason === 'unsupported_region') return `${labelForMethod(method)} is not available in this region. Your selected plan is still saved.`;
    if (reason === 'unsupported_browser') return `${labelForMethod(method)} is not available in this browser. Choose another supported method without changing your plan.`;
    if (reason === 'unsupported_device') return `${labelForMethod(method)} is not available on this device. Choose another supported method without changing your plan.`;
    if (reason === 'unsupported_recurrence_type') {
      const recurrence = selectedPlan && selectedPlan.interval === 'month' ? 'monthly renewal' :
        selectedPlan && selectedPlan.interval === 'year' ? 'annual renewal' : 'this access type';
      return `${labelForMethod(method)} is not available for ${recurrence}. Choose another supported method without changing your plan.`;
    }
    if (reason === 'provider_outage') return 'Checkout is temporarily unavailable. Free practice remains available while we recover.';
    if (reason === 'checkout_readiness_failed') return 'Checkout is not ready yet. Free practice remains available.';
    return 'This method is not available. Choose another supported method without changing your plan.';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    BROWSER_SAFE_RESPONSE_FIELDS,
    CHECKOUT_AVAILABILITY_STATUSES,
    CHECKOUT_UNAVAILABLE_REASONS,
    DEFAULT_CHECKOUT_LAUNCH_AVAILABILITY_POLICY,
    REQUIRED_PAYMENT_METHODS,
    buildCheckoutLaunchAvailability,
    validateCheckoutLaunchAvailabilityPolicy,
    validateCheckoutLaunchResponse
  };
});
