(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAppTelemetryPrivacy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const UNSAFE_KEYS = new Set([
    'learnerId', 'studentId', 'studentName', 'userId', 'uid', 'email',
    'question', 'choices', 'answer', 'answers', 'explanation', 'explanations',
    'questionText', 'answerKey',
    'storyBeats', 'conceptRules', 'examples', 'guidedChecks', 'commonMistakes',
    'lessonBody', 'rawLesson', 'narrative',
    'rawMission', 'missionProgressSnapshot', 'providerPayload', 'rawProviderPayload',
    'personalizationFeatureSnapshot', 'featureStoreProviderPayload',
    'learningExperimentAuditRecord', 'experimentProviderPayload', 'rawExperimentOutcome',
    'personalizationRolloutRawEvent', 'personalizationProviderDiagnostics',
    'leaderboardParticipantRef', 'participantRef', 'participantId', 'rawLeaderboardId', 'leaderboardEntryId',
    'authToken', 'token', 'sessionToken', 'privateKey', 'privateKeyRef',
    'stack', 'rawStack', 'rawError'
  ]);

  function assertAppTelemetryPrivacy(payload) {
    scan(payload, []);
    return true;
  }

  function sanitizeAppTelemetryPayload(payload) {
    return sanitize(payload);
  }

  function scan(value, path) {
    if (!value || typeof value !== 'object') return;
    Object.keys(value).forEach(key => {
      const child = value[key];
      if (UNSAFE_KEYS.has(key)) throw new Error(`unsafe_app_telemetry_field:${path.concat(key).join('.')}`);
      if ((key === 'route' || key === 'url' || key === 'sourceUrl') && String(child || '').includes('?')) {
        throw new Error(`unsafe_app_telemetry_query:${path.concat(key).join('.')}`);
      }
      scan(child, path.concat(key));
    });
  }

  function sanitize(value) {
    if (Array.isArray(value)) return value.map(sanitize);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((result, key) => {
      if (UNSAFE_KEYS.has(key)) return result;
      const child = value[key];
      if (key === 'route' || key === 'url' || key === 'sourceUrl') {
        result[key] = stripQuery(child);
      } else if (key === 'featureFlags') {
        result[key] = sanitizeFeatureFlags(child);
      } else {
        result[key] = sanitize(child);
      }
      return result;
    }, {});
  }

  function sanitizeFeatureFlags(flags) {
    const input = flags && typeof flags === 'object' ? flags : {};
    return Object.keys(input).sort().reduce((result, key) => {
      if (/token|secret|private|key|learner|student/i.test(key)) return result;
      if (typeof input[key] === 'boolean' || typeof input[key] === 'string' || typeof input[key] === 'number') {
        result[key] = input[key];
      }
      return result;
    }, {});
  }

  function stripQuery(value) {
    return String(value || '').split('?')[0].split('#')[0] || '/';
  }

  return {
    assertAppTelemetryPrivacy,
    sanitizeAppTelemetryPayload,
    stripQuery
  };
});
