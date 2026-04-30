(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestMasteryModelPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DEFAULT_MASTERY_MODEL_POLICY = deepFreeze({
    policyVersion: 'mastery-model-v1',
    minimumAttempts: 3,
    lowAccuracyThreshold: 0.7,
    recoveryAccuracyThreshold: 0.8,
    secureAccuracyThreshold: 0.8,
    recencyWindowDays: 14,
    recoveryWindowDays: 7,
    maxRecommendations: 3,
    difficultyWeights: {
      easy: { correct: 0.9, incorrect: 1 },
      medium: { correct: 1, incorrect: 1 },
      hard: { correct: 1.15, incorrect: 0.75 }
    },
    masteryBands: [
      { code: 'insufficient_evidence', minAttempts: 0, minAccuracy: 0 },
      { code: 'needs_practice', minAttempts: 3, minAccuracy: 0 },
      { code: 'developing', minAttempts: 3, minAccuracy: 0.7 },
      { code: 'secure', minAttempts: 3, minAccuracy: 0.8 }
    ],
    evidenceLevels: {
      sparseMaxAttempts: 2
    },
    reasonPriority: [
      'overdue_review',
      'assignment_struggle',
      'low_recent_accuracy',
      'missed_recently',
      'low_attempt_count'
    ],
    reasonLabels: {
      low_recent_accuracy: 'Recent accuracy is below target.',
      missed_recently: 'Recent missed questions point to this skill.',
      overdue_review: 'Review items for this skill are due.',
      assignment_struggle: 'An active assignment shows struggle on this skill.',
      low_attempt_count: 'This skill needs more practice evidence.'
    }
  });

  function normalizeMasteryModelPolicy(overrides = {}) {
    const input = overrides && typeof overrides === 'object' ? overrides : {};
    const merged = Object.assign({}, clone(DEFAULT_MASTERY_MODEL_POLICY), input);
    merged.difficultyWeights = Object.assign(
      {},
      DEFAULT_MASTERY_MODEL_POLICY.difficultyWeights,
      input.difficultyWeights || {}
    );
    merged.evidenceLevels = Object.assign(
      {},
      DEFAULT_MASTERY_MODEL_POLICY.evidenceLevels,
      input.evidenceLevels || {}
    );
    merged.reasonLabels = Object.assign(
      {},
      DEFAULT_MASTERY_MODEL_POLICY.reasonLabels,
      input.reasonLabels || {}
    );
    merged.reasonPriority = normalizeStringArray(input.reasonPriority).length
      ? normalizeStringArray(input.reasonPriority)
      : DEFAULT_MASTERY_MODEL_POLICY.reasonPriority.slice();
    merged.masteryBands = Array.isArray(input.masteryBands)
      ? input.masteryBands.map(normalizeBand).filter(band => band.code)
      : DEFAULT_MASTERY_MODEL_POLICY.masteryBands.map(normalizeBand);
    merged.minimumAttempts = positiveInt(merged.minimumAttempts, DEFAULT_MASTERY_MODEL_POLICY.minimumAttempts);
    merged.lowAccuracyThreshold = ratio(merged.lowAccuracyThreshold, DEFAULT_MASTERY_MODEL_POLICY.lowAccuracyThreshold);
    merged.recoveryAccuracyThreshold = ratio(merged.recoveryAccuracyThreshold, DEFAULT_MASTERY_MODEL_POLICY.recoveryAccuracyThreshold);
    merged.secureAccuracyThreshold = ratio(merged.secureAccuracyThreshold, DEFAULT_MASTERY_MODEL_POLICY.secureAccuracyThreshold);
    merged.recencyWindowDays = positiveInt(merged.recencyWindowDays, DEFAULT_MASTERY_MODEL_POLICY.recencyWindowDays);
    merged.recoveryWindowDays = positiveInt(merged.recoveryWindowDays, DEFAULT_MASTERY_MODEL_POLICY.recoveryWindowDays);
    merged.maxRecommendations = positiveInt(merged.maxRecommendations, DEFAULT_MASTERY_MODEL_POLICY.maxRecommendations);
    return merged;
  }

  function classifyMasteryBand(evidence = {}, policy = DEFAULT_MASTERY_MODEL_POLICY) {
    const model = normalizeMasteryModelPolicy(policy);
    const attempts = positiveInt(evidence.attempts, 0);
    const accuracy = ratio(evidence.weightedAccuracy, 0);
    if (attempts < model.minimumAttempts) return 'insufficient_evidence';
    if (accuracy >= model.secureAccuracyThreshold) return 'secure';
    if (accuracy >= model.lowAccuracyThreshold) return 'developing';
    return 'needs_practice';
  }

  function classifyEvidenceLevel(evidence = {}, policy = DEFAULT_MASTERY_MODEL_POLICY) {
    const model = normalizeMasteryModelPolicy(policy);
    const attempts = positiveInt(evidence.attempts, 0);
    return attempts <= model.evidenceLevels.sparseMaxAttempts ? 'sparse' : 'sufficient';
  }

  function scoreAttempt(attempt = {}, policy = DEFAULT_MASTERY_MODEL_POLICY) {
    const model = normalizeMasteryModelPolicy(policy);
    const difficulty = normalizeDifficulty(attempt.difficulty);
    const correct = attempt.correct === true;
    const weights = model.difficultyWeights[difficulty] || model.difficultyWeights.medium;
    const weight = Math.max(0, Number(correct ? weights.correct : weights.incorrect) || 0);
    return {
      difficulty,
      correct,
      weight,
      earned: correct ? weight : 0
    };
  }

  function calculateWeightedAccuracy(scores) {
    const totals = (Array.isArray(scores) ? scores : []).reduce((acc, score) => {
      acc.weight += Math.max(0, Number(score && score.weight) || 0);
      acc.earned += Math.max(0, Number(score && score.earned) || 0);
      return acc;
    }, { earned: 0, weight: 0 });
    return totals.weight ? round(totals.earned / totals.weight) : 0;
  }

  function normalizeDifficulty(value) {
    const difficulty = safeString(value).toLowerCase();
    return ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium';
  }

  function normalizeBand(band) {
    const input = band && typeof band === 'object' ? band : {};
    return {
      code: safeString(input.code),
      minAttempts: positiveInt(input.minAttempts, 0),
      minAccuracy: ratio(input.minAccuracy, 0)
    };
  }

  function positiveInt(value, fallback) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  }

  function ratio(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= 1 ? number : fallback;
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    Object.keys(value).forEach(key => {
      if (value[key] && typeof value[key] === 'object') deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  return {
    DEFAULT_MASTERY_MODEL_POLICY,
    calculateWeightedAccuracy,
    classifyEvidenceLevel,
    classifyMasteryBand,
    normalizeDifficulty,
    normalizeMasteryModelPolicy,
    scoreAttempt
  };
});
