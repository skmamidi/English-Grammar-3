'use strict';

const {
  normalizeBillingRecord,
  projectBillingEntitlement,
  validateBillingRecord
} = require('../assets/billing-domain-contracts');

const BILLING_LEDGER_EVENT_TYPES = Object.freeze([
  'subscription_created',
  'payment_method_updated',
  'renewal_succeeded',
  'renewal_failed',
  'subscription_canceled',
  'one_time_payment_succeeded',
  'refund_issued',
  'dispute_opened',
  'duplicate_webhook_ignored',
  'stale_webhook_rejected',
  'provider_outage_fallback'
]);

const DEFAULT_BILLING_WEBHOOK_LEDGER_POLICY = Object.freeze({
  signedWebhookRequired: true,
  replayProtectionRequired: true,
  idempotentLedgerWritesRequired: true,
  monotonicEventOrderingRequired: true,
  checkoutRedirectsInformationalOnly: true,
  rawProviderPayloadForbidden: true,
  entitlementWritesRequireVerifiedLedger: true,
  diagnosticsAuditSafe: true
});

const REDACTED = '[REDACTED]';
const sensitiveKeyPattern = /learnerId|studentId|studentName|learnerEmail|rawProvider|providerPayload|webhookPayload|providerCustomerId|providerSubscriptionId|providerPayment|paymentCredential|walletCredential|cardNumber|cvv|cvc|secret|token|idempotencyKey|providerEventRef/i;

function validateBillingWebhookLedgerPolicy(policy = DEFAULT_BILLING_WEBHOOK_LEDGER_POLICY) {
  const input = policy && typeof policy === 'object' ? policy : {};
  const errors = [];
  [
    'signedWebhookRequired',
    'replayProtectionRequired',
    'idempotentLedgerWritesRequired',
    'monotonicEventOrderingRequired',
    'checkoutRedirectsInformationalOnly',
    'rawProviderPayloadForbidden',
    'entitlementWritesRequireVerifiedLedger',
    'diagnosticsAuditSafe'
  ].forEach(field => {
    if (input[field] !== true) errors.push(`${field} must be true`);
  });
  return { valid: errors.length === 0, errors };
}

function verifyProviderWebhookEnvelope(envelope = {}) {
  const input = envelope && typeof envelope === 'object' ? envelope : {};
  const errors = [];

  if (!safeString(input.envelopeId)) errors.push('envelopeId is required');
  if (!safeString(input.provider)) errors.push('provider is required');
  if (safeString(input.signatureStatus) !== 'verified') errors.push('signed webhook verification is required');
  if (!safeIso(input.receivedAt)) errors.push('receivedAt is required');
  if (!safeIso(input.eventCreatedAt)) errors.push('eventCreatedAt is required');
  if (!safeString(input.providerEventRef)) errors.push('providerEventRef is required');
  if (!safeString(input.idempotencyKey)) errors.push('idempotencyKey is required for replay protection');
  if (!BILLING_LEDGER_EVENT_TYPES.includes(safeString(input.eventType)) || isTerminalPolicyEvent(input.eventType)) {
    errors.push('supported billing ledger eventType is required');
  }
  if (!/^sha256:[a-f0-9]{12,}$/i.test(safeString(input.payloadDigest))) {
    errors.push('payloadDigest must be a sha256 digest reference');
  }
  if (!input.sanitizedFields || typeof input.sanitizedFields !== 'object') {
    errors.push('sanitizedFields are required');
  }
  if (containsUnsafeEnvelopeKey(input)) {
    errors.push('webhook envelope must be audit safe and free of raw provider payload or server-only fields');
  }
  if (containsUnsafeEnvelopeKey(input.sanitizedFields)) {
    errors.push('sanitizedFields must be audit safe and free of server-only billing data');
  }

  return {
    valid: errors.length === 0,
    errors,
    envelope: errors.length === 0 ? normalizeEnvelope(input) : null
  };
}

