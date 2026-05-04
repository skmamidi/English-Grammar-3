(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestCheckoutMethodPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_PAYMENT_METHODS = Object.freeze([
    'major_cards',
    'apple_pay',
    'paypal',
    'venmo'
  ]);
  const APPROVED_SURFACES = Object.freeze([
    'provider_hosted_checkout',
    'provider_elements',
    'approved_wallet_button'
  ]);
  const SERVER_ONLY_PROVIDER_FIELDS = Object.freeze([
    'apiKey',
    'webhookSecret',
    'idempotencyKey',
    'providerCustomerId',
    'providerSubscriptionId',
    'providerPaymentIntentId',
    'providerOrderId',
    'providerPaymentMethodId',
    'rawProviderPayload'
  ]);

  const DEFAULT_CHECKOUT_METHOD_POLICY = Object.freeze({
    serverOwnedCheckoutInitiation: true,
    paymentMethods: Object.freeze([
      method('major_cards', 'provider_elements', 'Use provider-hosted checkout or provider elements for card entry.'),
      method('apple_pay', 'approved_wallet_button', 'Use approved wallet button or provider-hosted checkout when device/browser support exists.'),
      method('paypal', 'approved_wallet_button', 'Use approved PayPal wallet button or provider-hosted checkout.'),
      method('venmo', 'approved_wallet_button', 'Use approved Venmo wallet button or provider-hosted checkout where available.')
    ]),
    browserResponseFields: Object.freeze([
      'hostedCheckoutUrl',
      'clientSafeSessionRef',
      'providerElementConfigRef',
      'redactedSessionStatus'
    ]),
    fallback: 'hide unavailable payment method and keep free practice available'
  });

  function method(methodName, requiredSurface, fallback) {
    return Object.freeze({
      method: methodName,
      requiredSurface,
      fallback
    });
  }

  function validateCheckoutMethodPolicy(policy = DEFAULT_CHECKOUT_METHOD_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const errors = [];
    const methods = Array.isArray(input.paymentMethods) ? input.paymentMethods : [];
    if (input.serverOwnedCheckoutInitiation !== true) errors.push('checkout initiation must be server-owned');
    REQUIRED_PAYMENT_METHODS.forEach(required => {
      const row = methods.find(item => safeString(item && item.method) === required);
      if (!row) errors.push(`missing checkout payment method: ${required}`);
      else validatePaymentMethodSurface({
        method: row.method,
        surface: row.requiredSurface,
        routeClass: 'checkout',
        capturesRawCredentials: false
      }).errors.forEach(error => errors.push(`${required}: ${error}`));
    });
    if (!safeString(input.fallback)) errors.push('checkout fallback option is required');
    return { valid: errors.length === 0, errors };
  }

  function validateCheckoutInitiationRequest(request = {}) {
    const input = request && typeof request === 'object' ? request : {};
    const errors = [];
    ['billingAccountId', 'planId', 'checkoutRouteId', 'successReturnRoute', 'cancelReturnRoute'].forEach(field => {
      if (!safeString(input[field])) errors.push(`${field} is required`);
    });
    normalizeStringArray(input.requestedPaymentMethods).forEach(paymentMethod => {
      if (!REQUIRED_PAYMENT_METHODS.includes(paymentMethod)) errors.push(`unsupported checkout payment method: ${paymentMethod}`);
    });
    if (!Array.isArray(input.requestedPaymentMethods) || input.requestedPaymentMethods.length === 0) {
      errors.push('requestedPaymentMethods are required');
    }
    Object.keys(input).forEach(key => {
      if (SERVER_ONLY_PROVIDER_FIELDS.includes(key) || /provider.*Id|rawProvider|apiKey|secret|token|credential/i.test(key)) {
        errors.push(`checkout initiation must not include server-only provider field: ${key}`);
      }
    });
    const response = input.responseContract && typeof input.responseContract === 'object' ? input.responseContract : {};
    Object.keys(response).forEach(key => {
      if (!DEFAULT_CHECKOUT_METHOD_POLICY.browserResponseFields.includes(key)) {
        errors.push(`checkout response includes unsafe field: ${key}`);
      }
    });
    if (response.hostedCheckoutUrl && !/^https:\/\//.test(String(response.hostedCheckoutUrl))) {
      errors.push('hosted checkout url must be https');
    }
    return { valid: errors.length === 0, errors };
  }

  function validatePaymentMethodSurface(surface = {}) {
    const input = surface && typeof surface === 'object' ? surface : {};
    const errors = [];
    if (!REQUIRED_PAYMENT_METHODS.includes(safeString(input.method))) errors.push(`unsupported checkout payment method: ${safeString(input.method)}`);
    if (!APPROVED_SURFACES.includes(safeString(input.surface))) {
      errors.push('payment method must use hosted checkout provider elements or approved wallet button');
    }
    if (input.capturesRawCredentials === true) errors.push('payment method must not capture raw credentials');
    if (!['checkout', 'payment'].includes(safeString(input.routeClass))) errors.push('payment method surface must be on checkout route');
    return { valid: errors.length === 0, errors };
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    APPROVED_SURFACES,
    DEFAULT_CHECKOUT_METHOD_POLICY,
    REQUIRED_PAYMENT_METHODS,
    validateCheckoutInitiationRequest,
    validateCheckoutMethodPolicy,
    validatePaymentMethodSurface
  };
});
