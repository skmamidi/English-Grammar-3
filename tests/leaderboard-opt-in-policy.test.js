const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyLeaderboardOptInChange,
  buildLeaderboardOptInDashboardProjection,
  canManageLeaderboardOptIn,
  createLeaderboardRemovalIntent,
  normalizeLeaderboardProfile,
  validateLeaderboardAlias
} = require('../assets/leaderboard-opt-in-policy');

const actors = require('./fixtures/backend-security/actors.json');

test('leaderboard participation is off by default and keeps personal XP separate', () => {
  const profile = normalizeLeaderboardProfile({
    personalXpProjectionRef: 'xpProjections/learner-a',
    totalXp: 99999,
    leaderboardAlias: 'student@example.test'
  });

  assert.equal(profile.leaderboardOptIn, false);
  assert.equal(profile.leaderboardAlias, '');
  assert.equal(profile.personalXpProjectionRef, 'xpProjections/learner-a');
  assert.equal(Object.hasOwn(profile, 'totalXp'), false);
});

test('linked guardians can enable edit and disable leaderboard participation with safe aliases', () => {
  const enabled = applyLeaderboardOptInChange({
    actor: actors.guardianLinked,
    learnerId: 'learner-a',
    action: 'enable',
    alias: 'Amber Kite',
    now: '2030-04-29T12:00:00.000Z',
    guardianConsent: { leaderboardParticipation: true },
    featureFlags: { leaderboardParticipation: true }
  });
  const edited = applyLeaderboardOptInChange({
    actor: actors.guardianLinked,
    learnerId: 'learner-a',
    action: 'edit',
    alias: 'Cedar Spark',
    currentProfile: enabled.profile,
    now: '2030-04-29T12:05:00.000Z',
    guardianConsent: { leaderboardParticipation: true },
    featureFlags: { leaderboardParticipation: true }
  });
  const disabled = applyLeaderboardOptInChange({
    actor: actors.guardianLinked,
    learnerId: 'learner-a',
    action: 'disable',
    currentProfile: edited.profile,
    now: '2030-04-29T12:10:00.000Z',
    guardianConsent: { leaderboardParticipation: true },
    featureFlags: { leaderboardParticipation: true }
  });

  assert.equal(enabled.allowed, true);
  assert.equal(enabled.profile.leaderboardOptIn, true);
  assert.equal(enabled.profile.leaderboardAlias, 'Amber Kite');
  assert.equal(enabled.profile.consent.authorizedByRole, 'parent_guardian');
  assert.equal(edited.profile.leaderboardAlias, 'Cedar Spark');
  assert.equal(disabled.profile.leaderboardOptIn, false);
  assert.equal(disabled.profile.removalIntent.removeFromFutureMaterializations, true);
  assert.equal(disabled.profile.personalXpProjectionRef, '');
});

test('teacher authorization is scoped and requires school policy', () => {
  assert.equal(canManageLeaderboardOptIn({
    actor: actors.teacherAssigned,
    learnerId: 'learner-a',
    classId: 'class-a',
    schoolPolicy: { leaderboardParticipation: true },
    featureFlags: { leaderboardParticipation: true }
  }).allowed, true);
  assert.equal(canManageLeaderboardOptIn({
    actor: actors.teacherAssigned,
    learnerId: 'learner-a',
    classId: 'class-a',
    schoolPolicy: { leaderboardParticipation: false },
    featureFlags: { leaderboardParticipation: true }
  }).reason, 'institution_policy_denied');
  assert.equal(canManageLeaderboardOptIn({
    actor: actors.teacherUnrelated,
    learnerId: 'learner-a',
    classId: 'class-a',
    schoolPolicy: { leaderboardParticipation: true },
    featureFlags: { leaderboardParticipation: true }
  }).reason, 'relationship_scope_denied');
});

test('students parent preview and unrelated guardians cannot enable leaderboard participation', () => {
  assert.equal(canManageLeaderboardOptIn({
    actor: actors.student,
    learnerId: 'learner-a',
    guardianConsent: { leaderboardParticipation: true },
    featureFlags: { leaderboardParticipation: true }
  }).reason, 'guardian_or_teacher_authorization_required');
  assert.equal(canManageLeaderboardOptIn({
    actor: actors.parentPreview,
    learnerId: 'learner-a',
    guardianConsent: { leaderboardParticipation: true },
    featureFlags: { leaderboardParticipation: true }
  }).reason, 'parent_preview_read_only');
  assert.equal(canManageLeaderboardOptIn({
    actor: actors.guardianUnrelated,
    learnerId: 'learner-a',
    guardianConsent: { leaderboardParticipation: true },
    featureFlags: { leaderboardParticipation: true }
  }).reason, 'relationship_scope_denied');
});

test('leaderboard alias validation rejects identity-bearing strings', () => {
  ['student@example.test', 'learner-a', 'Student 12345', 'Jane Smith', 'user_abc'].forEach(alias => {
    assert.equal(validateLeaderboardAlias(alias).valid, false, alias);
  });
  assert.deepEqual(validateLeaderboardAlias('Pine Rocket'), {
    valid: true,
    alias: 'Pine Rocket',
    errors: []
  });
});

test('opt-out removal intent preserves personal XP while removing future leaderboard visibility', () => {
  const intent = createLeaderboardRemovalIntent({
    participantRef: 'leaderboardParticipants/participant-a',
    personalXpProjectionRef: 'xpProjections/learner-a',
    requestedAt: '2030-04-29T12:00:00.000Z',
    requestedBy: 'guardians/guardian-linked'
  });

  assert.equal(intent.removeFromFutureMaterializations, true);
  assert.equal(intent.preservePersonalXpProjectionRef, 'xpProjections/learner-a');
  assert.equal(JSON.stringify(intent).includes('learner-a/state'), false);
});

test('dashboard projection exposes safe controls for opt-in and opt-out states', () => {
  const disabled = buildLeaderboardOptInDashboardProjection({
    actor: actors.guardianLinked,
    learnerId: 'learner-a',
    profile: normalizeLeaderboardProfile(),
    guardianConsent: { leaderboardParticipation: true },
    featureFlags: { leaderboardParticipation: true }
  });
  const enabled = buildLeaderboardOptInDashboardProjection({
    actor: actors.guardianLinked,
    learnerId: 'learner-a',
    profile: normalizeLeaderboardProfile({
      leaderboardOptIn: true,
      leaderboardAlias: 'Amber Kite',
      participantRef: 'leaderboardParticipants/participant-a'
    }),
    guardianConsent: { leaderboardParticipation: true },
    featureFlags: { leaderboardParticipation: true }
  });

  assert.equal(disabled.state, 'opted_out');
  assert.equal(disabled.canEnable, true);
  assert.equal(disabled.canDisable, false);
  assert.equal(enabled.state, 'opted_in');
  assert.equal(enabled.canEditAlias, true);
  assert.equal(enabled.canDisable, true);
  assert.equal(JSON.stringify(enabled).includes('learner-a'), false);
});
