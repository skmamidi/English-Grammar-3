(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestMissionTelemetryPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const appPrivacy = root.GrammarQuestAppTelemetryPrivacy ||
    (typeof require === 'function' ? require('./app-telemetry-privacy') : null);

  const MISSION_TELEMETRY_TYPES = Object.freeze([
    'mission_start',
    'mission_step_completed',
    'mission_recommendation_impression',
    'mission_assignment_open',
    'mission_reminder_action',
    'mission_completion_outcome'
  ]);

  const SAFE_STEP_TYPES = new Set(['lesson', 'practice', 'review', 'reflection']);
  const SAFE_REASON_CODES = new Set([
    'assigned',
    'catalog_loaded',
    'local_resume',
    'offline_resume',
    'recommendation',
    'reward_projected',
    'sync_pending',
    'server_reconciled',
    'reminder_opened',
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
    'questionText',
    'prompt',
    'choices',
    'answer',
    'answers',
    'correctAnswer',
    'answerKey',
    'explanation',
    'lessonBody',
    'rawLesson',
    'rawMission',
    'missionProgressSnapshot',
    'providerPayload',
    'rawProviderPayload'
  ]);

  function evaluateMissionTelemetryPolicy(input = {}) {
    const flags = objectOrEmpty(input.flags || input.featureFlags);
    const privacyPreferences = objectOrEmpty(input.privacyPreferences || input.learnerPrivacyPreferences);
    if (input.parentPreview === true || privacyPreferences.parentPreview === true) {
      return policy(false, 'parent_preview_read_only');
    }
    if (flags.missionTelemetryEnabled !== true) return policy(false, 'feature_flag_disabled');
    if (privacyPreferences.telemetryEnabled !== true) return policy(false, 'telemetry_consent_required');
    return policy(true, 'enabled');
  }

  function normalizeMissionTelemetryEvent(input = {}) {
    const type = MISSION_TELEMETRY_TYPES.includes(input.type) ? input.type : '';
    if (!type) throw new Error('mission_telemetry_type_invalid');

    const normalized = {
      schemaVersion: 1,
      type,
      route: stripQuery(input.route || input.url || ''),
      missionId: safeToken(input.missionId || input.id),
      stepId: safeStepId(input.stepId),
      stepType: SAFE_STEP_TYPES.has(safeToken(input.stepType)) ? safeToken(input.stepType) : '',
      grade: normalizeGrade(input.grade),
      outcome: safeToken(input.outcome || input.status),
      reasonCodes: normalizeReasonCodes(input.reasonCodes || input.reasons),
      durationSeconds: normalizeCount(input.durationSeconds),
      severity: normalizeSeverity(input.severity || input.outcome)
    };

    if (type === 'mission_start' || type === 'mission_recommendation_impression') normalized.source = safeToken(input.source);
    if (type === 'mission_assignment_open') normalized.assignmentScope = normalizeAssignmentScope(input.assignmentScope);
    if (type === 'mission_reminder_action') normalized.reminderChannel = normalizeReminderChannel(input.reminderChannel || input.channel);

    return removeEmptyOperationalFields(normalized);
  }

  function assertMissionTelemetryPrivacy(payload) {
    scan(payload, []);
    if (appPrivacy && typeof appPrivacy.assertAppTelemetryPrivacy === 'function') {
      appPrivacy.assertAppTelemetryPrivacy(payload);
    }
    return true;
  }

  function scan(value, path) {
    if (!value || typeof value !== 'object') return;
    Object.keys(value).forEach(key => {
      if (UNSAFE_KEYS.has(key)) throw new Error(`unsafe_mission_telemetry_field:${path.concat(key).join('.')}`);
      if ((key === 'route' || key === 'url' || key === 'sourceUrl') && String(value[key] || '').includes('?')) {
        throw new Error(`unsafe_mission_telemetry_query:${path.concat(key).join('.')}`);
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

  function normalizeGrade(value) {
    const grade = normalizeCount(value);
    return grade >= 1 && grade <= 12 ? grade : 0;
  }

  function normalizeAssignmentScope(value) {
    const scope = safeToken(value);
    if (scope === 'learner' || scope === 'class' || scope === 'guardian') return scope;
    return '';
  }

  function normalizeReminderChannel(value) {
    const channel = safeToken(value);
    if (channel === 'in_app' || channel === 'email' || channel === 'push') return channel;
    return '';
  }

  function normalizeSeverity(value) {
    const token = safeToken(value);
    if (token === 'failed' || token === 'error' || token === 'rejected') return 'error';
    if (token === 'blocked' || token === 'warn' || token === 'fatigued') return 'warn';
    return 'info';
  }

  function removeEmptyOperationalFields(input) {
    return Object.keys(input).reduce((result, key) => {
      const value = input[key];
      if (Array.isArray(value)) {
        result[key] = value;
      } else if (value !== '' && value !== undefined && value !== null && value !== 0) {
        result[key] = value;
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

  function safeStepId(value) {
    return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  }

  function safeToken(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 80);
  }

  function objectOrEmpty(value) {
    return value && typeof value === 'object' ? value : {};
  }

  return {
    MISSION_TELEMETRY_TYPES,
    assertMissionTelemetryPrivacy,
    evaluateMissionTelemetryPolicy,
    normalizeMissionTelemetryEvent
  };
});
