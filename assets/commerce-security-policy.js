(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestCommerceSecurityPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_COMMERCE_SECURITY_CHECKS = Object.freeze([
    'route_class',
    'payment_credential_handling',
    'provider_hosted_flow',
    'webhook_entitlement_source',
    'route_scoped_payment_permission',
    'third_party_script_audit',
    'error_redaction',
    'launch_evidence'
  ]);

  const CHECKOUT_ROUTE_CLASSES = new Set(['checkout', 'payment']);
  const FORBIDDEN_PAYMENT_CREDENTIAL_FIELDS = Object.freeze([
    'cardNumber',
    'card_number',
    'pan',
    'primaryAccountNumber',
    'expirationMonth',
    'expirationYear',
    'expiry',
    'cvv',
    'cvc',
    'securityCode',
    'walletCredential',
    'walletToken',
    'paypalCredential',
    'venmoCredential',
    'paymentCredential',
    'paymentMethodToken',
    'providerCustomerId',
    'providerPaymentMethodId',
    'rawProviderPayload',
    'rawCard'
  ]);

  const DEFAULT_COMMERCE_SECURITY_POLICY = Object.freeze({
    pciScopeTarget: 'provider_hosted_or_provider_elements',
    claimsCertification: false,
    requiredChecks: REQUIRED_COMMERCE_SECURITY_CHECKS,
    checkoutRouteClasses: Object.freeze(Array.from(CHECKOUT_ROUTE_CLASSES)),
    defaultPaymentPermission: 'denied',
    checkoutPaymentPermission: 'route_scoped',
    credentialHandling: 'provider_only',
    checkoutFlow: 'provider_hosted_or_elements',
    entitlementSource: 'signed_webhook_only',
    permittedScriptOrigins: Object.freeze(['self', 'provider_hosted_payment_origin']),
    forbiddenPaymentCredentialFields: FORBIDDEN_PAYMENT_CREDENTIAL_FIELDS,
    errorRedaction: 'no_provider_payload_or_payment_credentials',
    launchEvidence: Object.freeze([
      'docs/security/commerce-security-policy.md',
      'docs/commerce-readiness-launch-gate.md',
      'docs/compliance-release-checklist.md'
    ])
  });

  function validateCommerceSecurityPolicy(policy = DEFAULT_COMMERCE_SECURITY_POLICY) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const errors = [];
    const checks = Array.isArray(input.requiredChecks) ? input.requiredChecks : [];

    REQUIRED_COMMERCE_SECURITY_CHECKS.forEach(check => {
      if (!checks.includes(check)) errors.push(`missing commerce security check: ${check}`);
    });
    if (input.pciScopeTarget !== 'provider_hosted_or_provider_elements') {
      errors.push('pci scope target must use hosted provider pages or provider elements');
    }
    if (input.claimsCertification !== false) errors.push('policy must not claim PCI certification');
    if (input.credentialHandling !== 'provider_only') errors.push('credential handling must be provider_only');
    if (input.checkoutFlow !== 'provider_hosted_or_elements') errors.push('checkout flow must be provider hosted or elements');
    if (input.entitlementSource !== 'signed_webhook_only') errors.push('entitlement source must be signed_webhook_only');
    if (input.defaultPaymentPermission !== 'denied') errors.push('default payment permission must be denied');
    if (input.checkoutPaymentPermission !== 'route_scoped') errors.push('checkout payment permission must be route_scoped');
    if (!Array.isArray(input.launchEvidence) || input.launchEvidence.length < 2) errors.push('launch evidence is required');
    if (input.forbiddenPaymentCredentialFields) {
      const forbiddenResult = validatePaymentCredentialFields(input.forbiddenPaymentCredentialFields);
      if (forbiddenResult.errors.length !== input.forbiddenPaymentCredentialFields.length) {
        errors.push('forbidden payment credential catalog must enumerate dangerous fields');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  function validateCommerceRouteSecurity(route = {}) {
    const input = route && typeof route === 'object' ? route : {};
    const routeClass = safeString(input.routeClass);
    const errors = [];

    if (!safeString(input.routeId)) errors.push('routeId is required');
    if (!routeClass) errors.push('routeClass is required');
    if (isCheckoutRoute(routeClass)) {
      if (input.paymentPermission !== 'route_scoped') errors.push('checkout routes require route_scoped payment permission');
      if (input.credentialHandling !== 'provider_only') errors.push('checkout credential handling must be provider_only');
      if (input.checkoutFlow !== 'provider_hosted_or_elements') errors.push('checkout flow must be provider hosted or elements');
      if (input.entitlementSource !== 'signed_webhook_only') errors.push('checkout entitlement source must be signed_webhook_only');
      if (input.errorRedaction !== 'no_provider_payload_or_payment_credentials') {
        errors.push('checkout error redaction must hide provider payloads and payment credentials');
      }
      validateThirdPartyScriptAudit(input.thirdPartyScriptAudit).forEach(error => errors.push(error));
      normalizeStringArray(input.launchEvidence).forEach(link => {
        if (!/^docs\//.test(link)) errors.push(`launch evidence must be a docs path: ${link}`);
      });
      if (normalizeStringArray(input.launchEvidence).length < 2) errors.push('checkout launch evidence requires at least two links');
    } else if (input.paymentPermission && input.paymentPermission !== 'denied') {
      errors.push('payment permission must stay denied outside checkout routes');
    }

    const scriptOrigins = normalizeStringArray(input.permittedScriptOrigins);
    if (!isCheckoutRoute(routeClass) && scriptOrigins.some(origin => origin !== 'self')) {
      errors.push('third-party scripts must be isolated to audited checkout routes');
    }

    return { valid: errors.length === 0, errors };
  }

  function validatePaymentCredentialFields(fields = []) {
    const normalized = normalizeStringArray(fields);
    const forbidden = new Set(FORBIDDEN_PAYMENT_CREDENTIAL_FIELDS.map(normalizeFieldName));
    const errors = normalized
      .filter(field => forbidden.has(normalizeFieldName(field)))
      .map(field => `forbidden payment credential field: ${field}`);
    return { valid: errors.length === 0, errors };
  }

  function validateThirdPartyScriptAudit(audit = {}) {
    const input = audit && typeof audit === 'object' ? audit : {};
    const errors = [];
    if (!safeString(input.owner)) errors.push('third-party script audit owner is required');
    if (!safeString(input.reviewCadence)) errors.push('third-party script audit cadence is required');
    if (!Array.isArray(input.evidenceLinks) || input.evidenceLinks.length === 0) {
      errors.push('third-party script audit evidence is required');
    }
    return errors;
  }

  function isCheckoutRoute(routeClass) {
    return CHECKOUT_ROUTE_CLASSES.has(safeString(routeClass));
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function normalizeFieldName(value) {
    return safeString(value).replace(/[\s_-]/g, '').toLowerCase();
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_COMMERCE_SECURITY_POLICY,
    FORBIDDEN_PAYMENT_CREDENTIAL_FIELDS,
    REQUIRED_COMMERCE_SECURITY_CHECKS,
    validateCommerceRouteSecurity,
    validateCommerceSecurityPolicy,
    validatePaymentCredentialFields
  };
});
