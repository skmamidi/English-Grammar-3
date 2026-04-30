(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAssignmentDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STATUSES = new Set(['active', 'in_progress', 'completed', 'archived']);
  const PAYLOAD_KEYS = new Set(['question', 'choices', 'explanation', 'questionSnapshots', 'questions']);

  function normalizeAssignment(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    return {
      id: safeString(input.id),
      title: safeString(input.title || 'Practice Plan'),
      assignedBy: normalizeAssignedBy(input.assignedBy),
      assignedTo: normalizeAssignedTo(input.assignedTo),
      scope: normalizeScope(input.scope),
      quizOptions: normalizeQuizOptions(input.quizOptions),
      dueAt: safeString(input.dueAt),
      status: STATUSES.has(input.status) ? input.status : 'active',
      createdAt: safeString(input.createdAt),
      updatedAt: safeString(input.updatedAt),
      startedAt: safeString(input.startedAt),
      completedAt: safeString(input.completedAt),
      completedSessionId: safeString(input.completedSessionId)
    };
  }

  function validateAssignment(raw) {
    const errors = [];
    const input = raw && typeof raw === 'object' ? raw : {};
    const assignment = normalizeAssignment(input);
    if (!assignment.id) errors.push('id is required.');
    if (!assignment.title) errors.push('title is required.');
    if (!assignment.assignedTo.learnerIds.length && !assignment.assignedTo.classIds.length) {
      errors.push('assignedTo must include learnerIds or classIds.');
    }
    if (!hasScope(assignment.scope)) errors.push('scope must include at least one domain, set, skill, standard, or question ref.');
    if (containsQuestionPayload(input)) errors.push('assignment must not store copied question payloads.');
    if (!STATUSES.has(assignment.status)) errors.push(`status "${assignment.status}" is invalid.`);
    if (assignment.quizOptions.count < 1) errors.push('quizOptions.count must be positive.');
    return errors;
  }

  function markAssignmentStarted(raw, startedAt) {
    const assignment = normalizeAssignment(raw);
    return Object.assign({}, assignment, {
      status: 'in_progress',
      startedAt: safeString(startedAt) || new Date().toISOString(),
      updatedAt: safeString(startedAt) || new Date().toISOString()
    });
  }

  function markAssignmentCompleted(raw, sessionRef) {
    const assignment = normalizeAssignment(raw);
    const completedAt = safeString(sessionRef && (sessionRef.completedAt || sessionRef.completedAtIso)) || new Date().toISOString();
    return Object.assign({}, assignment, {
      status: 'completed',
      completedAt,
      updatedAt: completedAt,
      completedSessionId: safeString(sessionRef && (sessionRef.sessionId || sessionRef.id))
    });
  }

  function archiveAssignment(raw, archivedAt) {
    const assignment = normalizeAssignment(raw);
    return Object.assign({}, assignment, {
      status: 'archived',
      updatedAt: safeString(archivedAt) || new Date().toISOString()
    });
  }

  function normalizeAssignedBy(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      actorId: safeString(input.actorId || input.id),
      role: safeString(input.role)
    };
  }

  function normalizeAssignedTo(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      learnerIds: normalizeStringArray(input.learnerIds),
      classIds: normalizeStringArray(input.classIds)
    };
  }

  function normalizeScope(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      domainIds: normalizeStringArray(input.domainIds),
      setIds: normalizeStringArray(input.setIds),
      skillIds: normalizeStringArray(input.skillIds),
      standardIds: normalizeStringArray(input.standardIds),
      questionRefs: (Array.isArray(input.questionRefs) ? input.questionRefs : []).map(normalizeQuestionRef).filter(ref => ref.id || ref.sourceSet)
    };
  }

  function normalizeQuestionRef(ref) {
    const input = ref && typeof ref === 'object' ? ref : {};
    return {
      id: safeString(input.id),
      sourceSet: safeString(input.sourceSet),
      version: Number(input.version) || 0,
      contentHash: safeString(input.contentHash),
      sequence: Number(input.sequence) || 0
    };
  }

  function normalizeQuizOptions(value) {
    const input = value && typeof value === 'object' ? value : {};
    return {
      count: Math.max(1, Number(input.count) || 10),
      grade: safeString(input.grade || '4'),
      difficulty: safeString(input.difficulty || 'medium'),
      mode: safeString(input.mode || 'assignment')
    };
  }

  function hasScope(scope) {
    return ['domainIds', 'setIds', 'skillIds', 'standardIds', 'questionRefs'].some(key => Array.isArray(scope[key]) && scope[key].length);
  }

  function containsQuestionPayload(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => {
      if (PAYLOAD_KEYS.has(key)) return true;
      const child = value[key];
      if (Array.isArray(child)) return child.some(containsQuestionPayload);
      return child && typeof child === 'object' && containsQuestionPayload(child);
    });
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : [])
      .map(safeString)
      .filter(Boolean)));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    archiveAssignment,
    markAssignmentCompleted,
    markAssignmentStarted,
    normalizeAssignment,
    normalizeQuestionRef,
    validateAssignment
  };
});
