(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.GrammarQuestParentReviewQuestionApi = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function buildQuestionRenderRequest(input) {
    const ref = normalizeQuestionRef(input && (input.questionRef || input));
    const errors = validateQuestionRef(ref);
    if (errors.length) {
      const error = new Error(`parent_review_question_request_invalid:${errors.join(',')}`);
      error.code = 'parent_review_question_request_invalid';
      error.errors = errors;
      throw error;
    }
    return {
      schemaVersion: 1,
      questionRef: ref,
      renderMode: 'student_practice',
      includeScene: true,
      includeCharacters: true
    };
  }

  function buildReviewEvidenceRequest(input) {
    const source = input && typeof input === 'object' ? input : {};
    const questionRef = normalizeQuestionRef(source.questionRef || source);
    return {
      schemaVersion: 1,
      learnerId: safeString(source.learnerId || source.studentId),
      sessionId: safeString(source.sessionId || (source.session && source.session.id)),
      reportId: safeString(source.reportId || source.id),
      completedAt: safeString(source.completedAt || (source.session && source.session.completedAt)),
      questionRef
    };
  }

  function buildParentQuestionReviewModel(question, evidence) {
    const normalizedEvidence = evidence && typeof evidence === 'object' ? evidence : {};
    const requestRef = normalizeQuestionRef(normalizedEvidence.questionRef || normalizedEvidence);
    const canonical = question && typeof question === 'object' ? question : {};
    const canonicalRef = normalizeQuestionRef(Object.assign({}, requestRef, {
      id: canonical.id || requestRef.id,
      version: canonical.version || requestRef.version,
      contentHash: canonical.contentHash || requestRef.contentHash,
      sourceSet: canonical.metadata && canonical.metadata.sourceSet || requestRef.sourceSet,
      sequence: canonical.metadata && canonical.metadata.sequence || requestRef.sequence
    }));
    const match = validateHydratedQuestion(requestRef.id ? requestRef : canonicalRef, canonical);
    if (!match.valid) {
      const error = new Error(`parent_review_question_mismatch:${match.errors.join(',')}`);
      error.code = 'parent_review_question_mismatch';
      error.errors = match.errors;
      throw error;
    }
    const questionRef = canonicalRef;

    const choices = Array.isArray(canonical.choices) ? canonical.choices : [];
    const selectedIndex = normalizeIndex(normalizedEvidence.selectedIndex, choices, normalizedEvidence.selectedChoice);
    const correctIndex = Number.isFinite(canonical.correct)
      ? canonical.correct
      : normalizeIndex(normalizedEvidence.correctIndex, choices, normalizedEvidence.correctChoice);

    return {
      schemaVersion: 1,
      questionRef,
      studentView: {
        renderMode: 'student_practice',
        questionId: questionRef.id,
        question: safeString(canonical.question),
        choices,
        correctIndex,
        explanation: canonical.explanation || null,
        studyAid: canonical.studyAid || null,
        visualScene: canonical.visualScene || canonical.generatedVisualScene || null,
        metadata: canonical.metadata || {}
      },
      parentEvidence: {
        learnerId: safeString(normalizedEvidence.learnerId || normalizedEvidence.studentId),
        sessionId: safeString(normalizedEvidence.sessionId || (normalizedEvidence.session && normalizedEvidence.session.id)),
        reportId: safeString(normalizedEvidence.reportId || normalizedEvidence.id),
        completedAt: safeString(normalizedEvidence.completedAt || (normalizedEvidence.session && normalizedEvidence.session.completedAt)),
        selectedIndex,
        selectedChoice: choices[selectedIndex] || safeString(normalizedEvidence.selectedChoice),
        correctChoice: choices[correctIndex] || safeString(normalizedEvidence.correctChoice),
        firstAttemptCorrect: normalizedEvidence.firstAttemptCorrect === true,
        hintUsed: normalizedEvidence.hintUsed === true,
        confidence: safeString(normalizedEvidence.confidence),
        durationSeconds: Math.max(0, Number(normalizedEvidence.durationSeconds) || 0),
        status: safeString(normalizedEvidence.status),
        reason: safeString(normalizedEvidence.reason)
      }
    };
  }

  function validateHydratedQuestion(ref, question) {
    const errors = [];
    const current = question && typeof question === 'object' ? question : {};
    const metadata = current.metadata || {};
    if (!current.id || current.id !== ref.id) errors.push('question_id_mismatch');
    if (ref.version && Number(current.version || 0) !== ref.version) errors.push('question_version_mismatch');
    if (ref.contentHash && current.contentHash !== ref.contentHash) errors.push('question_hash_mismatch');
    if (ref.sourceSet && metadata.sourceSet && metadata.sourceSet !== ref.sourceSet) errors.push('source_set_mismatch');
    if (ref.sequence && metadata.sequence && Number(metadata.sequence) !== ref.sequence) errors.push('sequence_mismatch');
    return {
      valid: errors.length === 0,
      errors
    };
  }

  function normalizeQuestionRef(input) {
    const source = input && typeof input === 'object' ? input : {};
    return {
      id: safeString(source.id || source.questionId),
      sourceSet: safeString(source.sourceSet || source.setId),
      version: Math.max(0, Number(source.version || source.questionVersion) || 0),
      contentHash: safeString(source.contentHash || source.questionHash),
      sequence: Math.max(0, Number(source.sequence) || 0)
    };
  }

  function validateQuestionRef(ref) {
    const errors = [];
    if (!ref || !ref.id) errors.push('question_id_required');
    if (!ref || !ref.sourceSet) errors.push('source_set_required');
    if (!ref || !ref.version) errors.push('question_version_required');
    if (!ref || !ref.contentHash) errors.push('content_hash_required');
    return errors;
  }

  function normalizeIndex(value, choices, choiceText) {
    if (Number.isFinite(value) && value >= 0) return value;
    const list = Array.isArray(choices) ? choices : [];
    const match = list.indexOf(choiceText);
    return match >= 0 ? match : -1;
  }

  function safeString(value) {
    return String(value == null ? '' : value).trim();
  }

  return {
    buildQuestionRenderRequest,
    buildReviewEvidenceRequest,
    buildParentQuestionReviewModel,
    validateHydratedQuestion,
    normalizeQuestionRef,
    validateQuestionRef
  };
});
