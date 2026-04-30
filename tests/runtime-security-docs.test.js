const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const docPath = path.join(__dirname, '..', 'docs', 'security', 'runtime-security-headers.md');

test('runtime security header docs cover headers, hosts, guards, and structured errors', () => {
  const source = fs.readFileSync(docPath, 'utf8');

  [
    'Content-Security-Policy',
    'Referrer-Policy',
    'X-Content-Type-Options',
    'Permissions-Policy',
    'Firebase Hosting',
    'GitHub Pages',
    'api-request-guard.js',
    'api-error-contract.js',
    'unauthorized_origin',
    'payload_too_large',
    'rate_limited'
  ].forEach(term => assert.ok(source.includes(term), `expected ${term}`));
  assert.doesNotMatch(source, /BEGIN (EC |RSA |)PRIVATE KEY/);
});
