const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createLearnerStateRepository,
  createLocalStorageLearnerStateAdapter
} = require('../assets/learner-state-repository');
const service = require('../assets/learner-progress-transfer-service');

test('learner progress transfer service exports through repository and previews conflicts without mutation', () => {
  const repository = createRepository();
  repository.saveProgress({
    reports: { sessions: [{ id: 'session-1', studentId: 'learner-1', attempts: [{ questionId: 'q1', question: 'raw prompt' }] }] },
    assignments: [{ id: 'assignment-1', assignedTo: { learnerIds: ['learner-1'] } }],
    reviewQueue: { queueId: 'review-1', items: [{ questionRef: { id: 'q1' } }] }
  });

  const envelope = service.exportLearnerProgress(repository, 'learner-1', {
    now: () => '2030-04-29T12:00:00.000Z',
    appVersion: '1.0.0'
  });
  assert.equal(envelope.data.sessions.length, 1);
  assert.equal(JSON.stringify(envelope).includes('raw prompt'), false);

  const preview = service.previewProgressImport(envelope, {
    reports: { sessions: [{ id: 'session-1' }] }
  });
  assert.equal(preview.valid, true);
  assert.equal(preview.conflicts.length, 1);
  assert.equal(repository.getProgress().reports.sessions.length, 1);
});

test('learner progress transfer service applies skip merge and replace policies deterministically', () => {
  const envelope = service.createProgressExportEnvelope({
    learner: { id: 'learner-1' },
    app: { exportedAt: '2030-04-29T12:00:00.000Z' },
    data: { sessions: [{ id: 'session-new' }], questionReports: [{ id: 'report-new' }] }
  });

  assert.equal(service.applyProgressImport(envelope, { reports: { sessions: [{ id: 'session-old' }] } }, { policy: 'merge' }).reports.sessions.length, 2);
  assert.equal(service.applyProgressImport(envelope, { reports: { sessions: [{ id: 'session-new' }] } }, { policy: 'skip' }).reports.sessions.length, 1);
  assert.equal(service.applyProgressImport(envelope, { reports: { sessions: [{ id: 'session-old' }] } }, { policy: 'replace' }).reports.sessions[0].id, 'session-new');
});

test('learner progress transfer service converts imports into mergeable sync records', () => {
  const envelope = service.createProgressExportEnvelope({
    learner: { id: 'learner-1' },
    app: { exportedAt: '2030-04-29T12:00:00.000Z' },
    data: {
      progress: { totalGems: 3 },
      sessions: [{ id: 'session-imported', completedAt: '2030-04-29T12:00:00.000Z' }],
      questionReports: [{ id: 'report-imported', questionId: 'q1', status: 'open' }]
    }
  });

  const record = service.createSyncRecordFromProgressImport(envelope, {
    learnerId: 'learner-1',
    revision: 4,
    now: '2030-05-01T12:00:00.000Z'
  });

  assert.equal(record.learnerId, 'learner-1');
  assert.equal(record.revision, 4);
  assert.equal(record.state.totalGems, 3);
  assert.equal(record.state.reports.sessions[0].id, 'session-imported');
  assert.equal(record.state.reports.questionReports[0].questionId, 'q1');
});

test('learner progress transfer service exports backups and previews tombstone restore conflicts', () => {
  const repository = createRepository();
  repository.saveProgress({ totalGems: 9 });
  const backup = service.exportLearnerProgress(repository, 'learner-1', {
    mode: 'backup',
    now: () => '2030-04-29T12:00:00.000Z'
  });

  assert.equal(backup.backup.mode, 'backup');
  assert.equal(JSON.stringify(backup).includes('authToken'), false);

  const preview = service.previewBackupRestore(backup, {
    deletionTombstones: [{ learnerId: 'learner-1', deletedAt: '2030-04-30T12:00:00.000Z' }]
  });

  assert.equal(preview.valid, true);
  assert.equal(preview.allowed, false);
  assert.equal(preview.warnings[0], 'backup_older_than_deletion_tombstone');
});

function createRepository() {
  const storage = {};
  const adapter = createLocalStorageLearnerStateAdapter({
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; }
  });
  return createLearnerStateRepository(adapter);
}
