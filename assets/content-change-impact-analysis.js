(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestContentChangeImpactAnalysis = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const CONTENT_CHANGE_TYPES = Object.freeze(['changed', 'added', 'removed', 'moved', 'remediated']);
  const RISK_LEVELS = Object.freeze(['low', 'medium', 'high', 'critical']);
  const SENSITIVE_FIELD_PATTERN = /(^|_|\b)(learnerId|studentId|learnerState|activeLearnerRefs|answerKey|correctAnswer|correct|choices|questionText|prompt|rawAiDraft|aiDraft|sourceExcerpt|hiddenAnswer|studentName|email)(\b|_|$)/i;
  const SENSITIVE_VALUE_PATTERN = /(learner-[a-z0-9-]+|student-[a-z0-9-]+|answer key|raw ai draft|draft body|do not leak)/i;

  const DEFAULT_CONTENT_CHANGE_IMPACT_FIXTURE = Object.freeze({
    releaseId: 'content-impact-1',
    changes: Object.freeze([
      change('grammar-sentence-types-q0001', 'changed', 'grammar', 'grammar-sentence-types', ['grammar.sentence-analysis'], ['L.4.1'], 'assets/question-chunks/grammar/grammar-sentence-types.js', 'grammar-sentence-types:q0001', 'release:previous-grammar', 'medium', 'approved'),
      change('vocabulary-context-clues-q0002', 'added', 'vocabulary', 'vocabulary-context-clues', ['vocabulary.context'], ['L.4.4'], 'assets/question-chunks/vocabulary/vocabulary-context-clues.js', 'vocabulary-context-clues:q0002', 'release:previous-vocabulary', 'low', 'needs_review'),
      change('grammar-sentence-types-q0003', 'removed', 'grammar', 'grammar-sentence-types', ['grammar.sentence-analysis'], ['L.4.1'], 'assets/question-chunks/grammar/grammar-sentence-types.js', 'grammar-sentence-types:q0003', 'release:previous-grammar', 'high', 'needs_review', 'source-remediation:grammar-q0003'),
      change('vocabulary-context-clues-q0004', 'moved', 'vocabulary', 'vocabulary-context-clues', ['vocabulary.context'], ['L.4.4'], 'assets/question-chunks/vocabulary/vocabulary-context-clues.js', 'vocabulary-context-clues:q0004', 'release:previous-vocabulary', 'medium', 'approved'),
      change('grammar-sentence-types-q0005', 'remediated', 'grammar', 'grammar-sentence-types', ['grammar.sentence-analysis'], ['L.4.1'], 'assets/question-chunks/grammar/grammar-sentence-types.js', 'grammar-sentence-types:q0005', 'release:previous-grammar', 'medium', 'approved')
    ])
  });

  function change(questionId, changeType, domain, setId, skillIds, standardIds, chunkFile, manifestEntryId, rollbackRef, learnerStateCompatibilityRisk, reviewStatus, sourceRemediationRecord = '') {
    return Object.freeze({
      questionId,
      changeType,
      domain,
      setId,
      skillIds: Object.freeze(skillIds.slice()),
      standardIds: Object.freeze(standardIds.slice()),
      chunkFile,
      manifestEntryId,
      rollbackRef,
      learnerStateCompatibilityRisk,
      reviewStatus,
      sourceRemediationRecord
    });
  }

  function buildContentChangeImpactAnalysis(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const rows = (Array.isArray(source.changes) ? source.changes : []).map(normalizeRow);
    return Object.freeze({
      schemaVersion: 1,
      releaseId: safeString(source.releaseId || 'content-impact-local'),
      rows: Object.freeze(rows.map(row => Object.freeze(row))),
      summary: Object.freeze(buildSummary(rows))
    });
  }

  function normalizeRow(value) {
    const input = value && typeof value === 'object' ? value : {};
    const questionId = safeString(input.questionId || input.id);
    const setId = safeString(input.setId || input.sourceSet);
    const domain = safeString(input.domain || inferDomain(setId));
    return {
      questionId,
      changeType: CONTENT_CHANGE_TYPES.includes(input.changeType) ? input.changeType : safeString(input.changeType),
      domain,
      setId,
      skillIds: Object.freeze(normalizeStringArray(input.skillIds || input.skills)),
      standardIds: Object.freeze(normalizeStringArray(input.standardIds || input.standards)),
      chunkFile: safeString(input.chunkFile || (domain && setId ? `assets/question-chunks/${domain}/${setId}.js` : '')),
      manifestEntryId: safeString(input.manifestEntryId || (setId && questionId ? `${setId}:${questionId}` : '')),
      sourceRemediationRecord: safeString(input.sourceRemediationRecord || input.remediationRecordId),
      reviewStatus: safeString(input.reviewStatus || input.status || 'needs_review'),
      rollbackRef: safeString(input.rollbackRef),
      learnerStateCompatibilityRisk: RISK_LEVELS.includes(input.learnerStateCompatibilityRisk) ? input.learnerStateCompatibilityRisk : defaultRisk(input.changeType),
      safeSummary: `${safeString(input.changeType || 'changed')} content impact for ${questionId || setId || 'content item'}`
    };
  }

  function validateContentChangeImpactAnalysis(analysis = {}) {
    const input = analysis && typeof analysis === 'object' ? analysis : {};
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const errors = [];
    rows.forEach(row => {
      const label = safeString(row.questionId) || 'content impact row';
      if (!safeString(row.questionId)) errors.push('content impact row questionId is required');
      if (!CONTENT_CHANGE_TYPES.includes(safeString(row.changeType))) errors.push(`${label} changeType is invalid`);
      if (!safeString(row.domain)) errors.push(`${label} domain is required`);
      if (!safeString(row.setId)) errors.push(`${label} setId is required`);
      if (!safeString(row.chunkFile)) errors.push(`${label} chunkFile is required`);
      if (!safeString(row.manifestEntryId)) errors.push(`${label} manifestEntryId is required`);
      if (!safeString(row.rollbackRef)) errors.push(`${label} rollbackRef is required`);
      if (!RISK_LEVELS.includes(safeString(row.learnerStateCompatibilityRisk))) errors.push(`${label} learnerStateCompatibilityRisk is invalid`);
      if (containsSensitiveImpactData(row)) errors.push(`${label} contains sensitive content impact data`);
    });
    return { valid: errors.length === 0, errors };
  }

  function buildSummary(rows) {
    return {
      total: rows.length,
      changeTypes: uniqueSorted(rows.map(row => row.changeType)),
      domains: uniqueSorted(rows.map(row => row.domain)),
      sets: uniqueSorted(rows.map(row => row.setId)),
      skills: uniqueSorted(rows.flatMap(row => row.skillIds)),
      standards: uniqueSorted(rows.flatMap(row => row.standardIds)),
      chunks: uniqueSorted(rows.map(row => row.chunkFile)),
      manifestEntries: uniqueSorted(rows.map(row => row.manifestEntryId)),
      sourceRemediationRecords: uniqueSorted(rows.map(row => row.sourceRemediationRecord).filter(Boolean)),
      reviewStatuses: uniqueSorted(rows.map(row => row.reviewStatus)),
      rollbackRefs: uniqueSorted(rows.map(row => row.rollbackRef)),
      learnerStateCompatibilityRisk: highestRisk(rows.map(row => row.learnerStateCompatibilityRisk))
    };
  }

  function highestRisk(risks) {
    return risks.reduce((highest, risk) => {
      return riskRank(risk) > riskRank(highest) ? risk : highest;
    }, 'low');
  }

  function riskRank(risk) {
    return { low: 0, medium: 1, high: 2, critical: 3 }[risk] ?? 0;
  }

  function defaultRisk(changeType) {
    if (changeType === 'removed') return 'high';
    if (changeType === 'moved' || changeType === 'remediated' || changeType === 'changed') return 'medium';
    return 'low';
  }

  function containsSensitiveImpactData(value) {
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

  function inferDomain(setId) {
    return safeString(setId).split('-')[0];
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
  }

  function uniqueSorted(values, preferredOrder = null) {
    const unique = Array.from(new Set(values.map(safeString).filter(Boolean)));
    if (preferredOrder) {
      return unique.sort((a, b) => preferredOrder.indexOf(a) - preferredOrder.indexOf(b));
    }
    return unique.sort();
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    CONTENT_CHANGE_TYPES,
    DEFAULT_CONTENT_CHANGE_IMPACT_FIXTURE,
    buildContentChangeImpactAnalysis,
    validateContentChangeImpactAnalysis
  };
});
