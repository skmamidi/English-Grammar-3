(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestCurriculumReviewQueueDashboard = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_CURRICULUM_REVIEW_ISSUE_TYPES = Object.freeze([
    'publication_blocker',
    'duplicate_prompt',
    'weak_explanation',
    'source_finding',
    'standards_gap'
  ]);
  const VALID_SEVERITIES = Object.freeze(['critical', 'high', 'medium', 'low']);
  const VALID_STATUSES = Object.freeze(['needs_review', 'in_review', 'fixed', 'deferred', 'approved', 'blocked']);
  const SENSITIVE_FIELD_PATTERN = /(^|_|\b)(learnerId|studentId|answerKey|correctAnswer|correct|choices|questionText|prompt|rawAiDraft|aiDraft|sourceExcerpt|sourceDetail|hiddenAnswer|studentName|email)(\b|_|$)/i;
  const SENSITIVE_VALUE_PATTERN = /(learner-[a-z0-9-]+|student-[a-z0-9-]+|do not leak|copyrighted source detail|raw ai draft|answer key)/i;

  const DEFAULT_CURRICULUM_REVIEW_QUEUE_FIXTURES = Object.freeze({
    now: '2030-05-10T00:00:00.000Z',
    publicationBlockers: Object.freeze([{
      id: 'pub-blocker-grammar-1',
      domain: 'grammar',
      sourceSet: 'grammar-set',
      severity: 'critical',
      status: 'needs_review',
      owner: 'content_reviewer',
      createdAt: '2030-05-06T00:00:00.000Z',
      blocker: 'publication_qa_blocking'
    }]),
    duplicatePrompts: Object.freeze([{
      id: 'duplicate-grammar-1',
      domain: 'grammar',
      sourceSet: 'grammar-set',
      severity: 'medium',
      status: 'deferred',
      owner: 'content_reviewer',
      createdAt: '2030-05-07T00:00:00.000Z',
      duplicateGroupId: 'duplicate-group-1'
    }]),
    weakExplanations: Object.freeze([{
      id: 'weak-explanation-vocab-1',
      domain: 'vocabulary',
      sourceSet: 'vocabulary-set',
      severity: 'high',
      status: 'needs_review',
      owner: 'explanation_owner',
      createdAt: '2030-05-08T00:00:00.000Z',
      reason: 'weak_explanation'
    }]),
    sourceFindings: Object.freeze([{
      findingId: 'missing-source-file|grammar|grammar-set|q-open|source.pdf',
      ruleId: 'missing-source-file',
      domain: 'grammar',
      sourceSet: 'grammar-set',
      severity: 'critical',
      status: 'needs_review',
      owner: 'source_owner',
      createdAt: '2030-05-01T00:00:00.000Z'
    }]),
    standardsGaps: Object.freeze([{
      id: 'standards-gap-vocab-1',
      domain: 'vocabulary',
      sourceSet: 'vocabulary-set',
      standardId: 'L.4.2',
      severity: 'medium',
      status: 'needs_review',
      owner: 'standards_owner',
      createdAt: '2030-05-08T00:00:00.000Z'
    }])
  });

  function buildCurriculumReviewQueueProjection(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const now = safeDate(source.now || new Date().toISOString());
    const rows = []
      .concat(normalizeRows(source.publicationBlockers, 'publication_blocker', now))
      .concat(normalizeRows(source.duplicatePrompts, 'duplicate_prompt', now))
      .concat(normalizeRows(source.weakExplanations, 'weak_explanation', now))
      .concat(normalizeRows(source.sourceFindings, 'source_finding', now))
      .concat(normalizeRows(source.standardsGaps, 'standards_gap', now))
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || issueTypeRank(a.issueType) - issueTypeRank(b.issueType) || b.ageDays - a.ageDays || a.issueId.localeCompare(b.issueId));

    return Object.freeze({
      schemaVersion: 1,
      generatedAt: now.toISOString(),
      rows: Object.freeze(rows.map(row => Object.freeze(row))),
      summary: Object.freeze(buildSummary(rows))
    });
  }

  function normalizeRows(items, issueType, now) {
    return (Array.isArray(items) ? items : []).map(item => normalizeRow(item, issueType, now));
  }

  function normalizeRow(item, issueType, now) {
    const input = item && typeof item === 'object' ? item : {};
    const issueId = safeString(input.issueId || input.id || input.findingId || [
      issueType,
      input.domain,
      input.sourceSet,
      input.ruleId || input.standardId || input.blocker || input.reason || input.duplicateGroupId
    ].filter(Boolean).join(':'));
    const createdAt = safeDate(input.createdAt || input.detectedAt || now.toISOString());
    const sourceRef = safeString(input.sourceRef || input.sourceSet || input.setId || input.sourceFile || 'content-source');
    const status = VALID_STATUSES.includes(input.status) ? input.status : 'needs_review';
    const severity = VALID_SEVERITIES.includes(input.severity) ? input.severity : defaultSeverity(issueType);
    const reason = publicationBlockingReason(issueType, input);

    return {
      issueId,
      issueType,
      severity,
      status,
      owner: safeString(input.owner || defaultOwner(issueType)),
      domain: safeString(input.domain || 'content'),
      sourceRef,
      ageDays: ageDays(createdAt, now),
      publicationBlockingReason: reason,
      safeSummary: safeSummary(issueType, input)
    };
  }

  function filterCurriculumReviewQueueRows(projection = {}, filters = {}) {
    const rows = Array.isArray(projection.rows) ? projection.rows : [];
    const filter = filters && typeof filters === 'object' ? filters : {};
    return rows.filter(row => {
      return matches(row.severity, filter.severity) &&
        matches(row.domain, filter.domain) &&
        matches(row.sourceRef, filter.sourceRef) &&
        matches(row.status, filter.status) &&
        matches(row.owner, filter.owner) &&
        matches(row.issueType, filter.issueType);
    });
  }

  function validateCurriculumReviewQueueProjection(projection = {}) {
    const input = projection && typeof projection === 'object' ? projection : {};
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const errors = [];
    rows.forEach(row => {
      const issueId = safeString(row.issueId) || 'review_queue_row';
      if (!REQUIRED_CURRICULUM_REVIEW_ISSUE_TYPES.includes(safeString(row.issueType))) errors.push(`${issueId} issueType is invalid`);
      if (!VALID_SEVERITIES.includes(safeString(row.severity))) errors.push(`${issueId} severity is invalid`);
      if (!VALID_STATUSES.includes(safeString(row.status))) errors.push(`${issueId} status is invalid`);
      if (!safeString(row.owner)) errors.push(`${issueId} owner is required`);
      if (!safeString(row.domain)) errors.push(`${issueId} domain is required`);
      if (!safeString(row.sourceRef)) errors.push(`${issueId} sourceRef is required`);
      if (!Number.isFinite(Number(row.ageDays)) || Number(row.ageDays) < 0) errors.push(`${issueId} ageDays must be non-negative`);
      if (!safeString(row.publicationBlockingReason)) errors.push(`${issueId} publicationBlockingReason is required`);
      if (containsSensitiveReviewData(row)) errors.push(`${issueId} contains sensitive review queue data`);
    });
    return { valid: errors.length === 0, errors };
  }

  function buildSummary(rows) {
    return {
      total: rows.length,
      bySeverity: countBy(rows, 'severity'),
      byStatus: countBy(rows, 'status'),
      byDomain: countBy(rows, 'domain'),
      byOwner: countBy(rows, 'owner'),
      byIssueType: countBy(rows, 'issueType')
    };
  }

  function countBy(rows, field) {
    return rows.reduce((counts, row) => {
      const key = safeString(row[field] || 'unknown');
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function publicationBlockingReason(issueType, input) {
    if (issueType === 'publication_blocker') return safeString(input.blocker || input.publicationBlockingReason || 'publication_blocker');
    if (issueType === 'duplicate_prompt') return `duplicate_prompt:${safeString(input.duplicateGroupId || input.ruleId || 'review_required')}`;
    if (issueType === 'weak_explanation') return `weak_explanation:${safeString(input.reason || input.ruleId || 'quality_review')}`;
    if (issueType === 'source_finding') return `source_finding:${safeString(input.ruleId || 'source_review')}`;
    if (issueType === 'standards_gap') return `standards_gap:${safeString(input.standardId || input.skillId || 'coverage_review')}`;
    return 'review_required';
  }

  function safeSummary(issueType, input) {
    if (issueType === 'publication_blocker') return 'Publication blocker needs reviewer action.';
    if (issueType === 'duplicate_prompt') return 'Duplicate prompt group needs classification.';
    if (issueType === 'weak_explanation') return 'Explanation quality needs curriculum review.';
    if (issueType === 'source_finding') return 'Source finding needs remediation evidence.';
    if (issueType === 'standards_gap') return 'Standards coverage gap needs owner review.';
    return 'Curriculum review needed.';
  }

  function containsSensitiveReviewData(value) {
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

  function defaultSeverity(issueType) {
    if (issueType === 'publication_blocker' || issueType === 'source_finding') return 'critical';
    if (issueType === 'weak_explanation') return 'high';
    return 'medium';
  }

  function defaultOwner(issueType) {
    if (issueType === 'source_finding') return 'source_owner';
    if (issueType === 'standards_gap') return 'standards_owner';
    if (issueType === 'weak_explanation') return 'explanation_owner';
    return 'content_reviewer';
  }

  function severityRank(severity) {
    return { critical: 0, high: 1, medium: 2, low: 3 }[severity] || 4;
  }

  function issueTypeRank(issueType) {
    const index = REQUIRED_CURRICULUM_REVIEW_ISSUE_TYPES.indexOf(issueType);
    return index === -1 ? REQUIRED_CURRICULUM_REVIEW_ISSUE_TYPES.length : index;
  }

  function ageDays(createdAt, now) {
    const ms = now.getTime() - createdAt.getTime();
    return Math.max(0, Math.floor(ms / 86400000));
  }

  function safeDate(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : new Date(0);
  }

  function matches(value, expected) {
    return !safeString(expected) || safeString(value) === safeString(expected);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_CURRICULUM_REVIEW_QUEUE_FIXTURES,
    REQUIRED_CURRICULUM_REVIEW_ISSUE_TYPES,
    buildCurriculumReviewQueueProjection,
    filterCurriculumReviewQueueRows,
    validateCurriculumReviewQueueProjection
  };
});
