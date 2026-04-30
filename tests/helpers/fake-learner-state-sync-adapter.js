const {
  normalizeSyncRecord
} = require('../../assets/learner-state-sync-domain');

function createFakeLearnerStateSyncAdapter(options = {}) {
  const records = new Map();
  let mode = options.mode || 'ok';

  function assertAvailable() {
    if (mode === 'unavailable') throw createError('learner_state_sync_unavailable', 'sync_unavailable');
    if (mode === 'permission_denied') throw createError('learner_state_sync_permission_denied', 'permission_denied');
  }

  return {
    setMode(nextMode) {
      mode = nextMode || 'ok';
    },
    async readLearnerState(learnerId) {
      assertAvailable();
      const record = records.get(String(learnerId || ''));
      if (!record) return null;
      if (mode === 'invalid_schema') {
        return normalizeSyncRecord(Object.assign({}, record, { schemaVersion: record.schemaVersion + 1 }));
      }
      return clone(record);
    },
    async writeLearnerState(learnerId, state, writeOptions = {}) {
      assertAvailable();
      if (mode === 'partial_write') throw createError('learner_state_sync_partial_write_rejected', 'partial_write_rejected');
      const id = String(learnerId || '');
      const current = records.get(id);
      const expectedRevision = Number(writeOptions.revision) || 0;
      const currentRevision = current ? current.revision : 0;
      if (expectedRevision !== currentRevision) {
        const error = createError('learner_state_sync_conflict', 'conflict');
        error.currentRevision = currentRevision;
        throw error;
      }
      const record = normalizeSyncRecord({
        learnerId: id,
        revision: currentRevision + 1,
        updatedAt: writeOptions.now,
        source: writeOptions.source || 'fake-sync',
        state
      });
      records.set(id, record);
      return clone(record);
    },
    async deleteLearnerState(learnerId, deleteOptions = {}) {
      assertAvailable();
      const id = String(learnerId || '');
      const current = records.get(id);
      const currentRevision = current ? current.revision : 0;
      const expectedRevision = Number(deleteOptions.revision) || 0;
      if (current && expectedRevision !== currentRevision) {
        const error = createError('learner_state_sync_conflict', 'conflict');
        error.currentRevision = currentRevision;
        throw error;
      }
      records.delete(id);
      return { ok: true };
    },
    async listLearnerStateMetadata() {
      assertAvailable();
      return Array.from(records.values()).map(record => ({
        learnerId: record.learnerId,
        revision: record.revision,
        updatedAt: record.updatedAt,
        source: record.source,
        schemaVersion: record.schemaVersion
      }));
    },
    async getRevision(learnerId) {
      assertAvailable();
      const record = records.get(String(learnerId || ''));
      return record ? record.revision : 0;
    }
  };
}

function createError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

module.exports = {
  createFakeLearnerStateSyncAdapter
};
