const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BILLING_ENTITLEMENT_ACCESS_STATES,
  DEFAULT_BILLING_ENTITLEMENT_PROJECTION_POLICY,
  deriveBillingEntitlementProjection,
  sanitizeEntitlementProjection,
  validateBillingEntitlementProjection,
  validateBillingEntitlementProjectionPolicy
} = require('../assets/billing-entitlement-projection');
const {
  buildCrossPlatformEntitlementView,
  validateCrossPlatformCommerceRecord
} = require('../assets/cross-platform-commerce-policy');

const repoRoot = path.resolve(__dirname, '..');

function ledgerEvent(overrides = {}) {
  return {
    ledgerEventId: 'billing-ledger-1',
    eventType: 'renewal_succeeded',
    billingAccountId: 'billing-account-1',
    status: 'verified',
    occurredAt: '2030-05-03T00:00:00.000Z',
    effectiveAt: '2030-06-01T00:00:00.000Z',
    records: [{
      recordType: 'subscription',
      billingAccountId: 'billing-account-1',
      planId: 'premium_monthly',
      status: 'active',
      currentPeriod: {
        startsAt: '2030-05-01T00:00:00.000Z',
        endsAt: '2030-06-01T00:00:00.000Z'
      },
      autoRenew: true,
      cancelAtPeriodEnd: false,
      sourceLedgerEventId: 'billing-ledger-1'
    }],
    ...overrides
  };
}

test('billing entitlement projection policy is provider neutral and free-practice preserving', () => {
  assert.deepEqual(BILLING_ENTITLEMENT_ACCESS_STATES, [
    'free',
    'premium',
    'past_due',
    'grace',
    'canceled_at_period_end',
    'expired',
    'refunded',
    'disputed',
    'billing_unavailable'
  ]);

  assert.equal(DEFAULT_BILLING_ENTITLEMENT_PROJECTION_POLICY.sourceRequired, 'verified_billing_ledger');
  assert.equal(DEFAULT_BILLING_ENTITLEMENT_PROJECTION_POLICY.freePracticeAvailableByDefault, true);
  assert.equal(DEFAULT_BILLING_ENTITLEMENT_PROJECTION_POLICY.learnerProgressIndependent, true);
  assert.equal(DEFAULT_BILLING_ENTITLEMENT_PROJECTION_POLICY.providerPayloadForbidden, true);
  assert.deepEqual(validateBillingEntitlementProjectionPolicy(DEFAULT_BILLING_ENTITLEMENT_PROJECTION_POLICY).errors, []);
});

test('verified subscription ledger events project parent-safe recurring access fields', () => {
  const projection = deriveBillingEntitlementProjection({
    billingAccountId: 'billing-account-1',
    ledgerEvents: [ledgerEvent()],
    now: '2030-05-20T00:00:00.000Z'
  });

  assert.equal(projection.schemaVersion, 1);
  assert.equal(projection.billingAccountId, 'billing-account-1');
  assert.equal(projection.activePlanId, 'premium_monthly');
  assert.equal(projection.accessLevel, 'premium');
  assert.equal(projection.accessState, 'premium');
  assert.deepEqual(projection.featureEntitlements, ['core_practice', 'local_progress', 'premium_practice']);
  assert.equal(projection.currentPeriodEnd, '2030-06-01T00:00:00.000Z');
  assert.equal(projection.autoRenew, true);
  assert.equal(projection.daysUntilRenewalOrExpiration, 12);
  assert.equal(projection.source, 'verified_billing_ledger');
  assert.equal(projection.sourceLedgerEventId, 'billing-ledger-1');
  assert.equal(projection.freePracticeAvailable, true);
  assert.deepEqual(validateBillingEntitlementProjection(projection).errors, []);
});

