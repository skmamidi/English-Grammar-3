(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestDomainTypeContracts = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function validateLearnerStateContract(state) {
    const errors = [];
    if (!state || typeof state !== 'object') return ['learner_state_must_be_object'];
    if (state.schemaVersion !== 2) errors.push('learner_state_schema_version_must_be_2');
    if (!state.reports || !Array.isArray(state.reports.sessions)) errors.push('learner_state_reports_sessions_must_be_array');
    if (!state.privacyPreferences || typeof state.privacyPreferences.telemetryEnabled !== 'boolean') {
      errors.push('learner_state_privacy_preferences_required');
    }
    return errors;
  }

  function validateQuestionRefContract(ref) {
    const errors = [];
    if (!ref || typeof ref !== 'object') return ['question_ref_must_be_object'];
    if (!safeString(ref.id)) errors.push('question_ref_id_required');
    if (!safeString(ref.sourceSet)) errors.push('question_ref_source_set_required');
    if (!Number.isFinite(Number(ref.version))) errors.push('question_ref_version_required');
    if (hasUnsafePayload(ref)) errors.push('question_ref_must_not_include_payload');
    return errors;
  }

  function validateAssignmentContract(assignment) {
    const errors = [];
    if (!assignment || typeof assignment !== 'object') return ['assignment_must_be_object'];
    if (!safeString(assignment.id)) errors.push('assignment_id_required');
    if (!assignment.scope || typeof assignment.scope !== 'object') errors.push('assignment_scope_required');
    if (!assignment.quizOptions || typeof assignment.quizOptions !== 'object') errors.push('assignment_quiz_options_required');
    if (hasUnsafePayload(assignment)) errors.push('assignment_must_not_include_question_payload');
    return errors;
  }

  function validateAppTelemetryEventContract(event) {
    const errors = [];
    if (!event || typeof event !== 'object') return ['app_telemetry_event_must_be_object'];
    ['type', 'route', 'category', 'severity', 'occurredAt'].forEach(field => {
      if (!safeString(event[field])) errors.push(`app_telemetry_${field}_required`);
    });
    if (/[?#]/.test(String(event.route || ''))) errors.push('app_telemetry_route_must_strip_query');
    if (hasUnsafePayload(event)) errors.push('app_telemetry_must_not_include_payload');
    return errors;
  }

  function validateSelectionTelemetryEventContract(event) {
    const errors = [];
    if (!event || typeof event !== 'object') return ['selection_telemetry_event_must_be_object'];
    ['eventName', 'eventVersion', 'occurredAt', 'source'].forEach(field => {
      if (!safeString(event[field]) && field !== 'eventVersion') errors.push(`selection_telemetry_${field}_required`);
    });
    if (!Number.isFinite(Number(event.eventVersion))) errors.push('selection_telemetry_event_version_required');
    if (hasUnsafePayload(event)) errors.push('selection_telemetry_must_not_include_payload');
    return errors;
  }

  function hasUnsafePayload(value) {
    const unsafeKeys = new Set(['question', 'choices', 'answer', 'explanation', 'explanations', 'questionSnapshots', 'learnerAnswer', 'studentName', 'email', 'token', 'stack']);
    return scan(value);

    function scan(input) {
      if (!input || typeof input !== 'object') return false;
      return Object.keys(input).some(key => unsafeKeys.has(key) || scan(input[key]));
    }
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    validateAppTelemetryEventContract,
    validateAssignmentContract,
    validateLearnerStateContract,
    validateQuestionRefContract,
    validateSelectionTelemetryEventContract
  };
});
