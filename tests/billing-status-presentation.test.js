const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildBillingStatusPresentation,
  buildBillingStatusRows,
  validateBillingStatusPresentation
} = require('../assets/billing-status-presentation');

const repoRoot = path.resolve(__dirname, '..');

function projection(overrides = {}) {
  return {
    schemaVersion: 1,
    billingAccountId: 'billing-account-1',
    activePlanId: 'premium_monthly',
    accessLevel: 'premium',
    accessState: 'premium',
    featureEntitlements: ['core_practice', 'local_progress', 'premium_practice'],
    currentPeriodEnd: '2030-06-01T00:00:00.000Z',
    autoRenew: true,
    daysUntilRenewalOrExpiration: 12,
    oneTimeAccessWindow: { startsAt: '', endsAt: '' },
    pastDue: { startedAt: '', retryEndsAt: '' },
    gracePeriod: { startsAt: '', endsAt: '' },
    cancellation: { effectiveAt: '', reasonCode: '' },
    billingUnavailable: false,
    source: 'verified_billing_ledger',
    sourceLedgerEventId: 'billing-ledger-1',
    evaluatedAt: '2030-05-20T00:00:00.000Z',
    freePracticeAvailable: true,
    ...overrides
  };
}

test('active recurring status exposes plan renewal countdown and auto-renew state from projection dates', () => {
  const status = buildBillingStatusPresentation(projection(), {
    now: '2030-05-21T00:00:00.000Z'
  });

  assert.equal(status.currentPlanId, 'premium_monthly');
  assert.equal(status.accessState, 'premium');
  assert.equal(status.statusLabel, 'Active');
  assert.equal(status.renewalOrExpirationDate, '2030-06-01T00:00:00.000Z');
  assert.equal(status.countdownLabel, '12 days until renewal');
  assert.equal(status.daysLeft, 12);
  assert.equal(status.countdownSource, 'verified_projection_date');
  assert.equal(status.autoRenewState, 'on');
  assert.equal(status.cancellationEffectiveDate, '');
  assert.deepEqual(status.warningKeys, []);
  assert.deepEqual(status.recoveryActionKeys, ['manage_subscription', 'view_payment_history']);
  assert.equal(status.freePracticeAvailable, true);
  assert.deepEqual(validateBillingStatusPresentation(status).errors, []);
});

test('one-time and canceled-at-period-end statuses expose expiration and cancellation timing', () => {
  const oneTime = buildBillingStatusPresentation(projection({
    activePlanId: 'premium_one_time_90_day',
    autoRenew: false,
    currentPeriodEnd: '2030-08-01T00:00:00.000Z',
    oneTimeAccessWindow: {
      startsAt: '2030-05-03T00:00:00.000Z',
      endsAt: '2030-08-01T00:00:00.000Z'
    },
    evaluatedAt: '2030-07-15T00:00:00.000Z'
  }));
  assert.equal(oneTime.statusLabel, 'One-time access');
  assert.equal(oneTime.autoRenewState, 'off');
  assert.equal(oneTime.renewalOrExpirationDate, '2030-08-01T00:00:00.000Z');
  assert.equal(oneTime.countdownLabel, '17 days until access expires');
  assert.deepEqual(oneTime.recoveryActionKeys, ['renew_one_time_access']);

  const canceled = buildBillingStatusPresentation(projection({
    accessState: 'canceled_at_period_end',
    autoRenew: false,
    currentPeriodEnd: '2030-06-01T00:00:00.000Z',
    cancellation: {
      effectiveAt: '2030-06-01T00:00:00.000Z',
      reasonCode: 'parent_requested'
    }
  }));
  assert.equal(canceled.statusLabel, 'Canceling');
  assert.equal(canceled.cancellationEffectiveDate, '2030-06-01T00:00:00.000Z');
  assert.equal(canceled.countdownLabel, '12 days until access ends');
  assert.deepEqual(canceled.warningKeys, ['cancellation_effective_at_period_end']);
  assert.deepEqual(canceled.recoveryActionKeys, ['reactivate_subscription', 'view_payment_history']);
});

