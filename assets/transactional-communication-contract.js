(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestTransactionalCommunicationContract = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SENSITIVE_FORBIDDEN_FIELDS = Object.freeze([
    'learnerId',
    'studentName',
    'email',
    'providerCustomerId',
    'paymentCredential',
    'rawProviderPayload'
  ]);
  const REQUIRED_TRANSACTIONAL_MESSAGE_TYPES = Object.freeze([
    'checkout_started',
    'payment_pending',
    'receipt',
    'upcoming_renewal',
    'failed_renewal',
    'payment_method_update',
    'cancellation',
    'cancellation_effective_date',
    'one_time_access_expiration',
    'refund',
    'dispute',
    'terms_change',
    'account_recovery',
    'support_handoff'
  ]);

  const DEFAULT_TRANSACTIONAL_COMMUNICATION_CONTRACT = Object.freeze({
    schemaVersion: 1,
    providerNeutral: true,
    messages: Object.freeze([
      message('checkout_started', 'checkout_session_requested', ['billingOwnerRef', 'planId']),
      message('payment_pending', 'provider_checkout_pending', ['billingOwnerRef', 'planId', 'status']),
      message('receipt', 'payment_confirmed', ['billingOwnerRef', 'planId', 'amountDisplay']),
      message('upcoming_renewal', 'renewal_notice_window_opened', ['billingOwnerRef', 'planId', 'renewalDate']),
      message('failed_renewal', 'renewal_payment_failed', ['billingOwnerRef', 'planId', 'recoveryAction']),
      message('payment_method_update', 'payment_method_update_confirmed', ['billingOwnerRef', 'status']),
      message('cancellation', 'subscription_cancellation_requested', ['billingOwnerRef', 'planId', 'effectiveDate']),
      message('cancellation_effective_date', 'subscription_cancellation_effective', ['billingOwnerRef', 'planId', 'effectiveDate']),
      message('one_time_access_expiration', 'one_time_access_expiring', ['billingOwnerRef', 'planId', 'expiresAt']),
      message('refund', 'refund_status_changed', ['billingOwnerRef', 'planId', 'refundStatus']),
      message('dispute', 'dispute_status_changed', ['billingOwnerRef', 'planId', 'disputeStatus']),
      message('terms_change', 'commerce_terms_changed', ['billingOwnerRef', 'effectiveDate', 'termsSummaryKey']),
      message('account_recovery', 'billing_account_recovery_requested', ['billingOwnerRef', 'recoveryStatus']),
      message('support_handoff', 'billing_support_handoff_created', ['billingOwnerRef', 'supportCaseRef'])
    ])
  });

  function message(type, trigger, requiredFields) {
    return Object.freeze({
      type,
      trigger,
      audience: 'billing_owner',
      requiredFields: Object.freeze(requiredFields.slice()),
      forbiddenFields: SENSITIVE_FORBIDDEN_FIELDS,
      deliveryChannels: Object.freeze(['email', 'in_app']),
      policyRequirement: 'required_transactional_notice',
      localizationKey: `billing.transactional.${type.replace(/_/g, '.')}`,
      retentionClass: 'billing_transactional',
      audit: Object.freeze({
        eventType: 'transactional_message_queued',
        actorRef: 'system',
        redaction: 'required'
      }),
      samplePayload: Object.freeze(requiredFields.reduce((payload, field) => {
        payload[field] = sampleValue(field);
        return payload;
      }, {}))
    });
  }

  function validateTransactionalCommunicationContract(contract = DEFAULT_TRANSACTIONAL_COMMUNICATION_CONTRACT) {
    const input = contract && typeof contract === 'object' ? contract : {};
    const messages = Array.isArray(input.messages) ? input.messages : [];
    const errors = [];
    if (input.providerNeutral !== true) errors.push('communication contract must be provider-neutral');
    REQUIRED_TRANSACTIONAL_MESSAGE_TYPES.forEach(type => {
      if (!messages.some(message => safeString(message.type) === type)) errors.push(`missing transactional message type ${type}`);
    });
    messages.forEach(message => {
      validateTransactionalMessage(message).errors.forEach(error => errors.push(error));
    });
    return {
      valid: errors.length === 0,
      errors,
      contract: {
        schemaVersion: Number(input.schemaVersion) || 1,
        providerNeutral: input.providerNeutral === true,
        messages: messages.map(normalizeMessage)
      }
    };
  }

  function validateTransactionalMessage(message) {
    const item = normalizeMessage(message);
    const errors = [];
    const label = item.type || 'transactional_message';
    if (!item.trigger) errors.push(`${label} trigger is required`);
    if (!item.audience) errors.push(`${label} audience is required`);
    if (!item.requiredFields.length) errors.push(`${label} requiredFields are required`);
    if (!SENSITIVE_FORBIDDEN_FIELDS.every(field => item.forbiddenFields.includes(field))) {
      errors.push(`${label} forbiddenFields must include sensitive defaults`);
    }
    if (!item.deliveryChannels.length) errors.push(`${label} deliveryChannels are required`);
    if (!item.policyRequirement) errors.push(`${label} policyRequirement is required`);
    if (!/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/.test(item.localizationKey)) {
      errors.push(`${label} localizationKey must be localization-ready`);
    }
    if (!item.retentionClass) errors.push(`${label} retentionClass is required`);
    if (!item.audit.eventType || !item.audit.actorRef || !item.audit.redaction) errors.push(`${label} audit metadata is required`);
    item.requiredFields.forEach(field => {
      if (!hasOwn(item.samplePayload, field)) errors.push(`${label} samplePayload missing required field ${field}`);
    });
    item.forbiddenFields.forEach(field => {
      if (hasOwn(item.samplePayload, field)) errors.push(`${label} samplePayload includes forbidden field ${field}`);
    });
    return { valid: errors.length === 0, errors, message: item };
  }

  function evaluateTransactionalDelivery(options = {}) {
    const channel = safeString(options.channel || 'in_app');
    if (options.transactionalRequired === true) {
      return { allowed: true, reason: 'required_transactional_notice', channel };
    }
    const preferences = options.notificationPreferences && typeof options.notificationPreferences === 'object' ? options.notificationPreferences : {};
    if (options.marketingConsent === true && preferences.marketing === true) {
      return { allowed: true, reason: 'marketing_consent_granted', channel };
    }
    return { allowed: false, reason: 'marketing_consent_required', channel };
  }

  function normalizeMessage(message) {
    const input = message && typeof message === 'object' ? message : {};
    return {
      type: safeString(input.type),
      trigger: safeString(input.trigger),
      audience: safeString(input.audience),
      requiredFields: normalizeStringArray(input.requiredFields),
      forbiddenFields: normalizeStringArray(input.forbiddenFields),
      deliveryChannels: normalizeStringArray(input.deliveryChannels),
      policyRequirement: safeString(input.policyRequirement),
      localizationKey: safeString(input.localizationKey),
      retentionClass: safeString(input.retentionClass),
      audit: {
        eventType: safeString(input.audit && input.audit.eventType),
        actorRef: safeString(input.audit && input.audit.actorRef),
        redaction: safeString(input.audit && input.audit.redaction)
      },
      samplePayload: input.samplePayload && typeof input.samplePayload === 'object' ? Object.assign({}, input.samplePayload) : {}
    };
  }

  function sampleValue(field) {
    if (/date|At$/i.test(field)) return '2030-04-29T12:00:00.000Z';
    if (/amount/i.test(field)) return 'Pending approval';
    if (/billingOwnerRef/i.test(field)) return 'billing-owner:guardian-1';
    return `${field}:sample`;
  }

  function normalizeStringArray(value) {
    return (Array.isArray(value) ? value : []).map(safeString).filter(Boolean);
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_TRANSACTIONAL_COMMUNICATION_CONTRACT,
    REQUIRED_TRANSACTIONAL_MESSAGE_TYPES,
    evaluateTransactionalDelivery,
    validateTransactionalCommunicationContract,
    validateTransactionalMessage
  };
});
