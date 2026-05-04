(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestCommerceSupportPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const audit = typeof require === 'function' ? require('./audit-log-domain') : rootAudit();
  const REDACTED = '[REDACTED]';

  const COMMERCE_SUPPORT_ROLE = 'commerce_support';
  const COMMERCE_SUPPORT_RESOURCE = 'commerceSupportAction';
  const COMMERCE_SUPPORT_ACTIONS = Object.freeze([
    'view_billing_summary',
    'verify_account_ownership',
    'resend_receipt',
    'explain_billing_status',
    'grant_complimentary_access',
    'revoke_complimentary_access',
    'flag_abuse',
    'escalate_refund_or_dispute'
  ]);

  const ACTION_CAPABILITIES = Object.freeze({
    view_billing_summary: 'commerce_support:billing_summary',
    verify_account_ownership: 'commerce_support:verify_owner',
    resend_receipt: 'commerce_support:transactional_message',
    explain_billing_status: 'commerce_support:billing_summary',
    grant_complimentary_access: 'commerce_support:manual_access',
    revoke_complimentary_access: 'commerce_support:manual_access',
    flag_abuse: 'commerce_support:abuse_review',
    escalate_refund_or_dispute: 'commerce_support:refund_dispute_escalation'
  });

  const FORBIDDEN_SUPPORT_FIELDS = Object.freeze([
    'learnerId',
    'studentName',
    'learnerEmail',
    'questionPrompt',
    'questionText',
    'answer',
    'learnerAnswer',
    'providerCustomerId',
    'providerPaymentMethodId',
    'providerSubscriptionId',
    'rawProviderPayload',
    'paymentCredential',
    'walletCredential',
    'cardNumber',
    'cvv',
    'cvc',
    'secret',
    'token'
  ]);

  const DEFAULT_COMMERCE_SUPPORT_POLICY = Object.freeze({
    denyByDefault: true,
    impersonationAllowed: false,
    role: COMMERCE_SUPPORT_ROLE,
    resourceType: COMMERCE_SUPPORT_RESOURCE,
    actions: COMMERCE_SUPPORT_ACTIONS,
    actionCapabilities: ACTION_CAPABILITIES,
    forbiddenFields: FORBIDDEN_SUPPORT_FIELDS,
    manualAccess: Object.freeze({
      requiresExpiration: true,
      source: 'support_adjustment',
      maxDays: 31
    }),
    abuseFlag: Object.freeze({
      allowedStatuses: Object.freeze(['checkout_blocked', 'manual_review_required', 'provider_escalation_pending']),
      cannotChangeEntitlements: true
    })
  });

  function validateCommerceSupportPolicy(policy = DEFAULT_COMMERCE_SUPPORT_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const errors = [];
    if (input.denyByDefault !== true) errors.push('commerce support must deny by default');
    if (input.impersonationAllowed !== false) errors.push('commerce support impersonation must be disabled');
    if (safeString(input.role) !== COMMERCE_SUPPORT_ROLE) errors.push('commerce support role boundary is required');
    const actions = Array.isArray(input.actions) ? input.actions : [];
    COMMERCE_SUPPORT_ACTIONS.forEach(action => {
      if (!actions.includes(action)) errors.push(`missing commerce support action: ${action}`);
      if (!safeString(input.actionCapabilities && input.actionCapabilities[action])) {
        errors.push(`missing commerce support capability: ${action}`);
      }
    });
    if (!Array.isArray(input.forbiddenFields) || input.forbiddenFields.length < FORBIDDEN_SUPPORT_FIELDS.length) {
      errors.push('commerce support forbidden fields are incomplete');
    }
    if (!input.manualAccess || input.manualAccess.requiresExpiration !== true) {
      errors.push('manual access expiration is required by policy');
    }
    return { valid: errors.length === 0, errors };
  }

  function validateCommerceSupportAction(action = {}, options = {}) {
    const input = action && typeof action === 'object' ? action : {};
    const errors = [];
    const actionName = safeString(input.action);
    if (!COMMERCE_SUPPORT_ACTIONS.includes(actionName)) errors.push('unknown commerce support action');
    if (!safeString(input.billingOwnerId)) errors.push('billingOwnerId is required');
    if (!safeString(input.verifiedParentGuardianId)) errors.push('verified parent guardian is required');
    if (safeString(input.billingOwnerId) && safeString(input.verifiedParentGuardianId) && input.billingOwnerId !== input.verifiedParentGuardianId) {
      errors.push('parent ownership verification must match billing owner');
    }
    if (!Array.isArray(input.evidence) || input.evidence.map(safeString).filter(Boolean).length === 0) {
      errors.push('support evidence is required');
    }
    if (!safeString(input.reason)) errors.push('support reason is required');
    validateManualAccess(input, errors);
    validateAbuseFlag(input, errors);
    validateRefundDisputeEscalation(input, errors, options);
    return { valid: errors.length === 0, errors };
  }

  function canPerformCommerceSupportAction(actor = {}, action = {}) {
    const normalizedActor = normalizeActor(actor);
    const actionName = safeString(action.action);
    const errors = validateCommerceSupportAction(action).errors.slice();
    if (normalizedActor.role !== COMMERCE_SUPPORT_ROLE) errors.push('actor must be commerce_support');
    if (!normalizedActor.capabilities.includes(ACTION_CAPABILITIES[actionName])) {
      errors.push('commerce support capability is required');
    }
    return { allowed: errors.length === 0, errors };
  }

  function buildCommerceSupportAuditEvent(actor, action, options = {}) {
    const normalizedAction = action && typeof action === 'object' ? action : {};
    const event = audit.buildAuditEvent(
      actor,
      `commerce_support:${safeString(normalizedAction.action)}`,
      {
        type: COMMERCE_SUPPORT_RESOURCE,
        id: safeString(normalizedAction.billingOwnerId)
      },
      sanitizeCommerceSupportRecord({
        billingOwnerId: normalizedAction.billingOwnerId,
        action: normalizedAction.action,
        evidence: normalizedAction.evidence,
        reason: normalizedAction.reason,
        manualAccess: normalizedAction.manualAccess,
        abuseFlag: normalizedAction.abuseFlag
      }),
      options
    );
    return event;
  }

  function sanitizeCommerceSupportRecord(record) {
    if (Array.isArray(record)) return record.map(item => sanitizeCommerceSupportRecord(item));
    if (!record || typeof record !== 'object') return record;
    return Object.keys(record).reduce((sanitized, key) => {
      sanitized[key] = isForbiddenSupportField(key)
        ? REDACTED
        : sanitizeCommerceSupportRecord(record[key]);
      return sanitized;
    }, {});
  }

  function validateManualAccess(input, errors) {
    if (!['grant_complimentary_access', 'revoke_complimentary_access'].includes(safeString(input.action))) return;
    const manual = input.manualAccess && typeof input.manualAccess === 'object' ? input.manualAccess : {};
    if (!safeString(manual.accessLevel)) errors.push('manual access level is required');
    if (!safeString(manual.expiresAt)) errors.push('manual access expiration is required');
    if (safeString(manual.source) !== 'support_adjustment') errors.push('manual access source must be support_adjustment');
  }

  function validateAbuseFlag(input, errors) {
    if (safeString(input.action) !== 'flag_abuse') return;
    const flag = input.abuseFlag && typeof input.abuseFlag === 'object' ? input.abuseFlag : {};
    if (!['checkout_blocked', 'manual_review_required', 'provider_escalation_pending'].includes(safeString(flag.status))) {
      errors.push('abuse flag cannot directly change entitlements');
    }
    if (!safeString(flag.expiresAt)) errors.push('abuse flag expiration is required');
    if (!safeString(flag.escalationOwner)) errors.push('abuse flag escalation owner is required');
  }

  function validateRefundDisputeEscalation(input, errors, options) {
    if (safeString(input.action) !== 'escalate_refund_or_dispute') return;
    if (!safeString(input.escalationOwner || options.escalationOwner)) errors.push('refund or dispute escalation owner is required');
    if (input.issuesRefund === true || input.changesEntitlement === true) {
      errors.push('support escalation cannot directly issue refunds or change entitlements');
    }
  }

  function normalizeActor(actor) {
    const input = actor && typeof actor === 'object' ? actor : {};
    return {
      id: safeString(input.id || input.actorId || input.userId),
      role: safeString(input.role),
      capabilities: normalizeStringArray(input.capabilities)
    };
  }

  function isForbiddenSupportField(key) {
    const normalized = safeString(key).replace(/[\s_-]/g, '').toLowerCase();
    return FORBIDDEN_SUPPORT_FIELDS
      .map(field => field.replace(/[\s_-]/g, '').toLowerCase())
      .some(field => field === normalized || normalized.includes(field));
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function rootAudit() {
    return globalThis.GrammarQuestAuditLogDomain || {
      buildAuditEvent(actor, action, resource, metadata) {
        return { actor, action, resource, metadata };
      }
    };
  }

  return {
    ACTION_CAPABILITIES,
    COMMERCE_SUPPORT_ACTIONS,
    COMMERCE_SUPPORT_RESOURCE,
    COMMERCE_SUPPORT_ROLE,
    DEFAULT_COMMERCE_SUPPORT_POLICY,
    FORBIDDEN_SUPPORT_FIELDS,
    buildCommerceSupportAuditEvent,
    canPerformCommerceSupportAction,
    sanitizeCommerceSupportRecord,
    validateCommerceSupportAction,
    validateCommerceSupportPolicy
  };
});
