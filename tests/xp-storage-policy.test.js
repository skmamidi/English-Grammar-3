const assert = require('node:assert/strict');
const test = require('node:test');

const {
  BACKEND_STORAGE_PATHS,
  evaluateBackendPolicy,
  evaluateBackendStoragePolicy
} = require('../server/backend-policy-rules');
const {
  deriveXpProjection,
  normalizeXpAwardEvent,
  normalizeXpProjection
} = require('../assets/xp-storage-policy');

const actors = require('./fixtures/backend-security/actors.json');
const serviceActor = {
  id: 'xp-adjudicator',
  role: 'server_service',
  serverOwned: true
};

test('XP award events are append-only sanitized records', () => {
  const event = normalizeXpAwardEvent({
    awardEventId: 'award-1',
    learnerId: 'learner-a',
    attemptId: 'attempt-1',
    idempotencyKey: 'idem-1',
    awardedXp: 82,
    awardedAt: '2030-04-29T12:00:00.000Z',
    source: 'xp-attempt-service',
    awardSummary: {
      schemaVersion: 1,
      awardedXp: 82,
      baseXp: 30,
      correctCount: 2,
      totalQuestions: 2,
      serverAuthoritative: true,
      question: 'Do not store prompt',
      choices: ['A', 'B'],
      correctAnswer: 0,
      learnerId: 'learner-a'
    },
    selectedAnswers: [0, 1]
  });

  assert.equal(event.schemaVersion, 1);
  assert.equal(event.awardEventId, 'award-1');
  assert.equal(event.learnerId, 'learner-a');
  assert.equal(event.awardedXp, 82);
  assert.equal(event.awardSummary.serverAuthoritative, true);
  assert.equal(JSON.stringify(event).includes('Do not store prompt'), false);
  assert.equal(JSON.stringify(event).includes('selectedAnswers'), false);
  assert.equal(Object.hasOwn(event.awardSummary, 'learnerId'), false);
});

test('XP projections are derived from award events for total week and month windows', () => {
  const projection = deriveXpProjection([
    normalizeXpAwardEvent({
      awardEventId: 'award-1',
      learnerId: 'learner-a',
      attemptId: 'attempt-1',
      awardedXp: 50,
      awardedAt: '2030-04-29T12:00:00.000Z'
    }),
    normalizeXpAwardEvent({
      awardEventId: 'award-2',
      learnerId: 'learner-a',
      attemptId: 'attempt-2',
      awardedXp: 25,
      awardedAt: '2030-04-01T12:00:00.000Z'
    }),
    normalizeXpAwardEvent({
      awardEventId: 'award-3',
      learnerId: 'learner-b',
      attemptId: 'attempt-3',
      awardedXp: 100,
      awardedAt: '2030-04-29T12:00:00.000Z'
    })
  ], {
    learnerId: 'learner-a',
    now: '2030-04-29T18:00:00.000Z',
    source: 'xp-projection-job'
  });

  assert.equal(projection.totalXp, 75);
  assert.equal(projection.currentWeeklyXp, 50);
  assert.equal(projection.currentMonthlyXp, 75);
  assert.equal(projection.source, 'xp-projection-job');
  assert.deepEqual(projection.periodIds, {
    weekly: 'weekly_2030_W18',
    monthly: 'monthly_2030_04',
    allTime: 'all_time'
  });
});

test('XP projections normalize only server-derived totals and never payload fields', () => {
  const projection = normalizeXpProjection({
    learnerId: 'learner-a',
    totalXp: 120,
    currentWeeklyXp: 80,
    currentMonthlyXp: 100,
    evaluatedAt: '2030-04-29T12:00:00.000Z',
    source: 'server',
    question: 'unsafe',
    answerKey: [1]
  });

  assert.equal(projection.schemaVersion, 1);
  assert.equal(projection.totalXp, 120);
  assert.equal(projection.currentWeeklyXp, 80);
  assert.equal(projection.currentMonthlyXp, 100);
  assert.equal(JSON.stringify(projection).includes('unsafe'), false);
});

test('backend XP storage rules keep awards and projections server-owned', () => {
  assert.equal(evaluateBackendPolicy({
    actor: actors.student,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.xpProjection('learner-a')
  }).allow, false);
  assert.equal(evaluateBackendPolicy({
    actor: actors.guardianLinked,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.xpProjection('learner-a')
  }).allow, false);
  assert.equal(evaluateBackendPolicy({
    actor: actors.systemAdmin,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.xpProjection('learner-a')
  }).allow, false);
  assert.equal(evaluateBackendPolicy({
    actor: serviceActor,
    operation: 'create',
    path: BACKEND_STORAGE_PATHS.xpAwardEvent('learner-a', 'award-1')
  }).allow, true);
  assert.equal(evaluateBackendPolicy({
    actor: serviceActor,
    operation: 'update',
    path: BACKEND_STORAGE_PATHS.xpAwardEvent('learner-a', 'award-1')
  }).allow, false);
  assert.equal(evaluateBackendPolicy({
    actor: serviceActor,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.xpProjection('learner-a')
  }).allow, true);
});

test('backend XP storage rules deny client leaderboard writes and unsafe XP documents', () => {
  assert.equal(evaluateBackendPolicy({
    actor: actors.student,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.leaderboardEntry('weekly_2030_W18', 'learner-a')
  }).allow, false);
  assert.equal(evaluateBackendPolicy({
    actor: serviceActor,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.leaderboardEntry('weekly_2030_W18', 'learner-a')
  }).allow, true);

  const unsafeAward = evaluateBackendStoragePolicy({
    actor: serviceActor,
    operation: 'create',
    path: BACKEND_STORAGE_PATHS.xpAwardEvent('learner-a', 'award-1'),
    document: {
      awardEventId: 'award-1',
      learnerId: 'learner-a',
      awardedXp: 10,
      answerKey: [0]
    }
  });

  assert.equal(unsafeAward.allow, false);
  assert.equal(unsafeAward.reason, 'backend_document_sensitive_learner_payload');
});
