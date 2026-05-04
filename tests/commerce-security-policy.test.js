const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_COMMERCE_SECURITY_POLICY,
  REQUIRED_COMMERCE_SECURITY_CHECKS,
  validateCommerceRouteSecurity,
  validateCommerceSecurityPolicy,
  validatePaymentCredentialFields
} = require('../assets/commerce-security-policy');
const {
  buildSecurityHeaders,
  validateSecurityHeaderPolicy
} = require('../server/security-header-policy');

const repoRoot = path.resolve(__dirname, '..');

test('commerce security policy defines route-scoped PCI readiness checks', () => {
  assert.deepEqual(REQUIRED_COMMERCE_SECURITY_CHECKS, [
    'route_class',
    'payment_credential_handling',
    'provider_hosted_flow',
    'webhook_entitlement_source',
    'route_scoped_payment_permission',
    'third_party_script_audit',
    'error_redaction',
    'launch_evidence'
  ]);

  const result = validateCommerceSecurityPolicy(DEFAULT_COMMERCE_SECURITY_POLICY);

  assert.deepEqual(result.errors, []);
  assert.equal(DEFAULT_COMMERCE_SECURITY_POLICY.pciScopeTarget, 'provider_hosted_or_provider_elements');
  assert.equal(DEFAULT_COMMERCE_SECURITY_POLICY.claimsCertification, false);
});

test('app-owned payment forms reject raw card CVV wallet and provider credential fields', () => {
  assert.deepEqual(validatePaymentCredentialFields([
    'billingName',
    'billingPostalCode',
    'providerElementMountId',
    'consentAcceptedAt'
  ]).errors, []);

  const result = validatePaymentCredentialFields([
    'cardNumber',
    'cvv',
    'walletCredential',
    'providerCustomerId',
    'rawProviderPayload'
  ]);

  assert.ok(result.errors.includes('forbidden payment credential field: cardNumber'));
  assert.ok(result.errors.includes('forbidden payment credential field: cvv'));
  assert.ok(result.errors.includes('forbidden payment credential field: walletCredential'));
  assert.ok(result.errors.includes('forbidden payment credential field: providerCustomerId'));
  assert.ok(result.errors.includes('forbidden payment credential field: rawProviderPayload'));
});

test('checkout route policies scope payment permission scripts and entitlement source', () => {
  const checkoutRoute = {
    routeId: 'billing_checkout',
    routeClass: 'checkout',
    paymentPermission: 'route_scoped',
    permittedScriptOrigins: ['self', 'provider_hosted_payment_origin'],
    thirdPartyScriptAudit: {
      owner: 'security_owner',
      reviewCadence: 'before each billing release',
      evidenceLinks: ['docs/security/commerce-security-policy.md']
    },
    credentialHandling: 'provider_only',
    checkoutFlow: 'provider_hosted_or_elements',
    entitlementSource: 'signed_webhook_only',
    errorRedaction: 'no_provider_payload_or_payment_credentials',
    launchEvidence: [
      'docs/security/commerce-security-policy.md',
      'docs/commerce-readiness-launch-gate.md'
    ]
  };

  assert.deepEqual(validateCommerceRouteSecurity(checkoutRoute).errors, []);

  const marketingRoute = {
    ...checkoutRoute,
    routeId: 'billing_marketing',
    routeClass: 'marketing',
    paymentPermission: 'route_scoped'
  };

  assert.ok(validateCommerceRouteSecurity(marketingRoute).errors.includes('payment permission must stay denied outside checkout routes'));
});

test('security headers deny payment by default and only allow payment on dedicated checkout routes', () => {
  const defaultHeaders = buildSecurityHeaders({ cspMode: 'report-only' });

  assert.match(defaultHeaders['Permissions-Policy'], /payment=\(\)/);
  assert.doesNotThrow(() => validateSecurityHeaderPolicy(defaultHeaders));

  const checkoutHeaders = buildSecurityHeaders({ routeClass: 'checkout' });
  assert.match(checkoutHeaders['Permissions-Policy'], /payment=\(self\)/);
  assert.doesNotThrow(() => validateSecurityHeaderPolicy(checkoutHeaders, { routeClass: 'checkout' }));

  assert.throws(
    () => validateSecurityHeaderPolicy({ ...defaultHeaders, 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)' }, { routeClass: 'marketing' }),
    /payment_permission_not_route_scoped/
  );
});

test('commerce security docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'security', 'commerce-security-policy.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'compliance-release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'provider-hosted',
    'provider elements',
    'lowest feasible PCI scope',
    'no certification claim',
    'payment=()',
    'payment=(self)',
    'third-party script audit',
    'signed webhook',
    'error redaction'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(checklist, /commerce-security-policy\.md/);
  assert.match(checklist, /commerce-security-policy\.test\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/commerce-security-policy\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
