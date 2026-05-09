const POLICY_VERSION = 'dynamic-quiz-assembly/v1';
const MAX_SELECTED_QUESTIONS = 60;
const DEFAULT_POLICY = Object.freeze({
  maxWeakSkillShare: 0.5,
  maxDifficultyStretch: 0,
  maxPerSourceSet: 6,
  payloadBudgetBytes: 16 * 1024
});

const UNSAFE_KEY_PATTERN = /prompt|choices|answer|answerKey|correct|learnerId|studentId|email|provider|vector|warehouse|token|secret/i;
const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 };

function assembleDynamicQuizPlan(input = {}) {
  const request = normalizeAssemblyRequest(input.request || {});
  const policy = Object.assign({}, DEFAULT_POLICY, request.policy || {});
  if (input.repositoryError) {
    return buildDeterministicFallbackPlan({
      request,
      candidatePool: input.candidatePool,
      fallbackReasons: ['sparse_repository_unavailable'],
      fallbackQuestionRefs: request.fallbackQuestionRefs
    });
  }

  const candidatePool = buildCandidatePool(input.candidatePool && input.candidatePool.questions || input.candidatePool || []);
  if (!candidatePool.questions.length) {
    return buildDeterministicFallbackPlan({
      request,
      candidatePool,
      fallbackReasons: ['empty_candidate_pool'],
      fallbackQuestionRefs: request.fallbackQuestionRefs
    });
  }

  const freshness = getFeatureFreshness(input.featureSnapshot);
  if (!input.featureSnapshot || freshness.fresh !== true) {
    return buildDeterministicFallbackPlan({
      request,
      candidatePool,
      fallbackReasons: input.featureSnapshot
        ? normalizeStringArray(freshness.fallbackReasons).concat('personalization_unavailable')
        : ['missing_personalization_snapshot']
    });
  }

  const signals = normalizeSkillSignals(input.featureSnapshot.learnerSkillSignals);
  const candidateSet = filterCandidates(candidatePool.questions, request, policy);
  const scored = candidateSet.candidates
    .map(candidate => scoreCandidate(candidate, request, policy, signals))
    .sort((left, right) => right.score - left.score || left.tieBreaker.localeCompare(right.tieBreaker));
  const selected = selectWithCaps(scored, request, policy, signals);
  const refs = selected.map(entry => buildQuestionRef(entry.candidate));
  return freezePlan({
    schemaVersion: 1,
    policyVersion: POLICY_VERSION,
    planId: buildPlanId(request, refs, 'personalized'),
    mode: 'personalized',
    questionRefs: refs,
    questionSnapshots: [],
    explanations: selected.map(entry => buildExplanation(entry.candidate, entry.reasonCodes, entry.score)),
    fallbackReasons: [],
    diagnostics: {
      personalizationApplied: true,
      sourceOfTruth: 'sparse_content_refs_and_verified_feature_snapshot',
      candidateCount: candidatePool.questions.length,
      eligibleCandidateCount: candidateSet.candidates.length,
      selectedCount: refs.length,
      capsApplied: Array.from(new Set(candidateSet.capsApplied.concat(selected.flatMap(entry => entry.capsApplied || [])))),
      payloadBudgetBytes: policy.payloadBudgetBytes
    }
  });
}

function buildCandidatePool(records = []) {
  const questions = (Array.isArray(records) ? records : [])
    .map(normalizeCandidate)
    .filter(candidate => candidate.id && candidate.sourceSet && candidate.contentHash);
  return Object.freeze({
    schemaVersion: 1,
    questions: Object.freeze(questions)
  });
}

