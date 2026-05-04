(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLeaderboardDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DEFAULT_LEADERBOARD_TOP_LIMIT = 50;
  const MATERIALIZED_LEADERBOARD_LIMIT = 100;
  const IDENTITY_FIELD_PATTERN = /(^|_|\b)(learnerId|studentId|studentName|realName|email|accountId|userId|rawStudentId)(\b|_|$)/i;
  const PAYLOAD_FIELD_PATTERN = /(^|_|\b)(question|questions|prompt|choices|answer|answers|correctAnswer|answerKey|explanation)(\b|_|$)/i;

  function getLeaderboardPeriodIds(timestamp) {
    const date = safeDate(timestamp);
    return {
      weekly: isoWeekPeriodId(date),
      monthly: `monthly_${date.getUTCFullYear()}_${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      allTime: 'all_time'
    };
  }

  function getLeaderboardPeriodWindow(periodId) {
    const id = safeString(periodId);
    if (id === 'all_time') {
      return { periodId: id, periodType: 'all_time', startsAt: '', endsAt: '' };
    }
    let match = id.match(/^weekly_(\d{4})_W(\d{2})$/);
    if (match) {
      const start = isoWeekStart(Number(match[1]), Number(match[2]));
      return {
        periodId: id,
        periodType: 'weekly',
        startsAt: start.toISOString(),
        endsAt: addDays(start, 7).toISOString()
      };
    }
    match = id.match(/^monthly_(\d{4})_(\d{2})$/);
    if (match) {
      const start = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
      return {
        periodId: id,
        periodType: 'monthly',
        startsAt: start.toISOString(),
        endsAt: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)).toISOString()
      };
    }
    throw new Error(`leaderboard_period_invalid:${id}`);
  }

  function normalizeLeaderboardEntry(entry) {
    const input = entry && typeof entry === 'object' ? entry : {};
    assertNoUnsafeFields(input);
    if (input.optedIn !== true) throw new Error('leaderboard_entry_opt_in_required');
    const displayAlias = safeString(input.displayAlias || input.alias);
    if (!displayAlias) throw new Error('leaderboard_alias_required');
    if (isIdentityBearingAlias(displayAlias)) throw new Error('leaderboard_alias_identity_bearing');
    const participantRef = normalizeParticipantRef(input.participantRef || input.participantId);
    if (!participantRef) throw new Error('leaderboard_participant_ref_required');
    return {
      schemaVersion: 1,
      participantRef,
      displayAlias,
      score: Math.max(0, Math.round(Number(input.score || input.xp) || 0)),
      lastAwardedAt: safeIso(input.lastAwardedAt) || '',
      awardCount: Math.max(0, Math.round(Number(input.awardCount) || 0)),
      optInRef: safeOptInRef(input.optInRef),
      tieBreak: {
        lastAwardedAt: safeIso(input.lastAwardedAt) || '',
        awardCount: Math.max(0, Math.round(Number(input.awardCount) || 0)),
        participantRef
      }
    };
  }

  function materializeLeaderboardProjection(input = {}) {
    if (input.status === 'archived') throw new Error('leaderboard_period_archived');
    const periodId = safeString(input.periodId);
    const window = getLeaderboardPeriodWindow(periodId);
    const generatedAt = safeIso(input.generatedAt) || new Date(0).toISOString();
    const sorted = (Array.isArray(input.entries) ? input.entries : [])
      .map(normalizeLeaderboardEntry)
      .sort(compareLeaderboardEntries)
      .slice(0, MATERIALIZED_LEADERBOARD_LIMIT)
      .map((entry, index) => Object.assign({}, entry, { rank: index + 1 }));
    return {
      schemaVersion: 1,
      periodId,
      periodType: window.periodType,
      status: 'active',
      generatedAt,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      materializedLimit: MATERIALIZED_LEADERBOARD_LIMIT,
      defaultReadLimit: DEFAULT_LEADERBOARD_TOP_LIMIT,
      entries: sorted
    };
  }

  function buildLeaderboardReadModel(projection, options = {}) {
    const normalized = normalizeLeaderboardProjection(projection);
    const limit = Math.max(1, Math.min(MATERIALIZED_LEADERBOARD_LIMIT, Math.round(Number(options.limit) || DEFAULT_LEADERBOARD_TOP_LIMIT)));
    const participantRef = normalizeParticipantRef(options.participantRef);
    const topEntries = normalized.entries.slice(0, limit).map(sanitizeReadEntry);
    const ownEntry = participantRef
      ? normalized.entries.find(entry => entry.participantRef === participantRef)
      : null;
    return {
      schemaVersion: 1,
      periodId: normalized.periodId,
      periodType: normalized.periodType,
      generatedAt: normalized.generatedAt,
      topEntries,
      ownEntry: ownEntry ? sanitizeReadEntry(ownEntry) : null,
      readLimit: limit,
      materializedLimit: normalized.materializedLimit
    };
  }

  function archiveLeaderboardPeriod(projection, options = {}) {
    const normalized = normalizeLeaderboardProjection(projection);
    return Object.assign({}, normalized, {
      status: 'archived',
      archivedAt: safeIso(options.archivedAt) || new Date(0).toISOString(),
      archiveReason: safeString(options.archiveReason || 'period_closed'),
      entries: normalized.entries.map(entry => Object.assign({}, entry))
    });
  }

  function normalizeLeaderboardProjection(projection) {
    const input = projection && typeof projection === 'object' ? projection : {};
    const window = getLeaderboardPeriodWindow(input.periodId);
    return {
      schemaVersion: 1,
      periodId: safeString(input.periodId),
      periodType: safeString(input.periodType || window.periodType),
      status: input.status === 'archived' ? 'archived' : 'active',
      generatedAt: safeIso(input.generatedAt) || '',
      startsAt: safeIso(input.startsAt) || window.startsAt,
      endsAt: safeIso(input.endsAt) || window.endsAt,
      materializedLimit: MATERIALIZED_LEADERBOARD_LIMIT,
      defaultReadLimit: DEFAULT_LEADERBOARD_TOP_LIMIT,
      entries: (Array.isArray(input.entries) ? input.entries : []).map((entry, index) => {
        const normalized = normalizeLeaderboardEntry(Object.assign({ optedIn: true }, entry));
        return Object.assign({}, normalized, { rank: Math.max(1, Math.round(Number(entry.rank) || index + 1)) });
      })
    };
  }

  function compareLeaderboardEntries(left, right) {
    return right.score - left.score ||
      compareTieTime(left.lastAwardedAt, right.lastAwardedAt) ||
      right.awardCount - left.awardCount ||
      left.participantRef.localeCompare(right.participantRef);
  }

  function compareTieTime(left, right) {
    const leftTime = Date.parse(left || '') || Number.MAX_SAFE_INTEGER;
    const rightTime = Date.parse(right || '') || Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  }

  function sanitizeReadEntry(entry) {
    return {
      rank: entry.rank,
      participantRef: entry.participantRef,
      displayAlias: entry.displayAlias,
      score: entry.score,
      tieBreak: Object.assign({}, entry.tieBreak)
    };
  }

  function assertNoUnsafeFields(value) {
    const identityField = findMatchingField(value, IDENTITY_FIELD_PATTERN);
    if (identityField) throw new Error(`leaderboard_entry_identity_field_denied:${identityField}`);
    const payloadField = findMatchingField(value, PAYLOAD_FIELD_PATTERN);
    if (payloadField) throw new Error(`leaderboard_entry_payload_field_denied:${payloadField}`);
  }

  function findMatchingField(value, pattern) {
    if (!value || typeof value !== 'object') return '';
    return Object.keys(value).find(key => pattern.test(key)) ||
      Object.keys(value).map(key => findMatchingField(value[key], pattern)).find(Boolean) || '';
  }

  function normalizeParticipantRef(value) {
    const ref = safeString(value);
    if (/^leaderboardParticipants\/[A-Za-z0-9_-]+$/.test(ref)) return ref;
    if (/^[A-Za-z0-9_-]+$/.test(ref)) return `leaderboardParticipants/${ref}`;
    return '';
  }

  function safeOptInRef(value) {
    const ref = safeString(value);
    return !ref || /^leaderboardOptIns\/[A-Za-z0-9_-]+$/.test(ref) ? ref : '';
  }

  function isIdentityBearingAlias(alias) {
    return /@/.test(alias) ||
      /\b(?:student|learner|email|user)\b/i.test(alias) ||
      /^learner[-_]/i.test(alias) ||
      /^student[-_]/i.test(alias);
  }

  function isoWeekPeriodId(date) {
    const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = copy.getUTCDay() || 7;
    copy.setUTCDate(copy.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
    return `weekly_${copy.getUTCFullYear()}_W${String(week).padStart(2, '0')}`;
  }

  function isoWeekStart(year, week) {
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const day = jan4.getUTCDay() || 7;
    const monday = new Date(jan4);
    monday.setUTCDate(jan4.getUTCDate() - day + 1 + (Math.max(1, week) - 1) * 7);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
  }

  function addDays(date, days) {
    const copy = new Date(date);
    copy.setUTCDate(copy.getUTCDate() + days);
    return copy;
  }

  function safeDate(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date : new Date(0);
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
    DEFAULT_LEADERBOARD_TOP_LIMIT,
    MATERIALIZED_LEADERBOARD_LIMIT,
    archiveLeaderboardPeriod,
    buildLeaderboardReadModel,
    getLeaderboardPeriodIds,
    getLeaderboardPeriodWindow,
    materializeLeaderboardProjection,
    normalizeLeaderboardEntry,
    normalizeLeaderboardProjection
  };
});
