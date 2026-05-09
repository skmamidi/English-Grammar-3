'use strict';

const crypto = require('node:crypto');

const STRIPE_EVENT_TYPE_MAP = Object.freeze({
  'checkout.session.completed': 'subscription_created',
  'customer.subscription.created': 'subscription_created',
  'invoice.payment_succeeded': 'renewal_succeeded',
  'invoice.payment_failed': 'renewal_failed',
  'customer.subscription.deleted': 'subscription_canceled',
  'payment_intent.succeeded': 'one_time_payment_succeeded',
  'charge.refunded': 'refund_issued',
  'charge.dispute.created': 'dispute_opened'
});

const UNSAFE_CHECKOUT_KEY_PATTERN = /paymentCredential|walletCredential|cardNumber|cvv|cvc|providerCustomerId|providerSubscriptionId|providerPaymentIntentId|providerPaymentMethodId|rawProviderPayload|apiKey|secret|token/i;

function normalizeStripePaymentProviderConfig(env = {}) {
  const input = env && typeof env === 'object' ? env : {};
  const provider = safeString(input.GRAMMARQUEST_PAYMENT_PROVIDER || input.provider);
  const mode = safeString(input.STRIPE_PAYMENT_MODE || input.mode);
  const enabled = provider === 'stripe' && ['sandbox', 'production'].includes(mode);
  return Object.freeze({
    enabled,
    provider: enabled ? 'stripe' : provider || 'none',
    mode: enabled ? mode : 'disabled',
    publishableKey: safeString(input.STRIPE_PUBLISHABLE_KEY || input.publishableKey),
    secretKeyRef: safeString(input.STRIPE_SECRET_KEY_REF || input.secretKeyRef),
    webhookSecretRef: safeString(input.STRIPE_WEBHOOK_SECRET_REF || input.webhookSecretRef)
  });
}

function createStripePaymentProviderAdapter(options = {}) {
  const config = options.config || normalizeStripePaymentProviderConfig(options.env || {});
  const client = options.client || null;

  return Object.freeze({
    id: 'stripe-payment-provider',
    provider: 'stripe',
    kind: 'payment_provider',
    config,
    async createCheckoutSession(request = {}) {
      if (!config.enabled) {
        return disabledCheckoutResult(config);
      }

      const validation = validateStripeCheckoutRequest(request);
      if (!validation.valid) {
        return {
          status: 'rejected',
          provider: 'stripe',
          errors: validation.errors,
          browserContract: disabledCheckoutResult(config).browserContract
        };
      }
      if (!client || typeof client.createCheckoutSession !== 'function') {
        const error = new Error('stripe checkout client unavailable');
        error.code = 'provider_unavailable';
        throw error;
      }

      const normalized = validation.request;
      const providerRequest = {
        mode: normalized.planId.includes('one_time') ? 'payment' : 'subscription',
        success_url: normalized.successUrl,
        cancel_url: normalized.cancelUrl,
        line_items: [{ price: normalized.priceRef || normalized.planId, quantity: 1 }],
        metadata: {
          billingAccountId: normalized.billingAccountId,
          billingOwnerRef: normalized.billingOwnerRef,
          planId: normalized.planId
        }
      };
      const providerResult = await client.createCheckoutSession(providerRequest, {
        idempotencyKey: normalized.idempotencyKey || `checkout:${normalized.billingAccountId}:${normalized.planId}`
      });

      return sanitizeStripeCheckoutResult(providerResult, config, {
        planId: normalized.planId,
        billingAccountId: normalized.billingAccountId
      });
    },
    buildProviderElementConfig() {
      return {
        publishableConfig: {
          provider: 'stripe',
          mode: config.mode,
          publishableKey: config.publishableKey
        },
        providerElementConfigRef: `stripe-elements:${config.mode || 'disabled'}`,
        redactedBillingSummary: {
          accessState: config.enabled ? 'checkout_available' : 'checkout_disabled',
          provider: 'stripe'
        }
      };
    }
  });
}

function validateStripeCheckoutRequest(request = {}) {
  const input = request && typeof request === 'object' ? request : {};
  const errors = [];

  if (!safeString(input.billingAccountId)) errors.push('billingAccountId is required');
  if (!safeString(input.planId)) errors.push('planId is required');
  if (!safeString(input.successUrl)) errors.push('successUrl is required');
  if (!safeString(input.cancelUrl)) errors.push('cancelUrl is required');
  if (safeString(input.successUrl) && !safeString(input.successUrl).startsWith('https://')) errors.push('successUrl must be https');
  if (safeString(input.cancelUrl) && !safeString(input.cancelUrl).startsWith('https://')) errors.push('cancelUrl must be https');
  if (containsUnsafeCheckoutKey(input)) {
    errors.push('checkout request must not include browser-owned payment credentials or provider ids');
  }

  return {
    valid: errors.length === 0,
    errors: Array.from(new Set(errors)),
    request: {
      billingAccountId: safeString(input.billingAccountId),
      billingOwnerRef: safeString(input.billingOwnerRef),
      planId: safeString(input.planId),
      priceRef: safeString(input.priceRef),
      successUrl: safeString(input.successUrl),
      cancelUrl: safeString(input.cancelUrl),
      idempotencyKey: safeString(input.idempotencyKey)
    }
  };
}

