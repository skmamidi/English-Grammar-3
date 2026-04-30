(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSpacedRepetitionDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;
  const MIN_EASE = 1.6;
  const DEFAULT_EASE = 2;
  const FIRST_CORRECT_EASE = 2.4;
  const FIRST_CORRECT_INTERVAL = 2;
  const FIRST_MISS_INTERVAL = 1;

  function applyReviewOutcomes(existingSchedules, outcomes, options = {}) {
    const now = safeIso(options.now) || new Date().toISOString();
    const byId = {};
    normalizeSchedules(existingSchedules).forEach(schedule => {
      byId[schedule.ref.id] = schedule;
    });
    (Array.isArray(outcomes) ? outcomes : []).forEach(outcome => {
      const normalizedOutcome = normalizeReviewOutcome(outcome);
      if (!normalizedOutcome.questionRef.id) return;
      byId[normalizedOutcome.questionRef.id] = scheduleOutcome(byId[normalizedOutcome.questionRef.id], normalizedOutcome, now);
    });
    return normalizeSchedules(Object.keys(byId).map(id => byId[id]));
  }

  function scheduleOutcome(existingSchedule, outcome, now) {
    const previous = normalizeScheduleEntry(existingSchedule);
    const correct = outcome.correct === true;
    const currentInterval = previous.ref.id ? previous.intervalDays : 0;
    const ease = correct
      ? roundEase(Math.max(MIN_EASE, previous.ref.id ? previous.ease || FIRST_CORRECT_EASE : FIRST_CORRECT_EASE))
      : roundEase(Math.max(MIN_EASE, (previous.ease || DEFAULT_EASE) - 0.25));
    const intervalDays = correct
      ? nextCorrectInterval(currentInterval, ease)
      : FIRST_MISS_INTERVAL;
    const streak = correct ? (previous.streak || 0) + 1 : 0;
    const lapses = correct ? previous.lapses || 0 : (previous.lapses || 0) + 1;
    return normalizeScheduleEntry({
      ref: outcome.questionRef,
      skillIds: outcome.skillIds.length ? outcome.skillIds : previous.skillIds,
      intervalDays,
      ease,
      dueAt: addDays(now, intervalDays),
      lastReviewedAt: now,
      streak,
      lapses
    });
  }

  function nextCorrectInterval(currentInterval, ease) {
    if (!currentInterval) return FIRST_CORRECT_INTERVAL;
    return Math.max(currentInterval + 1, Math.ceil(currentInterval * ease));
  }

  function normalizeReviewOutcome(outcome) {
    const input = outcome && typeof outcome === 'object' ? outcome : {};
    return {
      questionRef: normalizeQuestionRef(input.questionRef || input.ref || input),
      skillIds: normalizeStringArray(input.skillIds),
      correct: input.correct === true
    };
  }

  function normalizeSchedules(schedules) {
    return (Array.isArray(schedules) ? schedules : [])
      .map(normalizeScheduleEntry)
      .filter(schedule => schedule.ref.id);
  }

  function normalizeScheduleEntry(entry) {
    const input = entry && typeof entry === 'object' ? entry : {};
    const intervalDays = Math.max(1, Math.round(Number(input.intervalDays) || 1));
    return {
      ref: normalizeQuestionRef(input.ref || input.questionRef),
      skillIds: normalizeStringArray(input.skillIds),
      intervalDays,
      ease: roundEase(Math.max(MIN_EASE, Number(input.ease) || DEFAULT_EASE)),
      dueAt: safeIso(input.dueAt) || '',
      lastReviewedAt: safeIso(input.lastReviewedAt) || '',
      streak: Math.max(0, Math.round(Number(input.streak) || 0)),
      lapses: Math.max(0, Math.round(Number(input.lapses) || 0))
    };
  }

  function normalizeQuestionRef(ref) {
    const input = ref && typeof ref === 'object' ? ref : {};
    return {
      id: safeString(input.id || input.questionId),
      sourceSet: safeString(input.sourceSet || input.setId),
      version: Number(input.version || input.questionVersion) || 0,
      contentHash: safeString(input.contentHash || input.questionHash),
      sequence: Number(input.sequence) || 0
    };
  }

  function addDays(iso, days) {
    const date = new Date(iso);
    date.setTime(date.getTime() + Math.max(1, Number(days) || 1) * DAY_MS);
    return date.toISOString();
  }

  function roundEase(value) {
    return Math.round(value * 100) / 100;
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    applyReviewOutcomes,
    normalizeQuestionRef,
    normalizeReviewOutcome,
    normalizeScheduleEntry,
    normalizeSchedules
  };
});