function applyBillingLedgerEvent({ envelope, existingEvents = [] } = {}) {
  const verified = verifyProviderWebhookEnvelope(envelope);
  if (!verified.valid) {
    return {
      outcome: 'webhook_rejected',
      ledgerEvent: null,
      diagnostics: sanitizeWebhookDiagnostics({ errors: verified.errors, envelope })
    };
  }

  const normalized = verified.envelope;
  if (existingEvents.some(event => safeString(event.idempotencyKey) === normalized.idempotencyKey)) {
    return {
      outcome: 'duplicate_webhook_ignored',
      duplicate: true,
      ledgerEvent: null,
      diagnostics: sanitizeWebhookDiagnostics({
        envelopeId: normalized.envelopeId,
        providerEventRef: normalized.providerEventRef,
        idempotencyKey: normalized.idempotencyKey,
        eventType: normalized.eventType
      })
    };
  }

  if (isStaleWebhook(normalized, existingEvents)) {
    return {
      outcome: 'stale_webhook_rejected',
      stale: true,
      ledgerEvent: null,
      diagnostics: sanitizeWebhookDiagnostics({
        envelopeId: normalized.envelopeId,
        providerEventRef: normalized.providerEventRef,
        idempotencyKey: normalized.idempotencyKey,
        eventType: normalized.eventType,
        eventCreatedAt: normalized.eventCreatedAt
      })
    };
  }

  const ledgerEventId = `billing-ledger-${normalized.eventType}-${stableSlug(normalized.envelopeId)}`;
  const records = buildRecordsForEvent(normalized, ledgerEventId);
  const invalidRecordErrors = records.flatMap((record, index) => validateBillingRecord(record).errors.map(error => `record_${index}_${error}`));
  if (invalidRecordErrors.length > 0) {
    return {
      outcome: 'ledger_event_rejected',
      ledgerEvent: null,
      diagnostics: sanitizeWebhookDiagnostics({ errors: invalidRecordErrors, envelopeId: normalized.envelopeId })
    };
  }

  return {
    outcome: 'ledger_event_recorded',
    ledgerEvent: {
      ledgerEventId,
      eventType: normalized.eventType,
      billingAccountId: normalized.sanitizedFields.billingAccountId,
      sourceEnvelopeId: normalized.envelopeId,
      sourceProviderEventRef: normalized.providerEventRef,
      idempotencyKey: normalized.idempotencyKey,
      sequence: normalized.sequence,
      occurredAt: normalized.eventCreatedAt,
      effectiveAt: effectiveAtFor(normalized),
      status: 'verified',
      payloadDigest: normalized.payloadDigest,
      records
    },
    diagnostics: sanitizeWebhookDiagnostics({
      envelopeId: normalized.envelopeId,
      providerEventRef: normalized.providerEventRef,
      idempotencyKey: normalized.idempotencyKey,
      eventType: normalized.eventType
    })
  };
}

function isEntitlementWriteAllowed(write = {}) {
  const input = write && typeof write === 'object' ? write : {};
  return safeString(input.source) === 'verified_billing_ledger' && Boolean(safeString(input.sourceLedgerEventId));
}

function sanitizeWebhookDiagnostics(value) {
  if (Array.isArray(value)) return value.map(item => sanitizeWebhookDiagnostics(item));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).reduce((sanitized, key) => {
    sanitized[key] = sensitiveKeyPattern.test(key) ? REDACTED : sanitizeWebhookDiagnostics(value[key]);
    return sanitized;
  }, {});
}

function buildRecordsForEvent(envelope, ledgerEventId) {
  const fields = envelope.sanitizedFields;
  const common = {
    billingAccountId: fields.billingAccountId,
    planId: fields.planId || 'premium_monthly',
    sourceLedgerEventId: ledgerEventId
  };

  switch (envelope.eventType) {
    case 'subscription_created':
      return [
        subscriptionRecord(common, fields, 'active'),
        entitlementRecord(common, fields, 'active')
      ];
    case 'payment_method_updated':
      return [
        normalizeBillingRecord({
          recordType: 'billing_account',
          billingAccountId: common.billingAccountId,
          billingOwnerId: fields.billingOwnerId || 'guardian-1',
          actorRole: 'parent_guardian',
          verifiedContact: true,
          country: fields.country || 'US',
          currency: fields.currency || 'USD',
          status: 'active',
          createdAt: envelope.eventCreatedAt,
          paymentMethodStatus: 'updated'
        })
      ];
    case 'renewal_succeeded':
      return [
        normalizeBillingRecord({
          recordType: 'renewal_period',
          ...common,
          periodStart: safeIso(fields.currentPeriodStart) || envelope.eventCreatedAt,
          periodEnd: safeIso(fields.currentPeriodEnd) || envelope.eventCreatedAt,
          renewalStatus: 'paid'
        }),
        normalizeBillingRecord({
          recordType: 'payment',
          ...common,
          paymentId: `payment-${stableSlug(envelope.envelopeId)}`,
          amountMinor: nonNegativeInteger(fields.amountMinor),
          currency: fields.currency || 'USD',
          status: 'succeeded'
        }),
        entitlementRecord(common, fields, 'active')
      ];
    case 'renewal_failed':
      return [
        normalizeBillingRecord({
          recordType: 'past_due_state',
          ...common,
          status: 'past_due',
          startedAt: envelope.eventCreatedAt,
          retryEndsAt: safeIso(fields.retryEndsAt) || addDays(envelope.eventCreatedAt, 7)
        }),
        entitlementRecord(common, fields, 'past_due')
      ];
    case 'subscription_canceled':
      return [
        normalizeBillingRecord({
          recordType: 'cancellation',
          ...common,
          effectiveAt: safeIso(fields.effectiveAt) || safeIso(fields.currentPeriodEnd) || envelope.eventCreatedAt,
          status: 'canceled_at_period_end',
          reasonCode: fields.reasonCode || 'parent_requested'
        }),
        entitlementRecord(common, fields, 'canceled')
      ];
    case 'one_time_payment_succeeded':
      return [
        normalizeBillingRecord({
          recordType: 'one_time_purchase',
          ...common,
          accessStartsAt: safeIso(fields.accessStartsAt) || envelope.eventCreatedAt,
          accessEndsAt: safeIso(fields.accessEndsAt) || safeIso(fields.currentPeriodEnd) || addDays(envelope.eventCreatedAt, 30),
          status: 'active'
        }),
        entitlementRecord(common, fields, 'active')
      ];
    case 'refund_issued':
      return [
        normalizeBillingRecord({
          recordType: 'refund',
          ...common,
          refundId: `refund-${stableSlug(envelope.envelopeId)}`,
          amountMinor: nonNegativeInteger(fields.amountMinor),
          currency: fields.currency || 'USD',
          status: 'issued',
          reasonCode: fields.reasonCode || 'support_approved'
        }),
        entitlementRecord(common, fields, 'refunded')
      ];
    case 'dispute_opened':
      return [
        normalizeBillingRecord({
          recordType: 'dispute',
          ...common,
          disputeId: `dispute-${stableSlug(envelope.envelopeId)}`,
          status: 'opened',
          openedAt: envelope.eventCreatedAt
        }),
        entitlementRecord(common, fields, 'disputed')
      ];
    case 'provider_outage_fallback':
      return [
        normalizeBillingRecord({
          recordType: 'grace_period',
          ...common,
          status: 'billing_unavailable',
          startsAt: envelope.eventCreatedAt,
          endsAt: safeIso(fields.graceEndsAt) || addDays(envelope.eventCreatedAt, 3)
        }),
        entitlementRecord(common, fields, 'billing_unavailable')
      ];
    default:
      return [];
  }
}

