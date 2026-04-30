const assert = require('node:assert/strict');
const test = require('node:test');

const access = require('../assets/access-control');
const lifecycle = require('../assets/learner-data-lifecycle-domain');

test('learner data deletion requests are role scoped and normalized', () => {
  const guardian = access.normalizeActor({ id: 'guardian-1', role: access.Roles.PARENT_GUARDIAN, linkedLearnerIds: ['learner-1'] });
  const request = lifecycle.createLearnerDataDeletionRequest({
    learnerId: 'learner-1',
    requestedBy: guardian,
    reason: 'guardian request'
  }, { now: () => '2030-04-29T12:00:00.000Z', id: () => 'delete-1' });

  assert.equal(request.deletionRequestId, 'delete-1');
  assert.equal(request.status, 'requested');
  assert.equal(request.scope, 'learner_state');
  assert.equal(request.requestedBy.actorId, 'guardian-1');
  assert.throws(() => lifecycle.createLearnerDataDeletionRequest({
    learnerId: 'learner-2',
    requestedBy: guardian,
    reason: 'not linked'
  }), /learner_data_delete_denied/);
});

test('deletion approval and completion write tombstone metadata', () => {
  const request = lifecycle.createLearnerDataDeletionRequest({
    learnerId: 'learner-1',
    requestedBy: { id: 'student-1', role: access.Roles.STUDENT, learnerId: 'learner-1' },
    reason: 'student request'
  }, { now: () => '2030-04-29T12:00:00.000Z', id: () => 'delete-1' });
  const approved = lifecycle.approveLearnerDataDeletion(request, {
    id: 'admin-1',
    role: access.Roles.SYSTEM_ADMIN
  }, { now: () => '2030-04-29T12:05:00.000Z' });
  const completed = lifecycle.completeLearnerDataDeletion(approved, {
    now: () => '2030-04-29T12:10:00.000Z'
  });

  assert.equal(approved.status, 'approved');
  assert.equal(completed.status, 'completed');
  assert.equal(completed.completedAt, '2030-04-29T12:10:00.000Z');
  assert.equal(completed.tombstone.learnerId, 'learner-1');
  assert.equal(completed.tombstone.deletionRequestId, 'delete-1');
});

test('restore is denied when a deletion tombstone is newer than the backup', () => {
  const tombstone = lifecycle.createDeletionTombstone({
    learnerId: 'learner-1',
    deletionRequestId: 'delete-1'
  }, { now: () => '2030-05-01T12:00:00.000Z' });

  assert.equal(lifecycle.canRestoreBackup({
    backupExportedAt: '2030-04-30T12:00:00.000Z',
    tombstone
  }).allowed, false);
  assert.equal(lifecycle.canRestoreBackup({
    backupExportedAt: '2030-05-02T12:00:00.000Z',
    tombstone
  }).allowed, true);
});