function sanitizeStripeCheckoutResult(providerResult = {}, config = {}, context = {}) {
  const input = providerResult && typeof providerResult === 'object' ? providerResult : {};
  const sessionId = safeString(input.id || input.sessionId);
  const hostedCheckoutUrl = /^https:\/\/checkout\.stripe\.com\//.test(safeString(input.url)) ? safeString(input.url) : '';
  return {
    status: hostedCheckoutUrl ? 'ready' : 'rejected',
    provider: 'stripe',
    mode: safeString(config.mode || 'disabled'),
    browserContract: {
      publishableConfig: {
        provider: 'stripe',
        mode: safeString(config.mode || 'disabled'),
        publishableKey: safeString(config.publishableKey)
      },
      hostedCheckoutUrl,
      clientSafeSessionRef: sessionId ? `checkout-session:${stableSlug(sessionId)}` : '',
      providerElementConfigRef: `stripe-elements:${safeString(config.mode || 'disabled')}`,
      redactedBillingSummary: {
        billingAccountRef: safeString(context.billingAccountId),
        planId: safeString(context.planId || 'premium_monthly'),
        accessState: hostedCheckoutUrl ? 'checkout_pending' : 'checkout_unavailable',
        provider: 'stripe'
      }
    }
  };
}

function buildStripeWebhookSignatureHeader({ payload, webhookSecret, timestamp } = {}) {
  const signedAt = Number.isInteger(timestamp) ? timestamp : Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', safeString(webhookSecret)).update(`${signedAt}.${String(payload || '')}`).digest('hex');
  return `t=${signedAt},v1=${signature}`;
}

function verifyStripeWebhookSignature(options = {}) {
  const payload = String(options.payload || '');
  const webhookSecret = safeString(options.webhookSecret);
  const signatureHeader = safeString(options.signatureHeader);
  const replayCache = options.replayCache && typeof options.replayCache.has === 'function' ? options.replayCache : null;
  const receivedAtSeconds = Math.floor(new Date(options.receivedAt || Date.now()).getTime() / 1000);
  const toleranceSeconds = Number.isInteger(options.toleranceSeconds) ? options.toleranceSeconds : 300;
  const parsed = parseStripeSignatureHeader(signatureHeader);
  const errors = [];

  if (!webhookSecret) errors.push('webhook secret is required');
  if (!parsed.timestamp) errors.push('webhook timestamp is required');
  if (parsed.signatures.length === 0) errors.push('webhook signature is required');
  if (parsed.timestamp && Math.abs(receivedAtSeconds - parsed.timestamp) > toleranceSeconds) {
    errors.push('webhook timestamp outside tolerance');
  }

  const expected = parsed.timestamp && webhookSecret
    ? crypto.createHmac('sha256', webhookSecret).update(`${parsed.timestamp}.${payload}`).digest('hex')
    : '';
  const matches = expected && parsed.signatures.some(signature => timingSafeEqualHex(signature, expected));
  if (!matches) errors.push('webhook signature mismatch');

  const replayKey = parsed.timestamp && parsed.signatures[0] ? `${parsed.timestamp}:${parsed.signatures[0]}` : '';
  if (replayCache && replayKey) {
    if (replayCache.has(replayKey)) {
      errors.push('webhook signature replay detected');
    } else if (errors.length === 0) {
      replayCache.add(replayKey);
    }
  }

  return {
    valid: errors.length === 0,
    errors: Array.from(new Set(errors)),
    timestamp: parsed.timestamp,
    payloadDigest: sha256Digest(payload)
  };
}