function buildDeterministicFallbackPlan(input = {}) {
  const request = normalizeAssemblyRequest(input.request || {});
  const candidatePool = buildCandidatePool(input.candidatePool && input.candidatePool.questions || input.candidatePool || []);
  const explicitRefs = (Array.isArray(input.fallbackQuestionRefs) ? input.fallbackQuestionRefs : request.fallbackQuestionRefs)
    .map(normalizeQuestionRef)
    .filter(ref => ref.id && ref.sourceSet);
  const sourceRefs = explicitRefs.length
    ? explicitRefs
    : filterCandidates(candidatePool.questions, request, Object.assign({}, DEFAULT_POLICY, request.policy || {})).candidates
      .sort((left, right) => fallbackSortKey(left, request).localeCompare(fallbackSortKey(right, request)))
      .map(buildQuestionRef);
  const refs = sourceRefs.slice(0, request.count);
  const reasons = normalizeStringArray(input.fallbackReasons).length
    ? normalizeStringArray(input.fallbackReasons)
    : ['non_personalized_fallback'];
  return freezePlan({
    schemaVersion: 1,
    policyVersion: POLICY_VERSION,
    planId: buildPlanId(request, refs, 'fallback'),
    mode: 'non_personalized_fallback',
    questionRefs: refs,
    questionSnapshots: [],
    explanations: refs.map(ref => ({
      ref: ref.id,
      reasonCodes: Object.freeze(['deterministic_fallback']),
      scoreBand: 'fallback'
    })),
    fallbackReasons: reasons,
    diagnostics: {
      personalizationApplied: false,
      sourceOfTruth: explicitRefs.length ? 'provided_fallback_refs' : 'sparse_content_refs',
      candidateCount: candidatePool.questions.length,
      eligibleCandidateCount: sourceRefs.length,
      selectedCount: refs.length,
      capsApplied: [],
      payloadBudgetBytes: Number(request.policy && request.policy.payloadBudgetBytes) || DEFAULT_POLICY.payloadBudgetBytes
    }
  });
}

