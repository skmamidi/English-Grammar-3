const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createLearnerStateSyncAdapterContract,
  createSyncUnavailableError
} = require('../assets/learner-state-sync-adapter');
const { createFakeLearnerStateSyncAdapter } = require('./helpers/fake-learner-state-sync-adapter');

test('fake sync adapter satisfies account-backed learner state contract', async () => {
  const adapter = createFakeLearnerStateSyncAdapter();
  const contract = createLearnerStateSyncAdapterContract(adapter);

  assert.equal(await contract.readLearnerState('learner-1'), null);
  const written = await contract.writeLearnerState('learner-1', { totalGems: 3 }, {
    revision: 0,
    source: 'contract-test',
    now: '2030-04-29T12:00:00.000Z'
  });

  assert.equal(written.learnerId, 'learner-1');
  assert.equal(written.revision, 1);
  assert.equal(written.state.totalGems, 3);
  assert.equal(await contract.getRevision('learner-1'), 1);
  assert.deepEqual((await contract.listLearnerStateMetadata({ actorId: 'admin-1' })).map(item => item.learnerId), ['learner-1']);

  await contract.deleteLearnerState('learner-1', { revision: 1 });
  assert.equal(await contract.readLearnerState('learner-1'), null);
});

test('fake sync adapter simulates stale revision, unavailable network, permission, schema, and partial write failures', async () => {
  const adapter = createFakeLearnerStateSyncAdapter();
  await adapter.writeLearnerState('learner-1', { totalGems: 3 }, { revision: 0 });

  await assert.rejects(() => adapter.writeLearnerState('learner-1', { totalGems: 4 }, { revision: 0 }), /learner_state_sync_conflict/);
  adapter.setMode('unavailable');
  await assert.rejects(() => adapter.readLearnerState('learner-1'), /learner_state_sync_unavailable/);
  adapter.setMode('permission_denied');
  await assert.rejects(() => adapter.listLearnerStateMetadata({}), /learner_state_sync_permission_denied/);
  adapter.setMode('invalid_schema');
  await assert.rejects(() => adapter.readLearnerState('learner-1'), /learner_state_sync_schema_unsupported/);
  adapter.setMode('partial_write');
  await assert.rejects(() => adapter.writeLearnerState('learner-1', { totalGems: 5 }, { revision: 1 }), /learner_state_sync_partial_write_rejected/);
});

test('sync contract requires all adapter methods', () => {
  assert.throws(() => createLearnerStateSyncAdapterContract({}), /learner_state_sync_adapter_requires_readLearnerState/);
  assert.equal(createSyncUnavailableError('offline').code, 'sync_unavailable');
});
