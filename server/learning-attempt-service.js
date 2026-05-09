'use strict';

const crypto = require('node:crypto');

const DEFAULT_MIN_SECONDS_PER_QUESTION = 2;
const CLIENT_CLAIM_FIELDS = Object.freeze([
  'score',
  'percentage',
  'correctCount',
  'mastery',
  'totalGems',
  'awardedXp',
  'leaderboardRank'
]);

function adjudicateLearningAttempt(submission = {}, options = {}) {
  if (submission.offlineLocalOnly === true) {
    return {
      status: 'provisional_local',
      verifiedReportingEligible: false,
      localPracticePreserved: true
    };
  }

  const ledger = options.ledger || createFakeLearningAttemptLedger();
  const learnerId = safeString(submission.learnerId);
  const idempotencyKey = safeString(submission.idempotencyKey || submission.attemptId);
  if (!learnerId || !idempotencyKey) return rejectAndAppend(ledger, learnerId, idempotencyKey, 'invalid_submission', options);

  const originalEvent = ledger.getByIdempotency(learnerId, idempotencyKey);
  if (originalEvent) {
    return {
      status: 'duplicate',
      reason: 'duplicate_idempotency_key',
      originalEvent
    };
  }

  const actorLearnerId = safeString(options.actor && options.actor.learnerId);
  if (actorLearnerId && actorLearnerId !== learnerId) {
    return rejectAndAppend(ledger, learnerId, idempotencyKey, 'unauthorized_learner', options);
  }

  const questionAttempts = Array.isArray(submission.questionAttempts) ? submission.questionAttempts : [];
  if (!questionAttempts.length) return rejectAndAppend(ledger, learnerId, idempotencyKey, 'invalid_question_ref', options);

  const replayReason = findReplayReason(questionAttempts);
  if (replayReason) return rejectAndAppend(ledger, learnerId, idempotencyKey, replayReason, options);

  const cadenceReason = validateCadence(submission, questionAttempts.length, options);
  if (cadenceReason) return rejectAndAppend(ledger, learnerId, idempotencyKey, cadenceReason, options);

  const canonicalById = buildCanonicalQuestionMap(options.canonicalQuestions);
  const questionResults = [];
  for (const attempt of questionAttempts) {
    const ref = attempt && attempt.questionRef || {};
    const canonical = canonicalById.get(safeString(ref.id || ref.questionId));
    const refReason = validateCanonicalRef(ref, canonical);
    if (refReason) return rejectAndAppend(ledger, learnerId, idempotencyKey, refReason, options);

    const selectedAnswer = Number(attempt.selectedAnswer ?? attempt.selectedAnswerIndex);
    if (!Number.isInteger(selectedAnswer) || selectedAnswer < 0 || selectedAnswer >= canonical.choices.length) {
      return rejectAndAppend(ledger, learnerId, idempotencyKey, 'malformed_answer_id', options);
    }

    questionResults.push({
      questionId: canonical.questionId || canonical.id,
      sourceSet: canonical.sourceSet,
      version: Number(canonical.version),
      contentHash: canonical.contentHash,
      sequence: Number(canonical.sequence),
      selectedAnswer,
      correct: selectedAnswer === Number(canonical.correct),
      skillIds: normalizeStringArray(canonical.skillIds),
      standardIds: normalizeStringArray(canonical.standardIds),
      gradeLevel: normalizeGrade(canonical.gradeLevel || canonical.grade || (canonical.gradeLevels || [])[0]),
      difficulty: safeString(canonical.difficulty),
      confidence: safeToken(attempt.confidence),
      hintUsed: attempt.hintUsed === true || attempt.hintUsage === true
    });
  }

  const correctCount = questionResults.filter(result => result.correct).length;
  const event = {
    schemaVersion: 1,
    eventId: hashStable({ learnerId, idempotencyKey, status: 'verified' }),
    learnerId,
    classId: safeString(submission.assignmentContext && submission.assignmentContext.classId),
    assignmentId: safeString(submission.assignmentContext && submission.assignmentContext.assignmentId),
    idempotencyKey,
    status: 'verified',
    source: 'server_adjudicated_learning_attempt',
    submittedAt: safeIso(submission.submittedAt),
    receivedAt: safeIso((options.now || (() => new Date()))()),
    score: {
      correctCount,
      totalQuestions: questionResults.length,
      accuracy: round(correctCount / questionResults.length)
    },
    questionResults,
    clientClaimsIgnored: CLIENT_CLAIM_FIELDS.filter(field => Object.prototype.hasOwnProperty.call(submission, field)).sort()
  };
  ledger.appendEvent(event);
  return { status: 'verified', event };
}

