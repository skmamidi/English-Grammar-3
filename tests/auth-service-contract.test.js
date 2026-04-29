const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  SESSION_SIGNED_OUT_EVENT,
  buildSignedOutState
} = require('../assets/session-domain');

const authSource = fs.readFileSync(path.join(__dirname, '..', 'assets', 'auth-service.js'), 'utf8');

test('auth service exposes a privacy-safe signed-out event contract', () => {
  assert.match(authSource, new RegExp(SESSION_SIGNED_OUT_EVENT));
  assert.match(authSource, /dispatchSessionSignedOut/);
  assert.match(authSource, /data-auth-signout>Sign out<\/button>/);
  assert.doesNotMatch(authSource, /detail:\s*\{[^}]*uid/s);
  assert.doesNotMatch(authSource, /detail:\s*\{[^}]*email/s);
});

test('auth sign-out contract clears stale admin role and capabilities', () => {
  const signedOut = buildSignedOutState({
    signedIn: true,
    role: 'system-admin',
    capabilities: ['manageUsers', 'manageSystemSettings'],
    activeStudent: { id: 'student-1' },
    sessionMode: 'parent'
  });

  assert.equal(signedOut.signedIn, false);
  assert.equal(signedOut.role, '');
  assert.deepEqual(signedOut.capabilities, []);
  assert.equal(signedOut.activeStudent, null);
});
