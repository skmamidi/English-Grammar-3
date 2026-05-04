'use strict';

const {
  applyBillingLedgerEvent,
  verifyProviderWebhookEnvelope
} = require('./billing-webhook-ledger-policy');
const { validateBillingRecord } = require('../assets/billing-domain-contracts');
const {
  deriveBillingEntitlementProjection,
  validateBillingEntitlementProjection
} = require('../assets/billing-entitlement-projection');

const BASE_TIME = '2030-05-03T00:00:00.000Z';

const FAKE_PROVIDER_BILLING_SCENARIOS = Object.freeze([
  scenario('subscription_created', 'subscription_created', 10),
  scenario('invoice_paid', 'renewal_succeeded', 20),
  scenario('renewal_succeeded', 'renewal_succeeded', 30),
  scenario('renewal_failed', 'renewal_failed', 40),
  scenario('payment_method_updated', 'payment_method_updated', 50),
  scenario('subscription_canceled_at_period_end', 'subscription_canceled', 60),
  scenario('one_time_payment_succeeded', 'one_time_payment_succeeded', 70),
  scenario('refund_issued', 'refund_issued', 80),
  scenario('dispute_opened', 'dispute_opened', 90),
  scenario('duplicate_webhook_ignored', 'renewal_succeeded', 100),
  scenario('stale_webhook_rejected', 'renewal_succeeded', 15),
  scenario('provider_outage_fallback', 'provider_outage_fallback', 110)
]);

function scenario(id, eventType, sequence) {
  return Object.freeze({
    id,
    eventType,
    sequence,
    billingAccountId: 'billing-account-1',
    planId: id === 'one_time_payment_succeeded' ? 'premium_one_time_30' : 'premium_monthly'
  });
}

function buildFakeProviderWebhookEnvelope(scenarioId, overrides = {}) {
  const selected = getScenario(scenarioId);
  const fields = sanitizedFieldsFor(selected);
  return {
    envelopeId: `fake-provider-envelope-${selected.id}`,
    provider: 'fake_provider',
    signatureStatus: 'verified',
    receivedAt: BASE_TIME,
    eventCreatedAt: eventCreatedAtFor(selected),
    providerEventRef: `fake-provider-event-${selected.id}`,
    idempotencyKey: `fake-ledger-key-${selected.id}`,
    eventType: selected.eventType,
    sequence: selected.sequence,
    payloadDigest: `sha256:${digestFor(selected.id)}`,
    sanitizedFields: fields,
    ...overrides
  };
}

function runFakeProviderBillingFixtureScenario(scenarioId, options = {}) {
  const selected = getScenario(scenarioId);
  const now = safeIso(options.now) || '2030-05-20T00:00:00.000Z';
  const seededSubscription = createSeededSubscriptionEvent();
  let existingEvents = Array.isArray(options.existingEvents) ? options.existingEvents.slice() : [];
  let envelope = buildFakeProviderWebhookEnvelope(selected.id);

  if (selected.id === 'duplicate_webhook_ignored') {
    const first = applyBillingLedgerEvent({ envelope, existingEvents: [] }).ledgerEvent;
    existingEvents = [first];
    envelope = buildFakeProviderWebhookEnvelope(selected.id, {
      envelopeId: 'fake-provider-envelope-duplicate-replay'
    });
  } else if (selected.id === 'stale_webhook_rejected') {
    existingEvents = [createSeededSubscriptionEvent({
      ledgerEventId: 'billing-ledger-newer-subscription',
      sequence: 50,
      occurredAt: '2030-05-10T00:00:00.000Z',
      effectiveAt: '2030-06-10T00:00:00.000Z'
    })];
    envelope = buildFakeProviderWebhookEnvelope(selected.id, {
      eventCreatedAt: '2030-05-02T00:00:00.000Z',
      sequence: 5,
      idempotencyKey: 'fake-ledger-key-stale-webhook'
    });
  } else if (selected.id === 'payment_method_updated') {
    existingEvents = [seededSubscription];
  }

  const ledgerResult = applyBillingLedgerEvent({ envelope, existingEvents });
  const ledgerEvents = ledgerResult.ledgerEvent ? [...existingEvents, ledgerResult.ledgerEvent] : existingEvents;
  const entitlementEvents = ledgerEvents.filter(event => affectsEntitlement(event.eventType));
  const entitlementProjection = deriveBillingEntitlementProjection({
    billingAccountId: selected.billingAccountId,
    ledgerEvents: entitlementEvents,
    now
  });

  return {
    scenarioId: selected.id,
    envelope,
    ledgerResult,
    billingRecords: ledgerResult.ledgerEvent ? ledgerResult.ledgerEvent.records : [],
    entitlementProjection,
    diagnostics: ledgerResult.diagnostics
  };
}

