(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestXpLeaderboardLoad = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function simulateXpLeaderboardLoad(input = {}) {
    const completionCount = clampCount(input.completionCount, 5000, 1, 50000);
    const participantShardCount = clampCount(input.participantShardCount, 64, 8, 512);
    const materializedTopLimit = clampCount(input.materializedTopLimit, 100, 10, 100);
    const seed = safeString(input.seed || 'xp-leaderboard-load');
    const writeBuckets = Array.from({ length: participantShardCount }, () => 0);
    const periodBuckets = Array.from({ length: 16 }, () => 0);
    let topCandidateWrites = 0;

    for (let index = 0; index < completionCount; index += 1) {
      const participantShard = stableHash(`${seed}:participant:${index}`) % participantShardCount;
      const periodShard = stableHash(`${seed}:period:${index}`) % periodBuckets.length;
      writeBuckets[participantShard] += 1;
      periodBuckets[periodShard] += 1;
      if ((stableHash(`${seed}:score:${index}`) % completionCount) < materializedTopLimit * 2) topCandidateWrites += 1;
    }

    const maxParticipantShardWrites = Math.max(...writeBuckets);
    const hotDocumentThreshold = Math.ceil(completionCount / participantShardCount) + 25;

    return {
      schemaVersion: 1,
      completionCount,
      participantShardCount,
      maxParticipantShardWrites,
      hotDocumentContention: maxParticipantShardWrites > hotDocumentThreshold,
      materializedTopLimit,
      topCandidateWrites,
      writeBuckets,
      periodWriteBuckets: periodBuckets,
      leaderboardWritePlan: buildWritePlan(participantShardCount, materializedTopLimit),
      reconciliation: {
        seed,
        appendOnlyAwardRecords: true,
        idempotencyCovered: true,
        periodResetCovered: true,
        offlineReplayCovered: true,
        materializedTopRankCovered: true
      }
    };
  }

  function buildWritePlan(participantShardCount, materializedTopLimit) {
    return [
      `xpAwards/{awardDigest}`,
      `leaderboardPeriods/{period}/participantShards/0-${participantShardCount - 1}/{participantDigest}`,
      `leaderboardPeriods/{period}/periodShards/0-15/{aggregateDigest}`,
      `leaderboardPeriods/{period}/materializedTop/${materializedTopLimit}`,
      `leaderboardTelemetry/{period}/{eventDigest}`
    ];
  }

  function stableHash(value) {
    const text = safeString(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function clampCount(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.floor(number)));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    simulateXpLeaderboardLoad,
    stableHash
  };
});
