const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_LEADERBOARD_TOP_LIMIT,
  MATERIALIZED_LEADERBOARD_LIMIT,
  archiveLeaderboardPeriod,
  buildLeaderboardReadModel,
  getLeaderboardPeriodIds,
  getLeaderboardPeriodWindow,
  materializeLeaderboardProjection,
  normalizeLeaderboardEntry
} = require('../assets/leaderboard-domain');
const {
  BACKEND_STORAGE_PATHS,
  evaluateBackendPolicy
} = require('../server/backend-policy-rules');

const serviceActor = { id: 'leaderboard-projector', role: 'server_service', serverOwned: true };
const studentActor = { id: 'student-user-a', role: 'student', learnerId: 'learner-a' };

test('leaderboard period ids are deterministic across UTC week and month boundaries', () => {
  assert.deepEqual(getLeaderboardPeriodIds('2029-12-30T23:59:59.000Z'), {
    weekly: 'weekly_2029_W52',
    monthly: 'monthly_2029_12',
    allTime: 'all_time'
  });
  assert.deepEqual(getLeaderboardPeriodIds('2029-12-31T00:00:00.000Z'), {
    weekly: 'weekly_2030_W01',
    monthly: 'monthly_2029_12',
    allTime: 'all_time'
  });
  assert.deepEqual(getLeaderboardPeriodIds('2030-05-01T00:00:00.000Z'), {
    weekly: 'weekly_2030_W18',
    monthly: 'monthly_2030_05',
    allTime: 'all_time'
  });
});

test('leaderboard period windows reset weekly on Monday UTC and monthly on the first', () => {
  assert.deepEqual(getLeaderboardPeriodWindow('weekly_2030_W01'), {
    periodId: 'weekly_2030_W01',
    periodType: 'weekly',
    startsAt: '2029-12-31T00:00:00.000Z',
    endsAt: '2030-01-07T00:00:00.000Z'
  });
  assert.deepEqual(getLeaderboardPeriodWindow('monthly_2030_05'), {
    periodId: 'monthly_2030_05',
    periodType: 'monthly',
    startsAt: '2030-05-01T00:00:00.000Z',
    endsAt: '2030-06-01T00:00:00.000Z'
  });
  assert.deepEqual(getLeaderboardPeriodWindow('all_time'), {
    periodId: 'all_time',
    periodType: 'all_time',
    startsAt: '',
    endsAt: ''
  });
});

test('leaderboard materialization ranks by XP with stable tie breakers and top limits', () => {
  const projection = materializeLeaderboardProjection({
    periodId: 'weekly_2030_W18',
    generatedAt: '2030-04-29T12:00:00.000Z',
    entries: [
      entry('participant-b', 'Blue Comet', 120, '2030-04-29T12:01:00.000Z', 4),
      entry('participant-a', 'Amber Kite', 120, '2030-04-29T12:00:00.000Z', 4),
      entry('participant-c', 'Cedar Spark', 90, '2030-04-29T12:02:00.000Z', 3)
    ]
  });

  assert.equal(projection.materializedLimit, MATERIALIZED_LEADERBOARD_LIMIT);
  assert.equal(projection.defaultReadLimit, DEFAULT_LEADERBOARD_TOP_LIMIT);
  assert.deepEqual(projection.entries.map(item => [item.rank, item.participantRef, item.score]), [
    [1, 'leaderboardParticipants/participant-a', 120],
    [2, 'leaderboardParticipants/participant-b', 120],
    [3, 'leaderboardParticipants/participant-c', 90]
  ]);
});

test('leaderboard entries reject non-opted-in and identity-bearing records', () => {
  assert.throws(() => normalizeLeaderboardEntry({
    participantRef: 'leaderboardParticipants/participant-a',
    displayAlias: 'student@example.test',
    score: 10,
    optedIn: true
  }), /leaderboard_alias_identity_bearing/);
  assert.throws(() => normalizeLeaderboardEntry({
    participantRef: 'leaderboardParticipants/participant-a',
    displayAlias: 'Learner A',
    learnerId: 'learner-a',
    score: 10,
    optedIn: true
  }), /leaderboard_entry_identity_field_denied/);
  assert.throws(() => normalizeLeaderboardEntry({
    participantRef: 'leaderboardParticipants/participant-a',
    displayAlias: 'Amber Kite',
    score: 10,
    optedIn: false
  }), /leaderboard_entry_opt_in_required/);
});

test('leaderboard read model returns top entries and own relative rank without raw ids', () => {
  const projection = materializeLeaderboardProjection({
    periodId: 'monthly_2030_04',
    generatedAt: '2030-04-29T12:00:00.000Z',
    entries: [
      entry('participant-a', 'Amber Kite', 200, '2030-04-29T12:00:00.000Z', 8),
      entry('participant-b', 'Blue Comet', 180, '2030-04-29T12:01:00.000Z', 7),
      entry('participant-c', 'Cedar Spark', 120, '2030-04-29T12:02:00.000Z', 6)
    ]
  });
  const readModel = buildLeaderboardReadModel(projection, {
    participantRef: 'leaderboardParticipants/participant-c',
    limit: 2
  });

  assert.equal(readModel.topEntries.length, 2);
  assert.equal(readModel.ownEntry.rank, 3);
  assert.equal(readModel.ownEntry.displayAlias, 'Cedar Spark');
  assert.equal(JSON.stringify(readModel).includes('learner-a'), false);
  assert.equal(JSON.stringify(readModel).includes('email'), false);
});

test('archived leaderboard periods are immutable for future materialization', () => {
  const projection = materializeLeaderboardProjection({
    periodId: 'weekly_2030_W18',
    generatedAt: '2030-04-29T12:00:00.000Z',
    entries: [entry('participant-a', 'Amber Kite', 120, '2030-04-29T12:00:00.000Z', 4)]
  });
  const archived = archiveLeaderboardPeriod(projection, {
    archivedAt: '2030-05-04T00:00:00.000Z',
    archiveReason: 'weekly_reset'
  });

  assert.equal(archived.status, 'archived');
  assert.equal(archived.archivedAt, '2030-05-04T00:00:00.000Z');
  assert.throws(() => materializeLeaderboardProjection(Object.assign({}, archived, {
    entries: [entry('participant-b', 'Blue Comet', 150, '2030-05-04T00:01:00.000Z', 5)]
  })), /leaderboard_period_archived/);
});

test('backend policy allows only server-owned leaderboard materialization writes', () => {
  assert.equal(evaluateBackendPolicy({
    actor: studentActor,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.leaderboardEntry('weekly_2030_W18', 'participant-a')
  }).allow, false);
  assert.equal(evaluateBackendPolicy({
    actor: serviceActor,
    operation: 'write',
    path: BACKEND_STORAGE_PATHS.leaderboardEntry('weekly_2030_W18', 'participant-a')
  }).allow, true);
});

function entry(id, alias, score, lastAwardedAt, awardCount) {
  return {
    participantRef: `leaderboardParticipants/${id}`,
    displayAlias: alias,
    score,
    lastAwardedAt,
    awardCount,
    optedIn: true
  };
}
