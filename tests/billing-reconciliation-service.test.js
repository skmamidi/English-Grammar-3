const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildBillingReconciliationReport,
  mapProviderRecordToExpectedLedgerEventType,
  validateBillingReconciliationReport
} = require('../server/billing-reconciliation-service');

const repoRoot = path.resolve(__dirname, '..');

test('billing reconciliation detects provider records missing verified app ledger evidence', () => {
  const report = buildBillingReconciliationReport({
    billingAccountId: 'billing-account-1',
    providerRecords: [
      providerRecord('subscription_renewal', 'provider-event-renewal-1'),
      providerRecord('refund', 'provider-event-refund-1')
    ],
    ledgerEvents: [ledgerEvent('provider-event-renewal-1', 'renewal_succeeded')],
    entitlementProjection: {
      billingAccountId: 'billing-account-1',
      accessState: 'premium',
      source: 'verified_billing_ledger',
      sourceLedgerEventId: 'ledger-renewal'
    }
  });

  assert.equal(report.status, 'action_required');
  assert.equal(report.canGrantEntitlement, false);
  assert.ok(report.findings.some(finding => finding.type === 'missing_ledger_evidence' && finding.providerEventRef === 'provider-event-refund-1'));
  assert.deepEqual(validateBillingReconciliationReport(report).errors, []);
});

test('billing reconciliation maps renewal cancellation refund dispute one-time grace and outage records', () => {
  assert.equal(mapProviderRecordToExpectedLedgerEventType(providerRecord('subscription_renewal')), 'renewal_succeeded');
  assert.equal(mapProviderRecordToExpectedLedgerEventType(providerRecord('subscription_canceled')), 'subscription_canceled');
  assert.equal(mapProviderRecordToExpectedLedgerEventType(providerRecord('refund')), 'refund_issued');
  assert.equal(mapProviderRecordToExpectedLedgerEventType(providerRecord('dispute')), 'dispute_opened');
  assert.equal(mapProviderRecordToExpectedLedgerEventType(providerRecord('one_time_purchase')), 'one_time_payment_succeeded');
  assert.equal(mapProviderRecordToExpectedLedgerEventType(providerRecord('provider_outage')), 'provider_outage_fallback');
});

test('billing reconciliation detects duplicate provider events stale app state and projection drift', () => {
  const report = buildBillingReconciliationReport({
    billingAccountId: 'billing-account-1',
    providerRecords: [
      providerRecord('subscription_renewal', 'provider-event-renewal-1'),
      providerRecord('subscription_renewal', 'provider-event-renewal-1')
    ],
    ledgerEvents: [
      ledgerEvent('provider-event-renewal-1', 'renewal_succeeded', { ledgerEventId: 'ledger-old', occurredAt: '2030-05-03T00:00:00.000Z' }),
      ledgerEvent('provider-event-renewal-2', 'renewal_succeeded', { ledgerEventId: 'ledger-new', occurredAt: '2030-06-03T00:00:00.000Z' })
    ],
    entitlementProjection: {
      billingAccountId: 'billing-account-1',
      accessState: 'premium',
      source: 'verified_billing_ledger',
      sourceLedgerEventId: 'ledger-old'
    }
  });

  assert.equal(report.status, 'action_required');
  assert.ok(report.findings.some(finding => finding.type === 'duplicate_provider_event'));
  assert.ok(report.findings.some(finding => finding.type === 'entitlement_projection_drift'));
  assert.equal(report.recommendedActions.includes('inspect_duplicate_provider_event'), true);
  assert.equal(report.recommendedActions.includes('rebuild_entitlement_projection_from_verified_ledger'), true);
});

test('billing reconciliation stays redacted and does not mutate entitlements directly', () => {
  const report = buildBillingReconciliationReport({
    billingAccountId: 'billing-account-1',
    providerRecords: [
      providerRecord('dispute', 'provider-event-dispute-1', {
        rawProviderPayload: { paymentCredential: 'secret' },
        providerCustomerId: 'cus_unsafe',
        learnerId: 'learner-1'
      })
    ],
    ledgerEvents: [],
    entitlementProjection: { billingAccountId: 'billing-account-1', accessState: 'premium' }
  });

  assert.equal(report.canGrantEntitlement, false);
  assert.equal(JSON.stringify(report).includes('secret'), false);
  assert.equal(JSON.stringify(report).includes('cus_unsafe'), false);
  assert.equal(JSON.stringify(report).includes('learner-1'), false);
  assert.ok(report.findings.every(finding => finding.canGrantEntitlement === false));
});

test('billing reconciliation docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'payment-provider-production-integration.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /missing webhook/i);
  assert.match(docs, /duplicate provider event/i);
  assert.match(docs, /entitlement projection drift/i);
  assert.match(pkg.scripts['test:unit'], /tests\/billing-reconciliation-service\.test\.js/);
});

function providerRecord(kind, providerEventRef = `provider-event-${kind}`, overrides = {}) {
  return {
    provider: 'stripe',
    providerEventRef,
    billingAccountId: 'billing-account-1',
    kind,
    eventCreatedAt: '2030-05-03T00:00:00.000Z',
    status: 'confirmed',
    ...overrides
  };
}

function ledgerEvent(providerEventRef, eventType, overrides = {}) {
  return {
    ledgerEventId: `ledger-${providerEventRef}`,
    sourceProviderEventRef: providerEventRef,
    eventType,
    billingAccountId: 'billing-account-1',
    status: 'verified',
    occurredAt: '2030-05-03T00:00:00.000Z',
    records: [],
    ...overrides
  };
}
