(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearnerStateSyncDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const CURRENT_SYNC_SCHEMA_VERSION = 1;
  const PAYLOAD_KEYS = new Set(['question', 'choices', 'correct', 'answer', 'answers', 'explanation', 'questions']);
  function getRepositoryApi() {
    return root.GrammarQuestLearnerStateRepository ||
      (typeof require === 'function' ? require('./learner-state-repository') : null);
  }

  function mergeLearnerStates(localState, remoteState, options = {}) {
    const local = normalizeState(localState);
    const remote = normalizeState(remoteState);
    return normalizeState(Object.assign({}, local, remote, {
      streakDays: Math.max(local.streakDays || 0, remote.streakDays || 0),
      totalGems: Math.max(local.totalGems || 0, remote.totalGems || 0),
      quizzesCompleted: Math.max(local.quizzesCompleted || 0, remote.quizzesCompleted || 0),
      bestScore: Math.max(local.bestScore || 0, remote.bestScore || 0),
      badges: mergeStrings(local.badges, remote.badges),
      reports: mergeReports(local.reports, remote.reports),
      activeQuiz: chooseNewestActiveQuiz(local.activeQuiz, remote.activeQuiz),
      assignments: mergeById(local.assignments, remote.assignments, assignmentTimestamp),
      reviewQueue: mergeReviewQueues(local.reviewQueue, remote.reviewQueue),
      reviewSchedules: mergeSchedules(local.reviewSchedules, remote.reviewSchedules),
      mastery: mergeMastery(local.mastery, remote.mastery),
      learnerGoals: chooseNewestLearnerGoals(local.learnerGoals, remote.learnerGoals),
      lastUpdatedAt: maxIso(local.lastUpdatedAt, remote.lastUpdatedAt, options.now)
    }));
  }

  function resolveSyncConflict(localRecord, remoteRecord, options = {}) {
    const local = normalizeSyncedLearnerRecord(localRecord);
    const remote = normalizeSyncedLearnerRecord(remoteRecord);
    if (local.learnerId && remote.learnerId && local.learnerId !== remote.learnerId) {
      throw new Error('learner_state_sync_learner_mismatch');
    }
    const merged = mergeLearnerStateRecords(local, remote, options);
    return {
      status: 'merged',
      record: normalizeSyncedLearnerRecord({
        learnerId: local.learnerId || remote.learnerId,
        revision: merged.winningRevision,
        updatedAt: merged.mergedAt,
        source: options.source || 'conflict-resolution',
        state: merged.state
      })
    };
  }

  function mergeLearnerStateRecords(localRecord, remoteRecord, options = {}) {
    const local = normalizeSyncedLearnerRecord(localRecord);
    const remote = normalizeSyncedLearnerRecord(remoteRecord);
    if (local.learnerId && remote.learnerId && local.learnerId !== remote.learnerId) {
      throw new Error('learner_state_sync_learner_mismatch');
    }
    const resolved = resolveLearnerStateConflict(local.state, remote.state, options);
    const conflicts = resolved.conflicts.slice();
    if (local.revision !== remote.revision || local.updatedAt !== remote.updatedAt) {
      conflicts.push({
        type: 'record_revision',
        localRevision: local.revision,
        remoteRevision: remote.revision,
        localUpdatedAt: local.updatedAt,
        remoteUpdatedAt: remote.updatedAt
      });
    }
    return {
      state: resolved.state,
      conflicts,
      warnings: resolved.warnings,
      winningRevision: Math.max(local.revision, remote.revision) + 1,
      mergedAt: currentIso(options)
    };
  }

  function resolveLearnerStateConflict(localState, remoteState, options = {}) {
    const local = normalizeState(localState);
    const warnings = [];
    try {
      assertMergeableState(remoteState);
    } catch (error) {
      warnings.push({
        code: 'remote_record_corrupt',
        message: error && error.message || 'learner_state_sync_record_corrupt'
      });
      return {
        state: local,
        conflicts: [{ type: 'remote_quarantined' }],
        warnings,
        winningRevision: 0,
        mergedAt: currentIso(options)
      };
    }
    return {
      state: mergeLearnerStates(local, remoteState, options),
      conflicts: collectStateConflicts(local, normalizeState(remoteState)),
      warnings,
      winningRevision: 0,
      mergedAt: currentIso(options)
    };
  }

  function normalizeSyncRecord(record) {
    const input = record && typeof record === 'object' ? record : {};
    const schemaVersion = Number(input.schemaVersion) || CURRENT_SYNC_SCHEMA_VERSION;
    if (schemaVersion > CURRENT_SYNC_SCHEMA_VERSION) throw new Error('learner_state_sync_schema_unsupported');
    if (schemaVersion <= 0) throw new Error('learner_state_sync_schema_invalid');
    return {
      schemaVersion: CURRENT_SYNC_SCHEMA_VERSION,
      learnerId: safeString(input.learnerId),
      revision: Math.max(0, Math.round(Number(input.revision) || 0)),
      updatedAt: safeIso(input.updatedAt) || new Date(0).toISOString(),
      source: safeString(input.source || 'unknown'),
      state: stripQuestionPayload(normalizeState(input.state))
    };
  }

  function normalizeSyncedLearnerRecord(record) {
    return normalizeSyncRecord(record);
  }

  function migrateServerRecord(record) {
    return normalizeSyncRecord(record);
  }

  function assertMergeableState(state) {
    const normalized = normalizeState(state);
    (normalized.reports.questionReports || []).forEach(report => {
      if (report && report.id && !report.questionId) throw new Error('learner_state_sync_record_corrupt:question_report_missing_question_id');
    });
    (normalized.reports.sessions || []).forEach(session => {
      if (session && !session.id) throw new Error('learner_state_sync_record_corrupt:session_missing_id');
    });
    (normalized.assignments || []).forEach(assignment => {
      if (assignment && !assignment.id) throw new Error('learner_state_sync_record_corrupt:assignment_missing_id');
    });
    (normalized.reviewQueue.items || []).forEach(item => {
      const itemId = reviewItemId(item);
      if (item && !itemId) throw new Error('learner_state_sync_record_corrupt:review_item_missing_id');
    });
    (normalized.reviewSchedules || []).forEach(schedule => {
      if (schedule && !scheduleId(schedule)) throw new Error('learner_state_sync_record_corrupt:schedule_missing_ref');
    });
    return normalized;
  }

  function collectStateConflicts(local, remote) {
    const conflicts = [];
    collectOverlappingIds('session', local.reports.sessions, remote.reports.sessions, conflicts);
    collectOverlappingIds('question_report', local.reports.questionReports, remote.reports.questionReports, conflicts);
    collectOverlappingIds('assignment', local.assignments, remote.assignments, conflicts);
    collectOverlappingIds('review_schedule', local.reviewSchedules, remote.reviewSchedules, conflicts, scheduleId);
    if (local.activeQuiz && remote.activeQuiz && activeQuizTimestamp(local.activeQuiz) !== activeQuizTimestamp(remote.activeQuiz)) {
      conflicts.push({ type: 'active_quiz', resolution: 'newest_updatedAt' });
    }
    return conflicts;
  }

  function collectOverlappingIds(type, localValues, remoteValues, conflicts, idFor = item => item && item.id) {
    const localIds = new Set((Array.isArray(localValues) ? localValues : []).map(idFor).map(safeString).filter(Boolean));
    (Array.isArray(remoteValues) ? remoteValues : []).forEach(item => {
      const id = safeString(idFor(item));
      if (id && localIds.has(id)) conflicts.push({ type, id });
    });
  }

  function stripQuestionPayload(value) {
    if (Array.isArray(value)) return value.map(stripQuestionPayload);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((result, key) => {
      if (PAYLOAD_KEYS.has(key)) return result;
      result[key] = stripQuestionPayload(value[key]);
      return result;
    }, {});
  }

  function containsQuestionPayload(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => {
      if (PAYLOAD_KEYS.has(key)) return true;
      const child = value[key];
      return Array.isArray(child) ? child.some(containsQuestionPayload) : containsQuestionPayload(child);
    });
  }

  function mergeReports(localReports = {}, remoteReports = {}) {
    return {
      sessions: mergeById(localReports.sessions, remoteReports.sessions, sessionTimestamp),
      questionReports: mergeById(localReports.questionReports, remoteReports.questionReports, reportTimestamp)
    };
  }

  function chooseNewestActiveQuiz(localQuiz, remoteQuiz) {
    if (!localQuiz) return remoteQuiz || null;
    if (!remoteQuiz) return localQuiz || null;
    return compareIso(activeQuizTimestamp(remoteQuiz), activeQuizTimestamp(localQuiz)) >= 0 ? remoteQuiz : localQuiz;
  }

  function mergeReviewQueues(localQueue = {}, remoteQueue = {}) {
    const queueId = remoteQueue.queueId || localQueue.queueId || '';
    const items = mergeById(localQueue.items, remoteQueue.items, reviewItemTimestamp, reviewItemId);
    return {
      queueId,
      generatedAt: maxIso(localQueue.generatedAt, remoteQueue.generatedAt),
      updatedAt: maxIso(localQueue.updatedAt, remoteQueue.updatedAt),
      items
    };
  }

  function mergeSchedules(localSchedules, remoteSchedules) {
    return mergeById(localSchedules, remoteSchedules, scheduleTimestamp, scheduleId);
  }

  function chooseNewestLearnerGoals(localGoals, remoteGoals) {
    if (!localGoals) return remoteGoals || null;
    if (!remoteGoals) return localGoals || null;
    return compareIso(goalTimestamp(remoteGoals), goalTimestamp(localGoals)) >= 0 ? remoteGoals : localGoals;
  }

  function mergeById(leftValues, rightValues, timestampFor, idFor = item => item && item.id) {
    const byId = new Map();
    (Array.isArray(leftValues) ? leftValues : []).concat(Array.isArray(rightValues) ? rightValues : []).forEach(item => {
      const id = safeString(idFor(item));
      if (!id) return;
      const previous = byId.get(id);
      if (!previous || compareIso(timestampFor(item), timestampFor(previous)) >= 0) byId.set(id, item);
    });
    return Array.from(byId.values()).sort((a, b) => compareIso(timestampFor(b), timestampFor(a)) || safeString(idFor(a)).localeCompare(safeString(idFor(b))));
  }

  function mergeMastery(local = {}, remote = {}) {
    const groups = new Set(Object.keys(local || {}).concat(Object.keys(remote || {})));
    return Array.from(groups).reduce((result, group) => {
      result[group] = Object.assign({}, local && local[group] || {}, remote && remote[group] || {});
      return result;
    }, {});
  }

  function normalizeState(state) {
    const repositoryApi = getRepositoryApi();
    return repositoryApi && typeof repositoryApi.normalizeLearnerState === 'function'
      ? repositoryApi.normalizeLearnerState(state)
      : (state && typeof state === 'object' ? state : {});
  }

  function sessionTimestamp(session) {
    return safeIso(session && (session.completedAt || session.updatedAt || session.createdAt)) || '';
  }

  function reportTimestamp(report) {
    return safeIso(report && (report.updatedAt || report.createdAt)) || '';
  }

  function assignmentTimestamp(assignment) {
    return safeIso(assignment && (assignment.updatedAt || assignment.completedAt || assignment.startedAt || assignment.createdAt)) || '';
  }

  function activeQuizTimestamp(quiz) {
    return safeIso(quiz && (quiz.updatedAt || quiz.lastSavedAt || quiz.startedAt)) || '';
  }

  function reviewItemTimestamp(item) {
    return safeIso(item && (item.masteredAt || item.seenAt || item.updatedAt || item.dueAt)) || '';
  }

  function reviewItemId(item) {
    return item && item.id || item && item.questionRef && item.questionRef.id;
  }

  function scheduleTimestamp(schedule) {
    return safeIso(schedule && (schedule.lastReviewedAt || schedule.dueAt)) || '';
  }

  function goalTimestamp(goals) {
    return safeIso(goals && goals.updatedAt) || '';
  }

  function scheduleId(schedule) {
    return schedule && schedule.ref && schedule.ref.id || schedule && schedule.questionRef && schedule.questionRef.id;
  }

  function mergeStrings(left, right) {
    return Array.from(new Set((Array.isArray(left) ? left : []).concat(Array.isArray(right) ? right : []).map(safeString).filter(Boolean)));
  }

  function maxIso(...values) {
    return values.map(safeIso).filter(Boolean).sort(compareIso).pop() || '';
  }

  function currentIso(options = {}) {
    const value = typeof options.now === 'function' ? options.now() : options.now;
    return safeIso(value) || new Date().toISOString();
  }

  function compareIso(left, right) {
    return (Date.parse(left || '') || 0) - (Date.parse(right || '') || 0);
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    CURRENT_SYNC_SCHEMA_VERSION,
    assertMergeableState,
    containsQuestionPayload,
    mergeLearnerStateRecords,
    mergeLearnerStates,
    migrateServerRecord,
    normalizeSyncedLearnerRecord,
    normalizeSyncRecord,
    resolveSyncConflict,
    resolveLearnerStateConflict,
    stripQuestionPayload
  };
});
