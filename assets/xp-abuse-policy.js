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

  function evaluateMissionRewardAbuse(input = {}) {
    const reasonCodes = [];
    const missionId = safeString(input.missionId || input.id);
    const priorMissionAwardIds = new Set(normalizeStringArray(input.priorMissionAwardIds || input.previousMissionAwardIds));
    const awardedXp = normalizeCount(input.awardedXp || input.xpAwarded);
    const completedAt = Date.parse(input.completedAt || '');
    const previousCompletedAt = Date.parse(input.previousCompletedAt || '');

    if (missionId && priorMissionAwardIds.has(missionId)) reasonCodes.push('duplicate_mission_completion');
    if (Number.isFinite(completedAt) && Number.isFinite(previousCompletedAt) && completedAt >= previousCompletedAt) {
      const elapsedSeconds = Math.floor((completedAt - previousCompletedAt) / 1000);
      if (elapsedSeconds < 300) reasonCodes.push('rapid_mission_repeat');
    }
    if (awardedXp > 120) reasonCodes.push('unusual_mission_award_spike');
    if (input.leaderboardEligible === true) reasonCodes.push('mission_leaderboard_bonus_blocked');
    if (hasClientMissionBonus(input)) reasonCodes.push('client_mission_bonus_submitted');

    const uniqueReasons = Array.from(new Set(reasonCodes)).sort();
    const review = uniqueReasons.length > 0;
    return {
      decision: review ? 'review' : 'allow',
      practiceAllowed: true,
      awardEligible: !review,
      leaderboardEligible: false,
      reasonCodes: uniqueReasons
    };
  }

  function evaluateMissionEngagementAbuse(input = {}) {
    const reasonCodes = [];
    const missionCompletionCount = normalizeCount(input.missionCompletionCount || input.completions);
    const distinctMissionCount = normalizeCount(input.distinctMissionCount || input.distinctMissions);
    const stepsCompleted = normalizeCount(input.stepsCompleted);
    const durationSeconds = normalizeCount(input.durationSeconds);
    const assignmentCreatesIn24h = normalizeCount(input.assignmentCreatesIn24h || input.assignmentCount24h);
    const reminderAttemptsIn24h = normalizeCount(input.reminderAttemptsIn24h || input.reminderCount24h);
    const reminderDismissalsIn7d = normalizeCount(input.reminderDismissalsIn7d || input.reminderDismissals);

    if (missionCompletionCount >= 8 && distinctMissionCount > 0 && missionCompletionCount / distinctMissionCount >= 4) {
      reasonCodes.push('mission_grinding');
    }
    if (stepsCompleted > 0 && durationSeconds > 0 && durationSeconds / stepsCompleted < 15) {
      reasonCodes.push('impossible_mission_cadence');
    }
    if (assignmentCreatesIn24h >= 8) reasonCodes.push('assignment_spam');
    if (reminderAttemptsIn24h >= 5 || reminderDismissalsIn7d >= 4) reasonCodes.push('reminder_fatigue');

    const uniqueReasons = Array.from(new Set(reasonCodes)).sort();
    const review = uniqueReasons.length > 0;
    return {
      decision: review ? 'review' : 'allow',
      practiceAllowed: true,
      assignmentEligible: !uniqueReasons.includes('assignment_spam'),
      reminderEligible: !uniqueReasons.includes('reminder_fatigue'),
      reasonCodes: uniqueReasons
    };
  }

  function buildAggregateMissionFairnessReport(observations = []) {
    const report = {
      schemaVersion: 1,
      totalObservations: 0,
      gradeBuckets: {},
      riskSignals: []
    };

    (Array.isArray(observations) ? observations : []).forEach(observation => {
      const grade = normalizeCount(observation.grade);
      if (grade <= 0) return;
      const key = `grade_${grade}`;
      if (!report.gradeBuckets[key]) report.gradeBuckets[key] = { observations: 0, missionStarts: 0, completions: 0 };
      report.totalObservations += 1;
      report.gradeBuckets[key].observations += 1;
      report.gradeBuckets[key].missionStarts += normalizeCount(observation.missionStarts || observation.starts);
      report.gradeBuckets[key].completions += normalizeCount(observation.completions || observation.missionCompletions);
    });

    if (hasGradeSkew(report.gradeBuckets)) report.riskSignals.push('grade_skew');
    return report;
  }

  function hasClientMissionBonus(input) {
    return Object.prototype.hasOwnProperty.call(input, 'clientAwardedXp') ||
      Object.prototype.hasOwnProperty.call(input, 'clientMissionBonusXp') ||
      Object.prototype.hasOwnProperty.call(input, 'missionBonusXp') ||
      Object.prototype.hasOwnProperty.call(input, 'submittedMissionBonusXp');
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

  function hasGradeSkew(gradeBuckets) {
    const buckets = Object.values(gradeBuckets);
    if (buckets.length < 2) return false;
    const rates = buckets.map(bucket => bucket.missionStarts > 0 ? bucket.completions / bucket.missionStarts : 0);
    return Math.max(...rates) - Math.min(...rates) > 0.5;
  }

  return {
    buildAggregateMissionFairnessReport,
    buildAggregateXpFairnessReport,
    evaluateMissionEngagementAbuse,
    evaluateMissionRewardAbuse,
    evaluateXpAttemptAbuse
  };
});
