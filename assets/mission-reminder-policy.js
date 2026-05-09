(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestMissionReminderPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ALLOWED_CHANNELS = new Set(['in_app', 'guardian_email']);
  const ACTIONABLE_STATES = new Set(['overdue', 'due_soon']);
  const PAYLOAD_KEYS = new Set(['answer', 'answerKey', 'choices', 'email', 'explanation', 'learnerDisplayName', 'learnerName', 'prompt', 'question', 'studentName']);

  function normalizeMissionReminderPreferences(raw) {
    const input = stripPayload(raw && typeof raw === 'object' ? raw : {});
    const quietHours = input.quietHours && typeof input.quietHours === 'object' ? input.quietHours : {};
    const frequencyCap = input.frequencyCap && typeof input.frequencyCap === 'object' ? input.frequencyCap : {};
    return {
      enabled: input.enabled === true,
      channels: normalizeChannels(input.channels),
      quietHours: {
        enabled: quietHours.enabled !== false,
        start: normalizeClock(quietHours.start, '20:00'),
        end: normalizeClock(quietHours.end, '07:00')
      },
      frequencyCap: {
        count: normalizeCapCount(frequencyCap.count),
        windowHours: normalizeWindowHours(frequencyCap.windowHours)
      }
    };
  }

  function evaluateMissionReminderCandidate(input = {}) {
    const now = safeIso(input.now) || new Date().toISOString();
    const nowMs = Date.parse(now);
    const preferences = normalizeMissionReminderPreferences(input.preferences);
    const candidate = normalizeCandidate(input.candidate);
    const recent = normalizeRecentNotifications(input.recentNotifications);
    const reasonCodes = [];

    if (!preferences.enabled) reasonCodes.push('reminders_disabled');
    if (!candidate.missionId || !ACTIONABLE_STATES.has(candidate.state)) reasonCodes.push('no_actionable_mission');
    if (candidate.channel && !preferences.channels.includes(candidate.channel)) reasonCodes.push('channel_not_enabled');
    if (preferences.quietHours.enabled && isQuietTime(now, preferences.quietHours)) reasonCodes.push('quiet_hours');
    if (isFrequencyCapped(recent, preferences.frequencyCap, nowMs)) reasonCodes.push('frequency_cap_reached');
    if (!reasonCodes.length) reasonCodes.push(candidate.state === 'overdue' ? 'mission_overdue' : 'mission_due_soon');

    const send = reasonCodes.length === 1 && ['mission_overdue', 'mission_due_soon'].includes(reasonCodes[0]);
    return {
      schemaVersion: 1,
      action: send ? 'send' : 'suppress',
      channel: candidate.channel || preferences.channels[0] || '',
      missionRef: { missionId: candidate.missionId },
      dueAt: candidate.dueAt,
      reasonCodes,
      evaluatedAt: now
    };
  }

  function normalizeCandidate(raw) {
    const input = stripPayload(raw && typeof raw === 'object' ? raw : {});
    return {
      missionId: safeString(input.missionId || input.id),
      state: safeString(input.state),
      dueAt: safeIso(input.dueAt),
      channel: safeString(input.channel || 'in_app')
    };
  }

  function normalizeRecentNotifications(values) {
    return (Array.isArray(values) ? values : []).map(value => {
      const input = stripPayload(value && typeof value === 'object' ? value : {});
      return {
        sentAt: safeIso(input.sentAt),
        missionId: safeString(input.missionId)
      };
    }).filter(item => item.sentAt);
  }

  function normalizeChannels(values) {
    return Array.from(new Set((Array.isArray(values) ? values : [])
      .map(safeString)
      .filter(channel => ALLOWED_CHANNELS.has(channel))));
  }

  function isFrequencyCapped(recent, cap, nowMs) {
    if (!cap.count) return true;
    const windowMs = cap.windowHours * 60 * 60 * 1000;
    return recent.filter(item => {
      const sentAt = Date.parse(item.sentAt);
      return Number.isFinite(sentAt) && nowMs - sentAt <= windowMs;
    }).length >= cap.count;
  }

  function isQuietTime(now, quietHours) {
    const date = new Date(now);
    if (!Number.isFinite(date.getTime())) return false;
    const currentMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
    const start = clockToMinutes(quietHours.start);
    const end = clockToMinutes(quietHours.end);
    if (start === end) return false;
    if (start < end) return currentMinutes >= start && currentMinutes < end;
    return currentMinutes >= start || currentMinutes < end;
  }

  function normalizeClock(value, fallback) {
    const text = safeString(value);
    return /^\d{2}:\d{2}$/.test(text) && clockToMinutes(text) < 24 * 60 ? text : fallback;
  }

  function clockToMinutes(value) {
    const parts = safeString(value).split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  function normalizeCapCount(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 && number <= 6 ? number : 0;
  }

  function normalizeWindowHours(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 && number <= 168 ? number : 24;
  }

  function stripPayload(value) {
    if (Array.isArray(value)) return value.map(stripPayload);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((result, key) => {
      if (PAYLOAD_KEYS.has(key)) return result;
      result[key] = stripPayload(value[key]);
      return result;
    }, {});
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
    ALLOWED_CHANNELS,
    evaluateMissionReminderCandidate,
    normalizeMissionReminderPreferences
  };
});