function createFakeLearningAttemptLedger(initialEvents = []) {
  const events = [];
  const byIdempotency = new Map();
  initialEvents.forEach(event => appendEvent(event));

  function appendEvent(event) {
    const stored = JSON.parse(JSON.stringify(event));
    events.push(stored);
    if (stored.learnerId && stored.idempotencyKey && stored.status === 'verified') {
      byIdempotency.set(idempotencyKey(stored.learnerId, stored.idempotencyKey), stored);
    }
    return stored;
  }

  return {
    appendEvent,
    getByIdempotency(learnerId, key) {
      return byIdempotency.get(idempotencyKey(learnerId, key)) || null;
    },
    listEvents() {
      return events.map(event => JSON.parse(JSON.stringify(event)));
    },
    updateEvent() {
      throw new Error('append_only');
    }
  };
}

function rejectAndAppend(ledger, learnerId, idempotencyKey, reason, options = {}) {
  const decision = {
    status: 'rejected',
    reason,
    event: {
      schemaVersion: 1,
      eventId: hashStable({ learnerId, idempotencyKey, status: 'rejected', reason }),
      learnerId,
      idempotencyKey,
      status: 'rejected',
      reason,
      receivedAt: safeIso((options.now || (() => new Date()))())
    }
  };
  if (learnerId && idempotencyKey && ledger && typeof ledger.appendEvent === 'function') ledger.appendEvent(decision.event);
  return decision;
}

function findReplayReason(questionAttempts) {
  const seen = new Set();
  for (const attempt of questionAttempts) {
    const ref = attempt && attempt.questionRef || {};
    const key = [
      safeString(ref.id || ref.questionId),
      safeString(ref.sourceSet),
      Number(ref.version) || 0
    ].join('|');
    if (!safeString(ref.id || ref.questionId) || !safeString(ref.sourceSet) || !safeString(ref.contentHash) || !Number.isFinite(Number(ref.version))) {
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

function validateCanonicalRef(ref, canonical) {
  if (!canonical) return 'invalid_question_ref';
  if (safeString(canonical.sourceSet) !== safeString(ref.sourceSet)) return 'invalid_question_ref';
  if (Number(canonical.version) !== Number(ref.version)) return 'version_mismatch';
  if (safeString(canonical.contentHash) !== safeString(ref.contentHash)) return 'stale_content';
  if (Number(canonical.sequence) !== Number(ref.sequence)) return 'invalid_question_ref';
  return '';
}

function buildCanonicalQuestionMap(canonicalQuestions) {
  return new Map((Array.isArray(canonicalQuestions) ? canonicalQuestions : []).map(question => [
    safeString(question && (question.questionId || question.id)),
    question
  ]).filter(entry => entry[0]));
}

function idempotencyKey(learnerId, key) {
  return `${safeString(learnerId)}:${safeString(key)}`;
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

function normalizeGrade(value) {
  const grade = Number(value);
  return Number.isFinite(grade) && grade > 0 ? Math.floor(grade) : 0;
}

function normalizeStringArray(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
}

function safeToken(value) {
  return safeString(value).toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 80);
}

function safeString(value) {
  return String(value || '').trim();
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  CLIENT_CLAIM_FIELDS,
  DEFAULT_MIN_SECONDS_PER_QUESTION,
  adjudicateLearningAttempt,
  createFakeLearningAttemptLedger
};
