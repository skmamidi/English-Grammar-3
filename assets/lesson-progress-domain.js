(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLessonProgressDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STATUSES = new Set(['in_progress', 'completed', 'skipped']);
  const EVENT_TYPES = new Set([
    'lesson_started',
    'lesson_completed',
    'lesson_skipped',
    'lesson_resumed',
    'lesson_opened_from_study_aid'
  ]);
  const SOURCES = new Set(['direct', 'lesson_page', 'study_aid', 'recommendation']);

  function normalizeLessonProgressRecord(record) {
    const input = record && typeof record === 'object' ? record : {};
    const lessonRefInput = input.lessonRef || {};
    const setId = safeString(input.setId || lessonRefInput.setId);
    if (!setId) return null;
    const source = normalizeSource(input.source, input.openedFromStudyAid);
    const status = normalizeStatus(input.status);
    const normalized = {
      schemaVersion: 1,
      lessonRef: {
        setId,
        grade: normalizeGrade(input.grade || lessonRefInput.grade),
        version: Math.max(0, Math.round(Number(input.version || input.contentVersion || lessonRefInput.version) || 0)),
        contentHash: safeString(input.contentHash || lessonRefInput.contentHash)
      },
      status,
      startedAt: safeIso(input.startedAt),
      completedAt: safeIso(input.completedAt),
      skippedAt: safeIso(input.skippedAt),
      resumedAt: safeIso(input.resumedAt),
      lastOpenedAt: safeIso(input.lastOpenedAt || input.openedAt),
      updatedAt: safeIso(input.updatedAt || input.completedAt || input.skippedAt || input.resumedAt || input.startedAt),
      source,
      sourceRoute: stripQuery(input.sourceRoute || input.route || input.url),
      openedFromStudyAid: input.openedFromStudyAid === true || source === 'study_aid'
    };
    if (!normalized.updatedAt) normalized.updatedAt = normalized.lastOpenedAt || normalized.completedAt || normalized.skippedAt || normalized.startedAt;
    return normalized;
  }

  function applyLessonProgressEvent(existing, event, options = {}) {
    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
    const input = event && typeof event === 'object' ? event : {};
    const type = EVENT_TYPES.has(safeString(input.type)) ? safeString(input.type) : 'lesson_started';
    const timestamp = safeIso(input.occurredAt || input.completedAt || input.skippedAt || input.resumedAt || input.startedAt) || safeIso(now()) || new Date().toISOString();
    const base = normalizeLessonProgressRecord(Object.assign({}, existing || {}, input, {
      source: type === 'lesson_opened_from_study_aid' ? 'study_aid' : input.source || existing && existing.source,
      openedFromStudyAid: type === 'lesson_opened_from_study_aid' || input.openedFromStudyAid === true || existing && existing.openedFromStudyAid === true
    }));
    if (!base) throw new Error('lesson_progress_requires_set_id');
    base.updatedAt = timestamp;
    base.lastOpenedAt = timestamp;
    if (type === 'lesson_completed') {
      base.status = 'completed';
      base.completedAt = timestamp;
    } else if (type === 'lesson_skipped') {
      base.status = 'skipped';
      base.skippedAt = timestamp;
    } else if (type === 'lesson_resumed') {
      base.status = base.status === 'completed' ? 'completed' : 'in_progress';
      base.resumedAt = timestamp;
    } else {
      base.status = base.status === 'completed' ? 'completed' : 'in_progress';
      if (!base.startedAt) base.startedAt = timestamp;
    }
    return normalizeLessonProgressRecord(base);
  }

  function mergeLessonProgressRecords(records) {
    const byKey = new Map();
    (Array.isArray(records) ? records : []).forEach(record => {
      const normalized = normalizeLessonProgressRecord(record);
      if (!normalized) return;
      const key = `${normalized.lessonRef.setId}::${normalized.lessonRef.grade || 0}`;
      const current = byKey.get(key);
      byKey.set(key, chooseNewerLessonProgress(current, normalized));
    });
    return Array.from(byKey.values()).sort((left, right) =>
      left.lessonRef.setId.localeCompare(right.lessonRef.setId) ||
      left.lessonRef.grade - right.lessonRef.grade
    );
  }

  function createLessonTelemetryEvent(input, options = {}) {
    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
    const type = EVENT_TYPES.has(safeString(input && input.type)) ? safeString(input.type) : 'lesson_started';
    const record = applyLessonProgressEvent(null, Object.assign({}, input || {}, { type }), { now });
    return {
      type,
      route: record.sourceRoute || '/',
      category: 'lesson_lifecycle',
      severity: 'info',
      occurredAt: record.updatedAt,
      lesson: {
        setId: record.lessonRef.setId,
        grade: record.lessonRef.grade,
        status: record.status,
        version: record.lessonRef.version,
        contentHash: record.lessonRef.contentHash,
        source: record.source,
        openedFromStudyAid: record.openedFromStudyAid
      }
    };
  }

  function chooseNewerLessonProgress(left, right) {
    if (!left) return right;
    if (left.status !== 'completed' && right.status === 'completed') return right;
    if (left.status === 'completed' && right.status !== 'completed') return left;
    const leftTime = Date.parse(left.updatedAt || left.completedAt || left.startedAt || '') || 0;
    const rightTime = Date.parse(right.updatedAt || right.completedAt || right.startedAt || '') || 0;
    return rightTime >= leftTime ? right : left;
  }

  function normalizeStatus(status) {
    const value = safeString(status);
    return STATUSES.has(value) ? value : 'in_progress';
  }

  function normalizeSource(source, openedFromStudyAid) {
    if (openedFromStudyAid === true) return 'study_aid';
    const value = safeString(source);
    return SOURCES.has(value) ? value : 'direct';
  }

  function normalizeGrade(value) {
    const grade = Math.round(Number(value) || 0);
    return grade >= 2 && grade <= 6 ? grade : 0;
  }

  function stripQuery(value) {
    return safeString(value).split('?')[0].split('#')[0];
  }

  function safeIso(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    EVENT_TYPES: Array.from(EVENT_TYPES),
    applyLessonProgressEvent,
    createLessonTelemetryEvent,
    mergeLessonProgressRecords,
    normalizeLessonProgressRecord
  };
});
