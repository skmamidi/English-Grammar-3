(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSourceRemediationDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STATUSES = new Set(['open', 'fixed', 'deferred', 'not_applicable']);
  const RESOLVED_STATUSES = new Set(['fixed', 'deferred', 'not_applicable']);

  function buildSourceFinding(input = {}) {
    const finding = {
      ruleId: safeString(input.ruleId),
      domain: safeString(input.domain),
      setId: safeString(input.setId),
      questionId: safeString(input.questionId),
      sourceFile: safeString(input.sourceFile),
      sourceHash: safeString(input.sourceHash),
      severity: normalizeSeverity(input.severity || input.level)
    };
    finding.findingId = safeString(input.findingId) || buildFindingId(finding);
    return finding;
  }

  function normalizeRemediationRecord(record = {}) {
    const status = STATUSES.has(safeString(record.status)) ? safeString(record.status) : 'open';
    return {
      findingId: safeString(record.findingId),
      ruleId: safeString(record.ruleId),
      domain: safeString(record.domain),
      setId: safeString(record.setId),
      questionId: safeString(record.questionId),
      sourceFile: safeString(record.sourceFile),
      severity: normalizeSeverity(record.severity),
      status,
      owner: safeString(record.owner),
      rationale: safeString(record.rationale),
      expiresAt: safeString(record.expiresAt),
      sourceHash: safeString(record.sourceHash)
    };
  }

  function validateRemediationRecord(record = {}, options = {}) {
    const normalized = normalizeRemediationRecord(record);
    const errors = [];
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    if (!normalized.findingId) errors.push('findingId is required');
    if (normalized.status === 'deferred') {
      if (!normalized.owner) errors.push('owner is required for deferred source remediation');
      if (!normalized.rationale) errors.push('rationale is required for deferred source remediation');
      if (!normalized.expiresAt) {
        errors.push('expiresAt is required for deferred source remediation');
      } else if (isExpired(normalized.expiresAt, now)) {
        errors.push('expiresAt must be in the future for deferred source remediation');
      }
    }
    if (['fixed', 'not_applicable'].includes(normalized.status)) {
      if (!normalized.owner) errors.push('owner is required for resolved source remediation');
      if (!normalized.rationale) errors.push('rationale is required for resolved source remediation');
    }
    return errors;
  }

  function evaluateSourceRemediation(options = {}) {
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    const findings = (Array.isArray(options.findings) ? options.findings : []).map(buildSourceFinding);
    const records = (Array.isArray(options.records) ? options.records : []).map(normalizeRemediationRecord);
    const recordsById = new Map(records.map(record => [record.findingId, record]));
    const errors = [];
    let resolvedCount = 0;

    findings.forEach(finding => {
      const record = recordsById.get(finding.findingId);
      if (!record || record.status === 'open') {
        errors.push(issue('source_remediation_required', finding, record));
        return;
      }

      if (record.status === 'deferred' && isExpired(record.expiresAt, now)) {
        errors.push(issue('source_remediation_expired', finding, record, 'Source remediation deferral has expired.'));
        return;
      }

      const validationErrors = validateRemediationRecord(record, { now });
      if (validationErrors.length) {
        validationErrors.forEach(message => errors.push(issue('source_remediation_invalid', finding, record, message)));
        return;
      }

      if (record.sourceHash && finding.sourceHash && record.sourceHash !== finding.sourceHash) {
        errors.push(issue('source_remediation_stale', finding, record, 'Source hash changed after remediation review.'));
        return;
      }

      if (!RESOLVED_STATUSES.has(record.status)) {
        errors.push(issue('source_remediation_required', finding, record));
        return;
      }

      resolvedCount += 1;
    });

    return {
      status: errors.length ? 'failed' : 'passed',
      errors,
      warnings: [],
      findings,
      records,
      summary: {
        findingCount: findings.length,
        recordCount: records.length,
        resolvedCount,
        openCount: errors.length,
        errorCount: errors.length,
        warningCount: 0
      }
    };
  }

  function issue(code, finding, record, message) {
    return {
      code,
      findingId: finding.findingId,
      ruleId: finding.ruleId,
      domain: finding.domain,
      setId: finding.setId,
      questionId: finding.questionId,
      sourceFile: finding.sourceFile,
      status: record && record.status || 'open',
      message: message || 'Source finding requires a fixed, active deferred, or not-applicable remediation record.'
    };
  }

  function buildFindingId(finding) {
    return [
      finding.ruleId,
      finding.domain,
      finding.setId,
      finding.questionId,
      finding.sourceFile
    ].map(safeString).join('|');
  }

  function normalizeSeverity(value) {
    const severity = safeString(value || 'warning').toLowerCase();
    return severity === 'error' ? 'error' : 'warning';
  }

  function isExpired(value, now) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) || parsed.getTime() <= now.getTime();
  }

  function safeString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
  }

  return {
    buildSourceFinding,
    evaluateSourceRemediation,
    normalizeRemediationRecord,
    validateRemediationRecord
  };
});