function validateAssemblyPlan(plan = {}) {
  const errors = [];
  if (plan.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (plan.policyVersion !== POLICY_VERSION) errors.push('policyVersion must be dynamic-quiz-assembly/v1');
  if (!safeString(plan.planId)) errors.push('planId is required');
  if (!['personalized', 'non_personalized_fallback'].includes(plan.mode)) errors.push('mode is invalid');
  if (!Array.isArray(plan.questionRefs)) errors.push('questionRefs are required');
  if (!Array.isArray(plan.questionSnapshots) || plan.questionSnapshots.length !== 0) errors.push('questionSnapshots must be empty');
  if (!Array.isArray(plan.explanations)) errors.push('explanations are required');
  if (containsUnsafePayload(plan)) errors.push('assembly_plan_must_not_include_payload_or_identity');
  const payloadBudget = Number(plan.diagnostics && plan.diagnostics.payloadBudgetBytes) || DEFAULT_POLICY.payloadBudgetBytes;
  if (Buffer.byteLength(JSON.stringify(plan), 'utf8') > payloadBudget) errors.push('assembly_plan_exceeds_payload_budget');
  return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
}

function filterCandidates(candidates, request, policy) {
  const capsApplied = [];
  const strictAssignment = request.assignment.requiredSkillIds.length > 0;
  const filtered = candidates.filter(candidate => {
    if (request.domain && candidate.domain && candidate.domain !== request.domain) return false;
    if (request.setIds.length && !request.setIds.includes(candidate.sourceSet)) return false;
    if (request.grade && candidate.gradeLevels.length && !candidate.gradeLevels.includes(Number(request.grade))) return false;
    const distance = difficultyDistance(candidate.difficultyBand, request.difficulty);
    if (distance > policy.maxDifficultyStretch || isHarderThanRequested(candidate.difficultyBand, request.difficulty)) {
      capsApplied.push('over_stretch_blocked');
      return false;
    }
    if (strictAssignment && request.assignment.requiredSkillIds.length && !intersects(candidate.skillIds, request.assignment.requiredSkillIds)) return false;
    if (strictAssignment && request.assignment.requiredStandardIds.length && !intersects(candidate.standardIds, request.assignment.requiredStandardIds)) return false;
    return true;
  });
  return { candidates: filtered, capsApplied: Array.from(new Set(capsApplied)) };
}

function scoreCandidate(candidate, request, policy, signals) {
  const signalScores = candidate.skillIds.map(skillId => signals.bySkill.get(skillId)).filter(Boolean);
  const reasonCodes = [];
  let score = 0;
  signalScores.forEach(signal => {
    if (signal.masteryBand === 'needs_practice') {
      score += 50;
      reasonCodes.push('weak_skill_review_due');
    } else if (signal.masteryBand === 'developing') {
      score += 24;
      reasonCodes.push('developing_skill_practice');
    } else if (signal.masteryBand === 'secure') {
      score += 4;
      reasonCodes.push('spiral_review');
    }
    score += Math.min(20, Number(signal.dueReviewCount || 0) * 5);
    score += Math.min(20, Number(signal.overdueReviewCount || 0) * 8);
    score += Math.min(12, Number(signal.evidenceWeight || 0));
    if (signal.assignmentUrgency) {
      score += 10;
      reasonCodes.push('assignment_context');
    }
  });
  if (intersects(candidate.skillIds, request.assignment.requiredSkillIds)) {
    score += 20;
    reasonCodes.push('assignment_constraint');
  }
  if (intersects(candidate.standardIds, request.assignment.requiredStandardIds)) {
    score += 8;
    reasonCodes.push('standard_constraint');
  }
  if (difficultyDistance(candidate.difficultyBand, request.difficulty) === 0) score += 6;
  score += deterministicJitter(`${request.seed}:${candidate.id}`);
  if (!reasonCodes.length) reasonCodes.push('balanced_coverage');
  return {
    candidate,
    score,
    reasonCodes: Array.from(new Set(reasonCodes)),
    tieBreaker: `${String(Math.round(score * 100000)).padStart(12, '0')}:${stableHash(`${request.seed}:${candidate.id}`)}:${candidate.id}`
  };
}

function selectWithCaps(scored, request, policy, signals) {
  const selected = [];
  const weakSkillLimit = Math.max(1, Math.floor(request.count * Math.max(0, Math.min(1, policy.maxWeakSkillShare))));
  const weakSkillIds = signals.weakSkillIds;
  const weakSelections = new Map();
  const sourceSelections = new Map();
  const skippedCaps = new Set();

  scored.some(entry => {
    const candidate = entry.candidate;
    const candidateWeakSkills = candidate.skillIds.filter(skillId => weakSkillIds.has(skillId));
    const currentWeakCount = Array.from(weakSelections.values()).reduce((total, count) => total + count, 0);
    if (candidateWeakSkills.length && currentWeakCount >= weakSkillLimit) {
      skippedCaps.add('weak_skill_concentration_capped');
      return false;
    }
    const sourceCount = sourceSelections.get(candidate.sourceSet) || 0;
    if (sourceCount >= policy.maxPerSourceSet) {
      skippedCaps.add('repeated_content_capped');
      return false;
    }
    selected.push(Object.assign({}, entry, { capsApplied: [] }));
    sourceSelections.set(candidate.sourceSet, sourceCount + 1);
    candidateWeakSkills.forEach(skillId => weakSelections.set(skillId, (weakSelections.get(skillId) || 0) + 1));
    return selected.length >= request.count;
  });

  if (skippedCaps.size) selected.forEach(entry => {
    entry.capsApplied = Array.from(skippedCaps);
  });
  return selected;
}

function buildExplanation(candidate, reasonCodes, score) {
  return Object.freeze({
    ref: candidate.id,
    sourceSet: candidate.sourceSet,
    skillIds: Object.freeze(candidate.skillIds.slice()),
    standardIds: Object.freeze(candidate.standardIds.slice()),
    reasonCodes: Object.freeze(Array.from(new Set(reasonCodes))),
    scoreBand: score >= 70 ? 'high' : score >= 30 ? 'medium' : 'coverage'
  });
}

function normalizeAssemblyRequest(input) {
  const count = Math.min(MAX_SELECTED_QUESTIONS, Math.max(1, Math.floor(Number(input.count || input.maxCount) || 10)));
  return {
    domain: safeString(input.domain),
    setIds: normalizeStringArray(input.setIds),
    grade: Number(input.grade) || 0,
    difficulty: normalizeDifficulty(input.difficulty),
    count,
    seed: safeString(input.seed || input.requestId || 'dynamic-quiz-assembly'),
    assignment: normalizeAssignment(input.assignment),
    policy: Object.assign({}, input.policy || {}),
    fallbackQuestionRefs: (Array.isArray(input.fallbackQuestionRefs) ? input.fallbackQuestionRefs : []).map(normalizeQuestionRef)
  };
}

function normalizeAssignment(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    assignmentRef: safeString(source.assignmentRef),
    requiredSkillIds: normalizeStringArray(source.requiredSkillIds || source.skillIds),
    requiredStandardIds: normalizeStringArray(source.requiredStandardIds || source.standardIds)
  };
}

