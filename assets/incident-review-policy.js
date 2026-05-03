(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestIncidentReviewPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_INCIDENT_REVIEW_SECTIONS = Object.freeze([
    'summary',
    'impact',
    'detection',
    'mitigation',
    'rollback',
    'regression_test',
    'owner',
    'verification'
  ]);
  const APPROVED_COMMAND_PREFIXES = Object.freeze(['npm run ', 'node --test ', 'node scripts/']);
  const UNSAFE_OUTPUT_FIELDS = new Set([
    'learnerid',
    'studentid',
    'question',
    'choices',
    'answer',
    'explanation',
    'prompt',
    'email',
    'token',
    'credential',
    'credentials',
    'rawstacktrace',
    'stack'
  ]);

  const DEFAULT_INCIDENT_REVIEW_POLICY = Object.freeze({
    schemaVersion: 1,
    template: Object.freeze({
      sections: Object.freeze([
        section({
          id: 'summary',
          label: 'Summary',
          prompt: 'Describe what happened using aggregate operational signals and affected capability names only.'
        }),
        section({
          id: 'impact',
          label: 'Impact',
          prompt: 'Record affected routes, cohorts, counts, rates, and duration without learner identifiers or question payloads.'
        }),
        section({
          id: 'detection',
          label: 'Detection',
          prompt: 'Name the SLO, monitor, QA gate, or runbook signal that detected the issue.'
        }),
        section({
          id: 'mitigation',
          label: 'Mitigation',
          prompt: 'List immediate mitigations and owner-approved containment steps.'
        }),
        section({
          id: 'rollback',
          label: 'Rollback',
          prompt: 'Record whether a rollback lever was used and link the relevant runbook or release manifest evidence.'
        }),
        section({
          id: 'regression_test',
          label: 'Regression test',
          prompt: 'Link the regression test, runbook update, roadmap item, or documented non-testable reason.'
        }),
        section({
          id: 'owner',
          label: 'Owner',
          prompt: 'Assign the follow-up owner and review date for durable coverage.'
        }),
        section({
          id: 'verification',
          label: 'Verification',
          prompt: 'List the local verification command and sanitized evidence that proves the regression path is covered.'
        })
      ])
    }),
    capture: Object.freeze({
      owner: 'platform',
      verificationCommand: 'node --test tests/incident-review-policy.test.js tests/operations-docs.test.js',
      regressionTests: Object.freeze(['tests/incident-review-policy.test.js']),
      runbookUpdates: Object.freeze(['docs/operations/incident-review.md']),
      roadmapItems: Object.freeze(['21.6']),
      nonTestableReason: ''
    })
  });

  function validateIncidentReviewPolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    const template = input.template && typeof input.template === 'object' ? input.template : {};
    const sections = (Array.isArray(template.sections) ? template.sections : []).map(normalizeSection);
    const errors = [];
    const ids = new Set();

    sections.forEach(item => {
      if (!item.id) errors.push('section id is required');
      if (ids.has(item.id)) errors.push(`${item.id} section id must be unique`);
      ids.add(item.id);
      if (!REQUIRED_INCIDENT_REVIEW_SECTIONS.includes(item.id)) errors.push(`${item.id} section is not supported`);
      if (!item.label) errors.push(`${item.id} label is required`);
      if (!item.prompt) errors.push(`${item.id} prompt is required`);
      if (item.aggregateOnly !== true) errors.push(`${item.id} must be aggregate-only`);
      item.outputFields.forEach(field => {
        if (UNSAFE_OUTPUT_FIELDS.has(field.toLowerCase())) errors.push(`${item.id} outputFields include unsafe field ${field}`);
      });
    });

    REQUIRED_INCIDENT_REVIEW_SECTIONS.forEach(id => {
      if (!ids.has(id)) errors.push(`missing required section ${id}`);
    });

    errors.push(...validateRegressionCapture(input.capture || {}).errors);

    return {
      valid: errors.length === 0,
      errors,
      policy: {
        schemaVersion: 1,
        template: { sections },
        capture: normalizeCapture(input.capture || {})
      }
    };
  }

  function validateRegressionCapture(capture) {
    const item = normalizeCapture(capture);
    const errors = [];
    const hasEvidence = item.regressionTests.length > 0 ||
      item.runbookUpdates.length > 0 ||
      item.roadmapItems.length > 0 ||
      Boolean(item.nonTestableReason);

    if (!item.owner) errors.push('owner is required');
    if (!isApprovedCommand(item.verificationCommand)) errors.push('verificationCommand must use an approved local command');
    if (!hasEvidence) errors.push('at least one regression test, runbook update, roadmap item, or non-testable reason is required');

    return {
      valid: errors.length === 0,
      errors,
      capture: item
    };
  }

  function buildIncidentReviewTemplate(policy, options = {}) {
    const validation = validateIncidentReviewPolicy(policy);
    const sections = validation.policy.template.sections.map(item => ({
      id: item.id,
      label: item.label,
      prompt: item.prompt,
      aggregateOnly: item.aggregateOnly
    }));

    return {
      schemaVersion: 1,
      ok: validation.valid,
      errors: validation.errors,
      incidentId: safeString(options.incidentId || 'INC-synthetic'),
      title: redactUnsafeText(options.title || 'Sanitized incident review'),
      sections,
      regressionCapture: validation.policy.capture,
      checkedLiveIncidentService: false,
      nextStep: 'Record aggregate impact, link mitigation and rollback evidence, then attach regression coverage or a documented non-testable reason.'
    };
  }

  function sanitizeIncidentReviewRecord(record = {}) {
    return {
      incidentId: safeString(record.incidentId),
      title: redactUnsafeText(record.title),
      summary: redactUnsafeText(record.summary),
      impact: redactUnsafeText(record.impact),
      detection: redactUnsafeText(record.detection),
      mitigation: redactUnsafeText(record.mitigation),
      rollback: redactUnsafeText(record.rollback),
      regressionTest: redactUnsafeText(record.regressionTest),
      owner: redactUnsafeText(record.owner),
      verification: redactUnsafeText(record.verification)
    };
  }

  function section(input) {
    return Object.freeze(Object.assign({
      aggregateOnly: true,
      outputFields: Object.freeze(['sectionId', 'status', 'evidenceUrl', 'verificationCommand'])
    }, input));
  }

  function normalizeSection(item) {
    const input = item && typeof item === 'object' ? item : {};
    return {
      id: safeString(input.id),
      label: safeString(input.label),
      prompt: safeString(input.prompt),
      aggregateOnly: input.aggregateOnly === true,
      outputFields: normalizeStringArray(input.outputFields)
    };
  }

  function normalizeCapture(capture) {
    const input = capture && typeof capture === 'object' ? capture : {};
    return {
      owner: safeString(input.owner),
      verificationCommand: safeString(input.verificationCommand),
      regressionTests: normalizeStringArray(input.regressionTests),
      runbookUpdates: normalizeStringArray(input.runbookUpdates),
      roadmapItems: normalizeStringArray(input.roadmapItems),
      nonTestableReason: safeString(input.nonTestableReason)
    };
  }

  function isApprovedCommand(command) {
    const normalized = safeString(command);
    if (/[?&=]/.test(normalized)) return false;
    return APPROVED_COMMAND_PREFIXES.some(prefix => normalized.startsWith(prefix));
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function redactUnsafeText(value) {
    const text = safeString(value);
    return text
      .replace(/\b(token|learnerId|studentId|email|credential|credentials)=([^\s&]+)/gi, '$1=[redacted]')
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
      .replace(/\b(raw stack trace|raw stack|stack trace)\b/gi, 'stack trace');
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_INCIDENT_REVIEW_POLICY,
    REQUIRED_INCIDENT_REVIEW_SECTIONS,
    buildIncidentReviewTemplate,
    sanitizeIncidentReviewRecord,
    validateIncidentReviewPolicy,
    validateRegressionCapture
  };
});
