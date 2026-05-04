const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildSecurityHeaders,
  validateSecurityHeaderPolicy
} = require('../server/security-header-policy');

test('security header policy exposes CSP and browser hardening headers', () => {
  const headers = buildSecurityHeaders({ cspMode: 'report-only' });

  assert.ok(headers['Content-Security-Policy-Report-Only'].includes("default-src 'self'"));
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.ok(headers['Permissions-Policy'].includes('geolocation=()'));
  assert.ok(headers['Permissions-Policy'].includes('payment=()'));
  assert.equal(headers['Cross-Origin-Opener-Policy'], 'same-origin');
  assert.doesNotThrow(() => validateSecurityHeaderPolicy(headers));
});

test('payment permission is scoped to checkout route classes', () => {
  const marketingHeaders = buildSecurityHeaders({ routeClass: 'marketing' });
  const checkoutHeaders = buildSecurityHeaders({ routeClass: 'checkout' });

  assert.ok(marketingHeaders['Permissions-Policy'].includes('payment=()'));
  assert.ok(checkoutHeaders['Permissions-Policy'].includes('payment=(self)'));
  assert.doesNotThrow(() => validateSecurityHeaderPolicy(checkoutHeaders, { routeClass: 'checkout' }));
  assert.throws(
    () => validateSecurityHeaderPolicy({
      ...marketingHeaders,
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)'
    }, { routeClass: 'marketing' }),
    /payment_permission_not_route_scoped/
  );
});

test('security header policy rejects weakened required headers', () => {
  const headers = buildSecurityHeaders();
  delete headers['X-Content-Type-Options'];

  assert.throws(() => validateSecurityHeaderPolicy(headers), /missing_security_header:X-Content-Type-Options/);
});
