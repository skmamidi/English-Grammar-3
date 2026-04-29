(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSessionDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const SESSION_SIGNED_OUT_EVENT = 'grammarquest:session-signed-out';

  function normalizeSessionState(input) {
    const state = input && typeof input === 'object' ? input : {};
    const signedIn = Boolean(state.signedIn || state.user);
    const parentPreview = Boolean(state.parentPreview || state.parentMode && !signedIn);
    return {
      signedIn,
      user: signedIn && state.user ? state.user : null,
      profile: signedIn && state.profile ? state.profile : null,
      role: signedIn ? String(state.role || state.profile && state.profile.role || '').trim() : '',
      capabilities: signedIn && Array.isArray(state.capabilities) ? state.capabilities.slice() : [],
      activeStudent: normalizeActiveStudent(state.activeStudent),
      sessionMode: String(state.sessionMode || '').trim(),
      parentPreview,
      studentMode: Boolean(state.studentMode),
      syncStatus: state.syncStatus || (signedIn ? 'idle' : 'local'),
      expiresAt: state.expiresAt || ''
    };
  }

  function isSessionExpired(session, now) {
    const normalized = normalizeSessionState(session);
    if (!normalized.signedIn || !normalized.expiresAt) return false;
    const expiry = Date.parse(normalized.expiresAt);
    const current = Date.parse(now || new Date().toISOString());
    if (!Number.isFinite(expiry) || !Number.isFinite(current)) return true;
    return expiry <= current;
  }

  function buildSignedOutState(previousState) {
    const previous = normalizeSessionState(previousState);
    const preservePreview = previous.parentPreview && !previous.signedIn;
    return {
      signedIn: false,
      user: null,
      profile: null,
      role: '',
      capabilities: [],
      activeStudent: preservePreview ? previous.activeStudent : null,
      sessionMode: preservePreview ? previous.sessionMode : '',
      parentPreview: preservePreview,
      studentMode: false,
      syncStatus: 'local',
      expiresAt: ''
    };
  }

  function shouldClearActiveStudentOnSignOut(previousState) {
    const previous = normalizeSessionState(previousState);
    if (previous.parentPreview && !previous.signedIn) return false;
    return Boolean(previous.activeStudent);
  }

  function normalizeActiveStudent(activeStudent) {
    if (!activeStudent || typeof activeStudent !== 'object') return null;
    return Object.assign({}, activeStudent, {
      id: String(activeStudent.id || '')
    });
  }

  return {
    SESSION_SIGNED_OUT_EVENT,
    buildSignedOutState,
    isSessionExpired,
    normalizeSessionState,
    shouldClearActiveStudentOnSignOut
  };
});
