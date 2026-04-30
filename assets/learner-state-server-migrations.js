(function (root, factory) {
  'use strict';

  const repository = root.GrammarQuestLearnerStateRepository ||
    (typeof require === 'function' ? require('./learner-state-repository') : null);
  const syncDomain = root.GrammarQuestLearnerStateSyncDomain ||
    (typeof require === 'function' ? require('./learner-state-sync-domain') : null);
  const api = factory(repository, syncDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearnerStateServerMigrations = api;
})(typeof window !== 'undefined' ? window : globalThis, function (repository, syncDomain) {
  'use strict';

  const CURRENT_SERVER_SCHEMA_VERSION = syncDomain && syncDomain.CURRENT_SYNC_SCHEMA_VERSION || 1;

  function migrateLearnerStateServerRecord(record, options = {}) {
    const input = record && typeof record === 'object' ? record : {};
    const schemaVersion = readSchemaVersion(input);
    if (schemaVersion > CURRENT_SERVER_SCHEMA_VERSION) throw error('learner_state_sync_schema_unsupported', 'schema_unsupported');
    if (schemaVersion < 0) throw error('learner_state_sync_schema_invalid', 'schema_invalid');
    const normalized = normalizeRecord({
      schemaVersion: CURRENT_SERVER_SCHEMA_VERSION,
      learnerId: input.learnerId,
      revision: input.revision,
      updatedAt: input.updatedAt,
      source: input.source || (schemaVersion < CURRENT_SERVER_SCHEMA_VERSION ? 'migration' : 'server'),
      state: input.state || input.progress || {}
    });
    normalized.metadata = sanitizeMetadata(input.metadata, options.allowMetadataKeys);
    assertRecordNotCorrupt(normalized);
    return normalized;
  }

  function createLearnerStateServerRecord(learnerId, state, options = {}) {
    return migrateLearnerStateServerRecord({
      schemaVersion: CURRENT_SERVER_SCHEMA_VERSION,
      learnerId,
      revision: options.revision,
      updatedAt: options.now,
      source: options.source || 'server-record',
      state
    }, options);
  }

  function normalizeRecord(record) {
    if (syncDomain && typeof syncDomain.normalizeSyncedLearnerRecord === 'function') {
      return syncDomain.normalizeSyncedLearnerRecord(record);
    }
    return {
      schemaVersion: CURRENT_SERVER_SCHEMA_VERSION,
      learnerId: String(record.learnerId || '').trim(),
      revision: Math.max(0, Math.round(Number(record.revision) || 0)),
      updatedAt: safeIso(record.updatedAt) || new Date(0).toISOString(),
      source: String(record.source || 'unknown').trim(),
      state: repository && typeof repository.normalizeLearnerState === 'function'
        ? repository.normalizeLearnerState(record.state)
        : record.state || {}
    };
  }

  function assertRecordNotCorrupt(record) {
    try {
      if (syncDomain && typeof syncDomain.assertMergeableState === 'function') syncDomain.assertMergeableState(record.state);
    } catch (reason) {
      throw error('learner_state_sync_record_corrupt', 'record_corrupt', reason);
    }
  }

  function readSchemaVersion(input) {
    if (Object.prototype.hasOwnProperty.call(input, 'schemaVersion')) return Number(input.schemaVersion);
    if (Object.prototype.hasOwnProperty.call(input, 'version')) return Number(input.version);
    return CURRENT_SERVER_SCHEMA_VERSION;
  }

  function sanitizeMetadata(metadata, allowMetadataKeys) {
    const allowed = new Set(Array.isArray(allowMetadataKeys) ? allowMetadataKeys : []);
    return Object.keys(metadata && typeof metadata === 'object' ? metadata : {}).sort().reduce((safe, key) => {
      if (allowed.has(key)) safe[key] = metadata[key];
      return safe;
    }, {});
  }

  function safeIso(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function error(message, code, cause) {
    const err = new Error(message);
    err.code = code;
    if (cause) err.cause = cause;
    return err;
  }

  return {
    CURRENT_SERVER_SCHEMA_VERSION,
    createLearnerStateServerRecord,
    migrateLearnerStateServerRecord
  };
});