function normalizeCandidate(record = {}) {
  const metadata = record.metadata || {};
  const gradeLevels = normalizeNumberArray(record.gradeLevels || metadata.gradeLevels);
  const difficulty = normalizeDifficulty(record.difficulty || record.difficultyBand || metadata.primaryDifficulty || metadata.intrinsicDifficulty || difficultyForGrade(record, gradeLevels[0]));
  return Object.freeze({
    id: safeString(record.questionId || record.id),
    sourceSet: safeString(record.sourceSet || metadata.sourceSet || record.setId),
    domain: safeString(record.domain),
    version: Number(record.version) || 1,
    contentHash: safeString(record.contentHash),
    sequence: Number(record.sequence || metadata.sequence) || 0,
    skillIds: normalizeStringArray(record.skillIds || metadata.skillIds || metadata.skills),
    standardIds: normalizeStringArray(record.standardIds || metadata.standardIds || metadata.standards),
    gradeLevels,
    difficultyBand: difficulty
  });
}

function normalizeQuestionRef(ref = {}) {
  return Object.freeze({
    id: safeString(ref.id || ref.questionId),
    sourceSet: safeString(ref.sourceSet),
    version: Number(ref.version) || 1,
    contentHash: safeString(ref.contentHash),
    sequence: Number(ref.sequence) || 0,
    skillIds: Object.freeze(normalizeStringArray(ref.skillIds)),
    standardIds: Object.freeze(normalizeStringArray(ref.standardIds)),
    gradeLevels: Object.freeze(normalizeNumberArray(ref.gradeLevels)),
    difficultyBand: normalizeDifficulty(ref.difficultyBand || ref.difficulty)
  });
}

function buildQuestionRef(candidate) {
  return normalizeQuestionRef({
    id: candidate.id,
    sourceSet: candidate.sourceSet,
    version: candidate.version,
    contentHash: candidate.contentHash,
    sequence: candidate.sequence,
    skillIds: candidate.skillIds,
    standardIds: candidate.standardIds,
    gradeLevels: candidate.gradeLevels,
    difficultyBand: candidate.difficultyBand
  });
}

function normalizeSkillSignals(signals = []) {
  const bySkill = new Map();
  const weakSkillIds = new Set();
  (Array.isArray(signals) ? signals : []).forEach(signal => {
    const skillId = safeString(signal && signal.skillId);
    if (!skillId) return;
    const normalized = {
      skillId,
      masteryBand: safeString(signal.masteryBand || 'unknown'),
      evidenceWeight: Number(signal.evidenceWeight) || 0,
      dueReviewCount: Number(signal.dueReviewCount) || 0,
      overdueReviewCount: Number(signal.overdueReviewCount) || 0,
      assignmentUrgency: safeString(signal.assignmentUrgency),
      reasonCodes: normalizeStringArray(signal.reasonCodes)
    };
    bySkill.set(skillId, normalized);
    if (normalized.masteryBand === 'needs_practice') weakSkillIds.add(skillId);
  });
  return { bySkill, weakSkillIds };
}

