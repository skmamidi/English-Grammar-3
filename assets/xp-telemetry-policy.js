(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestXpTelemetryPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const appPrivacy = root.GrammarQuestAppTelemetryPrivacy ||
    (typeof require === 'function' ? require('./app-telemetry-privacy') : null);

  const XP_TELEMETRY_TYPES = Object.freeze([
    'xp_award_outcome',
    'xp_sync_reconciliation',
    'leaderboard_read',
    'leaderboard_materialization_health'
  ]);

  const SAFE_REASON_CODES = new Set([
    'awarded',
    'duplicate_attempt',
    'repeat_attempt',
    'offline_replay',
    'reconciled',
    'rejected',
    'late_materialization',
    'materialized',
    'empty_leaderboard',
    'opted_out',
    'display_disabled',
    'telemetry_disabled'
  ]);

  const UNSAFE_KEYS = new Set([
    'learnerId',
    'studentId',
    'studentName',
    'userId',
    'uid',
    'email',
    'question',
    'prompt',
    'choices',
    'answer',
    'answers',
    'correctAnswer',
    'answerKey',
    'explanation',
    'leaderboardParticipantRef',
    'participantRef',
    'participantId',
    'rawLeaderboardId',
    'leaderboardEntryId'
  ]);

  function evaluateXpTelemetryPolicy(input = {}) {
    const flags = objectOrEmpty(input.flags || input.featureFlags);
    const privacyPreferences = objectOrEmpty(input.privacyPreferences || input.learnerPrivacyPreferences);
    if (input.parentPreview === true || privacyPreferences.parentPreview === true) {
      return policy(false, 'parent_preview_read_only');
    }
    if (flags.xpTelemetryEnabled !== true) return policy(false, 'feature_flag_disabled');
    if (privacyPreferences.telemetryEnabled !== true) return policy(false, 'telemetry_consent_required');
    return policy(true, 'enabled');
  }

  function normalizeXpTelemetryEvent(input = {}) {
    const type = XP_TELEMETRY_TYPES.includes(input.type) ? input.type : '';
    if (!type) throw new Error('xp_telemetry_type_invalid');
    const normalized = {
      schemaVersion: 1,
      type,
      route: stripQuery(input.route || input.url || ''),
      outcome: safeToken(input.outcome || input.status || ''),
      awardedXp: normalizeCount(input.awardedXp),
      periodType: normalizePeriod(input.periodType),
      reasonCodes: normalizeReasonCodes(input.reasonCodes || input.eligibilityReasons),
      severity: normalizeSeverity(input.severity || input.outcome)
    };

    if (type === 'xp_sync_reconciliation') normalized.queueState = safeToken(input.queueState);
    if (type === 'leaderboard_read') {
      normalized.topCount = normalizeCount(input.topCount);
      normalized.ownRankVisible = input.ownRankVisible === true;
    }
    if (type === 'leaderboard_materialization_health') {
      normalized.materializedCount = normalizeCount(input.materializedCount);
      normalized.shardCount = normalizeCount(input.shardCount);
    }

    return removeEmptyOperationalFields(normalized);
  }

  function assertXpTelemetryPrivacy(payload) {
    scan(payload, []);
    if (appPrivacy && typeof appPrivacy.assertAppTelemetryPrivacy === 'function') {
      appPrivacy.assertAppTelemetryPrivacy(payload);
    }
    return true;
  }

  function scan(value, path) {
    if (!value || typeof value !== 'object') return;
    Object.keys(value).forEach(key => {
      if (UNSAFE_KEYS.has(key)) throw new Error(`unsafe_xp_telemetry_field:${path.concat(key).join('.')}`);
      if ((key === 'route' || key === 'url' || key === 'sourceUrl') && String(value[key] || '').includes('?')) {
        throw new Error(`unsafe_xp_telemetry_query:${path.concat(key).join('.')}`);
      }
      scan(value[key], path.concat(key));
    });
  }

  function policy(enabled, reason) {
    return { enabled, reason };
  }

  function normalizeReasonCodes(values) {
    return Array.from(new Set((Array.isArray(values) ? values : [])
      .map(safeToken)
      .filter(value => value && SAFE_REASON_CODES.has(value))))
      .sort();
  }

  function normalizePeriod(value) {
    const period = safeToken(value);
    if (period === 'weekly' || period === 'monthly' || period === 'all_time') return period;
    if (period === 'alltime') return 'all_time';
    return '';
  }

  function normalizeSeverity(value) {
    const token = safeToken(value);
    if (token === 'error' || token === 'rejected') return 'error';
    if (token === 'warn' || token === 'late' || token === 'duplicate') return 'warn';
    return 'info';
  }

  function removeEmptyOperationalFields(input) {
    return Object.keys(input).reduce((result, key) => {
      const value = input[key];
      if (Array.isArray(value) && value.length === 0) {
        result[key] = value;
      } else if (value !== '' && value !== undefined && value !== null) {
        result[key] = value;
      } else if (key === 'periodType') {
        result[key] = '';
      }
      return result;
    }, {});
  }

  function stripQuery(value) {
    const route = String(value || '').trim().split('?')[0].split('#')[0];
    return route || '/';
  }

  function normalizeCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) return 0;
    return Math.floor(number);
  }

  function safeToken(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 80);
  }

  function objectOrEmpty(value) {
    return value && typeof value === 'object' ? value : {};
  }

  return {
    XP_TELEMETRY_TYPES,
    assertXpTelemetryPrivacy,
    evaluateXpTelemetryPolicy,
    normalizeXpTelemetryEvent
  };
});
