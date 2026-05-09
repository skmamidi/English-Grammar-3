function buildSecurityHeaders(options = {}) {
  const cspHeader = options.cspMode === 'enforce'
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only';
  const paymentRoute = isPaymentRoute(options.routeClass);
  const paymentPermission = paymentRoute ? 'payment=(self)' : 'payment=()';
  const connectSrc = paymentRoute ? "connect-src 'self' https://api.stripe.com" : "connect-src 'self'";
  const scriptSrc = paymentRoute ? "script-src 'self' 'unsafe-inline' https://js.stripe.com" : "script-src 'self' 'unsafe-inline'";
  const frameSrc = paymentRoute ? "frame-src https://js.stripe.com https://checkout.stripe.com" : "frame-src 'none'";
  const headers = {
    [cspHeader]: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      connectSrc,
      scriptSrc,
      frameSrc,
      "style-src 'self' 'unsafe-inline'"
    ].join('; '),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'Permissions-Policy': `camera=(), microphone=(), geolocation=(), ${paymentPermission}`,
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin'
  };
  return headers;
}

function validateSecurityHeaderPolicy(headers = {}, options = {}) {
  [
    'Referrer-Policy',
    'X-Content-Type-Options',
    'Permissions-Policy',
    'Cross-Origin-Opener-Policy'
  ].forEach(name => {
    if (!headers[name]) throw new Error(`missing_security_header:${name}`);
  });
  if (!headers['Content-Security-Policy'] && !headers['Content-Security-Policy-Report-Only']) {
    throw new Error('missing_security_header:Content-Security-Policy');
  }
  const csp = headers['Content-Security-Policy'] || headers['Content-Security-Policy-Report-Only'];
  if (!/default-src 'self'/.test(csp) || !/frame-ancestors 'none'/.test(csp)) {
    throw new Error('weak_content_security_policy');
  }
  if (isPaymentRoute(options.routeClass)) {
    if (!/script-src[^;]+https:\/\/js\.stripe\.com/.test(csp)) throw new Error('missing_checkout_provider_script_policy');
    if (!/frame-src[^;]+https:\/\/checkout\.stripe\.com/.test(csp)) throw new Error('missing_checkout_provider_frame_policy');
    if (!/connect-src[^;]+https:\/\/api\.stripe\.com/.test(csp)) throw new Error('missing_checkout_provider_connect_policy');
  } else if (/https:\/\/(?:api|js)\.stripe\.com|https:\/\/checkout\.stripe\.com/.test(csp)) {
    throw new Error('checkout_provider_csp_not_route_scoped');
  }
  if (String(options.routeClass || '').trim() === 'sso' && /https:\/\/accounts\.google\.com|https:\/\/login\.microsoftonline\.com|saml|openid/i.test(csp)) {
    throw new Error('sso_provider_csp_not_route_scoped');
  }
  if (headers['X-Content-Type-Options'] !== 'nosniff') throw new Error('weak_content_type_options');
  const permissions = String(headers['Permissions-Policy'] || '');
  if (isPaymentRoute(options.routeClass)) {
    if (!/payment=\(self\)/.test(permissions)) throw new Error('missing_checkout_payment_permission');
  } else if (!/payment=\(\)/.test(permissions)) {
    throw new Error('payment_permission_not_route_scoped');
  }
  return true;
}

function isPaymentRoute(routeClass) {
  return ['checkout', 'payment'].includes(String(routeClass || '').trim());
}

module.exports = {
  buildSecurityHeaders,
  isPaymentRoute,
  validateSecurityHeaderPolicy
};
