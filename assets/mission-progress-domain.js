(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestMissionProgressDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STEP_STATUSES = new Set(['queued', 'in_progress', 'completed', 'skipped']);
  const EVIDENCE_TYPES = new Set(['lesson_progress', 'saved_session', 'active_quiz', 'review_item', 'mission_assignment', 'manual_ref']);
  const PAYLOAD_KEYS = new Set(['question', 'choices', 'answer', 'answers', 'answerKey', 'correct', 'explanation', 'questions', 'questionSnapshots', 'storyBeats', 'examples', 'guidedChecks', 'providerPayload', 'learnerName', 'email']);

  function normalizeMissionProgressRecord(record) {
    const input = stripPayload(record && typeof record === 'object' ? record : {});
    const missionId = safeString(input.missionId || input.id);
    if (!missionId) return null;
    const stepEvidence = normalizeStepEvidence(input.stepEvidence || input.steps);
    const tombstone = input.tombstone || {};
    return {
      schemaVersion: 1,
      missionId,
      catalogSourceHash: safeString(input.catalogSourceHash),
      status: normalizeStatus(input.status),
      completedStepIds: completedStepIds(stepEvidence),
      stepEvidence,
      startedAt: safeIso(input.startedAt) || firstIso(stepEvidence, 'startedAt'),
      updatedAt: safeIso(input.updatedAt) || newestIso(stepEvidence, 'updatedAt'),
      completedAt: safeIso(input.completedAt) || (allRequiredComplete(input, stepEvidence) ? newestIso(stepEvidence, 'completedAt') : ''),
      offline: input.offline === true,
      tombstone: tombstone && tombstone.deletedAt ? createMissionProgressTombstone(Object.assign({}, tombstone, { missionId })) : null
    };
  }

  function recordMissionStepEvidence(existing, event, options = {}) {
    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
    const timestamp = safeIso(event && (event.occurredAt || event.completedAt || event.updatedAt)) || safeIso(now()) || new Date().toISOString();
    const base = normalizeMissionProgressRecord(existing) || normalizeMissionProgressRecord({ missionId: event && event.missionId, stepEvidence: [] });
    if (!base) throw new Error('mission_progress_requires_mission_id');
    const evidence = normalizeStepEvidence([Object.assign({}, event || {}, {
      updatedAt: timestamp,
      completedAt: (event && event.status) === 'completed' ? timestamp : event && event.completedAt
    })])[0];
    if (!evidence || !evidence.stepId) throw new Error('mission_progress_requires_step_id');
    return normalizeMissionProgressRecord(Object.assign({}, base, {
      status: evidence.status === 'completed' ? base.status : 'in_progress',
      stepEvidence: mergeEvidence(base.stepEvidence, [evidence]).values,
      updatedAt: timestamp
    }));
  }

  function projectMissionResume(record, mission, options = {}) {
    const progress = normalizeMissionProgressRecord(record);
    const summary = mission && typeof mission === 'object' ? mission : {};
    if (!progress) return { state: 'empty', missionId: safeString(summary.missionId), currentStep: null, completedStepIds: [], repairSequence: [] };
    if (progress.tombstone) return { state: 'deleted', missionId: progress.missionId, currentStep: null, completedStepIds: progress.completedStepIds, repairSequence: [] };
    if (progress.catalogSourceHash && summary.catalogSourceHash && progress.catalogSourceHash !== summary.catalogSourceHash && options.online === false) {
      return { state: 'stale_catalog_offline', missionId: progress.missionId, currentStep: null, completedStepIds: progress.completedStepIds, repairSequence: [] };
    }
    const sequence = buildRepairSequence(progress, summary);
    const currentStep = sequence.find(step => step.status === 'current') || null;
    const completed = sequence.length > 0 && sequence.filter(step => step.required !== false).every(step => step.status === 'completed');
    return {
      state: completed ? 'completed' : progress.stepEvidence.length ? 'in_progress' : 'ready',
      missionId: progress.missionId,
      currentStep,
      completedStepIds: progress.completedStepIds,
      repairSequence: sequence,
      practiceResume: buildPracticeResume(progress, currentStep)
    };
  }

  function mergeMissionProgressRecords(left, right, options = {}) {
    const local = normalizeMissionProgressRecord(left);
    const remote = normalizeMissionProgressRecord(right);
    if (!local) return { record: remote, conflicts: [], mergedAt: currentIso(options) };
    if (!remote) return { record: local, conflicts: [], mergedAt: currentIso(options) };
    if (local.missionId !== remote.missionId) throw new Error('mission_progress_mission_mismatch');
    const mergedEvidence = mergeEvidence(local.stepEvidence, remote.stepEvidence);
    const mergedAt = currentIso(options);
    return {
      record: normalizeMissionProgressRecord(Object.assign({}, compareIso(remote.updatedAt, local.updatedAt) >= 0 ? remote : local, {
        missionId: local.missionId,
        catalogSourceHash: remote.catalogSourceHash || local.catalogSourceHash,
        stepEvidence: mergedEvidence.values,
        updatedAt: mergedAt,
        offline: local.offline || remote.offline
      })),
      conflicts: mergedEvidence.conflicts,
      mergedAt
    };
  }

  function mergeMissionProgressList(leftRecords, rightRecords, options = {}) {
    const byId = new Map();
    normalizeMissionProgressList(leftRecords).concat(normalizeMissionProgressList(rightRecords)).forEach(record => {
      const previous = byId.get(record.missionId);
      byId.set(record.missionId, previous ? mergeMissionProgressRecords(previous, record, options).record : record);
    });
    return Array.from(byId.values()).sort((a, b) => a.missionId.localeCompare(b.missionId));
  }

  function createMissionProgressTombstone(input, options = {}) {
    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
    return {
      schemaVersion: 1,
      missionId: safeString(input && input.missionId),
      deletedAt: safeIso(input && input.deletedAt) || safeIso(now()) || new Date().toISOString(),
      reason: safeString(input && input.reason || 'mission_progress_deleted')
    };
  }

  function normalizeMissionProgressList(records) {
    return (Array.isArray(records) ? records : [])
      .map(normalizeMissionProgressRecord)
      .filter(Boolean);
  }

  function buildRepairSequence(progress, mission) {
    const steps = Array.isArray(mission.stepSummaries) ? mission.stepSummaries : [];
    const evidenceByStep = new Map(progress.stepEvidence.map(item => [item.stepId, item]));
    const sequence = steps.map(step => {
      const evidence = evidenceByStep.get(safeString(step.stepId));
      const completed = evidence && evidence.status === 'completed';
      return {
        stepId: safeString(step.stepId),
        type: safeString(step.type),
        title: safeString(step.title),
        required: step.required !== false,
        status: completed ? 'completed' : evidence && evidence.status === 'in_progress' ? 'current' : step.required === false ? 'optional' : 'upcoming',
        route: step.route || null
      };
    });
    if (!sequence.some(step => step.status === 'current')) {
      const next = sequence.find(step => step.required && step.status !== 'completed');
      if (next) next.status = 'current';
    }
    return sequence;
  }

  function buildPracticeResume(progress, currentStep) {
    if (!currentStep || currentStep.type !== 'practice') return null;
    const evidence = progress.stepEvidence.find(item => item.stepId === currentStep.stepId && item.evidenceRef.type === 'active_quiz');
    const activeQuizRef = evidence && evidence.evidenceRef.activeQuizRef;
    if (!activeQuizRef) return null;
    return {
      type: 'active_quiz',
      setId: safeString(activeQuizRef.setId),
      questionRefCount: Math.max(0, Number(activeQuizRef.questionRefCount) || 0),
      lastSavedAt: safeIso(activeQuizRef.lastSavedAt) || ''
    };
  }

  function normalizeStepEvidence(values) {
    return (Array.isArray(values) ? values : []).map(value => {
      const input = stripPayload(value && typeof value === 'object' ? value : {});
      const stepId = safeString(input.stepId || input.id);
      if (!stepId) return null;
      const status = normalizeStatus(input.status);
      const updatedAt = safeIso(input.updatedAt || input.occurredAt || input.completedAt) || '';
      return {
        stepId,
        stepType: safeString(input.stepType || input.type),
        status,
        evidenceRef: normalizeEvidenceRef(input.evidenceRef || input),
        route: safeInternalRoute(input.route),
        startedAt: safeIso(input.startedAt) || '',
        completedAt: status === 'completed' ? safeIso(input.completedAt || input.updatedAt || input.occurredAt) || updatedAt : '',
        updatedAt
      };
    }).filter(Boolean).sort((a, b) => a.stepId.localeCompare(b.stepId));
  }

  function normalizeEvidenceRef(ref) {
    const input = ref && typeof ref === 'object' ? ref : {};
    const type = EVIDENCE_TYPES.has(safeString(input.type)) ? safeString(input.type) : 'manual_ref';
    const normalized = { type };
    if (type === 'lesson_progress') {
      normalized.setId = safeString(input.setId);
      normalized.completedAt = safeIso(input.completedAt) || '';
    } else if (type === 'saved_session') {
      normalized.sessionId = safeString(input.sessionId || input.id);
      normalized.setId = safeString(input.setId);
    } else if (type === 'active_quiz') {
      const active = input.activeQuizRef || {};
      normalized.activeQuizRef = {
        setId: safeString(active.setId),
        questionRefCount: Math.max(0, Number(active.questionRefCount) || 0),
        lastSavedAt: safeIso(active.lastSavedAt) || ''
      };
    } else if (type === 'review_item') {
      normalized.queueId = safeString(input.queueId);
      normalized.itemId = safeString(input.itemId || input.questionId);
    } else if (type === 'mission_assignment') {
      normalized.assignmentId = safeString(input.assignmentId || input.id);
    }
    return normalized;
  }

  function mergeEvidence(leftValues, rightValues) {
    const byStep = new Map();
    const conflicts = [];
    normalizeStepEvidence(leftValues).concat(normalizeStepEvidence(rightValues)).forEach(item => {
      const previous = byStep.get(item.stepId);
      if (previous && JSON.stringify(previous.evidenceRef) !== JSON.stringify(item.evidenceRef)) {
        conflicts.push({ type: 'mission_step_evidence', stepId: item.stepId });
      }
      if (!previous || compareIso(item.updatedAt || item.completedAt, previous.updatedAt || previous.completedAt) >= 0) {
        byStep.set(item.stepId, item);
      }
    });
    return { values: Array.from(byStep.values()).sort((a, b) => a.stepId.localeCompare(b.stepId)), conflicts };
  }

  function completedStepIds(stepEvidence) {
    return stepEvidence
      .filter(item => item.status === 'completed')
      .map(item => item.stepId)
      .sort();
  }

  function allRequiredComplete(input, evidence) {
    const required = normalizeStringArray(input.completionPolicy && input.completionPolicy.requiredStepIds || input.requiredStepIds);
    return required.length > 0 && required.every(stepId => completedStepIds(evidence).includes(stepId));
  }

  function normalizeStatus(value) {
    const status = safeString(value);
    return STEP_STATUSES.has(status) ? status : 'queued';
  }

  function stripPayload(value) {
    if (Array.isArray(value)) return value.map(stripPayload);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((result, key) => {
      if (PAYLOAD_KEYS.has(key)) return result;
      result[key] = stripPayload(value[key]);
      return result;
    }, {});
  }

  function safeInternalRoute(value) {
    const route = safeString(value);
    if (!route || /^[a-z]+:/i.test(route) || route.includes('..')) return '';
    return route.replace(/^\/+/, '');
  }

  function firstIso(values, key) {
    return values.map(item => safeIso(item && item[key])).filter(Boolean).sort()[0] || '';
  }

  function newestIso(values, key) {
    return values.map(item => safeIso(item && item[key])).filter(Boolean).sort().reverse()[0] || '';
  }

  function currentIso(options) {
    const now = typeof options.now === 'function' ? options.now() : options.now;
    return safeIso(now) || new Date().toISOString();
  }

  function compareIso(left, right) {
    return (Date.parse(left || '') || 0) - (Date.parse(right || '') || 0);
  }

  function safeIso(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    createMissionProgressTombstone,
    mergeMissionProgressList,
    mergeMissionProgressRecords,
    normalizeMissionProgressList,
    normalizeMissionProgressRecord,
    projectMissionResume,
    recordMissionStepEvidence
  };
});