function getFeatureFreshness(snapshot) {
  const freshness = snapshot && snapshot.freshness && typeof snapshot.freshness === 'object'
    ? snapshot.freshness
    : {};
  return {
    fresh: freshness.fresh === true,
    fallbackReasons: normalizeStringArray(freshness.fallbackReasons)
  };
}

function freezePlan(plan) {
  plan.questionRefs = Object.freeze(plan.questionRefs.map(ref => Object.freeze(ref)));
  plan.questionSnapshots = Object.freeze([]);
  plan.explanations = Object.freeze(plan.explanations.map(item => Object.freeze(Object.assign({}, item, {
    skillIds: Object.freeze(normalizeStringArray(item.skillIds)),
    standardIds: Object.freeze(normalizeStringArray(item.standardIds)),
    reasonCodes: Object.freeze(normalizeStringArray(item.reasonCodes))
  }))));
  plan.fallbackReasons = Object.freeze(normalizeStringArray(plan.fallbackReasons));
  plan.diagnostics = Object.freeze(Object.assign({}, plan.diagnostics, {
    capsApplied: Object.freeze(normalizeStringArray(plan.diagnostics && plan.diagnostics.capsApplied))
  }));
  return Object.freeze(plan);
}

function buildPlanId(request, refs, mode) {
  return `assembly:${stableHash(JSON.stringify({
    mode,
    domain: request.domain,
    setIds: request.setIds,
    grade: request.grade,
    difficulty: request.difficulty,
    seed: request.seed,
    refs: refs.map(ref => ref.id)
  })).slice(0, 16)}`;
}

function fallbackSortKey(candidate, request) {
  return `${stableHash(`${request.seed}:${candidate.sourceSet}:${candidate.sequence}:${candidate.id}`)}:${candidate.sourceSet}:${String(candidate.sequence).padStart(5, '0')}`;
}

function deterministicJitter(value) {
  return Number.parseInt(stableHash(value).slice(0, 6), 16) / 0xffffff;
}

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function difficultyForGrade(record, grade) {
  const difficultyByGrade = record && (record.difficultyByGrade || record.metadata && record.metadata.difficultyByGrade) || {};
  return difficultyByGrade[String(grade)] || '';
}

function difficultyDistance(left, right) {
  return Math.abs((DIFFICULTY_RANK[normalizeDifficulty(left)] ?? 1) - (DIFFICULTY_RANK[normalizeDifficulty(right)] ?? 1));
}

function isHarderThanRequested(left, right) {
  return (DIFFICULTY_RANK[normalizeDifficulty(left)] ?? 1) > (DIFFICULTY_RANK[normalizeDifficulty(right)] ?? 1);
}

function normalizeDifficulty(value) {
  const text = safeString(value).toLowerCase();
  return Object.prototype.hasOwnProperty.call(DIFFICULTY_RANK, text) ? text : 'medium';
}

function containsUnsafePayload(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some(key => UNSAFE_KEY_PATTERN.test(key) || containsUnsafePayload(value[key]));
}

function intersects(left, right) {
  if (!left.length || !right.length) return false;
  const rightSet = new Set(right);
  return left.some(value => rightSet.has(value));
}

function normalizeNumberArray(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite))).sort((a, b) => a - b);
}

function normalizeStringArray(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
}

function safeString(value) {
  return String(value || '').trim();
}

module.exports = {
  DEFAULT_POLICY,
  POLICY_VERSION,
  assembleDynamicQuizPlan,
  buildCandidatePool,
  buildDeterministicFallbackPlan,
  validateAssemblyPlan
};
