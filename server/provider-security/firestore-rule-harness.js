const {
  BACKEND_STORAGE_PATHS,
  evaluateBackendStoragePolicy
} = require('../backend-policy-rules');

const FIRESTORE_RULE_VERSION = 'firestore-fake-emulator-v1';

const FIRESTORE_SECURITY_RULE_SCENARIOS = Object.freeze([
  scenario('deny-unknown-path', 'systemAdmin', 'read', 'unmodeled/provider/path'),
  scenario('deny-unauthenticated-learner-read', '', 'read', BACKEND_STORAGE_PATHS.learnerState('learner-a')),
  scenario('deny-parent-preview', 'parentPreview', 'read', BACKEND_STORAGE_PATHS.learnerState('learner-a')),
  scenario('allow-student-own-state-write', 'student', 'write', BACKEND_STORAGE_PATHS.learnerState('learner-a'), { mastery: { nouns: 0.8 } }),
  scenario('deny-student-other-state-read', 'student', 'read', BACKEND_STORAGE_PATHS.learnerState('learner-b')),
  scenario('allow-student-xp-attempt-create', 'student', 'create', BACKEND_STORAGE_PATHS.xpAttemptSubmission('learner-a', 'attempt-1'), {
    attemptId: 'attempt-1',
    questionRefs: [{ id: 'grammar-sentence-types-q0001', contentHash: 'sha256:abc' }],
    selectedAnswers: [{ questionId: 'grammar-sentence-types-q0001', selectedIndex: 0 }]
  }),
  scenario('deny-student-xp-projection-write', 'student', 'write', BACKEND_STORAGE_PATHS.xpProjection('learner-a'), { totalXp: 99999 }),
  scenario('allow-server-xp-award-create', 'serverService', 'create', BACKEND_STORAGE_PATHS.xpAwardEvent('learner-a', 'award-1'), {
    awardEventId: 'award-1',
    learnerId: 'learner-a',
    awardedXp: 10
  }),
  scenario('deny-server-xp-award-update', 'serverService', 'update', BACKEND_STORAGE_PATHS.xpAwardEvent('learner-a', 'award-1'), { awardedXp: 20 }),
  scenario('allow-server-xp-projection-write', 'serverService', 'write', BACKEND_STORAGE_PATHS.xpProjection('learner-a'), { totalXp: 10, currentWeeklyXp: 10, currentMonthlyXp: 10 }),
  scenario('allow-server-leaderboard-write', 'serverService', 'write', BACKEND_STORAGE_PATHS.leaderboardEntry('weekly_2030_W18', 'participant-a'), {
    participantRef: 'leaderboardParticipants/participant-a',
    displayAlias: 'Amber Kite',
    score: 10
  }),
  scenario('allow-linked-guardian-read', 'guardianLinked', 'read', BACKEND_STORAGE_PATHS.savedSession('learner-a', 'session-1')),
  scenario('deny-unlinked-guardian-read', 'guardianUnrelated', 'read', BACKEND_STORAGE_PATHS.questionReport('learner-a', 'report-1')),
  scenario('allow-teacher-class-assignment-write', 'teacherAssigned', 'write', BACKEND_STORAGE_PATHS.assignmentForClass('class-a', 'assignment-1'), { dueAt: '2026-06-01' }),
  scenario('deny-unassigned-teacher-class-read', 'teacherUnrelated', 'read', BACKEND_STORAGE_PATHS.classDashboard('class-a')),
  scenario('allow-system-admin-feature-flag-write', 'systemAdmin', 'write', BACKEND_STORAGE_PATHS.featureFlag('server-selection'), { enabled: true, rolloutPercent: 10 }),
  scenario('deny-system-admin-learner-state-read', 'systemAdmin', 'read', BACKEND_STORAGE_PATHS.learnerState('learner-a')),
  scenario('allow-content-reviewer-publication-write', 'contentReviewer', 'write', BACKEND_STORAGE_PATHS.contentPublication('publication-1'), { status: 'approved' }),
  scenario('allow-audit-create', 'systemAdmin', 'create', BACKEND_STORAGE_PATHS.auditEvent('audit-1'), { action: 'provider-rule-check', actorId: 'admin-1' }),
  scenario('deny-audit-update', 'systemAdmin', 'update', BACKEND_STORAGE_PATHS.auditEvent('audit-1'), { action: 'tamper' }),
  scenario('deny-secret-field-write', 'systemAdmin', 'write', BACKEND_STORAGE_PATHS.featureFlag('server-selection'), { enabled: true, privateKeyRef: 'projects/app/secrets/signing-key' }),
  scenario('deny-secret-path-read', 'systemAdmin', 'read', 'privateSigningKeys/selection-key-prod')
]);

