const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  BACKEND_STORAGE_PATHS,
  assertBackendReadableDocumentSafe,
  evaluateBackendPolicy,
  evaluateBackendStoragePolicy,
  resolveBackendResource
} = require('../server/backend-policy-rules');

const actors = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'backend-security', 'actors.json'), 'utf8'));

test('backend policy maps canonical storage paths to access-control resources', () => {
  assert.deepEqual(resolveBackendResource('learners/learner-a/state'), {
    type: 'learnerProgress',
    id: 'learner-a',
    learnerId: 'learner-a',
    ownerLearnerId: 'learner-a',
    classId: ''
  });
  assert.deepEqual(resolveBackendResource('classes/class-a/assignments/assignment-1'), {
    type: 'assignment',
    id: 'assignment-1',
    learnerId: '',
    ownerLearnerId: '',
    classId: 'class-a'
  });
  assert.equal(resolveBackendResource('unknown/path').type, 'unknown');
});

test('student can read and write only their own learner state and active quiz', () => {
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'read', path: 'learners/learner-a/state' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'write', path: 'learners/learner-a/state' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'write', path: 'learners/learner-a/activeQuiz' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'create', path: 'learners/learner-a/xpAttempts/attempt-1' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'read', path: 'learners/learner-b/state' }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'write', path: 'learners/learner-b/state' }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'create', path: 'learners/learner-b/xpAttempts/attempt-1' }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'write', path: 'xpProjections/learner-a' }).allow, false);
});

test('XP award storage and projections are server owned while attempt submissions stay learner scoped', () => {
  const serviceActor = { id: 'xp-adjudicator', role: 'server_service', serverOwned: true };

  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'create', path: BACKEND_STORAGE_PATHS.xpAttemptSubmission('learner-a', 'attempt-1') }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'create', path: BACKEND_STORAGE_PATHS.xpAwardEvent('learner-a', 'award-1') }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'write', path: BACKEND_STORAGE_PATHS.xpProjection('learner-a') }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'write', path: BACKEND_STORAGE_PATHS.leaderboardEntry('weekly_2030_W18', 'participant-a') }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'write', path: BACKEND_STORAGE_PATHS.xpProjection('learner-a') }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: serviceActor, operation: 'create', path: BACKEND_STORAGE_PATHS.xpAwardEvent('learner-a', 'award-1') }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: serviceActor, operation: 'update', path: BACKEND_STORAGE_PATHS.xpAwardEvent('learner-a', 'award-1') }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: serviceActor, operation: 'write', path: BACKEND_STORAGE_PATHS.xpProjection('learner-a') }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: serviceActor, operation: 'write', path: BACKEND_STORAGE_PATHS.leaderboardEntry('weekly_2030_W18', 'participant-a') }).allow, true);
});

test('guardian can read linked learner summaries but cannot write unrelated learner data', () => {
  assert.equal(evaluateBackendPolicy({ actor: actors.guardianLinked, operation: 'read', path: 'learners/learner-a/sessions/session-1' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.guardianLinked, operation: 'read', path: 'dashboards/learners/learner-a' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.guardianLinked, operation: 'write', path: 'learners/learner-a/state' }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.guardianUnrelated, operation: 'read', path: 'learners/learner-a/questionReports/report-1' }).allow, false);
});

test('teacher can manage assigned learner and class paths only', () => {
  assert.equal(evaluateBackendPolicy({ actor: actors.teacherAssigned, operation: 'read', path: 'learners/learner-a/state' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.teacherAssigned, operation: 'write', path: 'classes/class-a/assignments/assignment-1' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.teacherAssigned, operation: 'read', path: 'dashboards/classes/class-a' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.teacherUnrelated, operation: 'read', path: 'learners/learner-a/state' }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.teacherUnrelated, operation: 'write', path: 'classes/class-a/assignments/assignment-1' }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.student, operation: 'read', path: 'learners/learner-a/assignments/assignment-1' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.guardianLinked, operation: 'read', path: 'learners/learner-a/assignments/assignment-1' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'read', path: 'classes/class-a/assignments/assignment-1' }).allow, false);
});

test('system admin is operational-only and audit events are append-only', () => {
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'read', path: 'config/featureFlags/server-selection' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'write', path: 'config/featureFlags/server-selection' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'read', path: 'releaseManifests/current' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'read', path: 'telemetrySummaries/selection-health' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'read', path: 'learners/learner-a/state' }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'create', path: 'auditEvents/audit-1' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'update', path: 'auditEvents/audit-1' }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'delete', path: 'auditEvents/audit-1' }).allow, false);
});

test('content reviewer publication access is scoped to publication paths', () => {
  assert.equal(evaluateBackendPolicy({ actor: actors.contentReviewer, operation: 'read', path: 'contentPublications/publication-1' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.contentReviewer, operation: 'write', path: 'contentPublications/publication-1' }).allow, true);
  assert.equal(evaluateBackendPolicy({ actor: actors.contentReviewer, operation: 'read', path: 'learners/learner-a/state' }).allow, false);
});

test('unknown roles parent preview unknown paths and secret paths deny by default', () => {
  assert.equal(evaluateBackendPolicy({ actor: actors.unknownRole, operation: 'read', path: 'learners/learner-a/state' }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.parentPreview, operation: 'read', path: 'learners/learner-a/state' }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'read', path: 'not-modeled/path' }).allow, false);
  assert.equal(evaluateBackendPolicy({ actor: actors.systemAdmin, operation: 'read', path: 'privateSigningKeys/selection-key-prod' }).allow, false);
});

test('backend readable documents reject private signing keys tokens and secret refs', () => {
  assert.doesNotThrow(() => assertBackendReadableDocumentSafe(BACKEND_STORAGE_PATHS.featureFlag('server-selection'), {
    enabled: true,
    rolloutPercent: 10
  }));
  assert.throws(() => assertBackendReadableDocumentSafe(BACKEND_STORAGE_PATHS.featureFlag('server-selection'), {
    enabled: true,
    privateKeyRef: 'projects/app/secrets/key'
  }), /backend_readable_secret_field/);
  assert.throws(() => assertBackendReadableDocumentSafe('releaseManifests/current', {
    serviceAccount: { client_email: 'bot@example.test' }
  }), /backend_readable_secret_field/);
});

test('backend storage policy denies writes that would expose secret fields', () => {
  const safeFlag = evaluateBackendStoragePolicy({
    actor: actors.systemAdmin,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.featureFlag('server-selection'),
    document: { enabled: true, rolloutPercent: 10 }
  });
  const unsafeFlag = evaluateBackendStoragePolicy({
    actor: actors.systemAdmin,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.featureFlag('server-selection'),
    document: { enabled: true, privateKeyRef: 'projects/app/secrets/key' }
  });

  assert.equal(safeFlag.allow, true);
  assert.equal(unsafeFlag.allow, false);
  assert.equal(unsafeFlag.reason, 'backend_document_secret_field');
});

test('backend storage policy rejects client-owned XP totals inside learner state', () => {
  const decision = evaluateBackendStoragePolicy({
    actor: actors.student,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.learnerState('learner-a'),
    document: {
      totalGems: 3,
      totalXp: 99999,
      xpProjection: {
        currentWeeklyXp: 99999
      }
    }
  });

  assert.equal(decision.allow, false);
  assert.equal(decision.reason, 'backend_document_client_xp_projection_denied');
});
