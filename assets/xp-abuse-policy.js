(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestXpAbusePolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function evaluateXpAttemptAbuse(input = {}) {
    const reasonCodes = [];
    const attemptId = safeString(input.attemptId || input.id);
    const previousAttemptIds = new Set(normalizeStringArray(input.previousAttemptIds || input.seenAttemptIds));
    const totalQuestions = normalizeCount(input.totalQuestions);
    const durationSeconds = resolveDurationSeconds(input);
    const repeatCount = normalizeCount(input.repeatCount || input.repeatedQuestionCount);
    const stretchGap = normalizeCount(input.stretchGap || input.difficultyStretchGap);
    const awardedXp = normalizeCount(input.awardedXp || input.xpAwarded);
    const contentVersion = normalizeCount(input.contentVersion);
    const latestContentVersion = normalizeCount(input.latestContentVersion);

    if (attemptId && previousAttemptIds.has(attemptId)) reasonCodes.push('duplicate_attempt');
    if (totalQuestions > 0 && durationSeconds > 0 && durationSeconds / totalQuestions < 2) reasonCodes.push('impossible_cadence');
    if (repeatCount >= 5) reasonCodes.push('excessive_repeats');
    if (contentVersion > 0 && latestContentVersion > 0 && latestContentVersion - contentVersion > 1) reasonCodes.push('stale_content');
    if (stretchGap > 2) reasonCodes.push('unsupported_stretch_gap');
    if (awardedXp > Math.max(120, totalQuestions * 40)) reasonCodes.push('unusual_award_spike');

    const uniqueReasons = Array.from(new Set(reasonCodes)).sort();
    const review = uniqueReasons.length > 0;
    return {
      decision: review ? 'review' : 'allow',
      practiceAllowed: true,
      awardEligible: !review,
      leaderboardEligible: !review,
      reasonCodes: uniqueReasons
    };
  }

  function buildAggregateXpFairnessReport(attempts = []) {
    const report = {
      schemaVersion: 1,
      totalAttempts: 0,
      gradeBuckets: {},
      awardBuckets: { none: 0, low: 0, medium: 0, high: 0 },
      cadenceBuckets: { fast: 0, expected: 0, slow: 0 },
      riskSignals: []
    };

    (Array.isArray(attempts) ? attempts : []).forEach(attempt => {
      const grade = normalizeCount(attempt.grade);
      const awardedXp = normalizeCount(attempt.awardedXp);
      const durationSeconds = normalizeCount(attempt.durationSeconds);
      report.totalAttempts += 1;
      if (grade > 0) increment(report.gradeBuckets, `grade_${grade}`);
      increment(report.awardBuckets, awardBucket(awardedXp));
      increment(report.cadenceBuckets, cadenceBucket(durationSeconds));
    });

    if (report.awardBuckets.high > Math.max(1, report.totalAttempts * 0.25)) report.riskSignals.push('high_award_skew');
    if (report.cadenceBuckets.fast > Math.max(1, report.totalAttempts * 0.25)) report.riskSignals.push('fast_cadence_skew');
    return report;
  }

  function resolveDurationSeconds(input) {
    if (Number.isFinite(Number(input.durationSeconds))) return normalizeCount(input.durationSeconds);
    const start = Date.parse(input.startedAt || '');
    const end = Date.parse(input.completedAt || '');
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) return Math.floor((end - start) / 1000);
    return 0;
  }

  function awardBucket(value) {
    if (value <= 0) return 'none';
    if (value < 50) return 'low';
    if (value < 150) return 'medium';
    return 'high';
  }

  function cadenceBucket(seconds) {
    if (seconds > 0 && seconds < 15) return 'fast';
    if (seconds > 180) return 'slow';
    return 'expected';
  }

  function increment(target, key) {
    target[key] = (target[key] || 0) + 1;
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function normalizeCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return 0;
    return Math.floor(number);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildAggregateXpFairnessReport,
    evaluateXpAttemptAbuse
  };
});
