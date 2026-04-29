(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearnerStateMigration = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const DEFAULT_MARKER_KEY = 'grammarQuestProgress.indexeddbMigrated';

  function getRepositoryApi() {
    if (root.GrammarQuestLearnerStateRepository) return root.GrammarQuestLearnerStateRepository;
    if (typeof require === 'function') return require('./learner-state-repository');
    return null;
  }

  async function migrateLocalStorageToIndexedDb(options = {}) {
    const repositoryApi = getRepositoryApi();
    if (!repositoryApi || typeof repositoryApi.normalizeLearnerState !== 'function') {
      throw new Error('learner_state_migration_requires_repository_api');
    }
    const localStorageAdapter = options.localStorageAdapter;
    const indexedDbAdapter = options.indexedDbAdapter;
    if (!localStorageAdapter || typeof localStorageAdapter.read !== 'function') {
      throw new Error('learner_state_migration_requires_local_adapter');
    }
    if (!indexedDbAdapter || typeof indexedDbAdapter.write !== 'function' || typeof indexedDbAdapter.read !== 'function') {
      throw new Error('learner_state_migration_requires_indexeddb_adapter');
    }

    const markerStorage = options.markerStorage || null;
    const markerKey = options.markerKey || DEFAULT_MARKER_KEY;
    if (hasMigrationMarker(markerStorage, markerKey)) {
      return { status: 'already_migrated' };
    }

    const raw = await localStorageAdapter.read();
    if (!raw) return { status: 'empty' };

    const normalized = repositoryApi.normalizeLearnerState(raw);
    await indexedDbAdapter.write(normalized);
    const roundTrip = repositoryApi.normalizeLearnerState(await indexedDbAdapter.read());
    assertRoundTripMatches(normalized, roundTrip);
    setMigrationMarker(markerStorage, markerKey);
    return { status: 'migrated', progress: roundTrip };
  }

  function hasMigrationMarker(storage, key) {
    try {
      return !!(storage && typeof storage.getItem === 'function' && storage.getItem(key) === 'true');
    } catch (error) {
      return false;
    }
  }

  function setMigrationMarker(storage, key) {
    if (!storage || typeof storage.setItem !== 'function') return;
    storage.setItem(key, 'true');
  }

  function assertRoundTripMatches(expected, actual) {
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      throw new Error('learner_state_migration_round_trip_mismatch');
    }
  }

  return {
    migrateLocalStorageToIndexedDb
  };
});
