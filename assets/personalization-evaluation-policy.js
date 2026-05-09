(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestPersonalizationEvaluationPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const POLICY_VERSION = 'personalization-evaluation/v1';
  const DEFAULT_PERSONALIZATION_EVALUATION_POLICY = Object.freeze({
    maxGradeSkewShare: 0.5,
    maxRepeatedItemShare: 0.25,
    maxWeakSkillShare: 0.6,
    maxUnsupportedStretchShare: 0,
    maxAllowedStretchGrades: 1,
    minCoverageShare: 1,
    rollbackFeatureFlag: 'dynamicQuizAssemblyPilot'
  });
  const UNSAFE_KEY_PATTERN = /learnerId|studentId|studentName|email|prompt|question|choices|answer|answerKey|correct|explanation|provider|vector|token|secret|raw/i;

  function evaluatePersonalizationRun(input = {}, policy = DEFAULT_PERSONALIZATION_EVALUATION_POLICY) {
    const run = input && typeof input === 'object' ? input : {};
    const outcomes = normalizeOutcomes(run.outcomes);
    const selections = outcomes.flatMap(outcome => outcome.selectedRefs.map(ref => ({ outcome, ref })));
    const expected = normalizeExpected(run.expected);
    const blockers = [];

    const slices = {
      grade: buildSlices(outcomes, outcome => outcome.grade, outcome => outcome.selectedRefs.length),
      difficulty: buildSlices(outcomes, outcome => outcome.difficulty, outcome => outcome.selectedRefs.length),
      domain: buildSlices(outcomes, outcome => outcome.domain, outcome => outcome.selectedRefs.length),
      assignmentStatus: buildSlices(outcomes, outcome => outcome.assignmentStatus, outcome => outcome.selectedRefs.length),
      reviewUrgency: buildSlices(outcomes, outcome => outcome.reviewUrgency, outcome => outcome.selectedRefs.length),
      accessibility: buildSlices(outcomes, outcome => outcome.accessibilityMode, outcome => outcome.selectedRefs.length),
      offline: buildSlices(outcomes, outcome => outcome.offlineEligible ? 'offline_eligible' : 'online_only', outcome => outcome.selectedRefs.length)
    };
    const coverage = buildCoverage(selections, expected);
    const metrics = buildFairnessMetrics(outcomes, selections, expected, policy);

    if (metrics.gradeSkewShare >= policy.maxGradeSkewShare && metrics.gradeSkewShare > 0) blockers.push('grade_skew');
    if (metrics.repeatedItemShare > policy.maxRepeatedItemShare) blockers.push('repeated_item_pressure');
    if (coverage.skills.coverageShare < policy.minCoverageShare) blockers.push('skill_starvation');
    if (coverage.domains.coverageShare < policy.minCoverageShare) blockers.push('domain_starvation');
    if (coverage.standards.coverageShare < policy.minCoverageShare) blockers.push('coverage_drift');
    if (metrics.unsupportedStretchShare > policy.maxUnsupportedStretchShare) blockers.push('unsupported_stretch');
    if (metrics.weakSkillShare > policy.maxWeakSkillShare) blockers.push('over_remediation');

    const report = {
      schemaVersion: 1,
      policyVersion: POLICY_VERSION,
      runRef: safeString(run.runId || run.runRef),
      generatedAt: safeIso(run.generatedAt),
      aggregateOnly: true,
      summary: {
        totalPlans: outcomes.length,
        totalSelections: selections.length,
        ownerPresent: !!safeString(run.owner),
        reviewed: !!safeIso(run.reviewedAt),
        rollbackCriteriaPresent: normalizeStringArray(run.rollbackCriteria).length > 0
      },
      slices,
      coverage,
      fairness: metrics,
      gate: {
        status: blockers.length ? 'blocked' : 'passed',
        blockers: Array.from(new Set(blockers)),
        rollbackFeatureFlag: policy.rollbackFeatureFlag
      }
    };
    return deepFreeze(report);
  }

  function evaluatePersonalizationEvaluationGate(input = {}, policy = DEFAULT_PERSONALIZATION_EVALUATION_POLICY) {
    const run = input.evaluationRun || {};
    const report = input.evaluationReport || evaluatePersonalizationRun(run, policy);
    const blockers = [];
    if (report.gate.status !== 'passed') blockers.push(...report.gate.blockers);
    if (!safeString(run.owner || input.owner)) blockers.push('owner_required');
    if (!safeIso(run.reviewedAt || input.reviewedAt)) blockers.push('review_date_required');
    if (!normalizeStringArray(run.rollbackCriteria || input.rollbackCriteria).length) blockers.push('rollback_criteria_required');
    return {
      launchAllowed: blockers.length === 0,
      blockers: Array.from(new Set(blockers)),
      owner: safeString(run.owner || input.owner),
      reviewedAt: safeIso(run.reviewedAt || input.reviewedAt),
      rollbackFeatureFlag: policy.rollbackFeatureFlag,
      report
    };
  }

  function validateEvaluationReportPrivacy(report = {}) {
    const errors = [];
    if (containsUnsafe(report)) errors.push('evaluation_report_must_be_aggregate_only');
    if (report.aggregateOnly !== true) errors.push('evaluation_report_must_be_aggregate_only');
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function normalizeOutcomes(outcomes) {
    return (Array.isArray(outcomes) ? outcomes : []).map(outcome => {
      const input = outcome && typeof outcome === 'object' ? outcome : {};
      return {
        planRef: safeString(input.planRef || input.planId),
        grade: safeString(input.grade || 'unknown'),
        difficulty: safeString(input.difficulty || 'mixed'),
        domain: safeString(input.domain || 'unknown'),
        assignmentStatus: safeString(input.assignmentStatus || 'unknown'),
        reviewUrgency: safeString(input.reviewUrgency || 'none'),
        accessibilityMode: safeString(input.accessibilityMode || 'standard'),
        offlineEligible: input.offlineEligible === true,
        selectedRefs: normalizeRefs(input.selectedRefs)
      };
    });
  }

  function normalizeRefs(refs) {
    return (Array.isArray(refs) ? refs : []).map(ref => {
      const input = ref && typeof ref === 'object' ? ref : {};
      return {
        id: safeString(input.id || input.questionRef || input.ref),
        sourceSet: safeString(input.sourceSet),
        gradeLevel: Number(input.gradeLevel || input.grade) || 0,
        difficultyBand: safeString(input.difficultyBand || input.difficulty || 'mixed'),
        skillIds: normalizeStringArray(input.skillIds),
        standardIds: normalizeStringArray(input.standardIds),
        reasonCodes: normalizeStringArray(input.reasonCodes)
      };
    }).filter(ref => ref.id);
  }

  function normalizeExpected(expected = {}) {
    const input = expected && typeof expected === 'object' ? expected : {};
    return {
      grades: normalizeStringArray(input.grades),
      domains: normalizeStringArray(input.domains),
      skills: normalizeStringArray(input.skills),
      standards: normalizeStringArray(input.standards)
    };
  }

  function buildSlices(outcomes, keyFn, selectionCountFn) {
    const index = new Map();
    outcomes.forEach(outcome => {
      const key = safeString(keyFn(outcome) || 'unknown');
      const current = index.get(key) || { key, planCount: 0, selectionCount: 0 };
      current.planCount += 1;
      current.selectionCount += Number(selectionCountFn(outcome)) || 0;
      index.set(key, current);
    });
    return Array.from(index.values()).sort((left, right) => left.key.localeCompare(right.key));
  }

  function buildCoverage(selections, expected) {
    return {
      domains: coverageSummary(expected.domains, selections.map(item => item.outcome.domain)),
      skills: coverageSummary(expected.skills, selections.flatMap(item => item.ref.skillIds)),
      standards: coverageSummary(expected.standards, selections.flatMap(item => item.ref.standardIds))
    };
  }

  function coverageSummary(expected, actualValues) {
    const actual = Array.from(new Set(actualValues.map(safeString).filter(Boolean))).sort();
    const expectedSet = new Set(expected);
    const covered = expected.filter(value => actual.includes(value));
    const missing = expected.filter(value => !actual.includes(value));
    return {
      expected: Object.freeze(expected.slice()),
      covered: Object.freeze(covered),
      missing: Object.freeze(missing),
      coverageShare: expectedSet.size ? covered.length / expectedSet.size : 1
    };
  }

  function buildFairnessMetrics(outcomes, selections, expected, policy) {
    const totalSelections = Math.max(1, selections.length);
    const gradeCounts = countValues(outcomes.map(outcome => outcome.grade));
    const expectedGradeShare = expected.grades.length ? 1 / expected.grades.length : 1;
    const gradeSkewShare = expected.grades.reduce((worst, grade) => {
      const actualShare = (gradeCounts[grade] || 0) / Math.max(1, outcomes.length);
      return Math.max(worst, Math.abs(actualShare - expectedGradeShare));
    }, 0);
    const repeatedCounts = countValues(selections.map(item => item.ref.id));
    const maxRepeated = Object.values(repeatedCounts).reduce((max, count) => Math.max(max, count), 0);
    const weakSkillSelections = selections.filter(item => item.ref.reasonCodes.includes('weak_skill_review_due')).length;
    const unsupportedStretch = selections.filter(item => {
      const learnerGrade = Number(item.outcome.grade);
      const questionGrade = Number(item.ref.gradeLevel);
      return Number.isFinite(learnerGrade) && Number.isFinite(questionGrade) && questionGrade - learnerGrade > policy.maxAllowedStretchGrades;
    }).length;
    return {
      gradeSkewShare,
      repeatedItemShare: maxRepeated / totalSelections,
      weakSkillShare: weakSkillSelections / totalSelections,
      unsupportedStretchShare: unsupportedStretch / totalSelections
    };
  }

  function countValues(values) {
    return values.reduce((counts, value) => {
      const key = safeString(value || 'unknown');
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function containsUnsafe(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => UNSAFE_KEY_PATTERN.test(key) || containsUnsafe(value[key]));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object') return value;
    Object.freeze(value);
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return value;
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
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
    DEFAULT_PERSONALIZATION_EVALUATION_POLICY,
    POLICY_VERSION,
    evaluatePersonalizationEvaluationGate,
    evaluatePersonalizationRun,
    validateEvaluationReportPrivacy
  };
});
