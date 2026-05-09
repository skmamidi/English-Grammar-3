const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createNativeReceiptValidationAdapter,
  validateNativeReceiptEnvelope
} = require('../server/provider-adapters/native-receipt-validation-adapter');
const {
  buildCrossPlatformEntitlementView,
  validateCrossPlatformCommerceRecord
} = require('../assets/cross-platform-commerce-policy');

test('native receipt adapter returns explicit unsupported state for unselected channels', async () => {
  const adapter = createNativeReceiptValidationAdapter();
  const result = await adapter.validateReceipt({
    purchaseChannel: 'android_iap',
    receiptSource: 'play_store_receipt_ref',
    receiptRef: 'receipt:google:test',
    billingAccountId: 'billing-account-1'
  });

  assert.equal(result.status, 'unsupported');
  assert.equal(result.entitlementMutation, 'none');
  assert.equal(result.canGrantEntitlement, false);
  assert.equal(result.reason, 'purchase_channel_not_supported');
});

test('ios receipt validation produces verified ledger evidence without raw receipts', async () => {
  const adapter = createNativeReceiptValidationAdapter({
    appleValidator: async request => ({
      status: 'verified',
      productId: 'premium_monthly',
      purchaseType: 'subscription_renewal',
      transactionRef: 'apple-transaction-redacted',
      periodStart: '2030-05-01T00:00:00.000Z',
      periodEnd: '2030-06-01T00:00:00.000Z',
      amountMinor: 999,
      currency: 'USD',
      rawReceipt: 'unsafe-raw-receipt',
      request
    })
  });

  const result = await adapter.validateReceipt({
    platform: 'ios_ipados',
    purchaseChannel: 'ios_iap',
    receiptSource: 'app_store_receipt_ref',
    receiptRef: 'receipt:apple:test-1',
    billingAccountId: 'billing-account-1',
    receivedAt: '2030-05-03T00:00:00.000Z',
    rawReceipt: 'client-raw-receipt'
  });

  assert.equal(result.status, 'verified');
  assert.equal(result.provider, 'apple_app_store');
  assert.equal(result.canGrantEntitlement, false);
  assert.equal(result.entitlementMutation, 'server_verified_receipt_ledger');
  assert.equal(result.ledgerEnvelope.eventType, 'renewal_succeeded');
  assert.equal(result.ledgerEnvelope.signatureStatus, 'verified');
  assert.equal(result.ledgerEnvelope.sanitizedFields.billingAccountId, 'billing-account-1');
  assert.equal(JSON.stringify(result).includes('unsafe-raw-receipt'), false);
  assert.equal(JSON.stringify(result).includes('client-raw-receipt'), false);
  assert.deepEqual(validateNativeReceiptEnvelope(result.ledgerEnvelope).errors, []);
});

test('native receipt validation can feed cross-platform entitlement views through ledger projections only', async () => {
  const adapter = createNativeReceiptValidationAdapter({
    appleValidator: async () => ({
      status: 'verified',
      productId: 'premium_one_time_30',
      purchaseType: 'one_time_purchase',
      transactionRef: 'apple-transaction-one-time',
      periodStart: '2030-05-03T00:00:00.000Z',
      periodEnd: '2030-06-02T00:00:00.000Z',
      amountMinor: 499,
      currency: 'USD'
    })
  });
  const validation = await adapter.validateReceipt({
    platform: 'ios_ipados',
    purchaseChannel: 'ios_iap',
    receiptSource: 'app_store_receipt_ref',
    receiptRef: 'receipt:apple:test-2',
    billingAccountId: 'billing-account-1'
  });
  const view = buildCrossPlatformEntitlementView({
    platform: 'ios_ipados',
    purchaseChannel: 'ios_iap',
    receiptSource: 'app_store_receipt_ref',
    entitlementProjection: {
      activePlanId: 'premium_one_time_30',
      accessLevel: 'premium',
      accessState: 'premium',
      featureEntitlements: ['core_practice', 'local_progress', 'premium_practice'],
      evaluatedAt: '2030-05-03T00:00:00.000Z',
      freePracticeAvailable: true,
      sourceLedgerEventId: validation.ledgerEnvelope.envelopeId
    }
  });

  assert.equal(validation.ledgerEnvelope.eventType, 'one_time_payment_succeeded');
  assert.deepEqual(validateCrossPlatformCommerceRecord(view).errors, []);
  assert.equal(Object.hasOwn(view.entitlement, 'sourceLedgerEventId'), false);
});
