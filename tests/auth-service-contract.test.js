const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  SESSION_SIGNED_OUT_EVENT,
  buildSignedOutState
} = require('../assets/session-domain');
const {
  normalizeLeaderboardProfile
} = require('../assets/leaderboard-opt-in-policy');

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

test('auth service exposes telemetry opt-out contract without learner context', () => {
  assert.match(authSource, /telemetryConsent/);
  assert.match(authSource, /setTelemetryOptOut/);
  assert.doesNotMatch(authSource, /telemetryConsent:\s*\{[^}]*activeStudent/s);
});

test('auth profile helpers keep leaderboard participation disabled by default', () => {
  const profile = normalizeLeaderboardProfile({
    leaderboardAlias: 'student@example.test',
    email: 'student@example.test'
  });

  assert.equal(profile.leaderboardOptIn, false);
  assert.equal(profile.leaderboardAlias, '');
  assert.equal(JSON.stringify(profile).includes('student@example.test'), false);
});
