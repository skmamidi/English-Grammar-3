const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_BACKUP_ROLLBACK_REHEARSAL_POLICY,
  buildBackupRollbackRehearsalPlan,
  sanitizeBackupRollbackRehearsalResult,
  validateBackupRollbackRehearsalPolicy
} = require('../assets/backup-rollback-rehearsal-policy');
const {
  runBackupRollbackRehearsalCheck
} = require('../scripts/qa/backup-rollback-rehearsals');

const REQUIRED_REHEARSAL_TYPES = [
  'learner_backup_preview',
  'deletion_tombstone_protection',
  'release_manifest_rollback',
  'stale_artifact_rollback',
  'service_worker_cache_recovery'
];

test('backup and rollback rehearsal policy covers required recovery scenarios', () => {
  const result = validateBackupRollbackRehearsalPolicy(DEFAULT_BACKUP_ROLLBACK_REHEARSAL_POLICY);
  const types = result.policy.rehearsals.map(rehearsal => rehearsal.type);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(types, REQUIRED_REHEARSAL_TYPES);
});

test('backup and rollback rehearsals are non-destructive and evidence-driven', () => {
  const result = validateBackupRollbackRehearsalPolicy(DEFAULT_BACKUP_ROLLBACK_REHEARSAL_POLICY);

  result.policy.rehearsals.forEach(rehearsal => {
    assert.equal(rehearsal.usesSyntheticFixtures, true, `${rehearsal.id} must use synthetic fixtures`);
    assert.equal(rehearsal.mutatesProduction, false, `${rehearsal.id} must not mutate production data`);
    assert.equal(rehearsal.restoresLiveLearnerRecords, false, `${rehearsal.id} must not restore live learner records`);
    assert.equal(rehearsal.requiresLiveCredentials, false, `${rehearsal.id} must not require live credentials`);
    assert.match(rehearsal.runbook, /^docs\/operations\//, `${rehearsal.id} should link an operations runbook`);
    assert.ok(rehearsal.owner, `${rehearsal.id} should define an owner`);
    assert.match(rehearsal.verificationCommand, /^(npm run|node --test|node scripts\/)/, `${rehearsal.id} should expose a reproducible verification command`);
    assert.ok(rehearsal.nonDestructiveEvidence.length >= 2, `${rehearsal.id} should list non-destructive evidence`);
  });
});

test('backup and rollback rehearsal validation rejects unsafe incomplete definitions', () => {
  const result = validateBackupRollbackRehearsalPolicy({
    rehearsals: [{
      id: 'unsafe_restore',
      label: 'Unsafe restore',
      type: 'learner_backup_preview',
      owner: '',
      runbook: '',
      verificationCommand: 'curl https://example.test?learnerId=abc',
      steps: [],
      nonDestructiveEvidence: [],
      usesSyntheticFixtures: false,
      mutatesProduction: true,
      restoresLiveLearnerRecords: true,
      requiresLiveCredentials: true,
      capturesPayload: true,
      outputFields: ['learnerId', 'rawStackTrace']
    }]
  });

  assert.deepEqual(result.errors, [
    'unsafe_restore owner is required',
    'unsafe_restore runbook is required',
    'unsafe_restore verificationCommand must use an approved local command',
    'unsafe_restore steps are required',
    'unsafe_restore nonDestructiveEvidence is required',
    'unsafe_restore must use synthetic fixtures',
    'unsafe_restore must not mutate production',
    'unsafe_restore must not restore live learner records',
    'unsafe_restore must not require live credentials',
    'unsafe_restore must not capture payloads',
    'unsafe_restore outputFields include unsafe field learnerId',
    'unsafe_restore outputFields include unsafe field rawStackTrace',
    'missing required rehearsal type deletion_tombstone_protection',
    'missing required rehearsal type release_manifest_rollback',
    'missing required rehearsal type stale_artifact_rollback',
    'missing required rehearsal type service_worker_cache_recovery'
  ]);
});

test('backup and rollback rehearsal plan is actionable and privacy-safe', () => {
  const plan = buildBackupRollbackRehearsalPlan(DEFAULT_BACKUP_ROLLBACK_REHEARSAL_POLICY, {
    mode: 'staging',
    rehearsalIds: ['learner_backup_preview_rehearsal', 'service_worker_cache_recovery_rehearsal']
  });

  assert.equal(plan.mode, 'staging');
  assert.equal(plan.checkedLiveDependencies, false);
  assert.deepEqual(plan.rehearsals.map(rehearsal => rehearsal.id), [
    'learner_backup_preview_rehearsal',
    'service_worker_cache_recovery_rehearsal'
  ]);
  assert.match(plan.rehearsals[0].nextStep, /Run the listed synthetic rehearsal steps/);
  assert.match(plan.rehearsals[1].runbook, /offline-cache-issue/);
  assert.doesNotMatch(JSON.stringify(plan), /learnerId|studentId|question text|answer choices|explanation|prompt|token|raw stack/i);
});

test('backup and rollback rehearsal result sanitizer keeps bounded diagnostics only', () => {
  const sanitized = sanitizeBackupRollbackRehearsalResult({
    id: 'learner_backup_preview_rehearsal',
    ok: false,
    observedSignals: ['restore_preview_denied', 'learnerId=secret'],
    evidenceUrl: 'https://example.test/admin?token=secret',
    error: 'raw stack trace mentions prompt and token=secret',
    payload: { learnerId: 'abc', question: 'Choose one', answer: 'A' }
  });

  assert.deepEqual(sanitized, {
    id: 'learner_backup_preview_rehearsal',
    ok: false,
    observedSignals: ['restore_preview_denied', '[redacted]'],
    evidenceUrl: 'https://example.test/admin',
    error: 'stack trace mentions prompt and token=[redacted]',
    action: 'Compare observed signals with the rehearsal runbook, then record only non-destructive evidence.'
  });
});

test('backup and rollback rehearsal helper lists validated rehearsals without live dependency access', () => {
  const result = runBackupRollbackRehearsalCheck({ mode: 'local' });

  assert.equal(result.ok, true);
  assert.equal(result.checkedLiveDependencies, false);
  assert.deepEqual(result.rehearsals.map(rehearsal => rehearsal.type), REQUIRED_REHEARSAL_TYPES);
  assert.doesNotMatch(JSON.stringify(result), /learnerId|studentId|credentials|question text|answer choices|raw stack/i);
});