test('past due grace unavailable expired refund and dispute states include warnings and recovery keys', () => {
  const rows = buildBillingStatusRows([
    projection({
      accessState: 'past_due',
      currentPeriodEnd: '2030-05-25T00:00:00.000Z',
      pastDue: {
        startedAt: '2030-05-20T00:00:00.000Z',
        retryEndsAt: '2030-05-25T00:00:00.000Z'
      }
    }),
    projection({
      accessState: 'grace',
      currentPeriodEnd: '2030-05-27T00:00:00.000Z',
      gracePeriod: {
        startsAt: '2030-05-20T00:00:00.000Z',
        endsAt: '2030-05-27T00:00:00.000Z'
      }
    }),
    projection({
      accessState: 'billing_unavailable',
      billingUnavailable: true,
      currentPeriodEnd: '2030-05-23T00:00:00.000Z',
      gracePeriod: {
        startsAt: '2030-05-20T00:00:00.000Z',
        endsAt: '2030-05-23T00:00:00.000Z'
      }
    }),
    projection({ accessState: 'expired', accessLevel: 'free', currentPeriodEnd: '' }),
    projection({ accessState: 'refunded', accessLevel: 'free', currentPeriodEnd: '' }),
    projection({ accessState: 'disputed', accessLevel: 'free', currentPeriodEnd: '' })
  ]);

  assert.deepEqual(rows.map(row => row.statusLabel), [
    'Past due',
    'Grace period',
    'Billing refreshing',
    'Expired',
    'Refunded',
    'Disputed'
  ]);
  assert.deepEqual(rows[0].warningKeys, ['payment_retry_window']);
  assert.deepEqual(rows[0].recoveryActionKeys, ['update_payment_method', 'contact_support']);
  assert.deepEqual(rows[1].warningKeys, ['grace_period_ending']);
  assert.deepEqual(rows[2].warningKeys, ['billing_status_refreshing']);
  assert.equal(rows[2].freePracticeAvailable, true);
  assert.equal(rows[2].paidAccessPromise, 'not_overpromised');
  assert.deepEqual(rows[3].recoveryActionKeys, ['renew_access']);
  assert.deepEqual(rows[4].recoveryActionKeys, ['contact_support']);
  assert.deepEqual(rows[5].recoveryActionKeys, ['contact_support']);
});

test('billing status validation rejects client-clock-only countdowns and unsafe details', () => {
  const result = validateBillingStatusPresentation({
    currentPlanId: 'premium_monthly',
    accessState: 'premium',
    statusLabel: 'Active',
    renewalOrExpirationDate: '2030-06-01T00:00:00.000Z',
    daysLeft: 11,
    countdownLabel: '11 days until renewal',
    countdownSource: 'client_clock',
    autoRenewState: 'on',
    cancellationEffectiveDate: '',
    warningKeys: [],
    recoveryActionKeys: [],
    freePracticeAvailable: true,
    paidAccessPromise: 'active',
    providerCustomerId: 'provider-customer-placeholder',
    learnerId: 'learner-1'
  });

  assert.ok(result.errors.includes('countdown source must be verified projection date'));
  assert.ok(result.errors.includes('billing status must not include learner identity'));
  assert.ok(result.errors.includes('billing status must not include provider payload or payment details'));
});

test('billing status docs subscription route and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-status-presentation.md'), 'utf8');
  const entitlementDocs = fs.readFileSync(path.join(repoRoot, 'docs', 'billing-entitlement-projection.md'), 'utf8');
  const subscription = fs.readFileSync(path.join(repoRoot, 'subscription.html'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'current plan',
    'access state',
    'renewal or expiration date',
    'days left',
    'auto-renew',
    'cancellation effective date',
    'past-due warning',
    'free practice remains available'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(entitlementDocs, /billing-status-presentation\.md/);
  assert.match(subscription, /Billing Status/i);
  assert.match(subscription, /Auto-renew/i);
  assert.match(subscription, /Renewal or expiration/i);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-status-presentation\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
