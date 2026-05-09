(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestCrossPlatformCommercePolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REDACTED = '[REDACTED]';
  const CROSS_PLATFORM_PURCHASE_CHANNELS = Object.freeze([
    'web_checkout',
    'ios_iap',
    'ios_external_link',
    'support_adjustment',
    'app_store_refund',
    'provider_outage_grace'
  ]);
  const APP_STORE_COMMERCE_DECISION_QUESTIONS = Object.freeze([
    'iap_required_for_digital_access',
    'web_purchase_access_in_native',
    'external_billing_link_allowed',
    'receipt_validation_boundary',
    'refund_source_of_truth',
    'cancellation_owner',
    'account_linking_allowed',
    'entitlement_parity_evidence'
  ]);
  const DEFAULT_CROSS_PLATFORM_COMMERCE_POLICY = Object.freeze({
    schemaVersion: 1,
    entitlementSourceOfTruth: 'app_owned_entitlement_projection',
    entitlementMutationBoundary: 'server_verified_ledger_or_receipt',
    learnerProgressIndependent: true,
    rawReceiptsForbiddenInClients: true,
    supportVisibility: 'billing_summary_only',
    purchaseChannels: Object.freeze({
      web_checkout: channel('web', 'web_provider_receipt_ref', 'server_webhook_only', 'verified_billing_ledger', 'ready_for_web_billing_contracts'),
      ios_iap: channel('ios_ipados', 'app_store_receipt_ref', 'server_only', 'server_verified_receipt_ledger', 'ready_for_server_receipt_validation'),
      ios_external_link: channel('ios_ipados', 'external_billing_eligibility_ref', 'server_policy_review_only', 'server_verified_ledger_or_receipt', 'deferred_until_policy_review'),
      support_adjustment: channel('server', 'support_case_ref', 'server_only', 'server_only', 'requires_expiring_audit_evidence'),
      app_store_refund: channel('ios_ipados', 'app_store_refund_ref', 'server_only', 'server_verified_receipt_ledger', 'ready_for_server_receipt_validation'),
      provider_outage_grace: channel('server', 'billing_operations_ref', 'server_only', 'server_only', 'ready_for_operations_contracts')
    })
  });

  const learnerIdentityPattern = /^(learnerId|studentId|studentName|learnerEmail|learnerProgress|questionText|questionPrompt|answer|learnerAnswer)$/i;
  const sensitivePattern = /^(rawReceipt|receiptPayload|rawProviderPayload|providerPayload|providerCustomerId|providerPaymentMethodId|paymentCredential|walletCredential|cardNumber|cvv|cvc|authToken|token|secret|privateKey|webhookPayload)$/i;
  const clientMutationValues = new Set(['client_side', 'native_client', 'browser_redirect', 'local_storage']);
  const serverMutationValues = new Set([
    '',
    'server_only',
    'verified_billing_ledger',
    'server_verified_receipt_ledger',
    'server_verified_ledger_or_receipt'
  ]);

  function channel(platform, receiptSource, receiptValidation, entitlementMutation, decisionStatus) {
    return Object.freeze({
      platform,
      receiptSource,
      receiptValidation,
      entitlementMutation,
      decisionStatus,
      supportVisibility: 'billing_summary_only'
    });
  }

  function validateCrossPlatformCommercePolicy(policy = DEFAULT_CROSS_PLATFORM_COMMERCE_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const errors = [];
    const purchaseChannels = input.purchaseChannels && typeof input.purchaseChannels === 'object' ? input.purchaseChannels : {};

    if (input.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    if (input.entitlementSourceOfTruth !== 'app_owned_entitlement_projection') errors.push('entitlement source must be app owned');
    if (input.entitlementMutationBoundary !== 'server_verified_ledger_or_receipt') errors.push('entitlement mutation boundary must be server verified');
    if (input.learnerProgressIndependent !== true) errors.push('learner progress must stay independent from commerce');
    if (input.rawReceiptsForbiddenInClients !== true) errors.push('raw receipts must be forbidden in clients');
    if (input.supportVisibility !== 'billing_summary_only') errors.push('support visibility must be billing_summary_only');
    CROSS_PLATFORM_PURCHASE_CHANNELS.forEach(id => {
      if (!purchaseChannels[id]) {
        errors.push(`purchase channel missing:${id}`);
        return;
      }
      const item = purchaseChannels[id];
      if (!safeString(item.platform)) errors.push(`${id} platform is required`);
      if (!safeString(item.receiptSource)) errors.push(`${id} receipt source is required`);
      if (!safeString(item.receiptValidation).startsWith('server')) errors.push(`${id} receipt validation must be server owned`);
      if (clientMutationValues.has(safeString(item.entitlementMutation))) errors.push(`${id} cannot mutate entitlement from a client`);
      if (safeString(item.supportVisibility) !== 'billing_summary_only') errors.push(`${id} support visibility must be billing_summary_only`);
    });

    return { valid: errors.length === 0, errors, policy: normalizePolicy(input) };
  }

  function buildPurchaseChannelDecisionMatrix(policy = DEFAULT_CROSS_PLATFORM_COMMERCE_POLICY) {
    const normalized = validateCrossPlatformCommercePolicy(policy).policy;
    return {
      schemaVersion: 1,
      entitlementSourceOfTruth: normalized.entitlementSourceOfTruth,
      decisionQuestions: APP_STORE_COMMERCE_DECISION_QUESTIONS.slice(),
      channels: Object.keys(normalized.purchaseChannels).sort().reduce((channels, id) => {
        channels[id] = normalized.purchaseChannels[id];
        return channels;
      }, {})
    };
  }

  function buildCrossPlatformEntitlementView(input = {}) {
    const projection = input.entitlementProjection && typeof input.entitlementProjection === 'object' ? input.entitlementProjection : {};
    const accountLinking = input.accountLinking && typeof input.accountLinking === 'object' ? input.accountLinking : {};
    return {
      schemaVersion: 1,
      platform: normalizePlatform(input.platform),
      purchaseChannel: normalizePurchaseChannel(input.purchaseChannel),
      receiptSource: normalizeReceiptSource(input.receiptSource),
      accountLinkingState: safeString(accountLinking.linkingState || input.accountLinkingState || 'unknown'),
      parentAccountRef: safeString(accountLinking.parentAccountRef || input.parentAccountRef),
      entitlement: {
        activePlanId: safeString(projection.activePlanId || 'free_practice'),
        accessLevel: safeString(projection.accessLevel || 'free'),
        accessState: safeString(projection.accessState || 'free'),
        featureEntitlements: normalizeStringArray(projection.featureEntitlements),
        freePracticeAvailable: projection.freePracticeAvailable !== false,
        evaluatedAt: safeIso(projection.evaluatedAt)
      },
      supportVisibility: 'billing_summary_only'
    };
  }

  function buildCrossPlatformAccountLinkingPlan(input = {}) {
    return {
      schemaVersion: 1,
      platform: normalizePlatform(input.platform),
      purchaseChannel: normalizePurchaseChannel(input.purchaseChannel),
      receiptSource: normalizeReceiptSource(input.receiptSource),
      accountLinkingState: safeString(input.accountLinkingState || 'linked'),
      parentAccountRef: safeString(input.parentAccountRef),
      learnerAccountRef: safeString(input.learnerAccountRef),
      billingOwnerBoundary: 'parent_guardian_account',
      learnerProgressBoundary: 'ref_only_learning_state',
      entitlementMutation: 'server_only',
      supportVisibility: 'billing_summary_only'
    };
  }

  function buildCrossPlatformSupportCase(input = {}) {
    return {
      billingOwnerId: safeString(input.billingOwnerId),
      platform: normalizePlatform(input.platform),
      purchaseChannel: normalizePurchaseChannel(input.purchaseChannel),
      receiptSource: normalizeReceiptSource(input.receiptSource),
      issueType: safeString(input.issueType),
      status: safeString(input.status),
      visibility: 'billing_summary_only',
      entitlementMutation: 'server_only'
    };
  }

  function validateCrossPlatformCommerceRecord(record = {}) {
    const input = record && typeof record === 'object' ? record : {};
    const errors = [];
    if (safeString(input.purchaseChannel) && !CROSS_PLATFORM_PURCHASE_CHANNELS.includes(safeString(input.purchaseChannel))) {
      errors.push('purchase channel is invalid');
    }
    if (safeString(input.receiptSource) === 'raw_receipt') {
      errors.push('raw receipts must not appear in client projections');
    }
    if (clientMutationValues.has(safeString(input.entitlementMutation))) {
      errors.push('entitlement mutation must be server owned');
    }
    if (!serverMutationValues.has(safeString(input.entitlementMutation))) {
      errors.push('entitlement mutation must be server owned');
    }
    if (containsKey(input, learnerIdentityPattern)) {
      errors.push('commerce projection must not include learner identity');
    }
    if (containsKey(input, sensitivePattern)) {
      errors.push('commerce projection must not include provider payloads credentials tokens or secrets');
    }
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function assertCrossPlatformCommercePrivacy(record) {
    const result = validateCrossPlatformCommerceRecord(record);
    if (result.errors.length) throw new Error(`unsafe_cross_platform_commerce:${result.errors.join(',')}`);
    return true;
  }

  function sanitizeCrossPlatformCommerceRecord(value) {
    if (Array.isArray(value)) return value.map(item => sanitizeCrossPlatformCommerceRecord(item));
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((sanitized, key) => {
      sanitized[key] = isSensitiveKey(key) ? REDACTED : sanitizeCrossPlatformCommerceRecord(value[key]);
      return sanitized;
    }, {});
  }

  function normalizePolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const purchaseChannels = input.purchaseChannels && typeof input.purchaseChannels === 'object'
      ? input.purchaseChannels
      : {};
    return {
      schemaVersion: 1,
      entitlementSourceOfTruth: safeString(input.entitlementSourceOfTruth),
      entitlementMutationBoundary: safeString(input.entitlementMutationBoundary),
      learnerProgressIndependent: input.learnerProgressIndependent === true,
      rawReceiptsForbiddenInClients: input.rawReceiptsForbiddenInClients === true,
      supportVisibility: safeString(input.supportVisibility),
      purchaseChannels: CROSS_PLATFORM_PURCHASE_CHANNELS.reduce((channels, id) => {
        channels[id] = {
          platform: safeString(purchaseChannels[id] && purchaseChannels[id].platform),
          receiptSource: safeString(purchaseChannels[id] && purchaseChannels[id].receiptSource),
          receiptValidation: safeString(purchaseChannels[id] && purchaseChannels[id].receiptValidation),
          entitlementMutation: safeString(purchaseChannels[id] && purchaseChannels[id].entitlementMutation),
          decisionStatus: safeString(purchaseChannels[id] && purchaseChannels[id].decisionStatus),
          supportVisibility: safeString(purchaseChannels[id] && purchaseChannels[id].supportVisibility)
        };
        return channels;
      }, {})
    };
  }

  function normalizePlatform(value) {
    const text = safeString(value).toLowerCase();
    if (text === 'ios' || text === 'ipados' || text === 'native') return 'ios_ipados';
    if (text === 'server') return 'server';
    return text || 'web';
  }

  function normalizePurchaseChannel(value) {
    const text = safeString(value);
    return CROSS_PLATFORM_PURCHASE_CHANNELS.includes(text) ? text : 'web_checkout';
  }

  function normalizeReceiptSource(value) {
    return safeString(value || 'web_provider_receipt_ref');
  }

  function isSensitiveKey(key) {
    return learnerIdentityPattern.test(key) || sensitivePattern.test(key);
  }

  function containsKey(value, pattern) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => pattern.test(key) || containsKey(value[key], pattern));
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    APP_STORE_COMMERCE_DECISION_QUESTIONS,
    CROSS_PLATFORM_PURCHASE_CHANNELS,
    DEFAULT_CROSS_PLATFORM_COMMERCE_POLICY,
    assertCrossPlatformCommercePrivacy,
    buildCrossPlatformAccountLinkingPlan,
    buildCrossPlatformEntitlementView,
    buildCrossPlatformSupportCase,
    buildPurchaseChannelDecisionMatrix,
    sanitizeCrossPlatformCommerceRecord,
    validateCrossPlatformCommercePolicy,
    validateCrossPlatformCommerceRecord
  };
});
