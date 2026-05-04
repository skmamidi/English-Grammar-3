(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestReviewerWorkloadSlaReport = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REVIEWER_WORKLOAD_SLA_THRESHOLDS = Object.freeze({
    criticalHours: 24,
    highHours: 48,
    mediumHours: 120,
    lowHours: 168,
    dueSoonRatio: 0.25,
    recentlyResolvedHours: 168
  });
  const VALID_ISSUE_TYPES = Object.freeze([
    'publication_blocker',
    'duplicate_prompt',
    'weak_explanation',
    'source_finding',
    'standards_gap'
  ]);
  const VALID_SEVERITIES = Object.freeze(['critical', 'high', 'medium', 'low']);
  const VALID_STATUSES = Object.freeze(['needs_review', 'in_review', 'fixed', 'deferred', 'approved', 'blocked']);
  const VALID_SLA_BUCKETS = Object.freeze(['within_sla', 'due_soon', 'overdue', 'resolved_recently', 'resolved_older', 'deferred_active']);
  const SENSITIVE_FIELD_PATTERN = /(^|_|\b)(learnerId|studentId|learnerState|answerKey|correctAnswer|correct|choices|questionText|prompt|rawAiDraft|aiDraft|sourceExcerpt|sourceDetail|hiddenAnswer|studentName|email|performanceScore|staffRanking)(\b|_|$)/i;
  const SENSITIVE_VALUE_PATTERN = /(learner-[a-z0-9-]+|student-[a-z0-9-]+|answer key|raw ai draft|source excerpt|performance score|staff ranking)/i;

  const DEFAULT_REVIEWER_WORKLOAD_SLA_FIXTURE = Object.freeze({
    now: '2030-05-10T00:00:00.000Z',
    issues: Object.freeze([
      fixtureIssue('pub-blocked', 'publication_blocker', 'content_reviewer', 'critical', 'blocked', '2030-05-08T00:00:00.000Z', 'publication_qa_blocking'),
      fixtureIssue('duplicate-due-soon', 'duplicate_prompt', 'content_reviewer', 'medium', 'needs_review', '2030-05-05T12:00:00.000Z', 'duplicate_prompt:review_required'),
      fixtureIssue('weak-within', 'weak_explanation', 'explanation_owner', 'high', 'needs_review', '2030-05-09T12:00:00.000Z', 'weak_explanation:quality_review'),
      fixtureIssue('source-overdue', 'source_finding', 'source_owner', 'critical', 'needs_review', '2030-05-01T00:00:00.000Z', 'source_finding:missing-source-file'),
      fixtureIssue('source-deferred', 'source_finding', 'source_owner', 'medium', 'deferred', '2030-05-07T00:00:00.000Z', '', '2030-05-20T00:00:00.000Z'),
      fixtureIssue('standards-fixed', 'standards_gap', 'standards_owner', 'medium', 'fixed', '2030-05-04T00:00:00.000Z', '', '', '2030-05-09T00:00:00.000Z')
    ])
  });

  function fixtureIssue(issueId, issueType, owner, severity, status, createdAt, publicationBlockingReason, deferredUntil = '', resolvedAt = '') {
    return Object.freeze({
      issueId,
      issueType,
      owner,
      severity,
      status,
      createdAt,
      publicationBlockingReason,
      deferredUntil,
      resolvedAt
    });
  }

  function buildReviewerWorkloadSlaReport(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const now = safeDate(source.now || new Date().toISOString());
    const rows = collectIssues(source, now)
      .map(row => normalizeRow(row, now))
      .sort((a, b) => bucketRank(a.slaBucket) - bucketRank(b.slaBucket) || severityRank(a.severity) - severityRank(b.severity) || b.ageHours - a.ageHours || a.issueId.localeCompare(b.issueId));

    return Object.freeze({
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      thresholds: Object.freeze(Object.assign({}, REVIEWER_WORKLOAD_SLA_THRESHOLDS)),
      rows: Object.freeze(rows.map(row => Object.freeze(row))),
      summary: Object.freeze(buildSummary(rows))
    });
  }

  function collectIssues(source, now) {
    return []
      .concat(Array.isArray(source.issues) ? source.issues : [])
      .concat(reviewQueueIssues(source.reviewQueue))
      .concat(sourceRemediationIssues(source.sourceRemediation, now));
  }

  function reviewQueueIssues(reviewQueue = {}) {
    return (Array.isArray(reviewQueue.rows) ? reviewQueue.rows : []).map(row => ({
      issueId: row.issueId,
      issueType: row.issueType,
      owner: row.owner,
      severity: row.severity,
      status: row.status,
      ageHours: Math.max(0, Number(row.ageDays) || 0) * 24,
      publicationBlockingReason: row.publicationBlockingReason,
      domain: row.domain,
      sourceRef: row.sourceRef
    }));
  }

  function sourceRemediationIssues(result = {}, now) {
    if (!result || typeof result !== 'object') return [];
    const errors = Array.isArray(result.errors) ? result.errors : [];
    return errors.map(error => ({
      issueId: safeString(error.findingId || error.issueId),
      issueType: 'source_finding',
      owner: 'source_owner',
      severity: error.code === 'source_remediation_required' || error.code === 'source_remediation_expired' ? 'critical' : 'high',
      status: 'needs_review',
      createdAt: now.toISOString(),
      publicationBlockingReason: `source_finding:${safeString(error.ruleId || error.code || 'source_review')}`,
      domain: error.domain,
      sourceRef: error.setId || error.sourceFile
    }));
  }

  function normalizeRow(value = {}, now) {
    const input = value && typeof value === 'object' ? value : {};
    const severity = VALID_SEVERITIES.includes(input.severity) ? input.severity : 'medium';
    const status = VALID_STATUSES.includes(input.status) ? input.status : 'needs_review';
    const ageHours = Number.isFinite(Number(input.ageHours)) ? Math.max(0, Math.floor(Number(input.ageHours))) : ageHoursFromCreatedAt(input.createdAt, now);
    const thresholdHours = thresholdForSeverity(severity);
    const publicationBlockingReason = safeString(input.publicationBlockingReason);
    const publicationBlockingState = safeString(input.publicationBlockingState) || (publicationBlockingReason ? 'blocking' : 'non_blocking');
    const dueAt = input.createdAt ? addHours(safeDate(input.createdAt), thresholdHours).toISOString() : '';
    const slaBucket = bucketFor({ status, ageHours, thresholdHours, resolvedAt: input.resolvedAt, deferredUntil: input.deferredUntil, now });
    return {
      issueId: safeString(input.issueId || input.id || 'review-work-item'),
      issueType: VALID_ISSUE_TYPES.includes(input.issueType) ? input.issueType : 'publication_blocker',
      owner: safeString(input.owner || 'content_reviewer'),
      severity,
      status,
      ageHours,
      domain: safeString(input.domain || 'content'),
      sourceRef: safeString(input.sourceRef || input.sourceSet || input.setId || 'content-source'),
      publicationBlockingState: publicationBlockingState === 'blocking' ? 'blocking' : 'non_blocking',
      publicationBlockingReason,
      slaBucket,
      dueAt,
      resolvedAt: safeString(input.resolvedAt),
      deferredUntil: safeString(input.deferredUntil),
      escalation: Object.freeze(escalationFor(slaBucket, input)),
      safeSummary: safeSummary(input.issueType)
    };
  }

  function validateReviewerWorkloadSlaReport(report = {}) {
    const input = report && typeof report === 'object' ? report : {};
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const errors = [];
    rows.forEach(row => {
      const issueId = safeString(row.issueId) || 'review_workload_row';
      if (!VALID_ISSUE_TYPES.includes(safeString(row.issueType))) errors.push(issue('invalid_issue_type', `${issueId} issueType is invalid.`));
      if (!safeString(row.owner)) errors.push(issue('missing_owner', `${issueId} owner is required.`));
      if (!VALID_SEVERITIES.includes(safeString(row.severity))) errors.push(issue('invalid_severity', `${issueId} severity is invalid.`));
      if (!VALID_STATUSES.includes(safeString(row.status))) errors.push(issue('invalid_status', `${issueId} status is invalid.`));
      if (!Number.isFinite(Number(row.ageHours)) || Number(row.ageHours) < 0) errors.push(issue('invalid_age', `${issueId} ageHours must be non-negative.`));
      if (!['blocking', 'non_blocking'].includes(safeString(row.publicationBlockingState))) errors.push(issue('invalid_publication_blocking_state', `${issueId} publicationBlockingState is invalid.`));
      if (!VALID_SLA_BUCKETS.includes(safeString(row.slaBucket))) errors.push(issue('invalid_sla_bucket', `${issueId} slaBucket is invalid.`));
      if (safeString(row.slaBucket) === 'overdue' && !safeString(row.escalation && row.escalation.owner)) errors.push(issue('missing_escalation_owner', `${issueId} overdue work requires an escalation owner.`));
      if (containsSensitiveWorkloadData(row)) errors.push(issue('unsafe_workload_payload', `${issueId} contains learner, answer, prompt, source-detail, or reviewer scoring data.`));
    });
    return { valid: errors.length === 0, errors };
  }

  function buildSummary(rows) {
    return {
      total: rows.length,
      byIssueType: countBy(rows, 'issueType'),
      byOwner: countBy(rows, 'owner'),
      bySeverity: countBy(rows, 'severity'),
      byStatus: countBy(rows, 'status'),
      byPublicationBlocking: countBy(rows, 'publicationBlockingState'),
      bySlaBucket: countBy(rows, 'slaBucket')
    };
  }

  function countBy(rows, field) {
    return rows.reduce((counts, row) => {
      const key = safeString(row[field] || 'unknown');
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function bucketFor({ status, ageHours, thresholdHours, resolvedAt, deferredUntil, now }) {
    if (status === 'fixed' || status === 'approved') {
      const resolvedAge = resolvedAt ? ageHoursFromCreatedAt(resolvedAt, now) : 0;
      return resolvedAge <= REVIEWER_WORKLOAD_SLA_THRESHOLDS.recentlyResolvedHours ? 'resolved_recently' : 'resolved_older';
    }
    if (status === 'deferred' && deferredUntil && safeDate(deferredUntil).getTime() > now.getTime()) return 'deferred_active';
    if (ageHours >= thresholdHours) return 'overdue';
    if (thresholdHours - ageHours <= thresholdHours * REVIEWER_WORKLOAD_SLA_THRESHOLDS.dueSoonRatio) return 'due_soon';
    return 'within_sla';
  }

  function escalationFor(slaBucket, input) {
    if (slaBucket !== 'overdue') return {};
    return {
      owner: safeString(input.escalationOwner || 'content_ops_lead'),
      reason: safeString(input.escalationReason || 'sla_overdue')
    };
  }

  function thresholdForSeverity(severity) {
    if (severity === 'critical') return REVIEWER_WORKLOAD_SLA_THRESHOLDS.criticalHours;
    if (severity === 'high') return REVIEWER_WORKLOAD_SLA_THRESHOLDS.highHours;
    if (severity === 'medium') return REVIEWER_WORKLOAD_SLA_THRESHOLDS.mediumHours;
    return REVIEWER_WORKLOAD_SLA_THRESHOLDS.lowHours;
  }

  function containsSensitiveWorkloadData(value) {
    return findSensitivePath(value) || SENSITIVE_VALUE_PATTERN.test(JSON.stringify(value || {}));
  }

  function findSensitivePath(value, trail = []) {
    if (!value || typeof value !== 'object') return '';
    return Object.keys(value).map(key => {
      const nextTrail = trail.concat(key);
      if (SENSITIVE_FIELD_PATTERN.test(key)) return nextTrail.join('.');
      return findSensitivePath(value[key], nextTrail);
    }).find(Boolean) || '';
  }

  function safeSummary(issueType) {
    if (issueType === 'publication_blocker') return 'Publication blocker needs content operations action.';
    if (issueType === 'duplicate_prompt') return 'Duplicate prompt review needs classification.';
    if (issueType === 'weak_explanation') return 'Explanation quality review needs an owner.';
    if (issueType === 'source_finding') return 'Source finding needs remediation evidence.';
    if (issueType === 'standards_gap') return 'Standards coverage gap needs review.';
    return 'Curriculum review work item.';
  }

  function ageHoursFromCreatedAt(createdAt, now) {
    const created = safeDate(createdAt || now.toISOString());
    return Math.max(0, Math.floor((now.getTime() - created.getTime()) / 3600000));
  }

  function addHours(date, hours) {
    return new Date(date.getTime() + hours * 3600000);
  }

  function bucketRank(bucket) {
    return { overdue: 0, due_soon: 1, within_sla: 2, deferred_active: 3, resolved_recently: 4, resolved_older: 5 }[bucket] || 6;
  }

  function severityRank(severity) {
    return { critical: 0, high: 1, medium: 2, low: 3 }[severity] || 4;
  }

  function issue(code, message) {
    return { code, message };
  }

  function safeDate(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : new Date(0);
  }

  function safeString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
  }

  return {
    DEFAULT_REVIEWER_WORKLOAD_SLA_FIXTURE,
    REVIEWER_WORKLOAD_SLA_THRESHOLDS,
    buildReviewerWorkloadSlaReport,
    validateReviewerWorkloadSlaReport
  };
});
