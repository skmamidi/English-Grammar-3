(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestXpSummaryUi = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const xpDomain = root.GrammarQuestXpDomain ||
    (typeof require === 'function' ? require('./xp-domain') : null);

  const XP_FEEDBACK_STATES = Object.freeze({
    PREVIEW: 'preview',
    PROVISIONAL: 'provisional',
    SYNCING: 'syncing',
    SYNCED: 'synced',
    DUPLICATE: 'duplicate',
    REJECTED: 'rejected',
    LOCAL_ONLY: 'local-only'
  });

  const STATE_COPY = Object.freeze({
    preview: 'XP preview only; the server confirms final awards after you finish.',
    provisional: 'Provisional XP is saved on this device. We will reconcile it when sync returns.',
    syncing: 'Syncing XP now. Keep practicing while the server checks the final total.',
    synced: 'Synced. The server confirmed this XP award.',
    duplicate: 'Already counted. Practice stays saved, but this attempt did not add new XP.',
    rejected: 'Not awarded after review. Practice is saved; review missed items and try again.',
    'local-only': 'Local practice saved. XP is unavailable for this attempt, but review guidance still works.'
  });

  function buildQuestionXpPreview(input = {}) {
    const question = input.question && typeof input.question === 'object' ? input.question : {};
    const safeQuestion = {
      correct: question.correct === true,
      difficulty: safeString(question.difficulty || input.difficulty || 'medium')
    };
    const amount = safeQuestion.correct && xpDomain && typeof xpDomain.calculateQuestionXp === 'function'
      ? xpDomain.calculateQuestionXp(safeQuestion, {
        assignedGrade: input.assignedGrade || input.quizGrade || 4,
        quizGrade: input.quizGrade || input.assignedGrade || 4
      })
      : 0;
    return {
      schemaVersion: 1,
      state: XP_FEEDBACK_STATES.PREVIEW,
      amount,
      label: amount > 0 ? `+${amount} XP preview` : 'XP preview',
      copy: STATE_COPY.preview,
      ariaLabel: amount > 0
        ? `${amount} XP preview, not final until synced.`
        : 'XP preview, not final until synced.'
    };
  }

  function buildQuizXpCompletionSummary(input = {}) {
    const source = normalizeSummarySource(input);
    const awardSummary = xpDomain && typeof xpDomain.calculateXpAwardSummary === 'function'
      ? xpDomain.calculateXpAwardSummary({
        questions: source.questions,
        assignedGrade: source.assignedGrade,
        quizGrade: source.quizGrade,
        attemptNumber: input.attemptNumber || 1,
        duplicateAttempt: input.duplicateAttempt === true,
        staleContent: input.staleContent === true,
        repeatedQuestionIds: input.repeatedQuestionIds,
        provisional: true
      })
      : fallbackAwardSummary(source);
    const state = normalizeState(input.awardState || input.status || (input.offline ? 'provisional' : 'syncing'));
    const syncedXp = Math.max(0, Math.round(Number(input.syncedXp || input.awardedXp) || 0));
    const finalXp = state === XP_FEEDBACK_STATES.SYNCED || state === XP_FEEDBACK_STATES.DUPLICATE
      ? syncedXp
      : state === XP_FEEDBACK_STATES.REJECTED || state === XP_FEEDBACK_STATES.LOCAL_ONLY
      ? 0
      : awardSummary.awardedXp;
    const multiplierLabel = formatMultiplier(awardSummary.completionMultiplierBps);
    return {
      schemaVersion: 1,
      source,
      state,
      stateLabel: labelForState(state),
      baseCorrectXp: awardSummary.baseCorrectXp,
      completionMultiplierBps: awardSummary.completionMultiplierBps,
      multiplierLabel,
      provisionalXp: awardSummary.awardedXp,
      finalXp,
      awardedXp: awardSummary.awardedXp,
      correctCount: awardSummary.correctCount,
      totalQuestions: awardSummary.totalQuestions,
      statusCopy: STATE_COPY[state] || STATE_COPY.syncing,
      retryCopy: buildRetryCopy(awardSummary),
      serverAuthoritative: state === XP_FEEDBACK_STATES.SYNCED || state === XP_FEEDBACK_STATES.DUPLICATE || state === XP_FEEDBACK_STATES.REJECTED
    };
  }

  function renderQuestionXpPreview(preview) {
    const model = preview && typeof preview === 'object' ? preview : buildQuestionXpPreview();
    return `
      <div class="xp-preview" role="status" aria-label="XP preview" aria-live="polite">
        <strong>${escapeHtml(model.label)}</strong>
        <span>${escapeHtml(model.copy)}</span>
      </div>
    `;
  }

  function renderQuizXpCompletionSummary(summary) {
    const model = summary && typeof summary === 'object' ? summary : buildQuizXpCompletionSummary();
    return `
      <section class="xp-completion-summary" aria-label="XP completion summary">
        <div class="xp-summary-grid">
          <div><strong>${escapeHtml(model.baseCorrectXp)}</strong><span>Base XP</span></div>
          <div><strong>${escapeHtml(model.multiplierLabel)}</strong><span>Completion boost</span></div>
          <div><strong>${escapeHtml(model.finalXp)}</strong><span>${model.serverAuthoritative ? 'Final XP' : 'Provisional XP'}</span></div>
        </div>
        <div class="xp-sync-status ${escapeHtml(model.state)}" role="status" aria-label="XP award status" aria-live="polite">
          <strong>${escapeHtml(model.stateLabel)}</strong>
          <span>${escapeHtml(model.statusCopy)}</span>
        </div>
        <p class="xp-summary-guidance">${escapeHtml(model.retryCopy)}</p>
      </section>
    `;
  }

  function normalizeSummarySource(input) {
    return {
      questions: (Array.isArray(input.questions) ? input.questions : []).map(question => ({
        correct: question && question.correct === true,
        difficulty: safeString(question && question.difficulty || input.difficulty || 'medium')
      })),
      assignedGrade: Math.round(Number(input.assignedGrade || 4)),
      quizGrade: Math.round(Number(input.quizGrade || input.assignedGrade || 4))
    };
  }

  function fallbackAwardSummary(source) {
    const correctCount = source.questions.filter(question => question.correct).length;
    const baseCorrectXp = correctCount * 20;
    return {
      baseCorrectXp,
      completionMultiplierBps: 10000,
      awardedXp: baseCorrectXp,
      correctCount,
      totalQuestions: source.questions.length
    };
  }

  function normalizeState(value) {
    const state = safeString(value);
    if (state === 'awarded') return XP_FEEDBACK_STATES.SYNCED;
    return Object.keys(STATE_COPY).includes(state) ? state : XP_FEEDBACK_STATES.SYNCING;
  }

  function labelForState(state) {
    if (state === XP_FEEDBACK_STATES.SYNCED) return 'Synced XP';
    if (state === XP_FEEDBACK_STATES.SYNCING) return 'Syncing XP';
    if (state === XP_FEEDBACK_STATES.PROVISIONAL) return 'Provisional XP';
    if (state === XP_FEEDBACK_STATES.DUPLICATE) return 'Duplicate XP';
    if (state === XP_FEEDBACK_STATES.REJECTED) return 'XP not awarded';
    if (state === XP_FEEDBACK_STATES.LOCAL_ONLY) return 'Local-only XP';
    return 'XP preview';
  }

  function formatMultiplier(bps) {
    const value = Math.max(0, Number(bps) || 0) / 10000;
    const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
    return `${formatted}x accuracy boost`;
  }

  function buildRetryCopy(summary) {
    if (summary.correctCount >= summary.totalQuestions) return 'Perfect run. Review once more or try a harder level when you are ready.';
    return 'Review missed items, then try again. Offline practice stays playable while XP sync catches up.';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  return {
    XP_FEEDBACK_STATES,
    buildQuestionXpPreview,
    buildQuizXpCompletionSummary,
    renderQuestionXpPreview,
    renderQuizXpCompletionSummary
  };
});
