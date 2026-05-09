'use strict';

const PROVIDER_RECORD_KIND_TO_LEDGER_EVENT = Object.freeze({
  subscription_created: 'subscription_created',
  subscription_renewal: 'renewal_succeeded',
  renewal_succeeded: 'renewal_succeeded',
  failed_payment: 'renewal_failed',
  subscription_canceled: 'subscription_canceled',
  one_time_purchase: 'one_time_payment_succeeded',
  refund: 'refund_issued',
  dispute: 'dispute_opened',
  chargeback: 'dispute_opened',
  provider_outage: 'provider_outage_fallback',
  grace_period: 'provider_outage_fallback'
});

function buildBillingReconciliationReport(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const billingAccountId = safeString(source.billingAccountId);
  const providerRecords = normalizeProviderRecords(source.providerRecords, billingAccountId);
  const ledgerEvents = normalizeLedgerEvents(source.ledgerEvents, billingAccountId);
  const entitlementProjection = source.entitlementProjection && typeof source.entitlementProjection === 'object' ? source.entitlementProjection : {};
  const findings = [];
  const ledgerByProviderEvent = new Map();

  ledgerEvents.forEach(event => {
    const providerEventRef = safeString(event.sourceProviderEventRef);
    if (!providerEventRef) return;
    if (!ledgerByProviderEvent.has(providerEventRef)) ledgerByProviderEvent.set(providerEventRef, []);
    ledgerByProviderEvent.get(providerEventRef).push(event);
  });

  const providerEventCounts = countBy(providerRecords, record => record.providerEventRef);
  providerRecords.forEach(record => {
    const expected = mapProviderRecordToExpectedLedgerEventType(record);
    const matchingLedger = ledgerByProviderEvent.get(record.providerEventRef) || [];
    if (providerEventCounts.get(record.providerEventRef) > 1) {
      findings.push(finding('duplicate_provider_event', record, expected));
    }
    if (expected && !matchingLedger.some(event => event.eventType === expected && event.status === 'verified')) {
      findings.push(finding('missing_ledger_evidence', record, expected));
    }
  });

  const latestLedger = ledgerEvents.slice().sort(compareLedgerEvents).at(-1);
  if (latestLedger && safeString(entitlementProjection.sourceLedgerEventId) && safeString(entitlementProjection.sourceLedgerEventId) !== latestLedger.ledgerEventId) {
    findings.push({
      type: 'entitlement_projection_drift',
      billingAccountId,
      expectedLedgerEventId: latestLedger.ledgerEventId,
      currentProjectionLedgerEventId: safeString(entitlementProjection.sourceLedgerEventId),
      recommendedAction: 'rebuild_entitlement_projection_from_verified_ledger',
      canGrantEntitlement: false
    });
  }

  const recommendedActions = Array.from(new Set(findings.map(item => item.recommendedAction).filter(Boolean)));
  return Object.freeze({
    schemaVersion: 1,
    billingAccountId,
    status: findings.length ? 'action_required' : 'reconciled',
    evaluatedAt: safeIso(source.now) || new Date(0).toISOString(),
    providerRecordCount: providerRecords.length,
    verifiedLedgerEventCount: ledgerEvents.length,
    canGrantEntitlement: false,
    entitlementMutation: 'none',
    findings: Object.freeze(findings.map(item => Object.freeze(item))),
    recommendedActions: Object.freeze(recommendedActions)
  });
}

function validateBillingReconciliationReport(report = {}) {
  const input = report && typeof report === 'object' ? report : {};
  const errors = [];
  if (input.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!safeString(input.billingAccountId)) errors.push('billingAccountId is required');
  if (!['reconciled', 'action_required'].includes(safeString(input.status))) errors.push('status is invalid');
  if (input.canGrantEntitlement !== false) errors.push('reconciliation must not grant entitlements directly');
  if (safeString(input.entitlementMutation) !== 'none') errors.push('reconciliation entitlement mutation must be none');
  if (!Array.isArray(input.findings)) errors.push('findings are required');
  if (containsSensitiveBillingEvidence(input)) errors.push('reconciliation report contains sensitive billing evidence');
  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}

function mapProviderRecordToExpectedLedgerEventType(providerRecord = {}) {
  const kind = safeString(providerRecord.kind || providerRecord.eventType);
  return PROVIDER_RECORD_KIND_TO_LEDGER_EVENT[kind] || '';
}

function normalizeProviderRecords(records, billingAccountId) {
  return (Array.isArray(records) ? records : []).map(record => {
    const input = record && typeof record === 'object' ? record : {};
    return {
      provider: safeString(input.provider),
      providerEventRef: safeString(input.providerEventRef),
      billingAccountId: safeString(input.billingAccountId || billingAccountId),
      kind: safeString(input.kind || input.eventType),
      eventCreatedAt: safeIso(input.eventCreatedAt),
      status: safeString(input.status)
    };
  }).filter(record => record.billingAccountId === billingAccountId);
}

function normalizeLedgerEvents(events, billingAccountId) {
  return (Array.isArray(events) ? events : []).map(event => {
    const input = event && typeof event === 'object' ? event : {};
    return {
      ledgerEventId: safeString(input.ledgerEventId),
      sourceProviderEventRef: safeString(input.sourceProviderEventRef),
      eventType: safeString(input.eventType),
      billingAccountId: safeString(input.billingAccountId || billingAccountId),
      status: safeString(input.status),
      occurredAt: safeIso(input.occurredAt),
      records: Array.isArray(input.records) ? input.records : []
    };
  }).filter(event => event.billingAccountId === billingAccountId && event.status === 'verified');
}

function finding(type, providerRecord, expectedLedgerEventType) {
  return {
    type,
    provider: providerRecord.provider,
    providerEventRef: providerRecord.providerEventRef,
    billingAccountId: providerRecord.billingAccountId,
    providerRecordKind: providerRecord.kind,
    expectedLedgerEventType,
    recommendedAction: type === 'duplicate_provider_event'
      ? 'inspect_duplicate_provider_event'
      : 'ingest_or_replay_verified_provider_webhook',
    canGrantEntitlement: false
  };
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
    return counts;
  }, new Map());
}

function compareLedgerEvents(left, right) {
  const leftTime = new Date(left.occurredAt || 0).getTime();
  const rightTime = new Date(right.occurredAt || 0).getTime();
  if (leftTime !== rightTime) return leftTime - rightTime;
  return left.ledgerEventId.localeCompare(right.ledgerEventId);
}

function containsSensitiveBillingEvidence(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some(key => /learnerId|studentId|studentName|learnerEmail|providerCustomerId|providerSubscriptionId|providerPaymentMethodId|rawProviderPayload|paymentCredential|walletCredential|cardNumber|cvv|cvc|apiKey|authToken|sessionToken|secret|password|token/i.test(key)
    || containsSensitiveBillingEvidence(value[key]));
}

function safeIso(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function safeString(value) {
  return String(value || '').trim();
}

module.exports = {
  PROVIDER_RECORD_KIND_TO_LEDGER_EVENT,
  buildBillingReconciliationReport,
  mapProviderRecordToExpectedLedgerEventType,
  validateBillingReconciliationReport
};