function subscriptionRecord(common, fields, status) {
  return normalizeBillingRecord({
    recordType: 'subscription',
    ...common,
    status,
    currentPeriod: {
      startsAt: safeIso(fields.currentPeriodStart) || safeIso(fields.accessStartsAt),
      endsAt: safeIso(fields.currentPeriodEnd) || safeIso(fields.accessEndsAt)
    },
    autoRenew: fields.autoRenew !== false,
    cancelAtPeriodEnd: false
  });
}

function entitlementRecord(common, fields, status) {
  return projectBillingEntitlement({
    ...common,
    accessLevel: status === 'active' || status === 'past_due' || status === 'billing_unavailable' ? 'premium' : 'free',
    status: status === 'active' ? 'active' : status,
    currentPeriodEnd: safeIso(fields.currentPeriodEnd) || safeIso(fields.accessEndsAt),
    autoRenew: fields.autoRenew !== false
  }, { now: () => safeIso(fields.evaluatedAt) || '2030-05-03T00:00:00.000Z' });
}

function normalizeEnvelope(input) {
  return {
    envelopeId: safeString(input.envelopeId),
    provider: safeString(input.provider),
    signatureStatus: 'verified',
    receivedAt: safeIso(input.receivedAt),
    eventCreatedAt: safeIso(input.eventCreatedAt),
    providerEventRef: safeString(input.providerEventRef),
    idempotencyKey: safeString(input.idempotencyKey),
    eventType: safeString(input.eventType),
    sequence: Number.isInteger(input.sequence) ? input.sequence : 0,
    payloadDigest: safeString(input.payloadDigest),
    sanitizedFields: { ...input.sanitizedFields }
  };
}

function containsUnsafeEnvelopeKey(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some(key => {
    if (['provider', 'providerEventRef', 'idempotencyKey'].includes(key)) return false;
    return sensitiveKeyPattern.test(key) || containsUnsafeEnvelopeKey(value[key]);
  });
}

function isTerminalPolicyEvent(eventType) {
  return ['duplicate_webhook_ignored', 'stale_webhook_rejected'].includes(safeString(eventType));
}

function isStaleWebhook(envelope, existingEvents) {
  return existingEvents.some(event => {
    if (safeString(event.billingAccountId) !== safeString(envelope.sanitizedFields.billingAccountId)) return false;
    const existingSequence = Number.isInteger(event.sequence) ? event.sequence : -1;
    const existingOccurredAt = new Date(event.occurredAt).getTime();
    const incomingOccurredAt = new Date(envelope.eventCreatedAt).getTime();
    return envelope.sequence < existingSequence || incomingOccurredAt < existingOccurredAt;
  });
}

function effectiveAtFor(envelope) {
  const fields = envelope.sanitizedFields;
  return safeIso(fields.effectiveAt) || safeIso(fields.currentPeriodEnd) || safeIso(fields.accessEndsAt) || envelope.eventCreatedAt;
}

function nonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function addDays(iso, days) {
  const date = new Date(safeIso(iso) || '1970-01-01T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function stableSlug(value) {
  return safeString(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'event';
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
  BILLING_LEDGER_EVENT_TYPES,
  DEFAULT_BILLING_WEBHOOK_LEDGER_POLICY,
  applyBillingLedgerEvent,
  isEntitlementWriteAllowed,
  sanitizeWebhookDiagnostics,
  validateBillingWebhookLedgerPolicy,
  verifyProviderWebhookEnvelope
};