test('projection covers one-time cancellation past-due grace refund dispute and unavailable states', () => {
  const cases = [
    [
      'one_time_payment_succeeded',
      [{
        recordType: 'one_time_purchase',
        billingAccountId: 'billing-account-1',
        planId: 'premium_one_time_30',
        status: 'active',
        accessStartsAt: '2030-05-03T00:00:00.000Z',
        accessEndsAt: '2030-06-02T00:00:00.000Z',
        sourceLedgerEventId: 'ledger-one-time'
      }],
      'premium',
      { oneTimeAccessWindow: { startsAt: '2030-05-03T00:00:00.000Z', endsAt: '2030-06-02T00:00:00.000Z' } }
    ],
    [
      'subscription_canceled',
      [{
        recordType: 'cancellation',
        billingAccountId: 'billing-account-1',
        planId: 'premium_monthly',
        effectiveAt: '2030-06-01T00:00:00.000Z',
        status: 'canceled_at_period_end',
        reasonCode: 'parent_requested',
        sourceLedgerEventId: 'ledger-cancel'
      }],
      'canceled_at_period_end',
      { cancellation: { effectiveAt: '2030-06-01T00:00:00.000Z', reasonCode: 'parent_requested' } }
    ],
    [
      'renewal_failed',
      [{
        recordType: 'past_due_state',
        billingAccountId: 'billing-account-1',
        planId: 'premium_monthly',
        status: 'past_due',
        startedAt: '2030-05-03T00:00:00.000Z',
        retryEndsAt: '2030-05-10T00:00:00.000Z',
        sourceLedgerEventId: 'ledger-past-due'
      }],
      'past_due',
      { pastDue: { startedAt: '2030-05-03T00:00:00.000Z', retryEndsAt: '2030-05-10T00:00:00.000Z' } }
    ],
    [
      'provider_outage_fallback',
      [{
        recordType: 'grace_period',
        billingAccountId: 'billing-account-1',
        planId: 'premium_monthly',
        status: 'billing_unavailable',
        startsAt: '2030-05-03T00:00:00.000Z',
        endsAt: '2030-05-06T00:00:00.000Z',
        sourceLedgerEventId: 'ledger-grace'
      }],
      'billing_unavailable',
      { gracePeriod: { startsAt: '2030-05-03T00:00:00.000Z', endsAt: '2030-05-06T00:00:00.000Z' }, billingUnavailable: true }
    ],
    [
      'refund_issued',
      [{
        recordType: 'refund',
        billingAccountId: 'billing-account-1',
        planId: 'premium_monthly',
        refundId: 'refund-ledger',
        amountMinor: 999,
        currency: 'USD',
        status: 'issued',
        reasonCode: 'support_approved',
        sourceLedgerEventId: 'ledger-refund'
      }],
      'refunded',
      { accessLevel: 'free' }
    ],
    [
      'dispute_opened',
      [{
        recordType: 'dispute',
        billingAccountId: 'billing-account-1',
        planId: 'premium_monthly',
        disputeId: 'dispute-ledger',
        status: 'opened',
        openedAt: '2030-05-03T00:00:00.000Z',
        sourceLedgerEventId: 'ledger-dispute'
      }],
      'disputed',
      { accessLevel: 'free' }
    ]
  ];

  cases.forEach(([eventType, records, expectedState, expected]) => {
    const sourceLedgerEvent = ledgerEvent({
      ledgerEventId: records[0].sourceLedgerEventId,
      eventType,
      records,
      occurredAt: '2030-05-03T00:00:00.000Z'
    });
    const projection = deriveBillingEntitlementProjection({
      billingAccountId: 'billing-account-1',
      ledgerEvents: [sourceLedgerEvent],
      now: '2030-05-03T00:00:00.000Z'
    });

    assert.equal(projection.accessState, expectedState, eventType);
    Object.entries(expected).forEach(([key, value]) => assert.deepEqual(projection[key], value, `${eventType} ${key}`));
    assert.equal(projection.sourceLedgerEventId, records[0].sourceLedgerEventId);
    assert.equal(projection.freePracticeAvailable, true);
    assert.deepEqual(validateBillingEntitlementProjection(projection).errors, []);
  });
});

test('projection ignores unverified and browser-origin events without touching learner progress', () => {
  const projection = deriveBillingEntitlementProjection({
    billingAccountId: 'billing-account-1',
    learnerProgress: { sessions: [{ id: 'session-1' }] },
    ledgerEvents: [
      ledgerEvent({ status: 'pending' }),
      ledgerEvent({ status: 'verified', source: 'checkout_success_redirect' })
    ],
    now: '2030-05-20T00:00:00.000Z'
  });

  assert.equal(projection.accessState, 'free');
  assert.equal(projection.accessLevel, 'free');
  assert.equal(projection.source, 'static_default');
  assert.equal(projection.sourceLedgerEventId, '');
  assert.equal(projection.freePracticeAvailable, true);
  assert.equal(Object.hasOwn(projection, 'learnerProgress'), false);
  assert.equal(Object.hasOwn(projection, 'sessions'), false);
});

