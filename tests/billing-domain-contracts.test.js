const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const contracts = require('../assets/domain-type-contracts');
const {
  BILLING_RECORD_TYPES,
  DEFAULT_BILLING_DOMAIN_FIXTURES,
  normalizeBillingRecord,
  projectBillingEntitlement,
  sanitizeBillingRecord,
  validateBillingDomainFixtures,
  validateBillingRecord
} = require('../assets/billing-domain-contracts');

const repoRoot = path.resolve(__dirname, '..');

test('billing domain contract defines provider-neutral record vocabulary', () => {
  assert.deepEqual(BILLING_RECORD_TYPES, [
    'billing_account',
    'subscription',
    'renewal_period',
    'one_time_purchase',
    'invoice',
    'payment',
    'refund',
    'dispute',
    'cancellation',
    'reactivation',
    'past_due_state',
    'grace_period',
    'entitlement_projection'
  ]);

  assert.deepEqual(validateBillingDomainFixtures(DEFAULT_BILLING_DOMAIN_FIXTURES).errors, []);
});

test('billing account links to parent guardian profile without learner or provider identity', () => {
  const account = normalizeBillingRecord({
    recordType: 'billing_account',
    billingAccountId: 'billing-account-1',
    billingOwnerId: 'guardian-1',
    actorRole: 'parent_guardian',
    verifiedContact: true,
    country: 'US',
    currency: 'USD',
    status: 'active',
    createdAt: '2030-05-03T00:00:00.000Z'
  });

  assert.deepEqual(validateBillingRecord(account).errors, []);

  const unsafe = validateBillingRecord({
    ...account,
    learnerId: 'learner-1',
    providerCustomerId: 'provider-customer-placeholder'
  });
  assert.ok(unsafe.errors.includes('billing record must not include learner identity'));
  assert.ok(unsafe.errors.includes('billing record must not include provider payload'));
});

test('subscriptions renewal periods one-time purchases and invoices validate lifecycle fields', () => {
  [
    {
      recordType: 'subscription',
      billingAccountId: 'billing-account-1',
      planId: 'premium_monthly',
      status: 'active',
      currentPeriod: { startsAt: '2030-05-01T00:00:00.000Z', endsAt: '2030-06-01T00:00:00.000Z' },
      autoRenew: true,
      cancelAtPeriodEnd: false,
      sourceLedgerEventId: 'ledger-subscription-created'
    },
    {
      recordType: 'renewal_period',
      billingAccountId: 'billing-account-1',
      planId: 'premium_monthly',
      periodStart: '2030-05-01T00:00:00.000Z',
      periodEnd: '2030-06-01T00:00:00.000Z',
      renewalStatus: 'scheduled',
      sourceLedgerEventId: 'ledger-renewal-scheduled'
    },
    {
      recordType: 'one_time_purchase',
      billingAccountId: 'billing-account-1',
      planId: 'one_time_90_day',
      accessStartsAt: '2030-05-03T00:00:00.000Z',
      accessEndsAt: '2030-08-01T00:00:00.000Z',
      status: 'active',
      sourceLedgerEventId: 'ledger-one-time-paid'
    },
    {
      recordType: 'invoice',
      billingAccountId: 'billing-account-1',
      invoiceId: 'invoice-1',
      invoiceStatus: 'paid',
      amountDueMinor: 1200,
      currency: 'USD',
      issuedAt: '2030-05-03T00:00:00.000Z',
      sourceLedgerEventId: 'ledger-invoice-paid'
    }
  ].forEach(record => assert.deepEqual(validateBillingRecord(normalizeBillingRecord(record)).errors, []));
});

