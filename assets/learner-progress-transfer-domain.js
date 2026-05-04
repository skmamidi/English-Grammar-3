(function (root, factory) {
  'use strict';

  const crypto = typeof require === 'function' ? require('node:crypto') : null;
  const lessonProgressDomain = root.GrammarQuestLessonProgressDomain ||
    (typeof require === 'function' ? require('./lesson-progress-domain') : null);
  const api = factory(crypto, lessonProgressDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearnerProgressTransferDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (crypto, lessonProgressDomain) {
  'use strict';

  const FORBIDDEN_KEYS = new Set(['authToken', 'sessionToken', 'privateKey', 'telemetry', 'question', 'choices', 'answer', 'correctAnswer', 'explanation', 'explanations', 'questionSnapshots']);

  function createProgressExportEnvelope(input = {}) {
    const envelope = {
      schemaVersion: 1,
      app: {
        name: safeString(input.app && input.app.name || 'Grammar Quest'),
        version: safeString(input.app && input.app.version),
        exportedAt: safeIso(input.app && input.app.exportedAt) || new Date().toISOString()
      },
      learner: {
        id: safeString(input.learner && input.learner.id),
        displayLabel: input.includeDisplayLabel ? safeString(input.learner && input.learner.displayLabel) : ''
      },
      artifactProvenance: {
        manifestVersion: Number(input.artifactProvenance && input.artifactProvenance.manifestVersion) || 0,
        sourceHash: safeString(input.artifactProvenance && input.artifactProvenance.sourceHash)
      },
      data: normalizeTransferData(input.data),
      integrity: { digest: '' }
    };
    envelope.integrity.digest = digestEnvelope(envelope);
    return envelope;
  }

  function validateProgressExport(envelope) {
    const errors = [];
    const input = envelope && typeof envelope === 'object' ? envelope : {};
    if (input.schemaVersion !== 1) errors.push('unsupported_schema_version');
    if (!input.learner || !input.learner.id) errors.push('missing_learner_id');
    if (findForbiddenFields(input).length) errors.push('forbidden_fields');
    if (!input.integrity || input.integrity.digest !== digestEnvelope(input)) errors.push('invalid_digest');
    return { valid: errors.length === 0, errors };
  }

  function normalizeTransferData(data) {
    const input = data && typeof data === 'object' ? data : {};
    return sanitize({
      progress: input.progress || {},
      sessions: Array.isArray(input.sessions) ? input.sessions : [],
      activeQuiz: input.activeQuiz || null,
      questionReports: Array.isArray(input.questionReports) ? input.questionReports : [],
      assignments: Array.isArray(input.assignments) ? input.assignments : [],
      reviewQueue: input.reviewQueue || null,
      reviewSchedules: Array.isArray(input.reviewSchedules) ? input.reviewSchedules : [],
      lessonProgress: normalizeLessonProgress(input.lessonProgress || input.progress && input.progress.lessonProgress)
    });
  }

  function normalizeLessonProgress(records) {
    if (!lessonProgressDomain || typeof lessonProgressDomain.mergeLessonProgressRecords !== 'function') return [];
    return lessonProgressDomain.mergeLessonProgressRecords(records);
  }

  function sanitize(value) {
    if (Array.isArray(value)) return value.map(sanitize);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).sort().reduce((clean, key) => {
      if (FORBIDDEN_KEYS.has(key)) return clean;
      clean[key] = sanitize(value[key]);
      return clean;
    }, {});
  }

  function findForbiddenFields(value, path = []) {
    if (!value || typeof value !== 'object') return [];
    return Object.keys(value).flatMap(key => {
      const next = path.concat(key);
      return FORBIDDEN_KEYS.has(key) ? [next.join('.')] : findForbiddenFields(value[key], next);
    });
  }

  function digestEnvelope(envelope) {
    const clone = JSON.parse(JSON.stringify(envelope || {}));
    if (clone.integrity) clone.integrity.digest = '';
    const payload = stableStringify(clone);
    if (crypto && typeof crypto.createHash === 'function') {
      return `sha256:${crypto.createHash('sha256').update(payload).digest('hex')}`;
    }
    return `sha256:${String(payload.length).padStart(64, '0').slice(-64)}`;
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  function safeIso(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return { createProgressExportEnvelope, digestEnvelope, findForbiddenFields, normalizeTransferData, validateProgressExport };
});