function validateFakeProviderBillingFixtures() {
  const errors = [];
  FAKE_PROVIDER_BILLING_SCENARIOS.forEach(scenario => {
    const envelopeResult = verifyProviderWebhookEnvelope(buildFakeProviderWebhookEnvelope(scenario.id));
    if (!envelopeResult.valid) {
      errors.push(`${scenario.id} envelope invalid: ${envelopeResult.errors.join(', ')}`);
    }
    const result = runFakeProviderBillingFixtureScenario(scenario.id);
    if (!['duplicate_webhook_ignored', 'stale_webhook_rejected'].includes(scenario.id)) {
      if (result.ledgerResult.outcome !== 'ledger_event_recorded') errors.push(`${scenario.id} ledger not recorded`);
      result.billingRecords.forEach((record, index) => {
        validateBillingRecord(record).errors.forEach(error => errors.push(`${scenario.id} record ${index}: ${error}`));
      });
    }
    validateBillingEntitlementProjection(result.entitlementProjection).errors.forEach(error => {
      errors.push(`${scenario.id} entitlement: ${error}`);
    });
    if (JSON.stringify(result).match(/rawProviderPayload|providerCustomerId|learnerId|paymentCredential/)) {
      errors.push(`${scenario.id} includes unsafe fixture payload`);
    }
  });
  return { valid: errors.length === 0, errors };
}

function sanitizedFieldsFor(selected) {
  const common = {
    billingAccountId: selected.billingAccountId,
    billingOwnerId: 'guardian-1',
    planId: selected.planId,
    accessLevel: 'premium',
    currentPeriodStart: '2030-05-01T00:00:00.000Z',
    currentPeriodEnd: '2030-06-01T00:00:00.000Z',
    accessStartsAt: '2030-05-03T00:00:00.000Z',
    accessEndsAt: '2030-06-02T00:00:00.000Z',
    retryEndsAt: '2030-05-10T00:00:00.000Z',
    graceEndsAt: '2030-05-06T00:00:00.000Z',
    effectiveAt: '2030-06-01T00:00:00.000Z',
    currency: 'USD',
    country: 'US',
    amountMinor: 999,
    reasonCode: 'parent_requested'
  };
  if (selected.eventType === 'refund_issued') return { ...common, reasonCode: 'support_approved' };
  if (selected.eventType === 'provider_outage_fallback') return { ...common, reasonCode: 'provider_unavailable' };
  return common;
}

function createSeededSubscriptionEvent(overrides = {}) {
  const envelope = buildFakeProviderWebhookEnvelope('subscription_created', {
    envelopeId: 'fake-provider-envelope-seeded-subscription',
    idempotencyKey: 'fake-ledger-key-seeded-subscription',
    providerEventRef: 'fake-provider-event-seeded-subscription',
    sequence: 1,
    eventCreatedAt: '2030-05-01T00:00:00.000Z'
  });
  return {
    ...applyBillingLedgerEvent({ envelope, existingEvents: [] }).ledgerEvent,
    ...overrides
  };
}

function affectsEntitlement(eventType) {
  return !['payment_method_updated'].includes(eventType);
}

function eventCreatedAtFor(selected) {
  const date = new Date(BASE_TIME);
  date.setUTCMinutes(date.getUTCMinutes() + selected.sequence);
  return date.toISOString();
}

function digestFor(value) {
  const hex = Buffer.from(String(value)).toString('hex').padEnd(16, '0');
  return hex.slice(0, 32);
}

function getScenario(scenarioId) {
  const selected = FAKE_PROVIDER_BILLING_SCENARIOS.find(item => item.id === scenarioId);
  if (!selected) throw new Error(`Unknown fake provider billing scenario: ${scenarioId}`);
  return selected;
}

function safeIso(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

module.exports = {
  FAKE_PROVIDER_BILLING_SCENARIOS,
  buildFakeProviderWebhookEnvelope,
  runFakeProviderBillingFixtureScenario,
  validateFakeProviderBillingFixtures
};
