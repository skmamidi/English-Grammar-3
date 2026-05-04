(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestStoryLessonDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const REQUIRED_LESSON_GRADES = Object.freeze([2, 3, 4, 5, 6]);
  const SAFE_ID_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
  const SAFE_DOMAIN_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
  const SUBTOPIC_ALIASES = Object.freeze({
    'punctuation-end-sentence': 'punctuation-end-sentence',
    'vocabulary-base-words': 'base-words-prefix-suffix',
    'vocabulary-roots-word-origins': 'roots-word-origins'
  });

  function validateStoryLessonRecord(record, options = {}) {
    const errors = [];
    const input = record && typeof record === 'object' ? record : {};
    const manifestIndex = buildManifestIndex(options.manifest);
    const characterIds = buildCharacterIdSet(options.characterCatalog || root.GrammarQuestCharacters);
    const setId = safeString(input.setId);
    const manifestSet = manifestIndex.setsById.get(setId);

    if (input.schemaVersion !== 1) errors.push('lesson_schema_version_required');
    if (!setId) errors.push('lesson_set_id_required');
    else if (!SAFE_ID_PATTERN.test(setId)) errors.push(`lesson_set_id_unsafe:${setId}`);
    else if (manifestIndex.hasManifest && !manifestSet) errors.push('lesson_set_id_unknown');
    if (!safeString(input.domain)) errors.push('lesson_domain_required');
    else if (!SAFE_DOMAIN_PATTERN.test(input.domain)) errors.push(`lesson_domain_unsafe:${input.domain}`);
    else if (manifestIndex.hasManifest && !manifestIndex.domains.has(input.domain)) errors.push(`lesson_domain_unknown:${input.domain}`);
    if (manifestSet && safeString(input.domain) && manifestSet.domain !== input.domain) errors.push('lesson_domain_mismatch');
    if (!safeString(input.title)) errors.push('lesson_title_required');

    validateGradeVariants(input.gradeVariants).forEach(error => errors.push(error));
    validateRelatedSubtopics(input.relatedSubtopics, manifestIndex, setId).forEach(error => errors.push(error));
    validateCharacterRoles(input.characterRoles, characterIds).forEach(error => errors.push(error));
    validateLessonRouteDescriptor(buildLessonRouteDescriptor({
      setId,
      domain: safeString(input.domain)
    }, options), options).forEach(error => errors.push(error));

    return unique(errors);
  }

  function normalizeStoryLessonRecord(record, options = {}) {
    const input = record && typeof record === 'object' ? record : {};
    const set = findManifestSet(input.setId, options.manifest);
    const setId = safeString(input.setId || set.id);
    const domain = safeString(input.domain || set.domain);
    const title = safeString(input.title || set.title || setId);
    const gradeVariants = {};

    REQUIRED_LESSON_GRADES.forEach(grade => {
      const variant = input.gradeVariants && input.gradeVariants[String(grade)] || {};
      gradeVariants[String(grade)] = normalizeGradeVariant(variant, setId, options);
    });

    return {
      schemaVersion: 1,
      setId,
      domain,
      title,
      version: Math.max(1, Math.round(Number(input.version) || 1)),
      contentHash: safeString(input.contentHash),
      estimatedMinutes: clampEstimatedMinutes(input.estimatedMinutes),
      route: buildLessonRouteDescriptor({ setId, domain }, options),
      gradeVariants,
      relatedSubtopics: normalizeRelatedSubtopics(input.relatedSubtopics, options),
      characterRoles: normalizeCharacterRoles(input.characterRoles),
      tags: normalizeTags(input.tags),
      authoring: normalizeAuthoring(input.authoring)
    };
  }

  function normalizeLessonSummary(record, options = {}) {
    const normalized = normalizeStoryLessonRecord(record, options);
    return {
      schemaVersion: 1,
      setId: normalized.setId,
      domain: normalized.domain,
      title: normalized.title,
      version: normalized.version,
      contentHash: normalized.contentHash,
      estimatedMinutes: normalized.estimatedMinutes,
      availableGrades: REQUIRED_LESSON_GRADES.filter(grade => !!normalized.gradeVariants[String(grade)]),
      route: normalized.route,
      relatedSubtopics: normalized.relatedSubtopics.map(item => ({
        setId: item.setId,
        relationship: item.relationship,
        route: item.route
      })),
      characterRoles: normalized.characterRoles.map(role => ({
        roleId: role.roleId,
        characterId: role.characterId,
        purpose: role.purpose
      })),
      tags: {
        conceptIds: normalized.tags.conceptIds,
        skillIds: normalized.tags.skillIds,
        standardIds: normalized.tags.standardIds,
        reviewStatus: normalized.tags.reviewStatus
      }
    };
  }

  function buildLessonRouteDescriptor(input = {}, options = {}) {
    const set = findManifestSet(input.setId, options.manifest);
    const setId = safeString(input.setId || set.id);
    const domain = safeString(input.domain || set.domain);
    const subtopic = safeString(input.subtopic || resolveSubtopicSlug(setId, domain));
    return {
      type: 'story_lesson',
      webPath: `topics/${domain}/subtopics/${subtopic}.html?learn=1`,
      params: {
        domain,
        learn: '1',
        setId,
        subtopic
      }
    };
  }

  function validateLessonRouteDescriptor(descriptor, options = {}) {
    const errors = [];
    const input = descriptor && typeof descriptor === 'object' ? descriptor : {};
    const params = input.params && typeof input.params === 'object' ? input.params : {};
    const webPath = safeString(input.webPath);
    const manifestIndex = buildManifestIndex(options.manifest);
    const normalizedPath = webPath.startsWith('/') ? webPath.slice(1) : webPath;
    const parsed = parseRelativeRoute(normalizedPath);

    if (input.type !== 'story_lesson') errors.push('lesson_route_type_required');
    if (!webPath) errors.push('lesson_route_web_path_required');
    if (/^[a-z][a-z0-9+.-]*:/i.test(webPath) || webPath.startsWith('//')) errors.push('lesson_route_external_url_forbidden');
    if (/\\|\.\.|%2e/i.test(webPath)) errors.push('lesson_route_web_path_unsafe');
    if (!parsed) errors.push('lesson_route_web_path_unsafe');
    if (params.learn !== '1' || (parsed && parsed.searchParams.get('learn') !== '1')) errors.push('lesson_route_learn_param_required');
    if (!SAFE_DOMAIN_PATTERN.test(safeString(params.domain))) errors.push('lesson_route_domain_unsafe');
    if (!SAFE_ID_PATTERN.test(safeString(params.setId))) errors.push('lesson_route_set_id_unsafe');
    if (!SAFE_DOMAIN_PATTERN.test(safeString(params.subtopic))) errors.push('lesson_route_subtopic_unsafe');
    if (manifestIndex.hasManifest && params.domain && !manifestIndex.domains.has(params.domain)) {
      errors.push(`lesson_route_domain_unknown:${params.domain}`);
    }
    if (manifestIndex.hasManifest && params.setId && !manifestIndex.setsById.has(params.setId)) {
      errors.push(`lesson_route_set_id_unknown:${params.setId}`);
    }
    const manifestSet = manifestIndex.setsById.get(params.setId);
    if (manifestSet && params.domain && manifestSet.domain !== params.domain) errors.push('lesson_route_domain_mismatch');
    if (manifestSet && params.subtopic && resolveSubtopicSlug(params.setId, params.domain) !== params.subtopic) {
      errors.push('lesson_route_subtopic_mismatch');
    }
    if (parsed) {
      const match = parsed.pathname.match(/^\/topics\/([^/]+)\/subtopics\/([^/]+)\.html$/);
      if (!match) errors.push('lesson_route_web_path_unsafe');
      else {
        if (params.domain && match[1] !== params.domain) errors.push('lesson_route_domain_mismatch');
        if (params.subtopic && match[2] !== params.subtopic) errors.push('lesson_route_subtopic_mismatch');
      }
      Array.from(parsed.searchParams.keys()).forEach(key => {
        if (key !== 'learn') errors.push(`lesson_route_query_param_unsupported:${key}`);
      });
    }

    return unique(errors);
  }

  function validateGradeVariants(gradeVariants) {
    const errors = [];
    if (!gradeVariants || typeof gradeVariants !== 'object' || Array.isArray(gradeVariants)) {
      return ['lesson_grade_variants_required'];
    }
    REQUIRED_LESSON_GRADES.forEach(grade => {
      const variant = gradeVariants[String(grade)];
      if (!variant || typeof variant !== 'object' || Array.isArray(variant)) {
        errors.push(`lesson_grade_variant_${grade}_required`);
        return;
      }
      if (!safeString(variant.readingLevel)) errors.push(`lesson_grade_variant_${grade}_reading_level_required`);
      ['storyBeats', 'conceptRules', 'examples', 'guidedChecks', 'commonMistakes'].forEach(field => {
        if (!Array.isArray(variant[field]) || !variant[field].length) errors.push(`lesson_grade_variant_${grade}_${field}_required`);
      });
      if (!variant.quizHandoff || typeof variant.quizHandoff !== 'object') errors.push(`lesson_grade_variant_${grade}_quiz_handoff_required`);
      else if (!safeString(variant.quizHandoff.targetSetId)) errors.push(`lesson_grade_variant_${grade}_quiz_handoff_target_required`);
    });
    return errors;
  }

  function validateRelatedSubtopics(relatedSubtopics, manifestIndex, currentSetId) {
    const errors = [];
    const seen = new Set();
    (Array.isArray(relatedSubtopics) ? relatedSubtopics : []).forEach(item => {
      const setId = safeString(item && item.setId);
      if (!setId) errors.push('lesson_related_subtopic_set_id_required');
      else if (!SAFE_ID_PATTERN.test(setId)) errors.push(`lesson_related_subtopic_set_id_unsafe:${setId}`);
      else if (seen.has(setId)) errors.push(`lesson_related_subtopic_duplicate:${setId}`);
      else if (setId === currentSetId) errors.push(`lesson_related_subtopic_self_reference:${setId}`);
      else if (manifestIndex.hasManifest && !manifestIndex.setsById.has(setId)) errors.push(`lesson_related_subtopic_set_id_unknown:${setId}`);
      seen.add(setId);
    });
    return errors;
  }

  function validateCharacterRoles(characterRoles, characterIds) {
    const errors = [];
    const seen = new Set();
    if (!Array.isArray(characterRoles) || !characterRoles.length) return ['lesson_character_roles_required'];
    characterRoles.forEach(role => {
      const roleId = safeString(role && role.roleId);
      const characterId = safeString(role && role.characterId);
      if (!roleId) errors.push('lesson_character_role_id_required');
      else if (seen.has(roleId)) errors.push(`lesson_character_role_duplicate:${roleId}`);
      if (!characterId) errors.push('lesson_character_id_required');
      else if (characterIds.size && !characterIds.has(characterId)) errors.push(`lesson_character_id_unknown:${characterId}`);
      seen.add(roleId);
    });
    return errors;
  }

  function normalizeGradeVariant(variant, fallbackSetId) {
    const input = variant && typeof variant === 'object' ? variant : {};
    return {
      readingLevel: safeString(input.readingLevel),
      storyBeats: normalizeArray(input.storyBeats),
      conceptRules: normalizeStringArray(input.conceptRules),
      examples: normalizeArray(input.examples),
      guidedChecks: normalizeArray(input.guidedChecks),
      commonMistakes: normalizeStringArray(input.commonMistakes),
      vocabulary: normalizeArray(input.vocabulary),
      quizHandoff: {
        label: safeString(input.quizHandoff && input.quizHandoff.label),
        targetSetId: safeString(input.quizHandoff && input.quizHandoff.targetSetId) || fallbackSetId,
        route: buildLessonRouteDescriptor({
          setId: safeString(input.quizHandoff && input.quizHandoff.targetSetId) || fallbackSetId
        }, arguments[2] || {})
      }
    };
  }

  function normalizeRelatedSubtopics(relatedSubtopics, options) {
    return (Array.isArray(relatedSubtopics) ? relatedSubtopics : []).map(item => ({
      setId: safeString(item && item.setId),
      relationship: safeString(item && item.relationship),
      route: buildLessonRouteDescriptor({ setId: safeString(item && item.setId) }, options)
    })).filter(item => item.setId);
  }

  function normalizeCharacterRoles(characterRoles) {
    return (Array.isArray(characterRoles) ? characterRoles : []).map(role => ({
      roleId: safeString(role && role.roleId),
      characterId: safeString(role && role.characterId),
      purpose: safeString(role && role.purpose)
    })).filter(role => role.roleId && role.characterId);
  }

  function normalizeTags(tags) {
    const input = tags && typeof tags === 'object' ? tags : {};
    return {
      conceptIds: normalizeStringArray(input.conceptIds),
      skillIds: normalizeStringArray(input.skillIds),
      standardIds: normalizeStringArray(input.standardIds),
      pedagogyMoves: normalizeStringArray(input.pedagogyMoves),
      commonMistakeIds: normalizeStringArray(input.commonMistakeIds),
      exampleTypes: normalizeStringArray(input.exampleTypes),
      reviewStatus: safeString(input.reviewStatus || 'draft')
    };
  }

  function normalizeAuthoring(authoring) {
    const assistance = authoring && authoring.assistance || {};
    return {
      assistance: {
        used: assistance.used === true,
        provider: safeString(assistance.provider),
        modelFamily: safeString(assistance.modelFamily),
        promptRecordId: safeString(assistance.promptRecordId),
        draftRecordId: safeString(assistance.draftRecordId)
      }
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

  function findManifestSet(setId, manifest) {
    return buildManifestIndex(manifest).setsById.get(safeString(setId)) || {};
  }

  function buildCharacterIdSet(catalog) {
    const ids = new Set();
    if (!catalog || typeof catalog !== 'object') return ids;
    if (Array.isArray(catalog.sets)) {
      catalog.sets.forEach(set => {
        (Array.isArray(set && set.characters) ? set.characters : []).forEach(character => {
          const id = safeString(character && character.id);
          if (id) ids.add(id);
        });
      });
    }
    return ids;
  }

  function resolveSubtopicSlug(setId, domain) {
    if (SUBTOPIC_ALIASES[setId]) return SUBTOPIC_ALIASES[setId];
    const prefix = `${domain}-`;
    return setId.startsWith(prefix) ? setId.slice(prefix.length) : setId;
  }

  function parseRelativeRoute(webPath) {
    try {
      return new URL(`https://grammarquest.app/${webPath}`);
    } catch (error) {
      return null;
    }
  }

  function normalizeArray(values) {
    return (Array.isArray(values) ? values : []).map(item => {
      if (!item || typeof item !== 'object') return {};
      return Object.assign({}, item);
    });
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function clampEstimatedMinutes(value) {
    const minutes = Math.round(Number(value) || 5);
    return Math.max(1, Math.min(30, minutes));
  }

  function unique(values) {
    return Array.from(new Set(values));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    REQUIRED_LESSON_GRADES,
    buildLessonRouteDescriptor,
    normalizeLessonSummary,
    normalizeStoryLessonRecord,
    validateLessonRouteDescriptor,
    validateStoryLessonRecord
  };
});
