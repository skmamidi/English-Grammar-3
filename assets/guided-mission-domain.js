(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestGuidedMissionDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const MISSION_STEP_TYPES = Object.freeze(['lesson', 'practice', 'review', 'reflection']);
  const COMPLETION_POLICY_TYPES = new Set(['all_required_steps', 'minimum_required_steps']);
  const SAFE_ID_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
  const SAFE_DOMAIN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
  const DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'mixed']);
  const UNSAFE_PAYLOAD_KEYS = new Set([
    'question',
    'questions',
    'choices',
    'answer',
    'answers',
    'answerKey',
    'correct',
    'explanation',
    'explanations',
    'storyBeats',
    'conceptRules',
    'examples',
    'guidedChecks',
    'commonMistakes',
    'vocabulary',
    'lessonBody',
    'questionPayload',
    'questionSnapshots',
    'providerPayload',
    'rawProvider',
    'studentName',
    'learnerName',
    'email'
  ]);
  const SUBTOPIC_ALIASES = Object.freeze({
    'punctuation-end-sentence': 'punctuation-end-sentence',
    'vocabulary-base-words': 'base-words-prefix-suffix',
    'vocabulary-roots-word-origins': 'roots-word-origins'
  });

  function validateGuidedMission(record, options = {}) {
    const errors = [];
    const input = record && typeof record === 'object' ? record : {};
    const manifestIndex = buildManifestIndex(options.manifest);
    const missionId = safeString(input.missionId || input.id);
    const domain = safeString(input.domain);

    if (input.schemaVersion !== 1) errors.push('mission_schema_version_required');
    if (!missionId) errors.push('mission_id_required');
    else if (!SAFE_ID_PATTERN.test(missionId)) errors.push(`mission_id_unsafe:${missionId}`);
    if (!safeString(input.title)) errors.push('mission_title_required');
    if (!domain) errors.push('mission_domain_required');
    else if (!SAFE_DOMAIN_PATTERN.test(domain)) errors.push(`mission_domain_unsafe:${domain}`);
    else if (manifestIndex.hasManifest && !manifestIndex.domains.has(domain)) errors.push(`mission_domain_unknown:${domain}`);
    validateGradeBand(input.gradeBand).forEach(error => errors.push(error));
    validateSubtopicRefs(input.subtopicRefs, manifestIndex, domain).forEach(error => errors.push(error));
    validateSkillRefs(input.skillRefs).forEach(error => errors.push(error));
    validatePrerequisites(input.prerequisites, manifestIndex).forEach(error => errors.push(error));
    validateCompletionPolicy(input.completionPolicy, input.steps).forEach(error => errors.push(error));
    validateXpPolicyRef(input.xpPolicyRef).forEach(error => errors.push(error));
    validateMissionRouteDescriptor(input.route || buildMissionRouteDescriptor({ missionId })).forEach(error => errors.push(error));
    validateSteps(input.steps, manifestIndex, domain).forEach(error => errors.push(error));
    if (hasUnsafePayload(input)) errors.push('mission_must_not_include_content_payload');

    return unique(errors);
  }

  function normalizeGuidedMission(record, options = {}) {
    const input = record && typeof record === 'object' ? record : {};
    const manifestIndex = buildManifestIndex(options.manifest);
    const missionId = safeString(input.missionId || input.id);
    const domain = safeString(input.domain);

    return {
      schemaVersion: 1,
      missionId,
      title: safeString(input.title),
      description: safeString(input.description),
      domain,
      gradeBand: normalizeGradeBand(input.gradeBand),
      estimatedMinutes: clampNumber(input.estimatedMinutes, 5, 1, 90),
      route: buildMissionRouteDescriptor({ missionId }),
      subtopicRefs: normalizeSubtopicRefs(input.subtopicRefs, manifestIndex),
      skillRefs: normalizeSkillRefs(input.skillRefs),
      prerequisites: normalizePrerequisites(input.prerequisites),
      completionPolicy: normalizeCompletionPolicy(input.completionPolicy),
      xpPolicyRef: normalizeXpPolicyRef(input.xpPolicyRef),
      steps: normalizeSteps(input.steps, manifestIndex, domain),
      tags: normalizeTags(input.tags)
    };
  }

  function normalizeMissionSummary(record, options = {}) {
    const mission = normalizeGuidedMission(record, options);
    return {
      schemaVersion: 1,
      missionId: mission.missionId,
      title: mission.title,
      description: mission.description,
      domain: mission.domain,
      gradeBand: mission.gradeBand,
      estimatedMinutes: mission.estimatedMinutes,
      route: mission.route,
      subtopicRefs: mission.subtopicRefs.map(ref => ({
        setId: ref.setId,
        relationship: ref.relationship,
        route: ref.route
      })),
      skillRefs: mission.skillRefs.map(ref => ({
        skillId: ref.skillId,
        relationship: ref.relationship
      })),
      prerequisites: mission.prerequisites.map(prerequisite => ({
        type: prerequisite.type,
        setId: prerequisite.setId,
        skillId: prerequisite.skillId,
        optional: prerequisite.optional
      })),
      completionPolicy: mission.completionPolicy,
      xpPolicyRef: mission.xpPolicyRef,
      stepSummaries: mission.steps.map(step => ({
        stepId: step.stepId,
        type: step.type,
        title: step.title,
        required: step.required,
        route: step.route
      })),
      tags: {
        conceptIds: mission.tags.conceptIds,
        standardIds: mission.tags.standardIds,
        pedagogyMoves: mission.tags.pedagogyMoves,
        reviewStatus: mission.tags.reviewStatus
      }
    };
  }

  function buildMissionRouteDescriptor(input = {}) {
    const missionId = safeString(input.missionId || input.id);
    return {
      type: 'guided_mission',
      webPath: `missions.html?missionId=${encodeURIComponent(missionId)}`,
      params: { missionId },
      native: {
        screen: 'GuidedMission',
        params: { missionId }
      }
    };
  }

  function validateMissionRouteDescriptor(descriptor) {
    const errors = [];
    const input = descriptor && typeof descriptor === 'object' ? descriptor : {};
    const params = input.params && typeof input.params === 'object' ? input.params : {};
    const webPath = safeString(input.webPath);
    const parsed = parseRelativeRoute(webPath);

    if (input.type !== 'guided_mission') errors.push('mission_route_type_required');
    if (!webPath) errors.push('mission_route_web_path_required');
    if (/^[a-z][a-z0-9+.-]*:/i.test(webPath) || webPath.startsWith('//')) errors.push('mission_route_external_url_forbidden');
    if (/\\|\.\.|%2e/i.test(webPath)) errors.push('mission_route_web_path_unsafe');
    if (!parsed) errors.push('mission_route_web_path_unsafe');
    if (!SAFE_ID_PATTERN.test(safeString(params.missionId))) errors.push('mission_route_mission_id_unsafe');
    if (parsed) {
      if (parsed.pathname !== '/missions.html') errors.push('mission_route_web_path_unsafe');
      if (parsed.searchParams.get('missionId') !== params.missionId) errors.push('mission_route_mission_id_mismatch');
      Array.from(parsed.searchParams.keys()).forEach(key => {
        if (key !== 'missionId') errors.push(`mission_route_query_param_unsupported:${key}`);
      });
    }
    if (input.native) {
      if (input.native.screen !== 'GuidedMission') errors.push('mission_route_native_screen_required');
      if (!input.native.params || input.native.params.missionId !== params.missionId) errors.push('mission_route_native_params_mismatch');
    }

    return unique(errors);
  }

  function validateSteps(steps, manifestIndex, missionDomain) {
    const errors = [];
    const seen = new Set();
    if (!Array.isArray(steps) || !steps.length) return ['mission_steps_required'];

    steps.forEach(step => {
      const input = step && typeof step === 'object' ? step : {};
      const stepId = safeString(input.stepId || input.id);
      const type = safeString(input.type);
      if (!stepId) errors.push('mission_step_id_required');
      else if (!SAFE_ID_PATTERN.test(stepId)) errors.push(`mission_step_id_unsafe:${stepId}`);
      else if (seen.has(stepId)) errors.push(`mission_step_duplicate:${stepId}`);
      seen.add(stepId);
      if (!MISSION_STEP_TYPES.includes(type)) errors.push(`mission_step_type_unsupported:${type}`);
      if (!safeString(input.title)) errors.push(`mission_step_title_required:${stepId || 'unknown'}`);

      if (type === 'lesson') validateLessonStep(input, manifestIndex, missionDomain).forEach(error => errors.push(error));
      if (type === 'practice') validatePracticeStep(input, manifestIndex, missionDomain).forEach(error => errors.push(error));
      if (type === 'review') validateReviewStep(input, manifestIndex).forEach(error => errors.push(error));
      if (type === 'reflection') validateReflectionStep(input).forEach(error => errors.push(error));
      if (input.route) validateStepRouteDescriptor(input.route, type, manifestIndex).forEach(error => errors.push(error));
    });

    return errors;
  }

  function validateLessonStep(step, manifestIndex, missionDomain) {
    const errors = [];
    const ref = step.lessonRef && typeof step.lessonRef === 'object' ? step.lessonRef : {};
    const setId = safeString(ref.setId);
    const set = manifestIndex.setsById.get(setId);
    if (!setId) errors.push('mission_step_lesson_set_required');
    else if (!SAFE_ID_PATTERN.test(setId)) errors.push(`mission_step_lesson_set_unsafe:${setId}`);
    else if (manifestIndex.hasManifest && !set) errors.push(`mission_step_lesson_set_unknown:${setId}`);
    if (set && missionDomain && set.domain !== missionDomain) errors.push('mission_step_lesson_domain_mismatch');
    if (!Number.isFinite(Number(ref.grade)) || Number(ref.grade) < 2 || Number(ref.grade) > 6) {
      errors.push('mission_step_lesson_grade_required');
    }
    return errors;
  }

  function validatePracticeStep(step, manifestIndex, missionDomain) {
    const errors = [];
    const ref = step.practiceRef && typeof step.practiceRef === 'object' ? step.practiceRef : {};
    const setId = safeString(ref.setId);
    const set = manifestIndex.setsById.get(setId);
    if (!setId) errors.push('mission_step_practice_set_required');
    else if (!SAFE_ID_PATTERN.test(setId)) errors.push(`mission_step_practice_set_unsafe:${setId}`);
    else if (manifestIndex.hasManifest && !set) errors.push(`mission_step_practice_set_unknown:${setId}`);
    if (set && missionDomain && set.domain !== missionDomain) errors.push('mission_step_practice_domain_mismatch');
    if (!['subtopic', 'mixed', 'assignment', 'adaptive_review'].includes(safeString(ref.mode))) {
      errors.push(`mission_step_practice_mode_unsupported:${safeString(ref.mode)}`);
    }
    if (!Number.isInteger(Number(ref.questionCount)) || Number(ref.questionCount) < 1 || Number(ref.questionCount) > 60) {
      errors.push('mission_step_practice_question_count_required');
    }
    if (ref.difficulty && !DIFFICULTIES.has(ref.difficulty)) errors.push(`mission_step_practice_difficulty_unsupported:${ref.difficulty}`);
    return errors;
  }

  function validateReviewStep(step, manifestIndex) {
    const errors = [];
    const ref = step.reviewRef && typeof step.reviewRef === 'object' ? step.reviewRef : {};
    if (!['missed_questions', 'spaced_repetition', 'mastery_gap'].includes(safeString(ref.source))) {
      errors.push(`mission_step_review_source_unsupported:${safeString(ref.source)}`);
    }
    const setIds = Array.isArray(ref.setIds) ? ref.setIds.map(safeString).filter(Boolean) : [];
    if (!setIds.length) errors.push('mission_step_review_set_ids_required');
    setIds.forEach(setId => {
      if (!SAFE_ID_PATTERN.test(setId)) errors.push(`mission_step_review_set_unsafe:${setId}`);
      else if (manifestIndex.hasManifest && !manifestIndex.setsById.has(setId)) errors.push(`mission_step_review_set_unknown:${setId}`);
    });
    if (!Number.isInteger(Number(ref.questionCount)) || Number(ref.questionCount) < 1 || Number(ref.questionCount) > 30) {
      errors.push('mission_step_review_question_count_required');
    }
    return errors;
  }

  function validateReflectionStep(step) {
    const errors = [];
    const ref = step.reflectionRef && typeof step.reflectionRef === 'object' ? step.reflectionRef : {};
    const promptId = safeString(ref.promptId);
    if (!promptId) errors.push('mission_step_reflection_prompt_id_required');
    else if (!SAFE_ID_PATTERN.test(promptId)) errors.push(`mission_step_reflection_prompt_id_unsafe:${promptId}`);
    return errors;
  }

  function validateStepRouteDescriptor(descriptor, type, manifestIndex) {
    const input = descriptor && typeof descriptor === 'object' ? descriptor : {};
    const webPath = safeString(input.webPath);
    const parsed = parseRelativeRoute(webPath);
    const errors = [];

    if (!webPath) errors.push('mission_route_web_path_required');
    if (/^[a-z][a-z0-9+.-]*:/i.test(webPath) || webPath.startsWith('//')) errors.push('mission_route_external_url_forbidden');
    if (/\\|\.\.|%2e/i.test(webPath) || !parsed) errors.push('mission_route_web_path_unsafe');
    if (type === 'lesson' && input.type !== 'story_lesson') errors.push('mission_route_step_type_mismatch');
    if (type === 'practice' && input.type !== 'practice') errors.push('mission_route_step_type_mismatch');
    if (type === 'review' && input.type !== 'adaptive_review') errors.push('mission_route_step_type_mismatch');
    if (type === 'reflection' && input.type !== 'mission_reflection') errors.push('mission_route_step_type_mismatch');
    if (input.params && input.params.setId && manifestIndex.hasManifest && !manifestIndex.setsById.has(input.params.setId)) {
      errors.push(`mission_route_set_unknown:${input.params.setId}`);
    }
    return unique(errors);
  }

  function normalizeSteps(steps, manifestIndex, missionDomain) {
    return (Array.isArray(steps) ? steps : []).map(step => normalizeStep(step, manifestIndex, missionDomain)).filter(step => step.stepId);
  }

  function normalizeStep(step, manifestIndex, missionDomain) {
    const input = step && typeof step === 'object' ? step : {};
    const type = MISSION_STEP_TYPES.includes(input.type) ? input.type : 'lesson';
    const normalized = {
      stepId: safeString(input.stepId || input.id),
      type,
      title: safeString(input.title),
      required: input.required !== false
    };

    if (type === 'lesson') {
      normalized.lessonRef = normalizeLessonRef(input.lessonRef, manifestIndex);
      normalized.route = normalizeStepRoute(input.route, type, normalized.lessonRef, manifestIndex);
    } else if (type === 'practice') {
      normalized.practiceRef = normalizePracticeRef(input.practiceRef, manifestIndex);
      normalized.route = normalizeStepRoute(input.route, type, normalized.practiceRef, manifestIndex);
    } else if (type === 'review') {
      normalized.reviewRef = normalizeReviewRef(input.reviewRef);
      normalized.route = normalizeStepRoute(input.route, type, normalized.reviewRef, manifestIndex);
    } else {
      normalized.reflectionRef = {
        promptId: safeString(input.reflectionRef && input.reflectionRef.promptId)
      };
      normalized.route = normalizeStepRoute(input.route, type, normalized.reflectionRef, manifestIndex, missionDomain);
    }

    return normalized;
  }

  function normalizeStepRoute(route, type, ref, manifestIndex, missionDomain) {
    if (route && !validateStepRouteDescriptor(route, type, manifestIndex).length) return cloneRoute(route);
    if (type === 'lesson') return buildLessonRouteDescriptor(ref, manifestIndex);
    if (type === 'practice') return buildPracticeRouteDescriptor(ref, manifestIndex);
    if (type === 'review') return buildReviewRouteDescriptor(ref);
    return {
      type: 'mission_reflection',
      webPath: `missions.html?reflect=${encodeURIComponent(ref.promptId || '')}`,
      params: { reflect: ref.promptId || '', domain: missionDomain || '' }
    };
  }

  function buildLessonRouteDescriptor(ref, manifestIndex) {
    const set = manifestIndex.setsById.get(safeString(ref && ref.setId)) || {};
    const setId = safeString(ref && ref.setId);
    const domain = safeString(set.domain || setId.split('-')[0]);
    const subtopic = resolveSubtopicSlug(setId, domain);
    return {
      type: 'story_lesson',
      webPath: `topics/${domain}/subtopics/${subtopic}.html?learn=1`,
      params: { domain, learn: '1', setId, subtopic }
    };
  }

  function buildPracticeRouteDescriptor(ref, manifestIndex) {
    const set = manifestIndex.setsById.get(safeString(ref && ref.setId)) || {};
    const setId = safeString(ref && ref.setId);
    const domain = safeString(set.domain || setId.split('-')[0]);
    const subtopic = resolveSubtopicSlug(setId, domain);
    return {
      type: 'practice',
      webPath: `topics/${domain}/subtopics/${subtopic}.html?practice=1`,
      params: { domain, practice: '1', setId, subtopic }
    };
  }

  function buildReviewRouteDescriptor(ref) {
    const setId = safeString(ref && Array.isArray(ref.setIds) && ref.setIds[0]);
    return {
      type: 'adaptive_review',
      webPath: `index.html?review=1&setId=${encodeURIComponent(setId)}`,
      params: { review: '1', setId }
    };
  }

  function normalizeLessonRef(ref, manifestIndex) {
    const input = ref && typeof ref === 'object' ? ref : {};
    return {
      setId: safeString(input.setId),
      grade: clampNumber(input.grade, 4, 2, 6),
      route: buildLessonRouteDescriptor(input, manifestIndex)
    };
  }

  function normalizePracticeRef(ref, manifestIndex) {
    const input = ref && typeof ref === 'object' ? ref : {};
    return {
      setId: safeString(input.setId),
      mode: safeString(input.mode || 'subtopic'),
      questionCount: clampNumber(input.questionCount, 10, 1, 60),
      grade: clampNumber(input.grade, 4, 2, 6),
      difficulty: DIFFICULTIES.has(input.difficulty) ? input.difficulty : 'medium',
      route: buildPracticeRouteDescriptor(input, manifestIndex)
    };
  }

  function normalizeReviewRef(ref) {
    const input = ref && typeof ref === 'object' ? ref : {};
    return {
      source: safeString(input.source || 'missed_questions'),
      setIds: normalizeStringArray(input.setIds),
      questionCount: clampNumber(input.questionCount, 3, 1, 30)
    };
  }

  function validateGradeBand(gradeBand) {
    const input = gradeBand && typeof gradeBand === 'object' ? gradeBand : {};
    const min = Number(input.min);
    const max = Number(input.max);
    const errors = [];
    if (!Number.isInteger(min) || min < 2 || min > 6) errors.push('mission_grade_band_min_required');
    if (!Number.isInteger(max) || max < 2 || max > 6) errors.push('mission_grade_band_max_required');
    if (Number.isInteger(min) && Number.isInteger(max) && min > max) errors.push('mission_grade_band_invalid_range');
    return errors;
  }

  function normalizeGradeBand(gradeBand) {
    const input = gradeBand && typeof gradeBand === 'object' ? gradeBand : {};
    const min = clampNumber(input.min, 3, 2, 6);
    const max = clampNumber(input.max, Math.max(min, 6), 2, 6);
    return { min: Math.min(min, max), max: Math.max(min, max) };
  }

  function validateSubtopicRefs(refs, manifestIndex, missionDomain) {
    const errors = [];
    const seen = new Set();
    if (!Array.isArray(refs) || !refs.length) return ['mission_subtopic_refs_required'];
    refs.forEach(ref => {
      const setId = safeString(ref && ref.setId);
      const set = manifestIndex.setsById.get(setId);
      if (!setId) errors.push('mission_subtopic_set_id_required');
      else if (!SAFE_ID_PATTERN.test(setId)) errors.push(`mission_subtopic_set_id_unsafe:${setId}`);
      else if (seen.has(setId)) errors.push(`mission_subtopic_duplicate:${setId}`);
      else if (manifestIndex.hasManifest && !set) errors.push(`mission_subtopic_set_unknown:${setId}`);
      if (set && missionDomain && set.domain !== missionDomain) errors.push(`mission_subtopic_domain_mismatch:${setId}`);
      seen.add(setId);
    });
    return errors;
  }

  function normalizeSubtopicRefs(refs, manifestIndex) {
    const seen = new Set();
    return (Array.isArray(refs) ? refs : []).map(ref => {
      const setId = safeString(ref && ref.setId);
      if (!setId || seen.has(setId)) return null;
      seen.add(setId);
      return {
        setId,
        relationship: safeString(ref && ref.relationship) || 'related',
        route: buildLessonRouteDescriptor({ setId }, manifestIndex)
      };
    }).filter(Boolean);
  }

  function validateSkillRefs(refs) {
    const errors = [];
    const seen = new Set();
    if (!Array.isArray(refs) || !refs.length) return ['mission_skill_refs_required'];
    refs.forEach(ref => {
      const skillId = safeString(ref && ref.skillId);
      if (!skillId) errors.push('mission_skill_id_required');
      else if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/i.test(skillId)) errors.push(`mission_skill_id_unsafe:${skillId}`);
      else if (seen.has(skillId)) errors.push(`mission_skill_duplicate:${skillId}`);
      seen.add(skillId);
    });
    return errors;
  }

  function normalizeSkillRefs(refs) {
    const seen = new Set();
    return (Array.isArray(refs) ? refs : []).map(ref => {
      const skillId = safeString(ref && ref.skillId);
      if (!skillId || seen.has(skillId)) return null;
      seen.add(skillId);
      return {
        skillId,
        relationship: safeString(ref && ref.relationship) || 'related'
      };
    }).filter(Boolean);
  }

  function validatePrerequisites(prerequisites, manifestIndex) {
    const errors = [];
    const allowed = new Set(['lesson_completed', 'practice_completed', 'mastery_at_or_above', 'assignment_available']);
    (Array.isArray(prerequisites) ? prerequisites : []).forEach(prerequisite => {
      const type = safeString(prerequisite && prerequisite.type);
      const setId = safeString(prerequisite && prerequisite.setId);
      if (!allowed.has(type)) errors.push(`mission_prerequisite_type_unsupported:${type}`);
      if (setId) {
        if (!SAFE_ID_PATTERN.test(setId)) errors.push(`mission_prerequisite_set_unsafe:${setId}`);
        else if (manifestIndex.hasManifest && !manifestIndex.setsById.has(setId)) errors.push(`mission_prerequisite_set_unknown:${setId}`);
      }
    });
    return errors;
  }

  function normalizePrerequisites(prerequisites) {
    return (Array.isArray(prerequisites) ? prerequisites : []).map(prerequisite => ({
      type: safeString(prerequisite && prerequisite.type),
      setId: safeString(prerequisite && prerequisite.setId),
      skillId: safeString(prerequisite && prerequisite.skillId),
      optional: prerequisite && prerequisite.optional === true
    })).filter(prerequisite => prerequisite.type);
  }

  function validateCompletionPolicy(policy, steps) {
    const errors = [];
    const input = policy && typeof policy === 'object' ? policy : {};
    const type = safeString(input.type);
    if (!COMPLETION_POLICY_TYPES.has(type)) errors.push(`mission_completion_policy_unsupported:${type}`);
    const stepIds = new Set((Array.isArray(steps) ? steps : []).map(step => safeString(step && (step.stepId || step.id))).filter(Boolean));
    const requiredStepIds = Array.isArray(input.requiredStepIds) ? input.requiredStepIds.map(safeString).filter(Boolean) : [];
    if (!requiredStepIds.length) errors.push('mission_completion_policy_required_steps_required');
    requiredStepIds.forEach(stepId => {
      if (!stepIds.has(stepId)) errors.push(`mission_completion_policy_unknown_step:${stepId}`);
    });
    if (input.minimumAccuracy !== undefined) {
      const accuracy = Number(input.minimumAccuracy);
      if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) errors.push('mission_completion_policy_minimum_accuracy_invalid');
    }
    return errors;
  }

  function normalizeCompletionPolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    return {
      type: COMPLETION_POLICY_TYPES.has(input.type) ? input.type : 'all_required_steps',
      requiredStepIds: normalizeStringArray(input.requiredStepIds),
      minimumAccuracy: clampFloat(input.minimumAccuracy, 0, 1)
    };
  }

  function validateXpPolicyRef(ref) {
    const input = ref && typeof ref === 'object' ? ref : {};
    const errors = [];
    if (!safeString(input.policyId)) errors.push('mission_xp_policy_id_required');
    if (!['none', 'verified_attempts_only', 'server_mission_completion'].includes(safeString(input.awardMode))) {
      errors.push(`mission_xp_award_mode_unsupported:${safeString(input.awardMode)}`);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'clientAwardedXp') || Object.prototype.hasOwnProperty.call(input, 'submittedXp')) {
      errors.push('mission_xp_policy_must_not_accept_client_award');
    }
    return errors;
  }

  function normalizeXpPolicyRef(ref) {
    const input = ref && typeof ref === 'object' ? ref : {};
    return {
      policyId: safeString(input.policyId || 'none'),
      awardMode: ['none', 'verified_attempts_only', 'server_mission_completion'].includes(input.awardMode)
        ? input.awardMode
        : 'none'
    };
  }

  function normalizeTags(tags) {
    const input = tags && typeof tags === 'object' ? tags : {};
    return {
      conceptIds: normalizeStringArray(input.conceptIds),
      standardIds: normalizeStringArray(input.standardIds),
      pedagogyMoves: normalizeStringArray(input.pedagogyMoves),
      reviewStatus: safeString(input.reviewStatus || 'draft')
    };
  }

  function buildManifestIndex(manifest) {
    const sets = Array.isArray(manifest && manifest.sets) ? manifest.sets : [];
    return {
      hasManifest: !!sets.length,
      setsById: new Map(sets.map(set => [safeString(set.id || set.setId), set])),
      domains: new Set(sets.map(set => safeString(set.domain)).filter(Boolean))
    };
  }

  function resolveSubtopicSlug(setId, domain) {
    if (SUBTOPIC_ALIASES[setId]) return SUBTOPIC_ALIASES[setId];
    const prefix = `${domain}-`;
    return setId.startsWith(prefix) ? setId.slice(prefix.length) : setId;
  }

  function parseRelativeRoute(webPath) {
    if (!webPath) return null;
    try {
      return new URL(webPath.startsWith('/') ? `https://grammarquest.app${webPath}` : `https://grammarquest.app/${webPath}`);
    } catch (error) {
      return null;
    }
  }

  function hasUnsafePayload(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => {
      if (UNSAFE_PAYLOAD_KEYS.has(key)) return true;
      const child = value[key];
      if (Array.isArray(child)) return child.some(hasUnsafePayload);
      return child && typeof child === 'object' && hasUnsafePayload(child);
    });
  }

  function cloneRoute(route) {
    return {
      type: safeString(route.type),
      webPath: safeString(route.webPath),
      params: Object.assign({}, route.params || {}),
      native: route.native ? {
        screen: safeString(route.native.screen),
        params: Object.assign({}, route.native.params || {})
      } : undefined
    };
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function clampNumber(value, fallback, min, max) {
    const number = Math.round(Number(value));
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function clampFloat(value, min, max) {
    if (value === undefined || value === null || value === '') return 0;
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(min, Math.min(max, number));
  }

  function unique(values) {
    return Array.from(new Set(values));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    MISSION_STEP_TYPES,
    buildMissionRouteDescriptor,
    normalizeGuidedMission,
    normalizeMissionSummary,
    validateGuidedMission,
    validateMissionRouteDescriptor
  };
});
