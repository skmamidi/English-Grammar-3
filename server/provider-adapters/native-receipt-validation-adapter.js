'use strict';

const crypto = require('node:crypto');

const SUPPORTED_NATIVE_PURCHASE_CHANNELS = Object.freeze([
  'ios_iap',
  'app_store_refund'
]);

const PURCHASE_TYPE_TO_LEDGER_EVENT = Object.freeze({
  subscription_initial: 'subscription_created',
  subscription_renewal: 'renewal_succeeded',
  one_time_purchase: 'one_time_payment_succeeded',
  refund: 'refund_issued',
  cancellation: 'subscription_canceled'
});

function createNativeReceiptValidationAdapter(options = {}) {
  const appleValidator = typeof options.appleValidator === 'function' ? options.appleValidator : null;
  const googleValidator = typeof options.googleValidator === 'function' ? options.googleValidator : null;

  return Object.freeze({
    id: 'native-receipt-validation',
    provider: 'native-receipt',
    kind: 'receipt_validation',
    async validateReceipt(request = {}) {
      const normalized = normalizeNativeReceiptRequest(request);
      if (!SUPPORTED_NATIVE_PURCHASE_CHANNELS.includes(normalized.purchaseChannel)) {
        return unsupportedResult(normalized, 'purchase_channel_not_supported');
      }
      if (normalized.platform !== 'ios_ipados') {
        return unsupportedResult(normalized, 'platform_not_supported');
      }
      if (!appleValidator) {
        return unsupportedResult(normalized, 'apple_validator_not_configured');
      }

      const providerResult = await appleValidator({
        receiptRef: normalized.receiptRef,
        receiptSource: normalized.receiptSource,
        purchaseChannel: normalized.purchaseChannel,
        billingAccountId: normalized.billingAccountId
      });
      if (!providerResult || providerResult.status !== 'verified') {
        return unsupportedResult(normalized, 'receipt_not_verified');
      }

      const ledgerEnvelope = buildNativeReceiptLedgerEnvelope(normalized, providerResult, 'apple_app_store');
      return Object.freeze({
        status: 'verified',
        provider: 'apple_app_store',
        purchaseChannel: normalized.purchaseChannel,
        receiptSource: normalized.receiptSource,
        entitlementMutation: 'server_verified_receipt_ledger',
        canGrantEntitlement: false,
        ledgerEnvelope
      });
    },
    async validateGoogleReceipt(request = {}) {
      const normalized = normalizeNativeReceiptRequest(request);
      if (!googleValidator) return unsupportedResult(normalized, 'google_validator_not_configured');
      return unsupportedResult(normalized, 'google_receipt_channel_not_enabled');
    }
  });
}

function validateNativeReceiptEnvelope(envelope = {}) {
  const input = envelope && typeof envelope === 'object' ? envelope : {};
  const errors = [];
  if (!safeString(input.envelopeId)) errors.push('envelopeId is required');
  if (!['apple_app_store', 'google_play'].includes(safeString(input.provider))) errors.push('native receipt provider is required');
  if (safeString(input.signatureStatus) !== 'verified') errors.push('receipt verification must be server verified');
  if (!safeString(input.providerEventRef)) errors.push('providerEventRef is required');
  if (!safeString(input.idempotencyKey)) errors.push('idempotencyKey is required');
  if (!Object.values(PURCHASE_TYPE_TO_LEDGER_EVENT).includes(safeString(input.eventType))) errors.push('supported receipt ledger eventType is required');
  if (!/^sha256:[a-f0-9]{12,}$/i.test(safeString(input.payloadDigest))) errors.push('payloadDigest must be a sha256 digest reference');
  if (!input.sanitizedFields || typeof input.sanitizedFields !== 'object') errors.push('sanitizedFields are required');
  if (containsUnsafeReceiptKey(input)) errors.push('native receipt envelope must not include raw receipts provider payloads or learner data');
  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}

