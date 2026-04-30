function buildSecurityHeaders(options = {}) {
  const cspHeader = options.cspMode === 'enforce'
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only';
  const headers = {
    [cspHeader]: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'"
    ].join('; '),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin'
  };
  return headers;
}

function validateSecurityHeaderPolicy(headers = {}) {
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
  if (headers['X-Content-Type-Options'] !== 'nosniff') throw new Error('weak_content_type_options');
  return true;
}

module.exports = {
  buildSecurityHeaders,
  validateSecurityHeaderPolicy
};