test('payments refunds disputes cancellation reactivation past-due and grace records validate without provider objects', () => {
  [
    {
      recordType: 'payment',
      billingAccountId: 'billing-account-1',
      paymentId: 'payment-1',
      amountMinor: 1200,
      currency: 'USD',
      status: 'succeeded',
      sourceLedgerEventId: 'ledger-payment-succeeded'
    },
    {
      recordType: 'refund',
      billingAccountId: 'billing-account-1',
      refundId: 'refund-1',
      amountMinor: 1200,
      currency: 'USD',
      status: 'succeeded',
      reasonCode: 'parent_request',
      sourceLedgerEventId: 'ledger-refund-succeeded'
    },
    {
      recordType: 'dispute',
      billingAccountId: 'billing-account-1',
      disputeId: 'dispute-1',
      status: 'opened',
      openedAt: '2030-05-03T00:00:00.000Z',
      sourceLedgerEventId: 'ledger-dispute-opened'
    },
    {
      recordType: 'cancellation',
      billingAccountId: 'billing-account-1',
      effectiveAt: '2030-06-01T00:00:00.000Z',
      status: 'scheduled',
      reasonCode: 'parent_request',
      sourceLedgerEventId: 'ledger-cancel-scheduled'
    },
    {
      recordType: 'reactivation',
      billingAccountId: 'billing-account-1',
      reactivatedAt: '2030-05-15T00:00:00.000Z',
      status: 'reactivated',
      sourceLedgerEventId: 'ledger-reactivated'
    },
    {
      recordType: 'past_due_state',
      billingAccountId: 'billing-account-1',
      status: 'past_due',
      startedAt: '2030-05-03T00:00:00.000Z',
      retryEndsAt: '2030-05-10T00:00:00.000Z',
      sourceLedgerEventId: 'ledger-payment-failed'
    },
    {
      recordType: 'grace_period',
      billingAccountId: 'billing-account-1',
      status: 'active',
      startsAt: '2030-05-03T00:00:00.000Z',
      endsAt: '2030-05-10T00:00:00.000Z',
      sourceLedgerEventId: 'ledger-grace-started'
    }
  ].forEach(record => assert.deepEqual(validateBillingRecord(normalizeBillingRecord(record)).errors, []));
});

test('entitlement projection remains separate from learner progress and free-practice fallback', () => {
  const projection = projectBillingEntitlement({
    billingAccountId: 'billing-account-1',
    planId: 'premium_monthly',
    accessLevel: 'premium',
    status: 'active',
    currentPeriodEnd: '2030-06-01T00:00:00.000Z',
    autoRenew: true,
    sourceLedgerEventId: 'ledger-subscription-created'
  }, { now: () => '2030-05-20T00:00:00.000Z' });

  assert.deepEqual(validateBillingRecord(projection).errors, []);
  assert.deepEqual(contracts.validateEntitlementProjectionContract(projection), []);
  assert.equal(projection.source, 'verified_billing_ledger');
  assert.equal(projection.freePracticeAvailable, true);
  assert.equal(projection.daysUntilRenewalOrExpiration, 12);

  const fallback = projectBillingEntitlement({ billingAccountId: 'billing-account-1', status: 'billing_unavailable' });
  assert.equal(fallback.accessState, 'free');
  assert.equal(fallback.freePracticeAvailable, true);
});

test('billing sanitizer rejects learner identity raw provider payloads credentials and secrets', () => {
  const sanitized = sanitizeBillingRecord({
    billingAccountId: 'billing-account-1',
    billingOwnerId: 'guardian-1',
    learnerId: 'learner-1',
    studentName: 'Student Name',
    providerSubscriptionId: 'provider-subscription-placeholder',
    rawProviderPayload: { type: 'invoice.paid' },
    paymentCredential: 'credential-placeholder',
    webhookSecret: 'secret-placeholder',
    amountMinor: 1200
  });

  assert.equal(sanitized.billingOwnerId, 'guardian-1');
  assert.equal(sanitized.amountMinor, 1200);
  assert.equal(JSON.stringify(sanitized).includes('learner-1'), false);
  assert.equal(JSON.stringify(sanitized).includes('provider-subscription-placeholder'), false);
  assert.equal(JSON.stringify(sanitized).includes('credential-placeholder'), false);
  assert.ok(validateBillingRecord({
    recordType: 'payment',
    billingAccountId: 'billing-account-1',
    paymentId: 'payment-1',
    amountMinor: 1200,
    currency: 'USD',
    status: 'succeeded',
    sourceLedgerEventId: 'ledger-payment-succeeded',
    rawProviderPayload: {}
  }).errors.includes('billing record must not include provider payload'));
});

test('billing domain docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-domain-contracts.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'billing account',
    'subscription',
    'one-time purchase',
    'invoice',
    'payment',
    'refund',
    'dispute',
    'cancellation',
    'reactivation',
    'past-due',
    'grace period',
    'entitlement projection',
    'verified provider events',
    'free practice fallback',
    'raw provider payload'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(pkg.scripts['test:unit'], /tests\/billing-domain-contracts\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