function buildNativeReceiptLedgerEnvelope(request, providerResult, provider) {
  const purchaseType = safeString(providerResult.purchaseType || 'one_time_purchase');
  const transactionRef = safeString(providerResult.transactionRef);
  const receivedAt = safeIso(request.receivedAt) || new Date(0).toISOString();
  return Object.freeze({
    envelopeId: `native-receipt-${stableSlug(provider)}-${stableSlug(transactionRef || request.receiptRef)}`,
    provider,
    signatureStatus: 'verified',
    receivedAt,
    eventCreatedAt: safeIso(providerResult.eventCreatedAt) || receivedAt,
    providerEventRef: transactionRef || `receipt:${stableSlug(request.receiptRef)}`,
    idempotencyKey: `${provider}:${transactionRef || request.receiptRef}`,
    eventType: PURCHASE_TYPE_TO_LEDGER_EVENT[purchaseType] || 'one_time_payment_succeeded',
    sequence: sequenceFrom(providerResult.eventCreatedAt || receivedAt),
    payloadDigest: digest(`${request.receiptRef}:${transactionRef}:${purchaseType}`),
    sanitizedFields: Object.freeze({
      billingAccountId: safeString(request.billingAccountId),
      planId: safeString(providerResult.productId || 'premium_monthly'),
      accessStartsAt: safeIso(providerResult.periodStart),
      accessEndsAt: safeIso(providerResult.periodEnd),
      currentPeriodStart: safeIso(providerResult.periodStart),
      currentPeriodEnd: safeIso(providerResult.periodEnd),
      amountMinor: Number.isInteger(providerResult.amountMinor) ? providerResult.amountMinor : 0,
      currency: safeString(providerResult.currency || 'USD').toUpperCase(),
      reasonCode: safeString(providerResult.reasonCode || purchaseType)
    })
  });
}

function normalizeNativeReceiptRequest(request = {}) {
  const input = request && typeof request === 'object' ? request : {};
  return Object.freeze({
    platform: normalizePlatform(input.platform),
    purchaseChannel: safeString(input.purchaseChannel),
    receiptSource: safeString(input.receiptSource || 'app_store_receipt_ref'),
    receiptRef: safeString(input.receiptRef),
    billingAccountId: safeString(input.billingAccountId),
    receivedAt: safeIso(input.receivedAt)
  });
}

function unsupportedResult(request, reason) {
  return Object.freeze({
    status: 'unsupported',
    provider: 'native-receipt',
    purchaseChannel: request.purchaseChannel,
    receiptSource: request.receiptSource,
    reason,
    entitlementMutation: 'none',
    canGrantEntitlement: false
  });
}

function containsUnsafeReceiptKey(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some(key => {
    if (['provider', 'providerEventRef', 'idempotencyKey'].includes(key)) return false;
    return /rawReceipt|receiptPayload|rawProviderPayload|providerPayload|learnerId|studentId|studentName|learnerEmail|paymentCredential|walletCredential|cardNumber|cvv|cvc|secret|token/i.test(key)
      || containsUnsafeReceiptKey(value[key]);
  });
}

function normalizePlatform(value) {
  const text = safeString(value).toLowerCase();
  if (text === 'ios' || text === 'ipados' || text === 'native') return 'ios_ipados';
  return text || 'ios_ipados';
}

function sequenceFrom(value) {
  const date = new Date(safeIso(value) || 0);
  return Math.floor(date.getTime() / 1000);
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 32)}`;
}

function safeIso(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function stableSlug(value) {
  return safeString(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'receipt';
}

function safeString(value) {
  return String(value || '').trim();
}

module.exports = {
  PURCHASE_TYPE_TO_LEDGER_EVENT,
  SUPPORTED_NATIVE_PURCHASE_CHANNELS,
  createNativeReceiptValidationAdapter,
  validateNativeReceiptEnvelope
};
