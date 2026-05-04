(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAuthoringFixtureLibrary = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const AUTHORING_FIXTURE_CATEGORIES = Object.freeze([
    'duplicated_prompt',
    'invalid_ai_assistance_metadata',
    'malformed_answer',
    'missing_attribution',
    'publication_blocker',
    'stale_source_remediation',
    'weak_explanation'
  ]);
  const SENSITIVE_FIELD_PATTERN = /(^|_|\b)(answerKey|correctAnswer|correct|choices|questionText|promptText|rawPrompt|rawAiDraft|sourceExcerpt|learnerId|studentId|studentName|email)(\b|_|$)/i;
  const SENSITIVE_VALUE_PATTERN = /(learner-[a-z0-9-]+|student-[a-z0-9-]+|answer key|raw ai draft|source excerpt|@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/i;

  const DEFAULT_AUTHORING_FIXTURE_LIBRARY = Object.freeze([
    fixture('duplicated_prompt', 'grammar', 'grammar-set', ['duplicate-prompt-in-set'], {
      questionId: 'fixture-duplicate-q0001',
      contentHash: 'sha256:duplicate-fixture',
      duplicateGroupId: 'fixture-duplicate-group'
    }),
    fixture('invalid_ai_assistance_metadata', 'grammar', 'grammar-set', ['ai_purpose_invalid', 'ai_review_required'], {
      questionId: 'fixture-ai-q0001',
      assistancePurpose: 'answer-generation'
    }),
    fixture('malformed_answer', 'grammar', 'grammar-set', ['invalid-correct-index'], {
      questionId: 'fixture-answer-q0001',
      mutation: 'choice-index-out-of-range'
    }),
    fixture('missing_attribution', 'vocabulary', 'vocabulary-set', ['missing-source-attribution'], {
      questionId: 'fixture-source-q0001',
      sourceFile: 'unattributed-source.pdf'
    }),
    fixture('publication_blocker', 'grammar', 'grammar-set', ['publication_qa_blocking'], {
      publicationId: 'fixture-publication-blocker'
    }),
    fixture('stale_source_remediation', 'grammar', 'grammar-set', ['missing-source-file'], {
      questionId: 'fixture-source-stale-q0001',
      sourceFile: 'source.pdf',
      previousSourceHash: 'sha256:previous-source',
      currentSourceHash: 'sha256:current-source'
    }),
    fixture('weak_explanation', 'vocabulary', 'vocabulary-set', ['weak-explanation-rationale'], {
      questionId: 'fixture-explanation-q0001',
      explanationShape: 'generic-rationale'
    })
  ]);

  function fixture(category, domain, sourceSet, expectedSignals, metadata = {}) {
    return Object.freeze({
      id: `authoring-fixture:${category}:v1`,
      category,
      domain,
      sourceSet,
      expectedSignals: Object.freeze(expectedSignals.slice()),
      publicationBlocking: true,
      safeSummary: safeSummary(category),
      metadata: Object.freeze(Object.assign({}, metadata))
    });
  }

  function getAuthoringFixture(category, library = DEFAULT_AUTHORING_FIXTURE_LIBRARY) {
    const fixture = (Array.isArray(library) ? library : []).find(item => item.category === category);
    if (!fixture) throw new Error(`unknown_authoring_fixture:${category}`);
    return fixture;
  }

  function buildAuthoringFixturePublicationBlockers(library = DEFAULT_AUTHORING_FIXTURE_LIBRARY) {
    return (Array.isArray(library) ? library : [])
      .filter(item => item && item.publicationBlocking)
      .map(item => ({
        id: item.id,
        domain: item.domain,
        sourceSet: item.sourceSet,
        severity: severityFor(item.category),
        status: 'needs_review',
        owner: 'content_reviewer',
        createdAt: '2030-05-01T00:00:00.000Z',
        blocker: `fixture:${item.category}`
      }));
  }

  function validateAuthoringFixtureLibrary(library = DEFAULT_AUTHORING_FIXTURE_LIBRARY) {
    const fixtures = Array.isArray(library) ? library : [];
    const errors = [];
    const categories = fixtures.map(item => safeString(item.category));
    AUTHORING_FIXTURE_CATEGORIES.forEach(category => {
      if (!categories.includes(category)) errors.push(issue('missing_fixture_category', `${category} fixture is required.`));
    });
    fixtures.forEach(item => {
      const id = safeString(item && item.id);
      if (!id.startsWith(`authoring-fixture:${safeString(item && item.category)}:`)) errors.push(issue('invalid_fixture_id', `${id || 'fixture'} id must include its category.`));
      if (!AUTHORING_FIXTURE_CATEGORIES.includes(safeString(item && item.category))) errors.push(issue('invalid_fixture_category', `${id || 'fixture'} category is invalid.`));
      if (!safeString(item && item.domain)) errors.push(issue('missing_fixture_domain', `${id || 'fixture'} domain is required.`));
      if (!safeString(item && item.sourceSet)) errors.push(issue('missing_fixture_source_set', `${id || 'fixture'} sourceSet is required.`));
      if (!Array.isArray(item && item.expectedSignals) || !item.expectedSignals.length) errors.push(issue('missing_fixture_signals', `${id || 'fixture'} expected signals are required.`));
      if (!safeString(item && item.safeSummary)) errors.push(issue('missing_safe_summary', `${id || 'fixture'} safeSummary is required.`));
      if (containsSensitiveFixtureData(item)) errors.push(issue('unsafe_fixture_payload', `${id || 'fixture'} contains learner, answer, raw prompt, or source-detail data.`));
    });
    return { valid: errors.length === 0, errors };
  }

  function safeSummary(category) {
    if (category === 'duplicated_prompt') return 'Duplicate prompt regression fixture.';
    if (category === 'invalid_ai_assistance_metadata') return 'Invalid AI assistance metadata regression fixture.';
    if (category === 'malformed_answer') return 'Malformed answer metadata regression fixture.';
    if (category === 'missing_attribution') return 'Missing source attribution regression fixture.';
    if (category === 'publication_blocker') return 'Publication blocking regression fixture.';
    if (category === 'stale_source_remediation') return 'Stale source remediation regression fixture.';
    if (category === 'weak_explanation') return 'Weak explanation regression fixture.';
    return 'Authoring regression fixture.';
  }

  function severityFor(category) {
    if (category === 'publication_blocker' || category === 'malformed_answer' || category === 'stale_source_remediation') return 'critical';
    if (category === 'invalid_ai_assistance_metadata' || category === 'missing_attribution') return 'high';
    return 'medium';
  }

  function containsSensitiveFixtureData(value) {
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

  function issue(code, message) {
    return { code, message };
  }

  function safeString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
  }

  return {
    AUTHORING_FIXTURE_CATEGORIES,
    DEFAULT_AUTHORING_FIXTURE_LIBRARY,
    buildAuthoringFixturePublicationBlockers,
    getAuthoringFixture,
    validateAuthoringFixtureLibrary
  };
});
