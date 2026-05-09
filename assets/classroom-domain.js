(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestClassroomDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STATUSES = new Set(['active', 'archived']);

  function normalizeClassroom(input = {}) {
    return {
      classId: safeString(input.classId || input.id),
      teacherIds: normalizeStringArray(input.teacherIds),
      learnerIds: normalizeStringArray(input.learnerIds),
      title: safeString(input.title || input.classId || input.id),
      status: STATUSES.has(input.status) ? input.status : 'active',
      createdAt: safeString(input.createdAt),
      updatedAt: safeString(input.updatedAt)
    };
  }

  function validateClassroom(input) {
    const classroom = normalizeClassroom(input);
    const errors = [];
    if (!classroom.classId) errors.push('classId is required.');
    if (!classroom.teacherIds.length) errors.push('teacherIds is required.');
    if (!classroom.learnerIds.length) errors.push('learnerIds is required.');
    if (!STATUSES.has(classroom.status)) errors.push('status is invalid.');
    return errors;
  }

  function canTeacherManageClass(actor, classroom) {
    const teacherId = safeString(actor && (actor.id || actor.actorId || actor.userId));
    const normalized = normalizeClassroom(classroom);
    return normalized.status === 'active' && normalized.teacherIds.includes(teacherId);
  }

  function validateClassroomLearnerScope(classroom, learnerIds) {
    const normalized = normalizeClassroom(classroom);
    const scopedLearners = normalizeStringArray(learnerIds);
    const errors = [];
    scopedLearners.forEach(learnerId => {
      if (!normalized.learnerIds.includes(learnerId)) {
        errors.push(`cross-class learner ref is not allowed: ${learnerId}`);
      }
    });
    return errors;
  }

  function updateClassroomMembership(classroom, change = {}, options = {}) {
    const normalized = normalizeClassroom(classroom);
    const remove = new Set(normalizeStringArray(change.removeLearnerIds));
    const learners = normalizeStringArray(normalized.learnerIds.concat(change.addLearnerIds || []))
      .filter(id => !remove.has(id));
    return Object.assign({}, normalized, {
      learnerIds: learners,
      updatedAt: typeof options.now === 'function' ? options.now() : (options.now || new Date().toISOString())
    });
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    canTeacherManageClass,
    normalizeClassroom,
    updateClassroomMembership,
    validateClassroomLearnerScope,
    validateClassroom
  };
});
