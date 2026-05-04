const assert = require('node:assert/strict');
const test = require('node:test');

const load = require('../assets/xp-leaderboard-load');

test('leaderboard load simulation avoids hot-document contention for 5000 completions', () => {
  const result = load.simulateXpLeaderboardLoad({
    completionCount: 5000,
    participantShardCount: 64,
    materializedTopLimit: 100,
    seed: 'pr-219'
  });

  assert.equal(result.completionCount, 5000);
  assert.equal(result.participantShardCount, 64);
  assert.equal(result.hotDocumentContention, false);
  assert.ok(result.maxParticipantShardWrites <= 100);
  assert.ok(result.materializedTopLimit <= 100);
  assert.equal(result.leaderboardWritePlan.some(path => /learner|student|uid/i.test(path)), false);
});

test('leaderboard load simulation produces deterministic reconciliation evidence', () => {
  const first = load.simulateXpLeaderboardLoad({ completionCount: 5000, seed: 'same-seed' });
  const second = load.simulateXpLeaderboardLoad({ completionCount: 5000, seed: 'same-seed' });

  assert.deepEqual(first.reconciliation, second.reconciliation);
  assert.deepEqual(first.writeBuckets, second.writeBuckets);
  assert.equal(first.reconciliation.periodResetCovered, true);
  assert.equal(first.reconciliation.offlineReplayCovered, true);
  assert.equal(first.reconciliation.materializedTopRankCovered, true);
});
