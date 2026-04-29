const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildSignedOutState,
  isSessionExpired,
  normalizeSessionState,
  shouldClearActiveStudentOnSignOut
} = require('../assets/session-domain');

test('session domain normalizes authenticated role and capability state', () => {
  const session = normalizeSessionState({
    signedIn: true,
    user: { uid: 'guardian-1', email: 'grownup@example.test' },
    role: 'guardian',
    capabilities: ['viewLinkedLearnerReports', 'manageUsers'],
    activeStudent: { id: 'student-1', name: 'Maya' },
    sessionMode: 'parent',
    expiresAt: '2030-04-29T12:00:00.000Z'
  });

  assert.equal(session.signedIn, true);
  assert.equal(session.role, 'guardian');
  assert.deepEqual(session.capabilities, ['viewLinkedLearnerReports', 'manageUsers']);
  assert.equal(session.activeStudent.id, 'student-1');
  assert.equal(session.expiresAt, '2030-04-29T12:00:00.000Z');
});

test('session expiration treats missing or past authenticated expiry as signed out', () => {
  assert.equal(isSessionExpired({
    signedIn: true,
    expiresAt: '2030-04-29T11:59:59.000Z'
  }, '2030-04-29T12:00:00.000Z'), true);
  assert.equal(isSessionExpired({
    signedIn: true,
    expiresAt: '2030-04-29T12:00:01.000Z'
  }, '2030-04-29T12:00:00.000Z'), false);
  assert.equal(isSessionExpired({ signedIn: false }, '2030-04-29T12:00:00.000Z'), false);
});

test('signed-out state clears authenticated identity, role, capabilities, and managed student selection', () => {
  const signedOut = buildSignedOutState({
    signedIn: true,
    user: { uid: 'admin-1' },
    role: 'system-admin',
    capabilities: ['manageUsers', 'viewAuditLogs'],
    activeStudent: { id: 'student-1' },
    sessionMode: 'parent',
    syncStatus: 'synced'
  });

  assert.equal(signedOut.signedIn, false);
  assert.equal(signedOut.user, null);
  assert.equal(signedOut.role, '');
  assert.deepEqual(signedOut.capabilities, []);
  assert.equal(signedOut.activeStudent, null);
  assert.equal(signedOut.sessionMode, '');
  assert.equal(signedOut.syncStatus, 'local');
});

test('local parent preview remains distinct from authenticated guardian sign-out', () => {
  const previewState = {
    signedIn: false,
    parentPreview: true,
    sessionMode: 'parent-preview',
    activeStudent: { id: 'preview-student' }
  };

  assert.equal(shouldClearActiveStudentOnSignOut(previewState), false);
  assert.equal(buildSignedOutState(previewState).activeStudent.id, 'preview-student');
});
