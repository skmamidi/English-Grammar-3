(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestContentAuthoringGuardrailsDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ALLOWED_AI_AUTHORING_PURPOSES = [
    'classification',
    'draft',
    'explanation',
    'metadata',
    'rewrite'
  ];
  const PURPOSES = new Set(ALLOWED_AI_AUTHORING_PURPOSES);
  const GUARDRAIL_FIELDS = [
    'sourceAttributionChecked',
    'standardsClaimChecked',
    'duplicateCheckPassed',
    'biasSafetyChecked',
    'explanationQualityChecked'
  ];
  const STRIPPED_KEY_PATTERN = /^(rawPrompt|promptText|prompt|reviewerNotes|learner[A-Z_].*|student[A-Z_].*|privateSourceText|sourceExcerpt|answerKey)$/;
  const UNSAFE_KEY_PATTERN = /(rawPrompt|promptText|reviewerNotes|learner(Name|Email|Id|Answer)|student(Name|Email|Id)|privateSourceText|sourceExcerpt|answerKey|authToken|privateKey|secret|password|credential)/i;
  const UNSAFE_VALUE_PATTERNS = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\bsk-[A-Za-z0-9_-]{16,}/,
    /\bghp_[A-Za-z0-9_]{20,}/,
    /\bBearer\s+[A-Za-z0-9._-]{20,}/i,
    /-----BEGIN\s+(?:RSA\s+)?PRIVATE KEY-----/
  ];

  function normalizeAuthoringRecord(record = {}) {
    const assistance = record.assistance && typeof record.assistance === 'object' ? record.assistance : {};
    const sourceAttribution = record.sourceAttribution && typeof record.sourceAttribution === 'object'
      ? record.sourceAttribution
      : {};
    const guardrails = record.guardrails && typeof record.guardrails === 'object' ? record.guardrails : {};

    return {
      questionId: safeString(record.questionId),
      sourceSet: safeString(record.sourceSet),
      assistance: {
        used: assistance.used === true,
        purpose: safeString(assistance.purpose),
        modelFamily: safeString(assistance.modelFamily),
        promptRecordId: safeString(assistance.promptRecordId),
        humanReviewed: assistance.humanReviewed === true,
        reviewerId: safeString(assistance.reviewerId),
        reviewedAt: safeString(assistance.reviewedAt)
      },
      sourceAttribution: {
        sourceFile: safeString(sourceAttribution.sourceFile),
        sourceCategory: safeString(sourceAttribution.sourceCategory),
        sourceQuestionNumber: safeString(sourceAttribution.sourceQuestionNumber),
        licenseStatus: safeString(sourceAttribution.licenseStatus || 'unknown').toLowerCase()
      },
      guardrails: GUARDRAIL_FIELDS.reduce((normalized, field) => {
        normalized[field] = guardrails[field] === true;
        return normalized;
      }, {})
    };
  }

  function evaluateAuthoringGuardrails(record = {}) {
    const normalized = normalizeAuthoringRecord(record);
    const issues = [];

    if (hasUnsafeMetadata(record)) {
      issues.push(issue('ai_metadata_unsafe', 'metadata', 'AI authoring metadata must not include raw prompts, learner data, secrets, or private source text.', normalized));
    }
    if (!normalized.assistance.used) return resultFor(normalized, issues);
    if (!PURPOSES.has(normalized.assistance.purpose)) {
      issues.push(issue('ai_purpose_invalid', 'assistance.purpose', 'AI assistance purpose is not allowed for content authoring.', normalized));
    }
    if (!normalized.assistance.humanReviewed || !normalized.assistance.reviewerId || !normalized.assistance.reviewedAt) {
      issues.push(issue('ai_review_required', 'assistance', 'AI-assisted content requires human review with reviewer identity and timestamp.', normalized));
    }
    if (!normalized.sourceAttribution.sourceFile || !normalized.sourceAttribution.sourceCategory || !normalized.sourceAttribution.sourceQuestionNumber) {
      issues.push(issue('ai_source_missing', 'sourceAttribution', 'AI-assisted content requires source attribution before publication.', normalized));
    }
    if (['denied', 'blocked', 'publication_denied'].includes(normalized.sourceAttribution.licenseStatus)) {
      issues.push(issue('ai_source_license_blocked', 'sourceAttribution.licenseStatus', 'AI-assisted content cannot publish from a blocked source license.', normalized));
    }
    GUARDRAIL_FIELDS.forEach(field => {
      if (!normalized.guardrails[field]) {
        issues.push(issue('ai_guardrail_failed', `guardrails.${field}`, `AI authoring guardrail ${field} must be reviewer-confirmed.`, normalized));
      }
    });

    return resultFor(normalized, issues);
  }

  function sanitizeAuthoringRecord(record = {}) {
    return sanitizeValue(record);
  }

  function resultFor(record, issues) {
    return {
      status: issues.length ? 'failed' : 'passed',
      blocking: issues.length > 0,
      record: normalizeAuthoringRecord(record),
      issues
    };
  }

  function issue(code, path, message, record) {
    return {
      code,
      path,
      message,
      questionId: record.questionId,
      sourceSet: record.sourceSet
    };
  }

  function sanitizeValue(value) {
    if (Array.isArray(value)) return value.map(sanitizeValue);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((sanitized, key) => {
      if (STRIPPED_KEY_PATTERN.test(key) || UNSAFE_KEY_PATTERN.test(key)) return sanitized;
      sanitized[key] = sanitizeValue(value[key]);
      return sanitized;
    }, {});
  }

  function hasUnsafeMetadata(value, path = []) {
    if (Array.isArray(value)) return value.some((item, index) => hasUnsafeMetadata(item, path.concat(String(index))));
    if (!value || typeof value !== 'object') {
      return typeof value === 'string' && UNSAFE_VALUE_PATTERNS.some(pattern => pattern.test(value));
    }
    return Object.keys(value).some(key => {
      const nextPath = path.concat(key);
      const fullPath = nextPath.join('.');
      if (fullPath === 'assistance.promptRecordId') return false;
      if (UNSAFE_KEY_PATTERN.test(key)) return true;
      return hasUnsafeMetadata(value[key], nextPath);
    });
  }

  function safeString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
  }

  return {
    ALLOWED_AI_AUTHORING_PURPOSES,
    evaluateAuthoringGuardrails,
    normalizeAuthoringRecord,
    sanitizeAuthoringRecord
  };
});