test('billing entitlement projection can feed cross-platform access without purchase internals', () => {
  const projection = deriveBillingEntitlementProjection({
    billingAccountId: 'billing-account-1',
    ledgerEvents: [ledgerEvent()],
    now: '2030-05-20T00:00:00.000Z'
  });

  const nativeView = buildCrossPlatformEntitlementView({
    platform: 'ios_ipados',
    purchaseChannel: 'web_checkout',
    receiptSource: 'web_provider_receipt_ref',
    accountLinking: {
      parentAccountRef: 'parent:guardian-1',
      learnerAccountRef: 'learner:learner-1',
      linkingState: 'linked'
    },
    entitlementProjection: projection
  });

  assert.equal(nativeView.entitlement.accessState, 'premium');
  assert.equal(nativeView.purchaseChannel, 'web_checkout');
  assert.equal(nativeView.receiptSource, 'web_provider_receipt_ref');
  assert.equal(nativeView.supportVisibility, 'billing_summary_only');
  assert.deepEqual(validateCrossPlatformCommerceRecord(nativeView).errors, []);
  assert.equal(Object.hasOwn(nativeView, 'sourceLedgerEventId'), false);
});

test('native receipt ledger events project entitlement without exposing receipt internals', () => {
  const projection = deriveBillingEntitlementProjection({
    billingAccountId: 'billing-account-1',
    ledgerEvents: [ledgerEvent({
      ledgerEventId: 'native-receipt-apple-transaction',
      eventType: 'one_time_payment_succeeded',
      sourceProviderEventRef: 'apple-transaction-redacted',
      records: [{
        recordType: 'one_time_purchase',
        billingAccountId: 'billing-account-1',
        planId: 'premium_one_time_30',
        accessStartsAt: '2030-05-03T00:00:00.000Z',
        accessEndsAt: '2030-06-02T00:00:00.000Z',
        status: 'active',
        sourceLedgerEventId: 'native-receipt-apple-transaction'
      }]
    })],
    now: '2030-05-20T00:00:00.000Z'
  });

  assert.equal(projection.accessState, 'premium');
  assert.equal(projection.sourceLedgerEventId, 'native-receipt-apple-transaction');
  assert.equal(JSON.stringify(projection).includes('apple-transaction-redacted'), false);
  assert.deepEqual(validateBillingEntitlementProjection(projection).errors, []);
});

test('projection validation rejects learner identity provider payloads credentials and ledger details', () => {
  const unsafe = sanitizeEntitlementProjection({
    schemaVersion: 1,
    billingAccountId: 'billing-account-1',
    accessState: 'premium',
    accessLevel: 'premium',
    featureEntitlements: ['core_practice', 'local_progress', 'premium_practice'],
    source: 'verified_billing_ledger',
    sourceLedgerEventId: 'ledger-1',
    evaluatedAt: '2030-05-03T00:00:00.000Z',
    freePracticeAvailable: true,
    providerPayload: { nested: true },
    providerCustomerId: 'customer-ref',
    learnerId: 'learner-1',
    paymentCredential: 'browser-collected-value',
    ledgerEvents: [{ ledgerEventId: 'ledger-1' }]
  });

  assert.equal(unsafe.providerPayload, '[REDACTED]');
  assert.equal(unsafe.providerCustomerId, '[REDACTED]');
  assert.equal(unsafe.learnerId, '[REDACTED]');
  assert.equal(unsafe.paymentCredential, '[REDACTED]');
  assert.equal(unsafe.ledgerEvents, '[REDACTED]');

  const result = validateBillingEntitlementProjection({
    schemaVersion: 1,
    billingAccountId: 'billing-account-1',
    accessState: 'premium',
    accessLevel: 'premium',
    featureEntitlements: ['core_practice'],
    source: 'verified_billing_ledger',
    evaluatedAt: '2030-05-03T00:00:00.000Z',
    freePracticeAvailable: true,
    providerPayload: { nested: true },
    learnerId: 'learner-1'
  });

  assert.ok(result.errors.includes('sourceLedgerEventId is required for verified billing ledger projections'));
  assert.ok(result.errors.includes('entitlement projection must not include learner identity'));
  assert.ok(result.errors.includes('entitlement projection must not include provider payload or ledger details'));
});

test('entitlement projection docs shared contract and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-entitlement-projection.md'), 'utf8');
  const billingDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-domain-contracts.md'), 'utf8');
  const sharedDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'shared-domain-contracts.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /entitlement projection/i);
  assert.match(docs, /separate from learner progress/i);
  assert.match(docs, /free practice/i);
  assert.match(docs, /billing unavailable/i);
  assert.match(docs, /billing-rollback-policy\.md/);
  assert.match(docs, /preserve existing paid access/i);
  assert.match(billingDocs, /small entitlement read model/i);
  assert.match(sharedDocs, /assets\/billing-entitlement-projection\.js/i);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-entitlement-projection\.test\.js/);
});
