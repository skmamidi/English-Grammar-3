(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestCrossPlatformSessionStoragePolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STORAGE_CLASS_IDS = [
    'browser_local_storage',
    'browser_session_storage',
    'indexed_db',
    'server_session',
    'native_keychain',
    'native_app_container',
    'native_shared_app_group',
    'volatile_memory'
  ];
  const DATA_CLASS_IDS = [
    'refresh_token',
    'access_token',
    'learner_state_cache',
    'content_bundle_cache',
    'privacy_preferences',
    'device_metadata',
    'redacted_account_profile'
  ];
  const RAW_TOKEN_PATTERN = /(real-|eyJ|ya29\.|refresh[_-]?token|access[_-]?token|secret|password|private[_-]?key)/i;

  function getSessionStoragePolicy() {
    return {
      schemaVersion: 1,
      storageClasses: [
        storageClass('browser_local_storage', 'web', false, true, false),
        storageClass('browser_session_storage', 'web', false, true, false),
        storageClass('indexed_db', 'web', false, true, false),
        storageClass('server_session', 'server', true, false, true),
        storageClass('native_keychain', 'ios_ipados', true, false, true),
        storageClass('native_app_container', 'ios_ipados', false, true, false),
        storageClass('native_shared_app_group', 'ios_ipados', false, true, false),
        storageClass('volatile_memory', 'all', false, false, true)
      ],
      dataClasses: {
        refresh_token: dataClass(['server_session', 'native_keychain'], ['server_session', 'native_keychain'], true),
        access_token: dataClass(['server_session', 'native_keychain', 'volatile_memory', 'browser_session_storage'], ['volatile_memory'], true),
        learner_state_cache: dataClass(['browser_local_storage', 'indexed_db', 'native_app_container'], [], false),
        content_bundle_cache: dataClass(['browser_local_storage', 'indexed_db', 'native_app_container', 'native_shared_app_group'], [], false),
        privacy_preferences: dataClass(['browser_local_storage', 'indexed_db', 'native_app_container'], [], false),
        device_metadata: dataClass(['browser_local_storage', 'indexed_db', 'native_app_container', 'native_shared_app_group'], [], false),
        redacted_account_profile: dataClass(['browser_session_storage', 'browser_local_storage', 'native_app_container', 'volatile_memory'], [], false)
      },
      lifecycle: {
        signOutClears: ['refresh_token', 'access_token', 'redacted_account_profile'],
        accountDeletionTombstones: ['learner_state', 'active_quiz', 'review_schedule', 'assignment_progress', 'privacy_preferences'],
        offlineExpiredMode: 'local_free_practice_only'
      }
    };
  }

  function storageClass(id, platform, secure, durable, clearedOnSignOut) {
    return { id, platform, secure, durable, clearedOnSignOut };
  }

  function dataClass(allowedStorage, requiredStorage, secret) {
    return { allowedStorage, requiredStorage, secret };
  }

  function validateSessionStoragePolicy(policy) {
    const errors = [];
    const input = policy && typeof policy === 'object' ? policy : {};
    if (input.schemaVersion !== 1) errors.push('session_storage_policy_schema_version_required');
    const classIds = (Array.isArray(input.storageClasses) ? input.storageClasses : []).map(item => item && item.id);
    STORAGE_CLASS_IDS.forEach(id => {
      if (!classIds.includes(id)) errors.push(`storage_class_missing:${id}`);
    });
    DATA_CLASS_IDS.forEach(id => {
      if (!input.dataClasses || !input.dataClasses[id]) errors.push(`data_class_missing:${id}`);
    });
    if (input.dataClasses && input.dataClasses.refresh_token && input.dataClasses.refresh_token.allowedStorage.includes('browser_local_storage')) {
      errors.push('refresh_token_must_not_allow_browser_local_storage');
    }
    if (input.dataClasses && input.dataClasses.access_token && input.dataClasses.access_token.allowedStorage.includes('browser_local_storage')) {
      errors.push('access_token_must_not_allow_browser_local_storage');
    }
    return errors;
  }

  function validateCredentialPlacement(input) {
    const errors = [];
    const policy = getSessionStoragePolicy();
    const placements = input && input.placements && typeof input.placements === 'object' ? input.placements : {};
    Object.keys(placements).forEach(dataClassId => {
      const storageClassId = placements[dataClassId];
      const dataClassPolicy = policy.dataClasses[dataClassId];
      if (!dataClassPolicy) {
        errors.push(`unknown_data_class:${dataClassId}`);
        return;
      }
      if (!dataClassPolicy.allowedStorage.includes(storageClassId)) {
        errors.push(`${dataClassId}_storage_forbidden:${storageClassId}`);
      }
      if (dataClassPolicy.requiredStorage.length && !dataClassPolicy.requiredStorage.includes(storageClassId)) {
        errors.push(`${dataClassId}_storage_not_secure_enough:${storageClassId}`);
      }
    });
    if (hasRawCredential(input && input.fixture)) errors.push('credential_fixture_must_not_include_raw_token_values');
    return Array.from(new Set(errors));
  }

  function planSessionSignOutCleanup(input = {}) {
    const platform = normalizePlatform(input.platform);
    const clearStorage = platform === 'ios'
      ? ['native_keychain', 'volatile_memory']
      : platform === 'server'
        ? ['server_session', 'volatile_memory']
        : ['browser_session_storage', 'volatile_memory'];
    const preserveStorage = platform === 'ios'
      ? ['native_app_container', 'native_shared_app_group']
      : ['browser_local_storage', 'indexed_db'];
    return {
      platform,
      clearStorage,
      preserveStorage,
      clearDataClasses: ['refresh_token', 'access_token', 'redacted_account_profile'],
      revokeServerSession: true,
      activeLearnerRef: redactRef(input.activeLearnerId),
      offlineAccess: {
        allowed: true,
        mode: 'local_free_practice_only',
        maySync: false,
        reason: 'signed_out_or_expired_credentials'
      }
    };
  }

  function planAccountDeletionPropagation(input = {}) {
    const platform = normalizePlatform(input.platform);
    const learnerIds = normalizeStringArray(input.learnerIds);
    return {
      platform,
      revokeServerSession: true,
      revokeRefreshTokens: true,
      clearStorage: platform === 'ios'
        ? ['native_keychain', 'volatile_memory', 'native_app_container']
        : ['browser_local_storage', 'browser_session_storage', 'indexed_db', 'volatile_memory'],
      tombstones: learnerIds.flatMap(learnerId => [
        tombstone('learner_state', learnerId),
        tombstone('active_quiz', learnerId),
        tombstone('review_schedule', learnerId),
        tombstone('assignment_progress', learnerId),
        tombstone('privacy_preferences', learnerId)
      ]),
      providerAction: 'provider_neutral_delete_request',
      auditRef: 'account-deletion-redacted'
    };
  }

  function evaluateCredentialState(session = {}, options = {}) {
    const now = safeIso(options.now) || new Date().toISOString();
    const signedIn = session.signedIn === true;
    const expiry = safeIso(session.expiresAt);
    const expired = signedIn && (!expiry || Date.parse(expiry) <= Date.parse(now));
    const offline = session.network === 'offline';
    const revoked = session.refreshRevoked === true;
    if (!signedIn) return credentialDecision('signed_out', true, false, false);
    if (revoked) return credentialDecision('revoked', true, false, true);
    if (expired && offline) return credentialDecision('expired_offline', true, false, true);
    if (expired) return credentialDecision('expired_online', true, false, true);
    return credentialDecision('active', true, true, false);
  }

  function credentialDecision(status, mayCompleteLocalPractice, maySync, requiresReauth) {
    return {
      status,
      mayCompleteLocalPractice,
      maySync,
      requiresReauth
    };
  }

  function evaluateAccountSeparation(input = {}) {
    const errors = [];
    const parent = input.parentAccount && typeof input.parentAccount === 'object' ? input.parentAccount : {};
    const learner = input.learnerAccount && typeof input.learnerAccount === 'object' ? input.learnerAccount : {};
    if (!safeString(parent.accountRef)) errors.push('parent_account_ref_required');
    if (!safeString(learner.accountRef)) errors.push('learner_account_ref_required');
    if (parent.accountRef && learner.accountRef && parent.accountRef === learner.accountRef) errors.push('parent_and_learner_accounts_must_not_share_identity');
    if (parent.storageScope && learner.storageScope && parent.storageScope === learner.storageScope) errors.push('parent_and_learner_storage_scopes_must_be_separate');
    if (learner.canManageBilling === true) errors.push('learner_account_must_not_manage_billing');
    if (input.activeLearnerRef && input.activeLearnerRef !== learner.accountRef) errors.push('active_learner_ref_must_point_to_learner_account');
    return errors;
  }

  function buildCrossPlatformSessionFixtures(options = {}) {
    const now = safeIso(options.now) || '2030-04-29T12:00:00.000Z';
    return {
      webSignedOut: planSessionSignOutCleanup({ platform: 'web', sessionMode: 'learner', activeLearnerId: 'learner-1' }),
      iosGuardianPlacement: {
        platform: 'ios',
        placements: {
          refresh_token: 'native_keychain',
          access_token: 'volatile_memory',
          learner_state_cache: 'native_app_container',
          content_bundle_cache: 'native_shared_app_group',
          privacy_preferences: 'native_app_container',
          redacted_account_profile: 'native_app_container'
        },
        fixture: {
          tokenRefs: ['refresh-token-ref', 'access-token-ref'],
          accountProfile: { accountRef: 'parent:guardian-1', role: 'guardian' }
        }
      },
      iosExpiredOffline: evaluateCredentialState({
        signedIn: true,
        expiresAt: addMinutes(now, -1),
        network: 'offline'
      }, { now }),
      accountDeletion: planAccountDeletionPropagation({
        platform: 'web',
        learnerIds: ['learner-1']
      }),
      accountSeparation: {
        parentAccount: { accountRef: 'parent:guardian-1', storageScope: 'guardian_profile', canManageBilling: true },
        learnerAccount: { accountRef: 'learner:learner-1', storageScope: 'learner_profile', canManageBilling: false },
        activeLearnerRef: 'learner:learner-1'
      }
    };
  }

  function normalizePlatform(value) {
    const platform = safeString(value).toLowerCase();
    if (platform === 'ios' || platform === 'ipados' || platform === 'native') return 'ios';
    if (platform === 'server') return 'server';
    return 'web';
  }

  function tombstone(resource, learnerId) {
    return {
      resource,
      learnerId,
      status: 'delete_requested',
      payload: 'redacted'
    };
  }

  function redactRef(value) {
    const text = safeString(value);
    return text ? `ref:${text}` : '';
  }

  function hasRawCredential(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => {
      const child = value[key];
      if (/token|secret|password|privateKey/i.test(key) && RAW_TOKEN_PATTERN.test(String(child || ''))) return true;
      if (typeof child === 'string' && RAW_TOKEN_PATTERN.test(child) && !/[-_]ref$/i.test(child)) return true;
      return child && typeof child === 'object' && hasRawCredential(child);
    });
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function addMinutes(iso, minutes) {
    const date = new Date(iso);
    date.setTime(date.getTime() + Number(minutes || 0) * 60 * 1000);
    return date.toISOString();
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildCrossPlatformSessionFixtures,
    evaluateAccountSeparation,
    evaluateCredentialState,
    getSessionStoragePolicy,
    planAccountDeletionPropagation,
    planSessionSignOutCleanup,
    validateCredentialPlacement,
    validateSessionStoragePolicy
  };
});
