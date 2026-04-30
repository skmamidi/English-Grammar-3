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

function createRepository() {
  const storage = {};
  const adapter = createLocalStorageLearnerStateAdapter({
    getItem(key) { return storage[key] || null; },
    setItem(key, value) { storage[key] = String(value); },
    removeItem(key) { delete storage[key]; }
  });
  return createLearnerStateRepository(adapter);
}

