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
    if (hasUnsafePayload(state)) errors.push('learner_state_must_not_include_question_payload');
    return errors;
  }

  function validateQuestionRefContract(ref) {
    const errors = [];
    if (!ref || typeof ref !== 'object') return ['question_ref_must_be_object'];
    if (!safeString(ref.id)) errors.push('question_ref_id_required');
    if (!safeString(ref.sourceSet)) errors.push('question_ref_source_set_required');
    if (!Number.isFinite(Number(ref.version))) errors.push('question_ref_version_required');
    if (!safeString(ref.contentHash)) errors.push('question_ref_content_hash_required');
    if (hasUnsafePayload(ref)) errors.push('question_ref_must_not_include_payload');
    return errors;
  }

  function validateSavedSessionContract(session) {
    const errors = [];
    if (!session || typeof session !== 'object') return ['saved_session_must_be_object'];
    if (!safeString(session.id)) errors.push('saved_session_id_required');
    if (!safeIso(session.completedAt)) errors.push('saved_session_completed_at_required');
    if (!Array.isArray(session.attempts)) errors.push('saved_session_attempts_must_be_array');
    if (Array.isArray(session.attempts)) {
      session.attempts.forEach((attempt, index) => {
        if (!safeString(attempt && (attempt.questionId || attempt.id))) errors.push(`saved_session_attempt_${index}_question_id_required`);
      });
    }
    if (hasUnsafePayload(session)) errors.push('saved_session_must_not_include_payload');
    return errors;
  }

  function validateQuestionReportContract(report) {
    const errors = [];
    if (!report || typeof report !== 'object') return ['question_report_must_be_object'];
    if (!safeString(report.id)) errors.push('question_report_id_required');
    if (!safeString(report.questionId)) errors.push('question_report_question_id_required');
    if (!safeString(report.status)) errors.push('question_report_status_required');
    if (hasUnsafePayload(report)) errors.push('question_report_must_not_include_payload');
    return errors;
  }

  function validateReviewItemContract(item) {
    const errors = [];
    if (!item || typeof item !== 'object') return ['review_item_must_be_object'];
    if (!safeString(item.status)) errors.push('review_item_status_required');
    const refErrors = validateQuestionRefContract(item.questionRef || item.ref || {});
    refErrors.forEach(error => errors.push(`review_item_${error}`));
    if (hasUnsafePayload(item)) errors.push('review_item_must_not_include_payload');
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

  function validateSelectionResponseContract(response) {
    const errors = [];
    if (!response || typeof response !== 'object') return ['selection_response_must_be_object'];
    if (!Number.isFinite(Number(response.schemaVersion))) errors.push('selection_response_schema_version_required');
    if (!safeString(response.requestHash)) errors.push('selection_response_request_hash_required');
    if (!safeString(response.responseDigest)) errors.push('selection_response_digest_required');
    if (!safeIso(response.expiresAt)) errors.push('selection_response_expires_at_required');
    if (!Array.isArray(response.questionRefs)) errors.push('selection_response_question_refs_must_be_array');
    if (Array.isArray(response.questionRefs)) {
      response.questionRefs.forEach((ref, index) => {
        validateQuestionRefContract(ref).forEach(error => errors.push(`selection_response_ref_${index}_${error}`));
      });
    }
    if (hasUnsafePayload(response)) errors.push('selection_response_must_not_include_payload');
    return errors;
  }

  function validateReleaseManifestContract(manifest) {
    const errors = [];
    if (!manifest || typeof manifest !== 'object') return ['release_manifest_must_be_object'];
    if (!Number.isFinite(Number(manifest.schemaVersion))) errors.push('release_manifest_schema_version_required');
    if (!safeString(manifest.appVersion)) errors.push('release_manifest_app_version_required');
    if (!safeString(manifest.releaseId)) errors.push('release_manifest_release_id_required');
    if (!safeIso(manifest.generatedAt)) errors.push('release_manifest_generated_at_required');
    if (!manifest.questionManifest || !safeString(manifest.questionManifest.sourceHash)) errors.push('release_manifest_question_manifest_hash_required');
    if (!manifest.serviceWorker || !safeString(manifest.serviceWorker.cacheName)) errors.push('release_manifest_service_worker_cache_required');
    if (hasSecretMaterial(manifest)) errors.push('release_manifest_must_not_include_secret_material');
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

  function hasSecretMaterial(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => {
      const stringValue = String(value[key] || '');
      if (/private.?key|token|secret|password/i.test(key)) return true;
      if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(stringValue)) return true;
      const child = value[key];
      return child && typeof child === 'object' && hasSecretMaterial(child);
    });
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
    validateAppTelemetryEventContract,
    validateAssignmentContract,
    validateLearnerStateContract,
    validateQuestionReportContract,
    validateQuestionRefContract,
    validateReleaseManifestContract,
    validateReviewItemContract,
    validateSavedSessionContract,
    validateSelectionResponseContract,
    validateSelectionTelemetryEventContract
  };
});
