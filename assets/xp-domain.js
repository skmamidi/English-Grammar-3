(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestXpDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const XP_SCHEMA_VERSION = 1;
  const XP_BPS_DENOMINATOR = 10000;
  const BASE_XP_BY_DIFFICULTY = Object.freeze({
    easy: 10,
    medium: 20,
    hard: 30
  });
  const STRETCH_MULTIPLIER_BPS = Object.freeze({
    0: 10000,
    1: 15000,
    2: 20000
  });
  const COMPLETION_THRESHOLDS = Object.freeze([
    { minPercent: 100, multiplierBps: 30000 },
    { minPercent: 95, multiplierBps: 20000 },
    { minPercent: 85, multiplierBps: 12000 },
    { minPercent: 75, multiplierBps: 11000 },
    { minPercent: 0, multiplierBps: 10000 }
  ]);
  const FORBIDDEN_ATTEMPT_FIELDS = new Set([
    'answer',
    'answerKey',
    'choices',
    'correctAnswer',
    'explanation',
    'explanations',
    'prompt',
    'question',
    'questionText'
  ]);

  function getBaseQuestionXp(difficulty) {
    const key = safeString(difficulty).toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(BASE_XP_BY_DIFFICULTY, key)) {
      throw new Error('xp_difficulty_invalid');
    }
    return BASE_XP_BY_DIFFICULTY[key];
  }

  function getStretchMultiplierBps(options = {}) {
    const assignedGrade = normalizeGrade(options.assignedGrade);
    const quizGrade = normalizeGrade(options.quizGrade);
    const stretchGap = Math.max(0, quizGrade - assignedGrade);
    if (stretchGap > 2) throw new Error('xp_stretch_gap_unsupported');
    return STRETCH_MULTIPLIER_BPS[stretchGap];
  }

  function getCompletionMultiplierBps(options = {}) {
    const correctCount = normalizeNonNegativeInteger(options.correctCount, 'xp_accuracy_invalid');
    const totalQuestions = normalizePositiveInteger(options.totalQuestions, 'xp_accuracy_invalid');
    if (correctCount > totalQuestions) throw new Error('xp_accuracy_invalid');
    const percent = Math.floor((correctCount * 10000) / totalQuestions) / 100;
    const match = COMPLETION_THRESHOLDS.find(threshold => percent >= threshold.minPercent);
    return match ? match.multiplierBps : 10000;
  }

  function calculateQuestionXp(question = {}, options = {}) {
    if (hasForbiddenAttemptPayload(question)) throw new Error('xp_question_payload_forbidden');
    if (!question.correct) return 0;
    const baseXp = getBaseQuestionXp(question.difficulty);
    const stretchMultiplierBps = getStretchMultiplierBps(options);
    return roundBps(baseXp, stretchMultiplierBps);
  }

  function calculateXpAwardSummary(options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, 'clientAwardedXp') ||
      Object.prototype.hasOwnProperty.call(options, 'submittedXp') ||
      Object.prototype.hasOwnProperty.call(options, 'awardedXp') ||
      Object.prototype.hasOwnProperty.call(options, 'missionBonusXp') ||
      Object.prototype.hasOwnProperty.call(options, 'clientMissionBonusXp') ||
      Object.prototype.hasOwnProperty.call(options, 'submittedMissionBonusXp')) {
      throw new Error('xp_client_award_not_accepted');
    }
    const questions = Array.isArray(options.questions) ? options.questions : [];
    if (!questions.length) throw new Error('xp_questions_required');
    const assignedGrade = normalizeGrade(options.assignedGrade);
    const quizGrade = normalizeGrade(options.quizGrade);
    const stretchGap = Math.max(0, quizGrade - assignedGrade);
    const stretchMultiplierBps = getStretchMultiplierBps({ assignedGrade, quizGrade });
    let correctCount = 0;
    const baseCorrectXp = questions.reduce((sum, question) => {
      if (hasForbiddenAttemptPayload(question)) throw new Error('xp_question_payload_forbidden');
      if (question && question.correct) correctCount += 1;
      return sum + calculateQuestionXp(question, { assignedGrade, quizGrade });
    }, 0);
    const completionMultiplierBps = getCompletionMultiplierBps({
      correctCount,
      totalQuestions: questions.length
    });
    const rawAwardXp = roundBps(baseCorrectXp, completionMultiplierBps);
    const eligibility = evaluateXpEligibility({
      attemptNumber: options.attemptNumber,
      duplicateAttempt: options.duplicateAttempt,
      staleContent: options.staleContent,
      repeatedQuestionIds: options.repeatedQuestionIds,
      stretchGap
    });

    return {
      schemaVersion: XP_SCHEMA_VERSION,
      source: safeString(options.source || 'domain_kernel'),
      awardType: eligibility.eligible ? 'eligible' : 'ineligible',
      assignedGrade,
      quizGrade,
      stretchGap,
      stretchMultiplierBps,
      completionMultiplierBps,
      correctCount,
      totalQuestions: questions.length,
      baseCorrectXp,
      rawAwardXp,
      awardedXp: eligibility.eligible ? rawAwardXp : 0,
      provisional: options.provisional === true,
      serverAuthoritative: options.serverAuthoritative === true,
      eligibility
    };
  }

  function evaluateXpEligibility(options = {}) {
    const reasons = [];
    const attemptNumber = normalizePositiveInteger(options.attemptNumber || 1, 'xp_attempt_number_invalid');
    const repeatedQuestionIds = normalizeStringArray(options.repeatedQuestionIds);
    const stretchGap = Number.isFinite(Number(options.stretchGap)) ? Number(options.stretchGap) : 0;

    if (attemptNumber > 1) reasons.push('repeat_attempt');
    if (options.duplicateAttempt === true) reasons.push('duplicate_attempt');
    if (options.staleContent === true) reasons.push('stale_content');
    if (repeatedQuestionIds.length) reasons.push('repeated_question_refs');
    if (stretchGap > 2) reasons.push('unsupported_stretch_gap');

    return {
      eligible: reasons.length === 0,
      leaderboardEligible: reasons.length === 0,
      reasons,
      repeatEligible: attemptNumber === 1 && repeatedQuestionIds.length === 0
    };
  }

  function roundBps(value, multiplierBps) {
    const amount = normalizeNonNegativeInteger(value, 'xp_amount_invalid');
    const bps = normalizeNonNegativeInteger(multiplierBps, 'xp_multiplier_invalid');
    return Math.floor((amount * bps + XP_BPS_DENOMINATOR / 2) / XP_BPS_DENOMINATOR);
  }

  function normalizeGrade(value) {
    const grade = Number(value);
    if (!Number.isInteger(grade) || grade < 2 || grade > 6) throw new Error('xp_grade_invalid');
    return grade;
  }

  function normalizePositiveInteger(value, errorCode) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) throw new Error(errorCode);
    return number;
  }

  function normalizeNonNegativeInteger(value, errorCode) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) throw new Error(errorCode);
    return number;
  }

  function hasForbiddenAttemptPayload(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => FORBIDDEN_ATTEMPT_FIELDS.has(key) || hasForbiddenAttemptPayload(value[key]));
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    BASE_XP_BY_DIFFICULTY,
    COMPLETION_THRESHOLDS,
    STRETCH_MULTIPLIER_BPS,
    XP_BPS_DENOMINATOR,
    XP_SCHEMA_VERSION,
    calculateQuestionXp,
    calculateXpAwardSummary,
    evaluateXpEligibility,
    getBaseQuestionXp,
    getCompletionMultiplierBps,
    getStretchMultiplierBps,
    roundBps
  };
});
