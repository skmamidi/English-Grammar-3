const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const roster = require('../server/roster-adapter-boundary');

const repoRoot = path.resolve(__dirname, '..');

test('roster import batches validate sanitized provider-neutral records', () => {
  const batch = roster.normalizeRosterImportBatch({
    schemaVersion: 1,
    batchId: 'batch-2026-05-04',
    tenantId: 'school-a',
    tenantType: 'school',
    providerClass: 'sis',
    mode: 'dry_run',
    idempotencyKey: 'tenant-school-a:batch-2026-05-04',
    receivedAt: '2026-05-04T14:30:00.000Z',
    identities: [
      roster.buildRosterIdentityMatch({
        matchId: 'match-learner-a',
        tenantId: 'school-a',
        appOwnedLearnerId: 'learner-a',
        rosterRole: 'student',
        redactedProviderRef: 'sis:student:hash-a',
        confidence: 0.98
      })
    ],
    membershipChanges: [
      roster.buildRosterMembershipChange({
        changeId: 'change-teacher-a',
        tenantId: 'school-a',
        actorId: 'teacher-a',
        role: 'teacher',
        learnerIds: ['learner-a'],
        classIds: ['class-a'],
        action: 'upsert',
        redactedProviderRef: 'sis:teacher:hash-a'
      })
    ]
  });

  assert.deepEqual(roster.validateRosterImportBatch(batch).errors, []);
  assert.equal(batch.mode, 'dry_run');
  assert.deepEqual(roster.validateRosterImportBatch(Object.assign({}, batch, {
    providerPayload: { raw: true }
  })).errors, ['roster_batch_provider_payload_forbidden']);
  assert.deepEqual(roster.validateRosterIdentityMatch(Object.assign({}, batch.identities[0], {
    providerStudentId: 'live-provider-student-id'
  })).errors, ['roster_identity_provider_identifier_forbidden']);
});

test('staging roster batches is dry-runnable idempotent auditable and reversible', () => {
  const existing = roster.createRosterState({
    memberships: [
      {
        membershipId: 'existing-teacher-a',
        tenantId: 'school-a',
        tenantType: 'school',
        actorId: 'teacher-a',
        role: 'teacher',
        status: 'active',
        learnerIds: ['learner-a'],
        classIds: ['class-a']
      },
      {
        membershipId: 'existing-guardian-a',
        tenantId: 'family-a',
        tenantType: 'family',
        actorId: 'guardian-a',
        role: 'guardian',
        status: 'active',
        learnerIds: ['learner-a']
      },
      {
        membershipId: 'existing-teacher-old',
        tenantId: 'school-a',
        tenantType: 'school',
        actorId: 'teacher-old',
        role: 'teacher',
        status: 'active',
        learnerIds: ['learner-a'],
        classIds: ['class-a']
      }
    ],
    appliedBatchIds: ['batch-old']
  });
  const batch = roster.normalizeRosterImportBatch({
    schemaVersion: 1,
    batchId: 'batch-transfer',
    tenantId: 'school-a',
    tenantType: 'school',
    providerClass: 'sis',
    mode: 'dry_run',
    idempotencyKey: 'school-a:batch-transfer',
    receivedAt: '2026-05-04T14:30:00.000Z',
    identities: [
      { matchId: 'match-a', tenantId: 'school-a', appOwnedLearnerId: 'learner-a', rosterRole: 'student', redactedProviderRef: 'sis:student:hash-a', confidence: 0.99 }
    ],
    membershipChanges: [
      { changeId: 'teacher-transfer', tenantId: 'school-a', actorId: 'teacher-a', role: 'teacher', action: 'upsert', learnerIds: ['learner-a'], classIds: ['class-b'], redactedProviderRef: 'sis:teacher:hash-a' }
    ]
  });

  const staged = roster.stageRosterImportBatch(existing, batch);
  const repeated = roster.stageRosterImportBatch(
    roster.createRosterState({ appliedBatchIds: ['batch-transfer'], memberships: existing.memberships }),
    batch
  );
  const rollback = roster.buildRosterRollbackPlan(staged);

  assert.equal(staged.dryRun, true);
  assert.equal(staged.activationAllowed, false);
  assert.ok(staged.auditRecords.every(record => record.tenantId === 'school-a'));
  assert.ok(staged.changes.some(change => change.type === 'teacher_transfer' && change.fromClassIds.includes('class-a') && change.toClassIds.includes('class-b')));
  assert.ok(staged.changes.some(change => change.type === 'drop_membership' && change.actorId === 'teacher-old'));
  assert.equal(staged.changes.some(change => change.type === 'drop_membership' && change.actorId === 'guardian-a'), false);
  assert.deepEqual(repeated.changes, []);
  assert.ok(repeated.warnings.includes('roster_batch_already_staged'));
  assert.equal(rollback.reversible, true);
  assert.equal(rollback.rollbackActions.length, staged.changes.length);
});

test('roster validation detects duplicate students guardian conflicts and unsafe raw payloads', () => {
  const batch = roster.normalizeRosterImportBatch({
    schemaVersion: 1,
    batchId: 'batch-conflicts',
    tenantId: 'school-a',
    tenantType: 'school',
    providerClass: 'classlink',
    mode: 'dry_run',
    idempotencyKey: 'school-a:batch-conflicts',
    receivedAt: '2026-05-04T14:30:00.000Z',
    identities: [
      { matchId: 'match-a1', tenantId: 'school-a', appOwnedLearnerId: 'learner-a', rosterRole: 'student', redactedProviderRef: 'classlink:student:hash-a', confidence: 0.91 },
      { matchId: 'match-a2', tenantId: 'school-a', appOwnedLearnerId: 'learner-a', rosterRole: 'student', redactedProviderRef: 'classlink:student:hash-b', confidence: 0.9 }
    ],
    membershipChanges: [
      { changeId: 'guardian-school', tenantId: 'school-a', actorId: 'guardian-a', role: 'guardian', action: 'upsert', learnerIds: ['learner-b'], redactedProviderRef: 'classlink:guardian:hash-a', providerPayload: { email: 'unsafe@example.test' } }
    ]
  });

  const result = roster.stageRosterImportBatch(roster.createRosterState({
    memberships: [{ tenantId: 'family-a', tenantType: 'family', actorId: 'guardian-a', role: 'guardian', status: 'active', learnerIds: ['learner-a'] }]
  }), batch);

  assert.ok(result.blockers.includes('duplicate_student_identity:learner-a'));
  assert.ok(result.blockers.includes('guardian_conflict:guardian-a'));
  assert.ok(result.blockers.includes('roster_membership_provider_payload_forbidden:guardian-school'));
  assert.equal(result.activationAllowed, false);
});

test('roster adapter boundary docs and package wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'roster-and-sso-boundaries.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /RosterImportBatch/);
  assert.match(docs, /dry-run/i);
  assert.match(docs, /rollback/i);
  assert.match(docs, /do not auto-merge family/i);
  assert.match(pkg.scripts['test:unit'], /tests\/roster-adapter-boundary\.test\.js/);
});
