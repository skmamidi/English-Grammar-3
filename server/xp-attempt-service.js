'use strict';

const crypto = require('node:crypto');
const xp = require('../assets/xp-domain');

const DEFAULT_MIN_SECONDS_PER_QUESTION = 2;

function adjudicateXpAttempt(submission = {}, options = {}) {
  const store = options.store || createMemoryXpAwardStore();
  const learnerId = safeString(submission.learnerId);
  const idempotencyKey = safeString(submission.idempotencyKey || submission.attemptId);
  if (!learnerId || !idempotencyKey) return reject('invalid_submission');

  const storeKey = buildStoreKey(learnerId, idempotencyKey);
  const originalDecision = store.get(storeKey);
  if (originalDecision) {
    return {
      status: 'duplicate',
      reason: 'duplicate_idempotency_key',
      decisionId: originalDecision.decisionId,
      originalDecision
    };
  }

  const actorLearnerId = safeString(options.actor && options.actor.learnerId);
  if (actorLearnerId && actorLearnerId !== learnerId) {
    return saveRejected(store, storeKey, reject('unauthorized_learner'));
  }

  const questionAttempts = Array.isArray(submission.questionAttempts) ? submission.questionAttempts : [];
  if (!questionAttempts.length) return saveRejected(store, storeKey, reject('invalid_question_ref'));
  const replayReason = findReplayReason(questionAttempts);
  if (replayReason) return saveRejected(store, storeKey, reject(replayReason));

  const cadenceReason = validateCadence(submission, questionAttempts.length, options);
  if (cadenceReason) return saveRejected(store, storeKey, reject(cadenceReason));

  let assignedGrade;
  let quizGrade;
  try {
    assignedGrade = Number(submission.assignedGrade);
    quizGrade = Number(submission.quizGrade);
    xp.getStretchMultiplierBps({ assignedGrade, quizGrade });
  } catch (error) {
    if (/xp_stretch_gap_unsupported/.test(error.message)) return saveRejected(store, storeKey, reject('over_stretch_rejected'));
    return saveRejected(store, storeKey, reject('invalid_grade'));
  }

  const canonicalById = buildCanonicalQuestionMap(options.canonicalQuestions);
  const xpQuestions = [];
  for (const attempt of questionAttempts) {
    const ref = attempt && attempt.questionRef || {};
    const canonical = canonicalById.get(safeString(ref.id));
    if (!canonical || safeString(canonical.sourceSet) !== safeString(ref.sourceSet) || Number(canonical.version) !== Number(ref.version)) {
      return saveRejected(store, storeKey, reject('invalid_question_ref'));
    }
    if (safeString(canonical.contentHash) !== safeString(ref.contentHash)) {
      return saveRejected(store, storeKey, reject('stale_content'));
    }
    xpQuestions.push({
      id: canonical.id,
      difficulty: canonical.difficulty,
      correct: Number(attempt.selectedAnswer) === Number(canonical.correct)
    });
  }

  let award;
  try {
    award = xp.calculateXpAwardSummary({
      assignedGrade,
      quizGrade,
      questions: xpQuestions,
      serverAuthoritative: true,
      provisional: false,
      source: 'server_xp_attempt_service'
    });
  } catch (error) {
    return saveRejected(store, storeKey, reject('invalid_submission'));
  }

  const decision = {
    status: 'awarded',
    decisionId: hashStable({ learnerId, idempotencyKey, status: 'awarded' }),
    awardId: hashStable({ learnerId, idempotencyKey, awardedXp: award.awardedXp }),
    outcome: 'server_authoritative',
    award,
    receivedAt: safeIso((options.now || (() => new Date()))())
  };
  store.set(storeKey, decision);
  return decision;
}

function createMemoryXpAwardStore(initial = {}) {
  const records = new Map(Object.entries(initial));
  return {
    get(key) {
      return records.get(String(key || '')) || null;
    },
    set(key, value) {
      records.set(String(key || ''), sanitizeDecision(value));
      return records.get(String(key || ''));
    },
    entries() {
      return Array.from(records.entries());
    }
  };
}

function saveRejected(store, storeKey, decision) {
  store.set(storeKey, decision);
  return store.get(storeKey);
}

function reject(reason) {
  return {
    status: 'rejected',
    reason,
    decisionId: hashStable({ reason, status: 'rejected' })
  };
}

function sanitizeDecision(decision) {
  return JSON.parse(JSON.stringify(decision));
}

function findReplayReason(questionAttempts) {
  const seen = new Set();
  for (const attempt of questionAttempts) {
    const ref = attempt && attempt.questionRef || {};
    const key = [
      safeString(ref.id),
      safeString(ref.sourceSet),
      Number(ref.version) || 0
    ].join('|');
    if (!safeString(ref.id) || !safeString(ref.sourceSet) || !safeString(ref.contentHash) || !Number.isFinite(Number(ref.version))) {
      return 'invalid_question_ref';
    }
    if (seen.has(key)) return 'replayed_question_ref';
    seen.add(key);
  }
  return '';
}

function validateCadence(submission, questionCount, options = {}) {
  const minSeconds = Number.isFinite(Number(options.minSecondsPerQuestion))
    ? Number(options.minSecondsPerQuestion)
    : DEFAULT_MIN_SECONDS_PER_QUESTION;
  const startedAt = new Date(safeString(submission.startedAt));
  const submittedAt = new Date(safeString(submission.submittedAt));
  if (!Number.isFinite(startedAt.getTime()) || !Number.isFinite(submittedAt.getTime())) return 'invalid_submission';
  const elapsedSeconds = (submittedAt.getTime() - startedAt.getTime()) / 1000;
  if (elapsedSeconds < Math.max(0, questionCount * minSeconds)) return 'cadence_rejected';
  return '';
}

function buildCanonicalQuestionMap(canonicalQuestions) {
  return new Map((Array.isArray(canonicalQuestions) ? canonicalQuestions : []).map(question => [
    safeString(question && question.id),
    question
  ]).filter(entry => entry[0]));
}

function buildStoreKey(learnerId, idempotencyKey) {
  return `${safeString(learnerId)}:${safeString(idempotencyKey)}`;
}

function hashStable(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function safeIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function safeString(value) {
  return String(value || '').trim();
}

module.exports = {
  DEFAULT_MIN_SECONDS_PER_QUESTION,
  adjudicateXpAttempt,
  createMemoryXpAwardStore
};
