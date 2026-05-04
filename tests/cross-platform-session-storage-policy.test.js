const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  buildCrossPlatformSessionFixtures,
  evaluateAccountSeparation,
  evaluateCredentialState,
  getSessionStoragePolicy,
  planAccountDeletionPropagation,
  planSessionSignOutCleanup,
  validateCredentialPlacement,
  validateSessionStoragePolicy
} = require('../assets/cross-platform-session-storage-policy');
const {
  buildCrossPlatformAccountLinkingPlan,
  validateCrossPlatformCommerceRecord
} = require('../assets/cross-platform-commerce-policy');

const repoRoot = path.resolve(__dirname, '..');

test('session storage policy defines explicit web native server and volatile classes', () => {
  const policy = getSessionStoragePolicy();
  const classes = policy.storageClasses.map(item => item.id);

  [
    'browser_local_storage',
    'browser_session_storage',
    'indexed_db',
    'server_session',
    'native_keychain',
    'native_app_container',
    'native_shared_app_group',
    'volatile_memory'
  ].forEach(id => assert.ok(classes.includes(id), `${id} storage class should be declared`));

  assert.deepEqual(validateSessionStoragePolicy(policy), []);
  assert.equal(policy.dataClasses.refresh_token.requiredStorage.includes('native_keychain'), true);
  assert.equal(policy.dataClasses.refresh_token.allowedStorage.includes('browser_local_storage'), false);
  assert.equal(policy.dataClasses.learner_state_cache.allowedStorage.includes('native_app_container'), true);
  assert.equal(policy.dataClasses.content_bundle_cache.allowedStorage.includes('native_shared_app_group'), true);
});

test('credential placement rejects unsafe token storage and raw credential fixtures', () => {
  assert.deepEqual(validateCredentialPlacement({
    platform: 'ios',
    placements: {
      refresh_token: 'native_keychain',
      access_token: 'volatile_memory',
      learner_state_cache: 'native_app_container',
      redacted_account_profile: 'native_app_container'
    }
  }), []);

  assert.ok(validateCredentialPlacement({
    platform: 'web',
    placements: {
      refresh_token: 'browser_local_storage',
      access_token: 'browser_local_storage'
    }
  }).includes('refresh_token_storage_forbidden:browser_local_storage'));

  assert.ok(validateCredentialPlacement({
    platform: 'ios',
    placements: {
      refresh_token: 'native_keychain'
    },
    fixture: { refreshToken: 'real-refresh-token-value' }
  }).includes('credential_fixture_must_not_include_raw_token_values'));
});

test('sign-out and account deletion plans clear tokens while preserving safe offline content', () => {
  const signOut = planSessionSignOutCleanup({
    platform: 'ios',
    sessionMode: 'guardian',
    activeLearnerId: 'learner-1'
  });

  assert.deepEqual(signOut.clearStorage.sort(), ['native_keychain', 'volatile_memory'].sort());
  assert.ok(signOut.preserveStorage.includes('native_app_container'));
  assert.ok(signOut.offlineAccess.allowed);
  assert.equal(signOut.offlineAccess.mode, 'local_free_practice_only');

  const deletion = planAccountDeletionPropagation({
    accountId: 'acct-1',
    learnerIds: ['learner-1'],
    platform: 'web'
  });

  assert.ok(deletion.tombstones.some(item => item.resource === 'learner_state' && item.learnerId === 'learner-1'));
  assert.ok(deletion.clearStorage.includes('browser_local_storage'));
  assert.ok(deletion.revokeServerSession);
  assert.equal(JSON.stringify(deletion).includes('acct-1'), false);
});

test('expired credentials and offline completions have deterministic states', () => {
  const expired = evaluateCredentialState({
    signedIn: true,
    expiresAt: '2030-04-29T11:59:00.000Z',
    refreshRevoked: false,
    network: 'offline'
  }, { now: '2030-04-29T12:00:00.000Z' });

  assert.equal(expired.status, 'expired_offline');
  assert.equal(expired.mayCompleteLocalPractice, true);
  assert.equal(expired.maySync, false);
  assert.equal(expired.requiresReauth, true);

  const revoked = evaluateCredentialState({
    signedIn: true,
    expiresAt: '2030-04-29T12:10:00.000Z',
    refreshRevoked: true,
    network: 'online'
  }, { now: '2030-04-29T12:00:00.000Z' });

  assert.equal(revoked.status, 'revoked');
  assert.equal(revoked.mayCompleteLocalPractice, true);
  assert.equal(revoked.maySync, false);
});

test('parent and learner account state stays separated across profiles and secure storage', () => {
  assert.deepEqual(evaluateAccountSeparation({
    parentAccount: { accountRef: 'parent:guardian-1', storageScope: 'guardian_profile', canManageBilling: true },
    learnerAccount: { accountRef: 'learner:learner-1', storageScope: 'learner_profile', canManageBilling: false },
    activeLearnerRef: 'learner:learner-1'
  }), []);

  assert.ok(evaluateAccountSeparation({
    parentAccount: { accountRef: 'parent:guardian-1', storageScope: 'shared_profile', canManageBilling: true },
    learnerAccount: { accountRef: 'parent:guardian-1', storageScope: 'shared_profile', canManageBilling: true },
    activeLearnerRef: 'parent:guardian-1'
  }).includes('parent_and_learner_accounts_must_not_share_identity'));
});

test('session account linking plans keep billing owner and learner identity separated', () => {
  const plan = buildCrossPlatformAccountLinkingPlan({
    platform: 'ios_ipados',
    parentAccountRef: 'parent:guardian-1',
    learnerAccountRef: 'learner:learner-1',
    purchaseChannel: 'ios_iap',
    receiptSource: 'app_store_receipt_ref'
  });

  assert.equal(plan.accountLinkingState, 'linked');
  assert.equal(plan.parentAccountRef, 'parent:guardian-1');
  assert.equal(plan.learnerAccountRef, 'learner:learner-1');
  assert.equal(plan.billingOwnerBoundary, 'parent_guardian_account');
  assert.equal(plan.learnerProgressBoundary, 'ref_only_learning_state');
  assert.deepEqual(validateCrossPlatformCommerceRecord(plan).errors, []);
});

test('session fixtures are sanitized and docs are wired', () => {
  const fixtures = buildCrossPlatformSessionFixtures({ now: '2030-04-29T12:00:00.000Z' });
  const serialized = JSON.stringify(fixtures);
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'cross-platform-session-storage.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.equal(serialized.includes('real-refresh-token'), false);
  assert.equal(serialized.includes('email'), false);
  assert.equal(fixtures.webSignedOut.offlineAccess.mode, 'local_free_practice_only');
  assert.equal(fixtures.iosExpiredOffline.requiresReauth, true);
  assert.match(docs, /native Keychain/i);
  assert.match(docs, /offline completions/i);
  assert.match(docs, /account deletion/i);
  assert.match(pkg.scripts['test:unit'], /tests\/cross-platform-session-storage-policy\.test\.js/);
});
