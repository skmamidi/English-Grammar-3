(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestPersonalizationFeatureStoreDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const crypto = typeof require === 'function' ? require('node:crypto') : null;
  const FEATURE_VERSION = 'personalization-feature-store/v1';
  const DEFAULT_FRESHNESS_POLICY = Object.freeze({
    maxEvidenceAgeDays: 14,
    requiredEvidenceKinds: Object.freeze(['verified_attempt_projection'])
  });
  const UNSAFE_KEY_PATTERN = /learnerId|studentId|studentName|learnerEmail|email|questionText|question|prompt|choices|answer|answerKey|explanation|lessonBody|storyBeats|provider|vector|warehouse|cacheKey|payment|billing|token|secret/i;

  function buildPersonalizationFeatureSnapshot(input = {}) {
    const generatedAt = safeIso(input.generatedAt) || new Date(0).toISOString();
    const evidence = buildEvidenceRefs(input);
    const freshness = evaluateFeatureFreshnessPolicy({ generatedAt, evidence });
    const learnerSkillSignals = buildLearnerSkillSignals(input);
    const contentCandidateSignals = (Array.isArray(input.contentCandidates) ? input.contentCandidates : [])
      .map(normalizeContentCandidateSignal)
      .filter(signal => signal.contentRef);
    const learnerScopeRef = hashScopeRef(input.learnerScopeRef || input.scopeRef || 'local-practice');

    return Object.freeze({
      schemaVersion: 1,
      featureVersion: FEATURE_VERSION,
      snapshotRef: `feature-snapshot:${digest([learnerScopeRef, generatedAt, evidence.map(item => item.ref).join('|')].join(':')).slice(7, 23)}`,
      learnerScopeRef,
      generatedAt,
      sourceOfTruth: 'verified_learning_evidence_refs',
      freshness,
      learnerSkillSignals: Object.freeze(learnerSkillSignals),
      contentCandidateSignals: Object.freeze(contentCandidateSignals),
      evidenceRefs: Object.freeze(evidence.map(item => item.ref).filter(Boolean)),
      fallbackReasons: Object.freeze(freshness.fallbackReasons.slice()),
      explainability: Object.freeze(buildExplainability(learnerSkillSignals, contentCandidateSignals, freshness))
    });
  }

  function normalizeLearnerSkillSignal(signal = {}) {
    const input = signal && typeof signal === 'object' ? signal : {};
    const reasonCodes = normalizeStringArray(input.reasonCodes);
    const masteryBand = normalizeMasteryBand(input.masteryBand);
    if (masteryBand && !reasonCodes.includes(masteryBand)) reasonCodes.push(masteryBand);
    return stripUnsafeKeys({
      skillId: safeString(input.skillId),
      masteryBand,
      accuracy: boundedNumber(input.accuracy, 0, 1),
      evidenceWeight: nonNegativeInteger(input.evidenceWeight || input.attempts),
      dueReviewCount: nonNegativeInteger(input.dueReviewCount || input.dueCount),
      overdueReviewCount: nonNegativeInteger(input.overdueReviewCount || input.overdueCount),
      assignmentUrgency: normalizeUrgency(input.assignmentUrgency),
      goalAlignment: normalizeStringArray(input.goalAlignment),
      reasonCodes,
      evidenceRefs: normalizeStringArray(input.evidenceRefs)
    });
  }

  function normalizeContentCandidateSignal(signal = {}) {
    const input = signal && typeof signal === 'object' ? signal : {};
    return stripUnsafeKeys({
      contentRef: safeString(input.contentRef || input.setRef || input.routeRef),
      skillIds: normalizeStringArray(input.skillIds),
      difficultyBand: safeString(input.difficultyBand || 'mixed'),
      estimatedMinutes: nonNegativeInteger(input.estimatedMinutes),
      reasonCodes: normalizeStringArray(input.reasonCodes),
      evidenceRefs: normalizeStringArray(input.evidenceRefs)
    });
  }

  function evaluateFeatureFreshnessPolicy(input = {}) {
    const generatedAt = Date.parse(input.generatedAt || new Date(0).toISOString());
    const policy = Object.assign({}, DEFAULT_FRESHNESS_POLICY, input.policy || {});
    const evidence = Array.isArray(input.evidence) ? input.evidence : [];
    const fallbackReasons = [];
    if (evidence.length === 0) fallbackReasons.push('missing_verified_evidence');
    const maxAgeMs = Math.max(1, Number(policy.maxEvidenceAgeDays) || 14) * 24 * 60 * 60 * 1000;
    evidence.forEach(item => {
      if (item && item.required === true && !safeString(item.ref)) fallbackReasons.push('missing_verified_evidence');
      const updatedAt = Date.parse(item && item.updatedAt || '');
      if (Number.isFinite(generatedAt) && Number.isFinite(updatedAt) && generatedAt - updatedAt > maxAgeMs) {
        fallbackReasons.push('stale_verified_evidence');
      }
    });
    return Object.freeze({
      fresh: fallbackReasons.length === 0,
      generatedAt: Number.isFinite(generatedAt) ? new Date(generatedAt).toISOString() : '',
      maxEvidenceAgeDays: Math.max(1, Number(policy.maxEvidenceAgeDays) || 14),
      fallbackReasons: Object.freeze(Array.from(new Set(fallbackReasons)))
    });
  }

  function validatePersonalizationFeatureSnapshot(snapshot = {}) {
    const input = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const errors = [];
    if (input.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    if (safeString(input.featureVersion) !== FEATURE_VERSION) errors.push('featureVersion must be personalization-feature-store/v1');
    if (!safeString(input.snapshotRef)) errors.push('snapshotRef is required');
    if (!safeString(input.learnerScopeRef)) errors.push('learnerScopeRef is required');
    if (/learner|student|email/i.test(safeString(input.learnerScopeRef))) errors.push('personalization snapshot must not include learner identity');
    if (!safeIso(input.generatedAt)) errors.push('generatedAt is required');
    if (!input.freshness || typeof input.freshness !== 'object') errors.push('freshness is required');
    if (!Array.isArray(input.learnerSkillSignals)) errors.push('learnerSkillSignals are required');
    if (!Array.isArray(input.contentCandidateSignals)) errors.push('contentCandidateSignals are required');
    if (!Array.isArray(input.evidenceRefs)) errors.push('evidenceRefs are required');
    if (containsUnsafeKey(input)) errors.push('personalization snapshot must not include prompts answers provider payment or raw learner data');
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function createFakePersonalizationFeatureStoreAdapter() {
    const snapshots = new Map();
    return Object.freeze({
      provider: 'fake',
      kind: 'personalization_feature_store',
      async writeSnapshot(snapshot) {
        const validation = validatePersonalizationFeatureSnapshot(snapshot);
        if (validation.errors.length) {
          const error = new Error(`invalid_personalization_feature_snapshot:${validation.errors.join(',')}`);
          error.errors = validation.errors;
          throw error;
        }
        snapshots.set(snapshot.snapshotRef, Object.freeze(Object.assign({}, snapshot)));
        return { status: 'stored', snapshotRef: snapshot.snapshotRef };
      },
      async readSnapshot(snapshotRef) {
        return snapshots.get(safeString(snapshotRef)) || null;
      },
      async mutateLearnerState() {
        throw new Error('feature_store_is_read_only');
      }
    });
  }

  function buildLearnerSkillSignals(input) {
    const projection = input.verifiedAttemptProjection && typeof input.verifiedAttemptProjection === 'object' ? input.verifiedAttemptProjection : {};
    const mastery = Array.isArray(projection.mastery) ? projection.mastery : [];
    const reviewBySkill = indexBySkill(input.reviewSchedule);
    const assignmentsBySkill = indexAssignmentsBySkill(input.assignments);
    const goalsBySkill = indexGoalsBySkill(input.goals);
    return mastery.map(item => normalizeLearnerSkillSignal({
      skillId: item.skillId,
      masteryBand: item.masteryBand,
      accuracy: item.accuracy,
      attempts: item.attempts,
      dueReviewCount: reviewBySkill[item.skillId] && reviewBySkill[item.skillId].dueCount,
      overdueReviewCount: reviewBySkill[item.skillId] && reviewBySkill[item.skillId].overdueCount,
      assignmentUrgency: assignmentsBySkill[item.skillId] ? 'due_soon' : '',
      goalAlignment: goalsBySkill[item.skillId] || [],
      reasonCodes: [
        item.masteryBand,
        reviewBySkill[item.skillId] && reviewBySkill[item.skillId].overdueCount > 0 ? 'overdue_review' : '',
        assignmentsBySkill[item.skillId] ? 'assignment_context' : '',
        goalsBySkill[item.skillId] ? 'goal_aligned' : ''
      ],
      evidenceRefs: [projection.projectionRef].filter(Boolean)
    })).filter(signal => signal.skillId);
  }

  function buildEvidenceRefs(input) {
    const evidence = [];
    const projection = input.verifiedAttemptProjection && typeof input.verifiedAttemptProjection === 'object' ? input.verifiedAttemptProjection : null;
    if (projection) {
      evidence.push({
        kind: 'verified_attempt_projection',
        ref: safeString(projection.projectionRef),
        updatedAt: safeIso(projection.updatedAt),
        required: true
      });
    }
    (Array.isArray(input.lessonProgress) ? input.lessonProgress : []).forEach(item => evidence.push({
      kind: 'lesson_progress',
      ref: safeString(item.lessonRef || item.progressRef),
      updatedAt: safeIso(item.completedAt || item.updatedAt)
    }));
    return evidence;
  }

  function buildExplainability(skillSignals, candidateSignals, freshness) {
    return {
      reasonCodes: Array.from(new Set(skillSignals.flatMap(signal => signal.reasonCodes).concat(freshness.fallbackReasons))).filter(Boolean),
      skillCount: skillSignals.length,
      candidateCount: candidateSignals.length
    };
  }

  function indexBySkill(items) {
    return (Array.isArray(items) ? items : []).reduce((index, item) => {
      if (item && item.skillId) index[item.skillId] = item;
      return index;
    }, {});
  }

  function indexAssignmentsBySkill(items) {
    return (Array.isArray(items) ? items : []).reduce((index, item) => {
      normalizeStringArray(item && item.skillIds).forEach(skillId => {
        index[skillId] = item;
      });
      return index;
    }, {});
  }

  function indexGoalsBySkill(items) {
    return (Array.isArray(items) ? items : []).reduce((index, item) => {
      normalizeStringArray(item && item.skillIds).forEach(skillId => {
        if (!index[skillId]) index[skillId] = [];
        index[skillId].push(safeString(item.goalRef));
      });
      return index;
    }, {});
  }

  function stripUnsafeKeys(value) {
    if (Array.isArray(value)) return value.map(stripUnsafeKeys);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((safe, key) => {
      if (UNSAFE_KEY_PATTERN.test(key)) return safe;
      safe[key] = stripUnsafeKeys(value[key]);
      return safe;
    }, {});
  }

  function containsUnsafeKey(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => UNSAFE_KEY_PATTERN.test(key) || containsUnsafeKey(value[key]));
  }

  function hashScopeRef(value) {
    return `scope:${digest(safeString(value)).slice(7, 23)}`;
  }

  function digest(value) {
    if (crypto) return `sha256:${crypto.createHash('sha256').update(String(value || '')).digest('hex')}`;
    let hash = 0;
    String(value || '').split('').forEach(char => {
      hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    });
    return `sha256:${Math.abs(hash).toString(16).padStart(64, '0')}`;
  }

  function normalizeMasteryBand(value) {
    const text = safeString(value);
    return ['needs_practice', 'developing', 'secure', 'unknown'].includes(text) ? text : 'unknown';
  }

  function normalizeUrgency(value) {
    const text = safeString(value);
    return ['overdue', 'due_soon', 'assigned', ''].includes(text) ? text : '';
  }

  function boundedNumber(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(max, Math.max(min, number));
  }

  function nonNegativeInteger(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
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
    DEFAULT_FRESHNESS_POLICY,
    FEATURE_VERSION,
    buildPersonalizationFeatureSnapshot,
    createFakePersonalizationFeatureStoreAdapter,
    evaluateFeatureFreshnessPolicy,
    normalizeContentCandidateSignal,
    normalizeLearnerSkillSignal,
    validatePersonalizationFeatureSnapshot
  };
});