function buildFirestoreSecurityRuleFixture(options = {}) {
  const actors = options.actors || {};
  const scenarios = FIRESTORE_SECURITY_RULE_SCENARIOS.map(ruleScenario => {
    const auth = authForActor(actors[ruleScenario.actorKey]);
    const expected = evaluateBackendStoragePolicy({
      actor: actorFromAuth(auth),
      operation: ruleScenario.operation,
      path: ruleScenario.path,
      document: ruleScenario.document
    });
    return {
      id: ruleScenario.id,
      provider: 'firestore',
      ruleVersion: FIRESTORE_RULE_VERSION,
      operation: ruleScenario.operation,
      path: ruleScenario.path,
      actorKey: ruleScenario.actorKey,
      auth,
      document: clone(ruleScenario.document),
      expected: {
        allow: expected.allow,
        reason: expected.reason,
        resourceType: expected.resource.type
      }
    };
  });

  return {
    provider: 'firestore',
    emulator: 'fake-firestore-rules',
    ruleVersion: FIRESTORE_RULE_VERSION,
    scenarios
  };
}

function runFirestoreRuleParity(options = {}) {
  const actors = options.actors || {};
  const fixture = options.fixture || buildFirestoreSecurityRuleFixture({ actors });
  const results = fixture.scenarios.map(entry => {
    const providerDecision = evaluateFirestoreSecurityRule(entry);
    const backendDecision = evaluateBackendStoragePolicy({
      actor: actorFromAuth(entry.auth),
      operation: entry.operation,
      path: entry.path,
      document: entry.document
    });
    return {
      id: entry.id,
      expectedAllow: backendDecision.allow,
      providerAllow: providerDecision.allow,
      expectedReason: backendDecision.reason,
      providerReason: providerDecision.reason
    };
  });
  const mismatches = results.filter(result =>
    result.expectedAllow !== result.providerAllow || result.expectedReason !== result.providerReason
  );

  return {
    provider: fixture.provider,
    emulator: fixture.emulator,
    ruleVersion: fixture.ruleVersion,
    total: results.length,
    summary: {
      allowed: results.filter(result => result.providerAllow).length,
      denied: results.filter(result => !result.providerAllow).length
    },
    mismatches,
    results
  };
}

function evaluateFirestoreSecurityRule(input = {}) {
  const auth = input.auth || null;
  const actor = actorFromAuth(auth);
  const decision = evaluateBackendStoragePolicy({
    actor,
    operation: input.operation,
    path: input.path,
    document: input.document
  });

  return {
    allow: decision.allow,
    reason: decision.reason,
    provider: 'firestore',
    emulator: 'fake-firestore-rules',
    resource: decision.resource
  };
}

function authForActor(actor) {
  if (!actor || !actor.id) return null;
  return {
    uid: actor.id,
    token: clone(actor)
  };
}

function actorFromAuth(auth) {
  if (!auth || !auth.token || typeof auth.token !== 'object') return {};
  return Object.assign({}, auth.token, { id: auth.token.id || auth.uid });
}

function scenario(id, actorKey, operation, path, document) {
  return Object.freeze({
    id,
    actorKey,
    operation,
    path,
    document: document ? Object.freeze(clone(document)) : undefined
  });
}

function clone(value) {
  return value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
}

module.exports = {
  FIRESTORE_RULE_VERSION,
  FIRESTORE_SECURITY_RULE_SCENARIOS,
  buildFirestoreSecurityRuleFixture,
  evaluateFirestoreSecurityRule,
  runFirestoreRuleParity
};
