const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  SUBSCRIPTION_ROUTE_CONTRACT,
  evaluateSubscriptionRouteAccess,
  sanitizeSubscriptionRouteProjection,
  validateSubscriptionRouteContract
} = require('../assets/subscription-route-contract');
const routeInventory = require('../scripts/qa/page-inventory');
const { buildSecurityHeaders, validateSecurityHeaderPolicy } = require('../server/security-header-policy');

const repoRoot = path.resolve(__dirname, '..');

function eligibleProfile(overrides = {}) {
  return {
    actorId: 'guardian-1',
    role: 'parent_guardian',
    signedIn: true,
    verifiedEmail: true,
    recoveryStatus: 'verified',
    countryRegion: 'US',
    currency: 'USD',
    notificationPreferences: {
      transactionalBilling: true,
      renewalReminder: true,
      failedPayment: true
    },
    supportVerification: {
      status: 'verified',
      method: 'account_session'
    },
    displayName: 'Guardian Account',
    ...overrides
  };
}

test('subscription route contract is authenticated parent scoped and checkout disabled', () => {
  assert.equal(SUBSCRIPTION_ROUTE_CONTRACT.path, 'subscription.html');
  assert.equal(SUBSCRIPTION_ROUTE_CONTRACT.routeType, 'subscription');
  assert.equal(SUBSCRIPTION_ROUTE_CONTRACT.ownerDomain, 'parent_account_billing');
  assert.equal(SUBSCRIPTION_ROUTE_CONTRACT.requiresAuthenticatedParentGuardian, true);
  assert.equal(SUBSCRIPTION_ROUTE_CONTRACT.parentPreviewReadOnly, true);
  assert.equal(SUBSCRIPTION_ROUTE_CONTRACT.checkoutEnabled, false);
  assert.deepEqual(SUBSCRIPTION_ROUTE_CONTRACT.consumes, [
    'billing_entitlement_projection',
    'redacted_billing_summary'
  ]);
  assert.deepEqual(validateSubscriptionRouteContract(SUBSCRIPTION_ROUTE_CONTRACT).errors, []);
});

test('subscription route access allows eligible guardians and keeps parent preview unpaid', () => {
  const allowed = evaluateSubscriptionRouteAccess({ profile: eligibleProfile() });
  const preview = evaluateSubscriptionRouteAccess({ profile: eligibleProfile({ parentPreview: true }), parentPreview: true });
  const student = evaluateSubscriptionRouteAccess({ profile: eligibleProfile({ role: 'student' }) });
  const unverified = evaluateSubscriptionRouteAccess({ profile: eligibleProfile({ verifiedEmail: false }) });

  assert.equal(allowed.canView, true);
  assert.equal(allowed.canManageBilling, false);
  assert.equal(allowed.reason, 'checkout_not_implemented');
  assert.deepEqual(allowed.blockers, []);

  assert.equal(preview.canView, true);
  assert.equal(preview.readOnly, true);
  assert.equal(preview.canManageBilling, false);
  assert.ok(preview.blockers.includes('parent_preview_cannot_manage_billing'));

  assert.equal(student.canView, false);
  assert.ok(student.blockers.includes('authenticated_parent_guardian_required'));
  assert.equal(unverified.canView, false);
  assert.ok(unverified.blockers.includes('verified_email_required'));
});

test('subscription route projection sanitizer exposes redacted billing and entitlement only', () => {
  const projection = sanitizeSubscriptionRouteProjection({
    entitlementProjection: {
      activePlanId: 'premium_monthly',
      accessState: 'premium',
      accessLevel: 'premium',
      currentPeriodEnd: '2030-06-01T00:00:00.000Z',
      freePracticeAvailable: true,
      learnerId: 'learner-1',
      rawProviderPayload: { nested: true }
    },
    billingSummary: {
      billingAccountId: 'billing-account-1',
      status: 'active',
      providerCustomerId: 'customer-ref',
      paymentCredential: 'browser-collected-value'
    },
    learnerProgress: { sessions: [{ id: 'session-1' }] }
  });

  assert.equal(projection.entitlementProjection.activePlanId, 'premium_monthly');
  assert.equal(projection.entitlementProjection.learnerId, '[REDACTED]');
  assert.equal(projection.entitlementProjection.rawProviderPayload, '[REDACTED]');
  assert.equal(projection.billingSummary.providerCustomerId, '[REDACTED]');
  assert.equal(projection.billingSummary.paymentCredential, '[REDACTED]');
  assert.equal(projection.learnerProgress, '[REDACTED]');
});

test('subscription html is inventory backed shared shell and non-checkout', () => {
  const html = fs.readFileSync(path.join(repoRoot, 'subscription.html'), 'utf8');
  const inventory = routeInventory.buildRouteCompositionInventory({ root: repoRoot });
  const route = inventory.routes.find(item => item.path === 'subscription.html');

  assert.ok(route, 'subscription.html should be in route inventory');
  assert.equal(route.type, 'subscription');
  assert.equal(route.usesSharedShell, true);
  assert.ok(route.requiredShellAssets.includes('assets/styles.css'));
  assert.ok(route.requiredScripts.includes('assets/subscription-route.js'));
  assert.match(html, /data-route="subscription"/);
  assert.match(html, /data-billing-surface="parent-account"/);
  assert.match(html, /id="subscription-entitlement"/);
  assert.match(html, /Parent preview is read-only/i);
  assert.match(html, /Checkout is not available yet/i);
  assert.doesNotMatch(html, /providerCustomerId|paymentCredential|rawProviderPayload|learnerId/);
});

test('subscription route keeps payment permission disabled until checkout contracts land', () => {
  const headers = buildSecurityHeaders({ routeClass: 'subscription' });

  assert.ok(headers['Permissions-Policy'].includes('payment=()'));
  assert.doesNotThrow(() => validateSecurityHeaderPolicy(headers, { routeClass: 'subscription' }));
});

test('subscription route accessibility visual and package wiring are present', () => {
  const a11ySmoke = fs.readFileSync(path.join(repoRoot, 'tests', 'accessibility-smoke.spec.js'), 'utf8');
  const a11yEngine = fs.readFileSync(path.join(repoRoot, 'tests', 'accessibility-engine.spec.js'), 'utf8');
  const visualMatrix = fs.readFileSync(path.join(repoRoot, 'assets', 'visual-state-matrix.js'), 'utf8');
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'subscription-route.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(a11ySmoke, /subscription\.html/);
  assert.match(a11yEngine, /Subscription/);
  assert.match(visualMatrix, /subscription-route/);
  assert.match(docs, /authenticated parent/i);
  assert.match(docs, /parent preview is read-only/i);
  assert.match(pkg.scripts['test:unit'], /tests\/subscription-route-contract\.test\.js/);
});
