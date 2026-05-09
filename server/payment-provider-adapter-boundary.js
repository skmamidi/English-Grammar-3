const SERVER_ONLY_PAYMENT_PROVIDER_FIELDS = Object.freeze([
  'apiKey',
  'webhookSecret',
  'idempotencyKey',
  'providerCustomerId',
  'providerSubscriptionId',
  'providerPaymentIntentId',
  'providerOrderId',
  'providerPaymentMethodId',
  'webhookSignatureHeader',
  'receiptValidationSecretRef',
  'nativeReceiptValidationSecretRef',
  'rawProviderPayload',
  'reconciliationCursor'
]);

const ALLOWED_BROWSER_BILLING_FIELDS = Object.freeze([
  'publishableConfig',
  'hostedCheckoutUrl',
  'clientSafeSessionRef',
  'providerElementConfigRef',
  'redactedBillingSummary'
]);

function validatePaymentProviderAdapterBoundary(policy = {}) {
  const input = policy && typeof policy === 'object' ? policy : {};
  const serverOnlyFields = Array.isArray(input.serverOnlyFields) ? input.serverOnlyFields : SERVER_ONLY_PAYMENT_PROVIDER_FIELDS;
  const browserFields = Array.isArray(input.browserFields) ? input.browserFields : ALLOWED_BROWSER_BILLING_FIELDS;
  const errors = [];

  SERVER_ONLY_PAYMENT_PROVIDER_FIELDS.forEach(field => {
    if (!serverOnlyFields.includes(field)) errors.push(`missing server-only provider field: ${field}`);
  });
  ALLOWED_BROWSER_BILLING_FIELDS.forEach(field => {
    if (!browserFields.includes(field)) errors.push(`missing browser-safe billing field: ${field}`);
  });
  if (serverOnlyFields.some(field => browserFields.includes(field))) {
    errors.push('server-only provider fields must not be browser-safe');
  }
  return { valid: errors.length === 0, errors };
}

function validateBrowserBillingContract(contract = {}) {
  const input = contract && typeof contract === 'object' ? contract : {};
  const errors = [];
  Object.keys(input).forEach(key => {
    if (SERVER_ONLY_PAYMENT_PROVIDER_FIELDS.includes(key) || isServerOnlyProviderKey(key)) {
      errors.push(`browser billing contract includes server-only field: ${key}`);
    } else if (!ALLOWED_BROWSER_BILLING_FIELDS.includes(key)) {
      errors.push(`browser billing contract includes unknown field: ${key}`);
    }
  });
  if (input.hostedCheckoutUrl && !/^https:\/\//.test(String(input.hostedCheckoutUrl))) {
    errors.push('hosted checkout url must be https');
  }
  return { valid: errors.length === 0, errors };
}

function validatePaymentProviderModulePlacement(filePath = '') {
  const normalized = String(filePath || '').replace(/\\/g, '/');
  const errors = [];
  const isServerLayer = /^server\//.test(normalized) || /^(providers|adapters)\//.test(normalized);
  const looksPaymentProvider = /payment-provider|provider-adapter|checkout-provider|billing-provider|subscription-ui/i.test(normalized);
  if (looksPaymentProvider && !isServerLayer) errors.push('payment provider adapter must be server-only');
  return { valid: errors.length === 0, errors };
}

function isServerOnlyProviderKey(key) {
  return /apiKey|webhookSecret|idempotencyKey|provider.*Id|rawProvider|reconciliation|paymentCredential|walletCredential|cardNumber|cvv|cvc|secret|token/i.test(String(key || ''));
}

module.exports = {
  ALLOWED_BROWSER_BILLING_FIELDS,
  SERVER_ONLY_PAYMENT_PROVIDER_FIELDS,
  validateBrowserBillingContract,
  validatePaymentProviderAdapterBoundary,
  validatePaymentProviderModulePlacement
};
