(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestXpStoragePolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const XP_STORAGE_SCHEMA_VERSION = 1;
  const PAYLOAD_KEYS = new Set(['question', 'prompt', 'choices', 'correct', 'correctAnswer', 'answerKey', 'answers', 'explanation', 'questions', 'selectedAnswers', 'learnerId']);

  function normalizeXpAwardEvent(event) {
    const input = event && typeof event === 'object' ? event : {};
    const awardedAt = safeIso(input.awardedAt) || new Date(0).toISOString();
    return {
      schemaVersion: XP_STORAGE_SCHEMA_VERSION,
      awardEventId: safeString(input.awardEventId || input.id),
      learnerId: safeString(input.learnerId),
      attemptId: safeString(input.attemptId),
      idempotencyKey: safeString(input.idempotencyKey),
      awardedXp: Math.max(0, Math.round(Number(input.awardedXp) || 0)),
      awardedAt,
      source: safeString(input.source || 'xp-attempt-service'),
      periodIds: periodIdsFor(awardedAt),
      awardSummary: sanitizeAwardSummary(input.awardSummary)
    };
  }

  function normalizeXpProjection(projection) {
    const input = projection && typeof projection === 'object' ? projection : {};
    const evaluatedAt = safeIso(input.evaluatedAt) || '';
    return {
      schemaVersion: XP_STORAGE_SCHEMA_VERSION,
      learnerId: safeString(input.learnerId),
      totalXp: Math.max(0, Math.round(Number(input.totalXp) || 0)),
      currentWeeklyXp: Math.max(0, Math.round(Number(input.currentWeeklyXp) || 0)),
      currentMonthlyXp: Math.max(0, Math.round(Number(input.currentMonthlyXp) || 0)),
      evaluatedAt,
      source: safeString(input.source || 'xp-projection'),
      periodIds: input.periodIds && typeof input.periodIds === 'object'
        ? normalizePeriodIds(input.periodIds)
        : periodIdsFor(evaluatedAt || new Date(0).toISOString())
    };
  }

  function deriveXpProjection(events, options = {}) {
    const learnerId = safeString(options.learnerId);
    const now = safeIso(options.now) || new Date().toISOString();
    const periods = periodIdsFor(now);
    const matching = (Array.isArray(events) ? events : [])
      .map(normalizeXpAwardEvent)
      .filter(event => !learnerId || event.learnerId === learnerId);
    const totalXp = matching.reduce((sum, event) => sum + event.awardedXp, 0);
    const currentWeeklyXp = matching
      .filter(event => event.periodIds.weekly === periods.weekly)
      .reduce((sum, event) => sum + event.awardedXp, 0);
    const currentMonthlyXp = matching
      .filter(event => event.periodIds.monthly === periods.monthly)
      .reduce((sum, event) => sum + event.awardedXp, 0);
    return normalizeXpProjection({
      learnerId,
      totalXp,
      currentWeeklyXp,
      currentMonthlyXp,
      evaluatedAt: now,
      source: options.source || 'xp-projection',
      periodIds: periods
    });
  }

  function periodIdsFor(timestamp) {
    const date = new Date(timestamp || '');
    const safeDate = Number.isFinite(date.getTime()) ? date : new Date(0);
    return {
      weekly: isoWeekPeriodId(safeDate),
      monthly: `monthly_${safeDate.getUTCFullYear()}_${String(safeDate.getUTCMonth() + 1).padStart(2, '0')}`,
      allTime: 'all_time'
    };
  }

  function isoWeekPeriodId(date) {
    const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = copy.getUTCDay() || 7;
    copy.setUTCDate(copy.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
    return `weekly_${copy.getUTCFullYear()}_W${String(week).padStart(2, '0')}`;
  }

  function normalizePeriodIds(periodIds) {
    return {
      weekly: safeString(periodIds.weekly),
      monthly: safeString(periodIds.monthly),
      allTime: safeString(periodIds.allTime || 'all_time')
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

  function safeString(value) {
    return String(value || '').trim();
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  return {
    XP_STORAGE_SCHEMA_VERSION,
    deriveXpProjection,
    normalizeXpAwardEvent,
    normalizeXpProjection,
    periodIdsFor
  };
});
