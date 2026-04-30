const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CURRENT_SERVER_SCHEMA_VERSION,
  createLearnerStateServerRecord,
  migrateLearnerStateServerRecord
} = require('../assets/learner-state-server-migrations');

test('server migration normalizes current records and strips unsafe payload fields', () => {
  const record = migrateLearnerStateServerRecord({
    schemaVersion: CURRENT_SERVER_SCHEMA_VERSION,
    learnerId: 'learner-1',
    revision: 3,
    updatedAt: '2030-04-29T12:00:00.000Z',
    state: {
      reports: {
        sessions: [{
          id: 'session-1',
          attempts: [{ questionId: 'q1', question: 'raw prompt', choices: ['A'] }]
        }]
      }
    },
    metadata: { safe: true, privateToken: 'nope' }
  }, { allowMetadataKeys: ['safe'] });

  assert.equal(record.schemaVersion, CURRENT_SERVER_SCHEMA_VERSION);
  assert.equal(record.revision, 3);
  assert.equal(JSON.stringify(record).includes('raw prompt'), false);
  assert.deepEqual(record.metadata, { safe: true });
});

test('server migration upgrades v0 and v1 records without inventing progress', () => {
  const v0 = migrateLearnerStateServerRecord({
    version: 0,
    learnerId: 'learner-1',
    state: { badges: ['legacy-sync'] }
  });
  const v1 = migrateLearnerStateServerRecord({
    schemaVersion: 1,
    learnerId: 'learner-1',
    revision: 4,
    state: { reports: { sessions: [{ id: 'session-1' }] } }
  });

  assert.equal(v0.schemaVersion, CURRENT_SERVER_SCHEMA_VERSION);
  assert.equal(v0.state.badges[0], 'legacy-sync');
  assert.equal(v1.revision, 4);
  assert.equal(v1.state.reports.sessions[0].id, 'session-1');
});

test('server migration rejects future schema and corrupt report records', () => {
  assert.throws(() => migrateLearnerStateServerRecord({
    schemaVersion: CURRENT_SERVER_SCHEMA_VERSION + 1,
    learnerId: 'learner-1',
    state: {}
  }), /learner_state_sync_schema_unsupported/);

  assert.throws(() => migrateLearnerStateServerRecord({
    learnerId: 'learner-1',
    state: { reports: { questionReports: [{ id: 'report-1', status: 'open' }] } }
  }), /learner_state_sync_record_corrupt/);
});

test('server migration creates revision-guarded sync records from normalized state', () => {
  const record = createLearnerStateServerRecord('learner-1', { totalGems: 5 }, {
    revision: 8,
    now: '2030-05-01T12:00:00.000Z',
    source: 'unit-test'
  });

  assert.equal(record.learnerId, 'learner-1');
  assert.equal(record.revision, 8);
  assert.equal(record.updatedAt, '2030-05-01T12:00:00.000Z');
  assert.equal(record.state.totalGems, 5);
});
