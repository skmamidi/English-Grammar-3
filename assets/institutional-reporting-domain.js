(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestInstitutionalReportingDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DEFAULT_MIN_COHORT_SIZE = 5;

  function buildInstitutionalReportProjection(input = {}) {
    const tenantId = safeString(input.tenantId);
    const tenantType = safeString(input.tenantType || 'school');
    const classId = safeString(input.classId);
    const minCohortSize = positiveInt(input.minCohortSize, DEFAULT_MIN_COHORT_SIZE);
    const events = normalizeEvents(input.verifiedAttempts || input.events)
      .filter(event => event.tenantId === tenantId)
      .filter(event => !classId || event.classId === classId)
      .filter(event => withinWindow(event.submittedAt, input.timeWindow));
    const verified = events.filter(event => event.status === 'verified');
    const pendingLocal = events.filter(event => event.status === 'provisional_local' || event.status === 'pending_local');
    const learnerCount = new Set(verified.map(event => event.learnerId).filter(Boolean)).size;
    const suppressed = learnerCount < minCohortSize;
    const evidence = {
      verifiedAttemptCount: verified.length,
      pendingLocalCount: pendingLocal.length,
      learnerCount,
      learnerCountBucket: suppressed ? 'suppressed' : bucketCount(learnerCount)
    };
    const summaries = suppressed ? [] : buildSkillSummaries(verified);

    return {
      schemaVersion: 1,
      reportId: `institutional-report:${tenantId}:${classId || 'tenant'}`,
      source: 'verified_learning_evidence',
      tenantId,
      tenantType,
      classId,
      roleScope: safeString(input.roleScope || 'teacher'),
      timeWindow: normalizeTimeWindow(input.timeWindow),
      evidence,
      suppressed,
      suppressionReason: suppressed ? 'small_cohort' : '',
      classroomSkillSummaries: summaries,
      standardsCoverageSummaries: suppressed ? [] : buildStandardsSummaries(verified),
      interventionQueue: suppressed ? [] : buildInterventionQueue(summaries)
    };
  }

  function validateInstitutionalReportProjection(raw = {}) {
    const report = raw && typeof raw === 'object' ? raw : {};
    const errors = [];
    if (report.schemaVersion !== 1) errors.push('institutional_report_schema_version_must_be_1');
    if (!safeString(report.reportId)) errors.push('institutional_report_id_required');
    if (report.source !== 'verified_learning_evidence') errors.push('institutional_report_source_must_be_verified');
    if (!safeString(report.tenantId)) errors.push('institutional_report_tenant_id_required');
    if (!report.evidence || !Number.isFinite(Number(report.evidence.verifiedAttemptCount))) errors.push('institutional_report_evidence_required');
    if (hasUnsafePayload(report)) errors.push('institutional_report_must_not_include_raw_learning_payload');
    return { valid: errors.length === 0, errors };
  }

  function buildReportVisibilityPolicy(input = {}) {
    return {
      schemaVersion: 1,
      tenantId: safeString(input.tenantId),
      tenantType: safeString(input.tenantType || 'school'),
      classId: safeString(input.classId),
      minCohortSize: positiveInt(input.minCohortSize, DEFAULT_MIN_COHORT_SIZE)
    };
  }

  function evaluateReportVisibility(input = {}) {
    const actor = input.actor && typeof input.actor === 'object' ? input.actor : {};
    const policy = buildReportVisibilityPolicy(input.policy);
    if (safeString(actor.role) === 'parent_guardian') return deny('institutional_report_role_denied');
    const membership = (Array.isArray(actor.tenantMemberships) ? actor.tenantMemberships : []).find(item =>
      safeString(item && item.tenantId) === policy.tenantId &&
      safeString(item && item.tenantType) === policy.tenantType &&
      safeString(item && item.status) === 'active'
    );
    if (!membership) return deny('institutional_report_tenant_membership_required');
    const role = safeString(membership.role || actor.role);
    if (role === 'support_operator') return { allow: true, visibility: 'metadata_only', reason: 'allowed' };
    if (role === 'teacher') {
      const classIds = normalizeStringArray(membership.classIds);
      return classIds.includes(policy.classId)
        ? { allow: true, visibility: 'full', reason: 'allowed' }
        : deny('institutional_report_class_scope_required');
    }
    if (role === 'school_admin' || role === 'district_admin') return { allow: true, visibility: 'full', reason: 'allowed' };
    return deny('institutional_report_role_denied');
  }

  function redactInstitutionalReportForExport(report = {}) {
    const evidence = report.evidence && typeof report.evidence === 'object' ? report.evidence : {};
    return Object.assign({}, report, {
      evidence: {
        verifiedAttemptCount: Number(evidence.verifiedAttemptCount) || 0,
        pendingLocalCount: Number(evidence.pendingLocalCount) || 0,
        learnerCountBucket: safeString(evidence.learnerCountBucket || 'suppressed')
      }
    });
  }

  function buildSkillSummaries(events) {
    const map = new Map();
    events.forEach(event => {
      questionResults(event).forEach(result => {
        normalizeStringArray(result.skillIds).forEach(skillId => {
          const item = map.get(skillId) || { skillId, attempts: 0, correct: 0, learnerRefs: new Set() };
          item.attempts += 1;
          if (result.correct) item.correct += 1;
          item.learnerRefs.add(event.learnerId);
          map.set(skillId, item);
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => a.skillId.localeCompare(b.skillId)).map(item => {
      const accuracy = round(item.correct / Math.max(1, item.attempts));
      return {
        skillId: item.skillId,
        attempts: item.attempts,
        learnerCountBucket: bucketCount(item.learnerRefs.size),
        accuracy,
        masteryBand: accuracy >= 0.8 ? 'secure' : accuracy >= 0.6 ? 'developing' : 'needs_review',
        evidenceQuality: item.attempts >= 4 ? 'usable' : 'limited'
      };
    });
  }

  function buildStandardsSummaries(events) {
    const map = new Map();
    events.forEach(event => {
      questionResults(event).forEach(result => {
        normalizeStringArray(result.standardIds).forEach(standardId => {
          const item = map.get(standardId) || { standardId, verifiedQuestions: 0, learnerRefs: new Set() };
          item.verifiedQuestions += 1;
          item.learnerRefs.add(event.learnerId);
          map.set(standardId, item);
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => a.standardId.localeCompare(b.standardId)).map(item => ({
      standardId: item.standardId,
      verifiedQuestions: item.verifiedQuestions,
      learnerCountBucket: bucketCount(item.learnerRefs.size),
      coverageBand: item.verifiedQuestions >= 6 ? 'strong' : item.verifiedQuestions >= 3 ? 'developing' : 'thin'
    }));
  }

  function buildInterventionQueue(skillSummaries) {
    return skillSummaries
      .filter(item => item.accuracy < 0.65)
      .map(item => ({
        skillId: item.skillId,
        priority: item.accuracy < 0.5 ? 'high' : 'medium',
        reasonCode: 'low_accuracy',
        learnerCountBucket: item.learnerCountBucket,
        evidenceQuality: item.evidenceQuality
      }));
  }

  function normalizeEvents(events) {
    return (Array.isArray(events) ? events : []).map(event => ({
      tenantId: safeString(event && event.tenantId),
      classId: safeString(event && event.classId),
      learnerId: safeString(event && event.learnerId),
      status: safeString(event && event.status),
      submittedAt: safeString(event && event.submittedAt),
      questionResults: questionResults(event)
    }));
  }

  function questionResults(event) {
    return (Array.isArray(event && event.questionResults) ? event.questionResults : []).map(result => ({
      correct: result && result.correct === true,
      skillIds: normalizeStringArray(result && result.skillIds),
      standardIds: normalizeStringArray(result && result.standardIds)
    }));
  }

  function withinWindow(iso, window) {
    const time = new Date(iso || '').getTime();
    if (!Number.isFinite(time) || !window) return true;
    const start = new Date(window.startsAt || '').getTime();
    const end = new Date(window.endsAt || '').getTime();
    if (Number.isFinite(start) && time < start) return false;
    if (Number.isFinite(end) && time > end) return false;
    return true;
  }

  function normalizeTimeWindow(window) {
    const value = window && typeof window === 'object' ? window : {};
    return {
      startsAt: safeString(value.startsAt),
      endsAt: safeString(value.endsAt)
    };
  }

  function hasUnsafePayload(value) {
    const text = JSON.stringify(value || {});
    return /learner-[a-z0-9-]+|raw prompt|answerKey|correctAnswer|studentName|billing/i.test(text);
  }

  function bucketCount(count) {
    const value = Number(count) || 0;
    if (value <= 0) return '0';
    if (value < 5) return '2-4';
    if (value < 10) return '5-9';
    return '10+';
  }

  function deny(reason) {
    return { allow: false, visibility: 'none', reason };
  }

  function positiveInt(value, fallback) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
  }

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildInstitutionalReportProjection,
    buildReportVisibilityPolicy,
    evaluateReportVisibility,
    redactInstitutionalReportForExport,
    validateInstitutionalReportProjection
  };
});