function buildStripeWebhookEnvelope(options = {}) {
  const payload = String(options.payload || '');
  const verified = verifyStripeWebhookSignature(options);
  if (!verified.valid) {
    return {
      envelopeId: `stripe-webhook-invalid-${verified.payloadDigest.slice(-12)}`,
      provider: 'stripe',
      signatureStatus: 'invalid',
      receivedAt: safeIso(options.receivedAt) || new Date(0).toISOString(),
      eventCreatedAt: safeIso(options.receivedAt) || new Date(0).toISOString(),
      providerEventRef: '',
      idempotencyKey: '',
      eventType: 'signature_verification_failed',
      sequence: 0,
      payloadDigest: verified.payloadDigest,
      sanitizedFields: { errors: verified.errors.slice() }
    };
  }

  const event = parseJson(payload);
  const object = event.data && event.data.object && typeof event.data.object === 'object' ? event.data.object : {};
  const metadata = object.metadata && typeof object.metadata === 'object' ? object.metadata : {};
  const eventType = STRIPE_EVENT_TYPE_MAP[safeString(event.type)] || 'provider_outage_fallback';
  const providerEventRef = safeString(event.id);
  const eventCreatedAt = epochToIso(event.created) || safeIso(options.receivedAt) || new Date(0).toISOString();

  return {
    envelopeId: `stripe-webhook-${stableSlug(providerEventRef || verified.payloadDigest)}`,
    provider: 'stripe',
    signatureStatus: 'verified',
    receivedAt: safeIso(options.receivedAt) || eventCreatedAt,
    eventCreatedAt,
    providerEventRef,
    idempotencyKey: `stripe:${providerEventRef || verified.payloadDigest}`,
    eventType,
    sequence: Number.isInteger(event.created) ? event.created : verified.timestamp,
    payloadDigest: verified.payloadDigest,
    sanitizedFields: sanitizeWebhookFields({
      billingAccountId: safeString(metadata.billingAccountId || object.client_reference_id || object.billing_account),
      planId: safeString(metadata.planId || object.planId || object.product || 'premium_monthly'),
      currentPeriodStart: epochToIso(object.period_start || object.current_period_start) || safeIso(object.currentPeriodStart),
      currentPeriodEnd: epochToIso(object.period_end || object.current_period_end) || safeIso(object.currentPeriodEnd),
      accessStartsAt: epochToIso(object.period_start) || safeIso(object.accessStartsAt),
      accessEndsAt: epochToIso(object.period_end) || safeIso(object.accessEndsAt),
      effectiveAt: epochToIso(object.canceled_at) || safeIso(object.effectiveAt),
      amountMinor: integerFrom(object.amount_paid, object.amount_total, object.amount),
      currency: safeString(object.currency || 'USD').toUpperCase(),
      reasonCode: safeString(object.reason || object.cancellation_reason || 'provider_event')
    })
  };
}

function disabledCheckoutResult(config = {}) {
  return {
    status: 'disabled',
    provider: 'stripe',
    reason: 'payment_provider_disabled',
    browserContract: {
      publishableConfig: {
        provider: 'stripe',
        mode: safeString(config.mode || 'disabled')
      },
      hostedCheckoutUrl: '',
      clientSafeSessionRef: '',
      providerElementConfigRef: 'stripe-elements:disabled',
      redactedBillingSummary: {
        accessState: 'checkout_disabled',
        provider: 'stripe'
      }
    }
  };
}

function parseStripeSignatureHeader(header) {
  const parts = safeString(header).split(',').map(part => part.trim()).filter(Boolean);
  return parts.reduce((parsed, part) => {
    const [key, value] = part.split('=');
    if (key === 't') parsed.timestamp = Number(value) || 0;
    if (key === 'v1') parsed.signatures.push(safeString(value));
    return parsed;
  }, { timestamp: 0, signatures: [] });
}

function timingSafeEqualHex(left, right) {
  if (!/^[a-f0-9]+$/i.test(left) || !/^[a-f0-9]+$/i.test(right) || left.length !== right.length) return false;
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function containsUnsafeCheckoutKey(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some(key => UNSAFE_CHECKOUT_KEY_PATTERN.test(key) || containsUnsafeCheckoutKey(value[key]));
}

function sanitizeWebhookFields(fields) {
  return Object.keys(fields).reduce((safe, key) => {
    const value = fields[key];
    if (value === '' || value === undefined || value === null) return safe;
    safe[key] = value;
    return safe;
  }, {});
}

function parseJson(payload) {
  try {
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function integerFrom(...values) {
  const found = values.find(value => Number.isInteger(value));
  return Number.isInteger(found) && found >= 0 ? found : 0;
}

function epochToIso(value) {
  if (!Number.isInteger(value)) return '';
  return new Date(value * 1000).toISOString();
}

function sha256Digest(value) {
  return `sha256:${crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 32)}`;
}

function safeIso(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function stableSlug(value) {
  return safeString(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ref';
}

function safeString(value) {
  return String(value || '').trim();
}

module.exports = {
  STRIPE_EVENT_TYPE_MAP,
  buildStripeWebhookEnvelope,
  buildStripeWebhookSignatureHeader,
  createStripePaymentProviderAdapter,
  normalizeStripePaymentProviderConfig,
  sanitizeStripeCheckoutResult,
  validateStripeCheckoutRequest,
  verifyStripeWebhookSignature
};
