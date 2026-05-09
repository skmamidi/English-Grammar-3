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

  function validateEntitlementProjectionContract(projection) {
    const errors = [];
    if (!projection || typeof projection !== 'object') return ['entitlement_projection_must_be_object'];
    if (projection.schemaVersion !== 1) errors.push('entitlement_projection_schema_version_required');
    if (!['free', 'trial', 'premium', 'expired', 'managed'].includes(projection.accessState)) {
      errors.push('entitlement_projection_access_state_required');
    }
    if (!Array.isArray(projection.featureEntitlements)) errors.push('entitlement_projection_feature_entitlements_required');
    if (!safeString(projection.source)) errors.push('entitlement_projection_source_required');
    if (hasProviderPayload(projection)) errors.push('entitlement_projection_must_not_include_provider_payload');
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

  function validateStoryLessonSummaryContract(summary) {
    const errors = [];
    if (!summary || typeof summary !== 'object') return ['story_lesson_summary_must_be_object'];
    if (summary.schemaVersion !== 1) errors.push('story_lesson_summary_schema_version_required');
    if (!safeString(summary.setId)) errors.push('story_lesson_summary_set_id_required');
    if (!safeString(summary.domain)) errors.push('story_lesson_summary_domain_required');
    if (!safeString(summary.title)) errors.push('story_lesson_summary_title_required');
    if (!Array.isArray(summary.availableGrades)) errors.push('story_lesson_summary_available_grades_required');
    if (!summary.route || summary.route.type !== 'story_lesson') errors.push('story_lesson_summary_route_required');
    if (hasLessonBodyPayload(summary) || hasUnsafePayload(summary)) errors.push('story_lesson_summary_must_not_include_body_payload');
    return errors;
  }

  function validateGuidedMissionSummaryContract(summary) {
    const errors = [];
    if (!summary || typeof summary !== 'object') return ['guided_mission_summary_must_be_object'];
    if (summary.schemaVersion !== 1) errors.push('guided_mission_summary_schema_version_required');
    if (!safeString(summary.missionId)) errors.push('guided_mission_summary_id_required');
    if (!safeString(summary.title)) errors.push('guided_mission_summary_title_required');
    if (!safeString(summary.domain)) errors.push('guided_mission_summary_domain_required');
    if (!summary.gradeBand || !Number.isFinite(Number(summary.gradeBand.min)) || !Number.isFinite(Number(summary.gradeBand.max))) {
      errors.push('guided_mission_summary_grade_band_required');
    }
    if (!summary.route || summary.route.type !== 'guided_mission') {
      errors.push('guided_mission_summary_route_required');
    } else if (!isInternalRoute(summary.route.webPath)) {
      errors.push('guided_mission_summary_route_must_be_internal');
    }
    if (!Array.isArray(summary.stepSummaries)) errors.push('guided_mission_summary_steps_required');
    if (Array.isArray(summary.stepSummaries)) {
      summary.stepSummaries.forEach((step, index) => {
        if (!safeString(step && step.stepId)) errors.push(`guided_mission_summary_step_${index}_id_required`);
        if (!['lesson', 'practice', 'review', 'reflection'].includes(step && step.type)) {
          errors.push(`guided_mission_summary_step_${index}_type_required`);
        }
        if (step && step.route && !isInternalRoute(step.route.webPath)) {
          errors.push(`guided_mission_summary_step_${index}_route_must_be_internal`);
        }
      });
    }
    if (hasMissionContentPayload(summary) || hasLessonBodyPayload(summary) || hasUnsafePayload(summary)) {
      errors.push('guided_mission_summary_must_not_include_content_payload');
    }
    return errors;
  }

  function isInternalRoute(webPath) {
    const value = safeString(webPath);
    return !!value && !/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith('//') && !/\\|\.\.|%2e/i.test(value);
  }

  function hasMissionContentPayload(value) {
    const missionPayloadKeys = new Set([
      'lessonRef',
      'practiceRef',
      'reviewRef',
      'questionPayload',
      'providerPayload',
      'rawProvider'
    ]);
    return scan(value);

    function scan(input) {
      if (!input || typeof input !== 'object') return false;
      return Object.keys(input).some(key => missionPayloadKeys.has(key) || scan(input[key]));
    }
  }

  function validateInternalLessonLinkContract(link) {
    const errors = [];
    if (!link || typeof link !== 'object') return ['internal_lesson_link_must_be_object'];
    if (link.type !== 'story_lesson') errors.push('internal_lesson_link_type_required');
    if (!safeString(link.webPath)) errors.push('internal_lesson_link_web_path_required');
    if (/^[a-z][a-z0-9+.-]*:/i.test(safeString(link.webPath)) || safeString(link.webPath).startsWith('//')) {
      errors.push('internal_lesson_link_must_not_use_external_url');
    }
    if (!link.params || link.params.learn !== '1') errors.push('internal_lesson_link_learn_param_required');
    if (link.params && (!safeString(link.params.setId) || !safeString(link.params.domain))) {
      errors.push('internal_lesson_link_params_required');
    }
    if (hasLessonBodyPayload(link) || hasUnsafePayload(link)) errors.push('internal_lesson_link_must_not_include_body_payload');
    return errors;
  }

  function validateCommerceCatalogContract(catalog) {
    const errors = [];
    if (!catalog || typeof catalog !== 'object') return ['commerce_catalog_must_be_object'];
    if (catalog.schemaVersion !== 1) errors.push('commerce_catalog_schema_version_required');
    if (!Array.isArray(catalog.products)) errors.push('commerce_catalog_products_required');
    if (!Array.isArray(catalog.plans)) errors.push('commerce_catalog_plans_required');
    if (Array.isArray(catalog.plans)) {
      catalog.plans.forEach((plan, index) => {
        if (!safeString(plan && plan.planId)) errors.push(`commerce_catalog_plan_${index}_id_required`);
        if (!safeString(plan && plan.entitlementLevel)) errors.push(`commerce_catalog_plan_${index}_entitlement_required`);
        if (!Array.isArray(plan && plan.featureGates)) errors.push(`commerce_catalog_plan_${index}_feature_gates_required`);
      });
    }
    if (hasProviderPayload(catalog)) errors.push('commerce_catalog_must_not_include_provider_payload');
    return errors;
  }

  function validateBillingDomainRecordContract(record) {
    const errors = [];
    if (!record || typeof record !== 'object') return ['billing_domain_record_must_be_object'];
    if (record.schemaVersion !== 1) errors.push('billing_domain_record_schema_version_required');
    if (!safeString(record.recordType)) errors.push('billing_domain_record_type_required');
    if (!safeString(record.billingAccountId)) errors.push('billing_domain_record_account_required');
    if (hasUnsafePayload(record) || hasLearnerIdentity(record)) errors.push('billing_domain_record_must_not_include_learner_payload');
    if (hasProviderPayload(record)) errors.push('billing_domain_record_must_not_include_provider_payload');
    return errors;
  }

  function validateXpAwardSummaryContract(summary) {
    const errors = [];
    if (!summary || typeof summary !== 'object') return ['xp_award_summary_must_be_object'];
    if (summary.schemaVersion !== 1) errors.push('xp_award_summary_schema_version_required');
    if (!['eligible', 'ineligible'].includes(summary.awardType)) errors.push('xp_award_summary_type_required');
    [
      'assignedGrade',
      'quizGrade',
      'stretchMultiplierBps',
      'completionMultiplierBps',
      'correctCount',
      'totalQuestions',
      'baseCorrectXp',
      'rawAwardXp',
      'awardedXp'
    ].forEach(field => {
      if (!Number.isFinite(Number(summary[field]))) errors.push(`xp_award_summary_${field}_required`);
    });
    if (!summary.eligibility || typeof summary.eligibility.eligible !== 'boolean') {
      errors.push('xp_award_summary_eligibility_required');
    }
    if (Object.prototype.hasOwnProperty.call(summary, 'clientAwardedXp') || Object.prototype.hasOwnProperty.call(summary, 'submittedXp')) {
      errors.push('xp_award_summary_must_not_accept_client_award');
    }
    if (hasUnsafePayload(summary)) errors.push('xp_award_summary_must_not_include_question_payload');
    return errors;
  }

  function validatePersonalizationFeatureSnapshotContract(snapshot) {
    const errors = [];
    if (!snapshot || typeof snapshot !== 'object') return ['personalization_feature_snapshot_must_be_object'];
    if (snapshot.schemaVersion !== 1) errors.push('personalization_feature_snapshot_schema_version_required');
    if (!safeString(snapshot.featureVersion)) errors.push('personalization_feature_snapshot_feature_version_required');
    if (!safeString(snapshot.snapshotRef)) errors.push('personalization_feature_snapshot_ref_required');
    if (!safeString(snapshot.learnerScopeRef)) errors.push('personalization_feature_snapshot_scope_required');
    if (!safeIso(snapshot.generatedAt)) errors.push('personalization_feature_snapshot_generated_at_required');
    if (!snapshot.freshness || typeof snapshot.freshness !== 'object') errors.push('personalization_feature_snapshot_freshness_required');
    if (!Array.isArray(snapshot.learnerSkillSignals)) errors.push('personalization_feature_snapshot_skill_signals_required');
    if (!Array.isArray(snapshot.contentCandidateSignals)) errors.push('personalization_feature_snapshot_candidate_signals_required');
    if (!Array.isArray(snapshot.evidenceRefs)) errors.push('personalization_feature_snapshot_evidence_refs_required');
    if (hasPersonalizationUnsafePayload(snapshot) || hasUnsafePayload(snapshot) || hasProviderPayload(snapshot)) {
      errors.push('personalization_feature_snapshot_must_not_include_payload');
    }
    return errors;
  }

  function hasPersonalizationUnsafePayload(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => /learnerId|studentId|studentName|learnerEmail|questionText|question|prompt|choices|answer|answerKey|explanation|provider|vector|warehouse|payment|billing/i.test(key) || hasPersonalizationUnsafePayload(value[key]));
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

  function hasLearnerIdentity(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => {
      if (/learnerId|studentId|studentName|learnerEmail/i.test(key)) return true;
      const child = value[key];
      return child && typeof child === 'object' && hasLearnerIdentity(child);
    });
  }

  function hasProviderPayload(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => {
      if (/providerPlanId|providerPriceId/i.test(key) && safeString(value[key])) return true;
      if (/providerPayload|rawProvider|subscriptionId|paymentToken|customerId|token|secret/i.test(key)) return true;
      const child = value[key];
      return child && typeof child === 'object' && hasProviderPayload(child);
    });
  }

  function hasLessonBodyPayload(value) {
    const bodyKeys = new Set([
      'storyBeats',
      'conceptRules',
      'examples',
      'guidedChecks',
      'commonMistakes',
      'vocabulary',
      'quizHandoff',
      'narrative',
      'prompt'
    ]);
    return scan(value);

    function scan(input) {
      if (!input || typeof input !== 'object') return false;
      return Object.keys(input).some(key => bodyKeys.has(key) || scan(input[key]));
    }
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
    validateBillingDomainRecordContract,
    validateCommerceCatalogContract,
    validateEntitlementProjectionContract,
    validateGuidedMissionSummaryContract,
    validateLearnerStateContract,
    validateQuestionReportContract,
    validateQuestionRefContract,
    validatePersonalizationFeatureSnapshotContract,
    validateReleaseManifestContract,
    validateReviewItemContract,
    validateSavedSessionContract,
    validateSelectionResponseContract,
    validateSelectionTelemetryEventContract,
    validateInternalLessonLinkContract,
    validateStoryLessonSummaryContract,
    validateXpAwardSummaryContract
  };
});
