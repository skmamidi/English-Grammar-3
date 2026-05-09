(function (root, factory) {
  'use strict';

  const privacy = root.GrammarQuestPrivacyPreferencesDomain ||
    (typeof require === 'function' ? require('./privacy-preferences-domain') : null);
  const api = factory(privacy);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearningExperimentPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function (privacy) {
  'use strict';

  const UNSAFE_METRIC_PATTERN = /(learner|student|question|prompt|choice|answer|explanation|email|name|provider|vector|token|secret|raw)/i;
  const ALLOWED_METRIC_SOURCES = ['verified_learning_projection', 'assembly_diagnostics', 'personalization_evaluation', 'assignment_projection'];
  const ALLOWED_AGGREGATION = ['aggregate', 'cohort'];

  function validateLearningExperimentDefinition(definition = {}) {
    const input = definition && typeof definition === 'object' ? definition : {};
    const errors = [];
    if (!safeString(input.id)) errors.push('id_required');
    if (!safeString(input.status)) errors.push('status_required');
    if (!safeString(input.owner)) errors.push('owner_required');
    if (!safeString(input.featureFlag)) errors.push('featureFlag_required');
    if (!safeIso(input.startsAt)) errors.push('startsAt_required');
    if (!safeIso(input.endsAt)) errors.push('endsAt_required');
    if (safeIso(input.startsAt) && safeIso(input.endsAt) && Date.parse(input.endsAt) <= Date.parse(input.startsAt)) errors.push('duration_invalid');
    if (!input.killSwitch || typeof input.killSwitch !== 'object') errors.push('killSwitch_required');
    if (!Array.isArray(input.rollbackCriteria) || !input.rollbackCriteria.length) errors.push('rollbackCriteria_required');
    const assignmentErrors = validateAssignmentPolicy(input.assignmentPolicy);
    errors.push(...assignmentErrors);
    const metrics = Array.isArray(input.outcomeMetrics) ? input.outcomeMetrics : [];
    if (!metrics.length) errors.push('outcomeMetrics_required');
    metrics.forEach(metric => {
      if (validateOutcomeMetric(metric).errors.length) errors.push('unsafe_outcome_metric');
    });
    return {
      valid: errors.length === 0,
      errors: Array.from(new Set(errors)),
      definition: sanitizeDefinition(input)
    };
  }

  function evaluateLearningExperimentEligibility(input = {}) {
    const definition = input.definition || {};
    const context = input.context || {};
    const validation = validateLearningExperimentDefinition(definition);
    if (!validation.valid) return deny('experiment_definition_invalid', definition.id);
    const now = Date.parse(context.now || new Date().toISOString());
    if (definition.status !== 'active') return deny('experiment_not_active', definition.id);
    if (definition.killSwitch && definition.killSwitch.enabled === true) return deny('experiment_killed', definition.id);
    if (Date.parse(definition.startsAt) > now) return deny('experiment_not_started', definition.id);
    if (Date.parse(definition.endsAt) <= now) return deny('experiment_expired', definition.id);
    const flags = objectOrEmpty(context.featureFlags || context.flags);
    if (flags[definition.featureFlag] !== true) return deny('experiment_flag_disabled', definition.id);
    const requiredFlags = normalizeStringArray(definition.eligibilityRules && definition.eligibilityRules.requiredFeatureFlags);
    if (requiredFlags.some(flag => flags[flag] !== true)) return deny('experiment_flag_disabled', definition.id);
    if (privacy.isParentPreview(context) && !(definition.eligibilityRules && definition.eligibilityRules.allowParentPreview === true)) {
      return deny('parent_preview_denied', definition.id);
    }
    if (isInstitutionDisabled(context.institutionPolicy || context.schoolPolicy, 'experiments')) return deny('institution_policy_denied', definition.id);
    if (isInstitutionDisabled(context.institutionPolicy || context.schoolPolicy, 'optionalPersonalization')) return deny('institution_policy_denied', definition.id);
    const preferences = privacy.normalizePrivacyPreferences(context.privacyPreferences || context.preferences);
    if (preferences.telemetryEnabled !== true) return deny('telemetry_disabled', definition.id);
    if (preferences.experimentParticipationEnabled !== true) return deny('experiment_consent_required', definition.id);
    if (requiresConsent(definition, 'optionalPersonalization') && preferences.optionalPersonalizationEnabled !== true) {
      return deny('optional_personalization_preference_denied', definition.id);
    }
    if (!hasRequiredConsent(definition, context)) return deny('explicit_consent_required', definition.id);
    if (definition.eligibilityRules && definition.eligibilityRules.requireAssignmentAuthority === true && !hasAssignmentAuthority(context)) {
      return deny('assignment_authority_required', definition.id);
    }
    return {
      allowed: true,
      reason: 'eligible',
      experimentId: safeString(definition.id),
      eligibilityRef: `experiment-eligibility:${hash(`${definition.id}:${context.classId || ''}:${context.now || ''}`).slice(0, 16)}`
    };
  }

  function normalizeExperimentAssignment(input = {}) {
    const definition = input.definition || {};
    const policy = normalizeAssignmentPolicy(definition.assignmentPolicy);
    const scopeHash = hash(`${policy.saltRef}:${safeString(input.learnerScopeRef || input.scopeRef || 'local')}`);
    const bucket = Number.parseInt(scopeHash.slice(0, 8), 16) % 100;
    if (bucket >= policy.trafficPercent) {
      return {
        assigned: false,
        reason: 'outside_traffic_allocation',
        assignmentRef: `experiment-assignment:${scopeHash.slice(0, 16)}`,
        experimentId: safeString(definition.id),
        bucket
      };
    }
    const weightBucket = Number.parseInt(scopeHash.slice(8, 16), 16) % Math.max(1, policy.totalWeight);
    let cumulative = 0;
    const variant = policy.variants.find(item => {
      cumulative += item.weight;
      return weightBucket < cumulative;
    }) || policy.variants[0] || { id: 'holdout', holdout: true };
    return {
      assigned: true,
      reason: 'assigned',
      assignmentRef: `experiment-assignment:${scopeHash.slice(0, 16)}`,
      experimentId: safeString(definition.id),
      variantId: variant.id,
      holdout: variant.holdout === true,
      bucket
    };
  }

  function buildExperimentAuditRecord(input = {}) {
    const definition = input.definition || {};
    const assignment = input.assignment || {};
    const eligibility = input.eligibility || {};
    const actor = input.actor || {};
    const occurredAt = safeIso(input.now) || new Date(0).toISOString();
    return Object.freeze({
      schemaVersion: 1,
      auditRef: `experiment-audit:${hash(`${definition.id}:${assignment.assignmentRef}:${occurredAt}`).slice(0, 16)}`,
      experimentId: safeString(definition.id),
      occurredAt,
      actorRole: safeString(actor.role || 'unknown'),
      eligibilityReason: safeString(eligibility.reason),
      assignmentRef: safeString(assignment.assignmentRef),
      variantId: safeString(assignment.variantId),
      holdout: assignment.holdout === true,
      aggregateOnly: true
    });
  }

  function validateOutcomeMetric(metric = {}) {
    const input = metric && typeof metric === 'object' ? metric : {};
    const errors = [];
    if (!safeString(input.id)) errors.push('id_required');
    if (UNSAFE_METRIC_PATTERN.test(safeString(input.id))) errors.push('unsafe_metric_field');
    if (!ALLOWED_METRIC_SOURCES.includes(safeString(input.source))) errors.push('source_invalid');
    if (!ALLOWED_AGGREGATION.includes(safeString(input.aggregationLevel))) errors.push('aggregation_invalid');
    if ((Number(input.minCohortSize) || 0) < 5) errors.push('min_cohort_required');
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function validateAssignmentPolicy(policy) {
    const normalized = normalizeAssignmentPolicy(policy);
    const errors = [];
    if (!normalized.saltRef) errors.push('assignment_salt_required');
    if (!normalized.variants.length) errors.push('variants_required');
    if (normalized.trafficPercent < 0 || normalized.trafficPercent > 100) errors.push('traffic_percent_invalid');
    return errors;
  }

  function normalizeAssignmentPolicy(policy = {}) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const variants = (Array.isArray(input.variants) ? input.variants : []).map(item => ({
      id: safeString(item && item.id),
      weight: Math.max(0, Number(item && item.weight) || 0),
      holdout: item && item.holdout === true
    })).filter(item => item.id && item.weight > 0);
    return {
      saltRef: safeString(input.saltRef),
      trafficPercent: Math.max(0, Math.min(100, Number(input.trafficPercent) || 0)),
      variants,
      totalWeight: variants.reduce((sum, item) => sum + item.weight, 0)
    };
  }

  function sanitizeDefinition(definition) {
    return {
      id: safeString(definition.id),
      status: safeString(definition.status),
      owner: safeString(definition.owner),
      featureFlag: safeString(definition.featureFlag),
      startsAt: safeIso(definition.startsAt),
      endsAt: safeIso(definition.endsAt),
      assignmentPolicy: normalizeAssignmentPolicy(definition.assignmentPolicy),
      outcomeMetrics: (Array.isArray(definition.outcomeMetrics) ? definition.outcomeMetrics : []).map(metric => ({
        id: safeString(metric && metric.id),
        source: safeString(metric && metric.source),
        aggregationLevel: safeString(metric && metric.aggregationLevel),
        minCohortSize: Number(metric && metric.minCohortSize) || 0
      }))
    };
  }

  function hasRequiredConsent(definition, context) {
    const required = normalizeStringArray(definition.eligibilityRules && definition.eligibilityRules.requiredConsent);
    const consent = objectOrEmpty(context.guardianConsent);
    const school = objectOrEmpty(context.schoolPolicy || context.institutionPolicy);
    return required.every(key => {
      if (key === 'telemetry') return consent.telemetry === true || school.telemetry === true;
      if (key === 'experiments') return consent.experiments === true || school.experiments === true;
      if (key === 'optionalPersonalization') return consent.optionalPersonalization === true || school.optionalPersonalization === true;
      return consent[key] === true || school[key] === true;
    });
  }

  function requiresConsent(definition, key) {
    return normalizeStringArray(definition.eligibilityRules && definition.eligibilityRules.requiredConsent).includes(key);
  }

  function isInstitutionDisabled(policy, key) {
    const input = objectOrEmpty(policy);
    const intent = key === 'experiments' ? 'experiments' : 'optional_personalization';
    if (Array.isArray(input.disabledFeatures) && (input.disabledFeatures.includes(key) || input.disabledFeatures.includes(intent))) return true;
    return input[key] === false;
  }

  function hasAssignmentAuthority(context) {
    const actor = objectOrEmpty(context.actor);
    const learnerId = safeString(context.learnerId);
    const classId = safeString(context.classId);
    if (actor.role === 'student') return safeString(actor.learnerId) === learnerId;
    if (actor.role === 'teacher') {
      return normalizeStringArray(actor.assignedLearnerIds).includes(learnerId) ||
        (!!classId && normalizeStringArray(actor.assignedClassIds).includes(classId));
    }
    return false;
  }

  function deny(reason, experimentId) {
    return { allowed: false, reason, experimentId: safeString(experimentId) };
  }

  function objectOrEmpty(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
  }

  function hash(value) {
    let result = 2166136261;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      result ^= text.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(16).padStart(8, '0').repeat(8).slice(0, 64);
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
    buildExperimentAuditRecord,
    evaluateLearningExperimentEligibility,
    normalizeExperimentAssignment,
    validateLearningExperimentDefinition,
    validateOutcomeMetric
  };
});
