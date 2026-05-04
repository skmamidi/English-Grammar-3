(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestXpOfflineQueue = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const OFFLINE_XP_STATES = Object.freeze({
    PROVISIONAL: 'provisional',
    SUBMITTED: 'submitted',
    AWARDED: 'awarded',
    DUPLICATE: 'duplicate',
    REJECTED: 'rejected',
    LOCAL_ONLY: 'local-only'
  });
  const VALID_STATES = new Set(Object.keys(OFFLINE_XP_STATES).map(key => OFFLINE_XP_STATES[key]));
  const PAYLOAD_KEYS = new Set(['question', 'prompt', 'choices', 'correct', 'correctAnswer', 'answerKey', 'answers', 'explanation', 'questions']);

  function createProvisionalXpQueueEntry(input = {}) {
    const evidence = normalizeAttemptEvidence(input.attemptEvidence);
    return normalizeXpQueueEntry({
      attemptId: evidence.attemptId,
      idempotencyKey: evidence.idempotencyKey,
      status: OFFLINE_XP_STATES.PROVISIONAL,
      provisionalXp: readAwardedXp(input.provisionalAwardSummary),
      queuedAt: safeIso(input.queuedAt) || currentIso(),
      attemptEvidence: evidence,
      provisionalAwardSummary: sanitizeAwardSummary(input.provisionalAwardSummary),
      localPracticeRef: normalizeLocalPracticeRef(input.localPracticeRef)
    });
  }

  function createLocalOnlyXpQueueEntry(input = {}) {
    const evidence = normalizeAttemptEvidence(input.attemptEvidence);
    return normalizeXpQueueEntry({
      attemptId: evidence.attemptId,
      idempotencyKey: evidence.idempotencyKey,
      status: OFFLINE_XP_STATES.LOCAL_ONLY,
      queuedAt: safeIso(input.queuedAt) || currentIso(),
      rejectionReason: safeString(input.reason || 'local_only'),
      attemptEvidence: evidence,
      localPracticeRef: normalizeLocalPracticeRef(input.localPracticeRef)
    });
  }

  function markXpQueueEntrySubmitted(entry, input = {}) {
    const normalized = normalizeXpQueueEntry(entry);
    return normalizeXpQueueEntry(Object.assign({}, normalized, {
      status: OFFLINE_XP_STATES.SUBMITTED,
      submittedAt: safeIso(input.submittedAt) || currentIso(),
      syncRequestId: safeString(input.syncRequestId)
    }));
  }

  function applyXpAdjudicationResult(entry, result = {}) {
    const normalized = normalizeXpQueueEntry(entry);
    const status = safeString(result.status);
    if (status === OFFLINE_XP_STATES.AWARDED || status === 'accepted') {
      return normalizeXpQueueEntry(Object.assign({}, normalized, {
        status: OFFLINE_XP_STATES.AWARDED,
        awardEventId: safeString(result.awardEventId),
        syncedXp: Math.max(0, Math.round(Number(result.awardedXp) || 0)),
        syncedAt: safeIso(result.syncedAt) || currentIso(),
        rejectionReason: ''
      }));
    }
    if (status === OFFLINE_XP_STATES.DUPLICATE) {
      return normalizeXpQueueEntry(Object.assign({}, normalized, {
        status: OFFLINE_XP_STATES.DUPLICATE,
        awardEventId: safeString(result.awardEventId),
        syncedXp: Math.max(0, Math.round(Number(result.awardedXp) || 0)),
        syncedAt: safeIso(result.syncedAt) || currentIso(),
        rejectionReason: 'duplicate'
      }));
    }
    if (status === OFFLINE_XP_STATES.LOCAL_ONLY || status === 'local_only') {
      return normalizeXpQueueEntry(Object.assign({}, normalized, {
        status: OFFLINE_XP_STATES.LOCAL_ONLY,
        syncedAt: safeIso(result.syncedAt) || currentIso(),
        rejectionReason: safeString(result.reason || 'local_only')
      }));
    }
    return normalizeXpQueueEntry(Object.assign({}, normalized, {
      status: OFFLINE_XP_STATES.REJECTED,
      syncedAt: safeIso(result.syncedAt) || currentIso(),
      rejectionReason: safeString(result.reason || result.rejectionReason || 'rejected')
    }));
  }

  function normalizeXpOfflineQueue(queue) {
    return (Array.isArray(queue) ? queue : []).map(normalizeXpQueueEntry).filter(entry => entry.attemptId || entry.idempotencyKey);
  }

  function normalizeXpQueueEntry(entry) {
    const input = entry && typeof entry === 'object' ? entry : {};
    const status = VALID_STATES.has(input.status) ? input.status : OFFLINE_XP_STATES.PROVISIONAL;
    const evidence = normalizeAttemptEvidence(input.attemptEvidence || input);
    return {
      schemaVersion: 1,
      attemptId: safeString(input.attemptId || evidence.attemptId),
      idempotencyKey: safeString(input.idempotencyKey || evidence.idempotencyKey),
      status,
      provisionalXp: Math.max(0, Math.round(Number(input.provisionalXp) || 0)),
      syncedXp: Math.max(0, Math.round(Number(input.syncedXp) || 0)),
      awardEventId: safeString(input.awardEventId),
      rejectionReason: safeString(input.rejectionReason),
      queuedAt: safeIso(input.queuedAt) || '',
      submittedAt: safeIso(input.submittedAt) || '',
      syncedAt: safeIso(input.syncedAt) || '',
      syncRequestId: safeString(input.syncRequestId),
      attemptEvidence: evidence,
      provisionalAwardSummary: sanitizeAwardSummary(input.provisionalAwardSummary),
      localPracticeRef: normalizeLocalPracticeRef(input.localPracticeRef)
    };
  }

  function normalizeAttemptEvidence(evidence) {
    const input = stripPayloadKeys(evidence && typeof evidence === 'object' ? evidence : {});
    const quiz = input.quiz && typeof input.quiz === 'object' ? input.quiz : {};
    return {
      attemptId: safeString(input.attemptId),
      idempotencyKey: safeString(input.idempotencyKey),
      learnerId: safeString(input.learnerId),
      quiz: {
        assignedGrade: Math.round(Number(quiz.assignedGrade) || 0),
        quizGrade: Math.round(Number(quiz.quizGrade) || 0),
        startedAt: safeIso(quiz.startedAt) || '',
        completedAt: safeIso(quiz.completedAt) || ''
      },
      questionRefs: (Array.isArray(input.questionRefs) ? input.questionRefs : []).map(normalizeQuestionRef).filter(ref => ref.id),
      selectedAnswers: normalizeSelectedAnswers(input.selectedAnswers)
    };
  }

  function normalizeSelectedAnswers(answers) {
    return (Array.isArray(answers) ? answers : []).map(answer => {
      const input = answer && typeof answer === 'object' ? answer : {};
      return {
        questionId: safeString(input.questionId || input.id),
        selectedIndex: Math.round(Number(input.selectedIndex))
      };
    }).filter(answer => answer.questionId && Number.isFinite(answer.selectedIndex));
  }

  function normalizeQuestionRef(ref) {
    const input = ref && typeof ref === 'object' ? ref : {};
    return {
      id: safeString(input.id || input.questionId),
      sourceSet: safeString(input.sourceSet || input.setId),
      version: Math.max(0, Math.round(Number(input.version || input.questionVersion) || 0)),
      contentHash: safeString(input.contentHash || input.questionHash),
      sequence: Math.max(0, Math.round(Number(input.sequence) || 0))
    };
  }

  function normalizeLocalPracticeRef(ref) {
    const input = ref && typeof ref === 'object' ? stripPayloadKeys(ref) : {};
    return {
      sessionId: safeString(input.sessionId || input.id),
      completedAt: safeIso(input.completedAt) || '',
      questionRefs: normalizeStringArray(input.questionRefs)
    };
  }

  function sanitizeAwardSummary(summary) {
    const input = stripPayloadKeys(summary && typeof summary === 'object' ? summary : {});
    return Object.keys(input).sort().reduce((result, key) => {
      const value = input[key];
      if (value && typeof value === 'object') return result;
      result[key] = value;
      return result;
    }, {});
  }

  function stripPayloadKeys(value) {
    if (Array.isArray(value)) return value.map(stripPayloadKeys);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((result, key) => {
      if (PAYLOAD_KEYS.has(key)) return result;
      result[key] = stripPayloadKeys(value[key]);
      return result;
    }, {});
  }

  function readAwardedXp(summary) {
    const input = summary && typeof summary === 'object' ? summary : {};
    return Math.max(0, Math.round(Number(input.awardedXp || input.provisionalXp) || 0));
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function currentIso() {
    return new Date().toISOString();
  }

  return {
    OFFLINE_XP_STATES,
    applyXpAdjudicationResult,
    createLocalOnlyXpQueueEntry,
    createProvisionalXpQueueEntry,
    markXpQueueEntrySubmitted,
    normalizeAttemptEvidence,
    normalizeXpOfflineQueue,
    normalizeXpQueueEntry
  };
});
