const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_RETENTION_POLICY,
  evaluateLearnerDataRetention,
  retentionCutoff
} = require('../assets/learner-data-retention-policy');

test('retention cutoffs are deterministic with injected dates', () => {
  assert.equal(
    retentionCutoff('2030-04-29T12:00:00.000Z', 30),
    '2030-03-30T12:00:00.000Z'
  );
  assert.equal(DEFAULT_RETENTION_POLICY.deletionTombstoneDays, 365);
});

test('retention policy classifies inactive backups audit logs and tombstones', () => {
  const result = evaluateLearnerDataRetention({
    learners: [
      { learnerId: 'active', lastUpdatedAt: '2030-04-01T12:00:00.000Z' },
      { learnerId: 'inactive', lastUpdatedAt: '2028-04-01T12:00:00.000Z' }
    ],
    backups: [{ backupId: 'backup-old', exportedAt: '2029-01-01T12:00:00.000Z' }],
    auditEvents: [{ id: 'audit-old', createdAt: '2028-01-01T12:00:00.000Z' }],
    tombstones: [{ learnerId: 'deleted', deletedAt: '2028-01-01T12:00:00.000Z' }]
  }, {
    now: () => '2030-04-29T12:00:00.000Z',
    policy: {
      inactiveLearnerDays: 365,
      backupDays: 90,
      auditLogDays: 730,
      deletionTombstoneDays: 365
    }
  });

  assert.deepEqual(result.inactiveLearners.map(item => item.learnerId), ['inactive']);
  assert.deepEqual(result.expiredBackups.map(item => item.backupId), ['backup-old']);
  assert.deepEqual(result.expiredAuditEvents.map(item => item.id), ['audit-old']);
  assert.deepEqual(result.expiredTombstones.map(item => item.learnerId), ['deleted']);
});
