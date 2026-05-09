(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearnerStateRepository = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const DEFAULT_STORAGE_KEY = 'grammarQuestProgress';
  const assignmentDomain = root.GrammarQuestAssignmentDomain ||
    (typeof require === 'function' ? require('./assignment-domain') : null);
  const reviewDomain = root.GrammarQuestAdaptiveReviewDomain ||
    (typeof require === 'function' ? require('./adaptive-review-domain') : null);
  const spacedRepetitionDomain = root.GrammarQuestSpacedRepetitionDomain ||
    (typeof require === 'function' ? require('./spaced-repetition-domain') : null);
  const questionReportDomain = root.GrammarQuestQuestionReportDomain ||
    (typeof require === 'function' ? require('./question-report-domain') : null);
  const syncDomain = root.GrammarQuestLearnerStateSyncDomain ||
    (typeof require === 'function' ? require('./learner-state-sync-domain') : null);
  const syncMigrations = root.GrammarQuestLearnerStateServerMigrations ||
    (typeof require === 'function' ? require('./learner-state-server-migrations') : null);
  const lifecycleDomain = root.GrammarQuestLearnerDataLifecycleDomain ||
    (typeof require === 'function' ? require('./learner-data-lifecycle-domain') : null);
  const privacyDomain = root.GrammarQuestPrivacyPreferencesDomain ||
    (typeof require === 'function' ? require('./privacy-preferences-domain') : null);
  const goalsDomain = root.GrammarQuestLearnerGoalsDomain ||
    (typeof require === 'function' ? require('./learner-goals-domain') : null);
  const lessonProgressDomain = root.GrammarQuestLessonProgressDomain ||
    (typeof require === 'function' ? require('./lesson-progress-domain') : null);
  const missionProgressDomain = root.GrammarQuestMissionProgressDomain ||
    (typeof require === 'function' ? require('./mission-progress-domain') : null);
  const xpOfflineQueueDomain = root.GrammarQuestXpOfflineQueue ||
    (typeof require === 'function' ? require('./xp-offline-queue') : null);

  function createLearnerStateRepository(adapter, options = {}) {
    if (!adapter || typeof adapter.read !== 'function' || typeof adapter.write !== 'function') {
      throw new Error('learner_state_repository_requires_adapter');
    }
    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
    const syncAdapter = options.syncAdapter || null;
    const learnerId = String(options.learnerId || 'current-learner');
    const syncStatus = {
      enabled: !!syncAdapter,
      pending: false,
      revision: 0,
      lastSyncedAt: '',
      lastError: null
    };

    function getProgress() {
      const raw = adapter.read();
      return normalizeLearnerState(raw);
    }

    function saveProgress(progress) {
      const normalized = normalizeLearnerState(Object.assign({}, progress || {}, {
        lastUpdatedAt: progress && progress.lastUpdatedAt || now()
      }));
      adapter.write(normalized);
      if (syncAdapter) {
        syncStatus.pending = true;
        syncStatus.lastError = null;
      }
      return normalized;
    }

    async function reconcileSync() {
      if (!syncAdapter) return { status: 'disabled', state: getProgress() };
      try {
        const localState = getProgress();
        const remoteRecord = await syncAdapter.readLearnerState(learnerId);
        if (!remoteRecord) return await writeSyncState(localState, 0, 'pushed');
        const remote = migrateSyncRecord(remoteRecord);
        const mergedResult = mergeSyncRecords({
          learnerId,
          revision: syncStatus.revision,
          updatedAt: localState.lastUpdatedAt,
          state: localState
        }, remote, { now });
        const merged = mergedResult.state;
        adapter.write(merged);
        return await writeSyncState(merged, remote.revision, 'merged');
      } catch (error) {
        syncStatus.pending = true;
        syncStatus.lastError = syncError(error);
        return { status: 'failed', error: syncStatus.lastError, state: getProgress() };
      }
    }

    async function flushSync() {
      if (!syncAdapter) return { status: 'disabled', state: getProgress() };
      try {
        const revision = typeof syncAdapter.getRevision === 'function'
          ? await syncAdapter.getRevision(learnerId)
          : syncStatus.revision;
        return await writeSyncState(getProgress(), revision, 'synced');
      } catch (error) {
        syncStatus.pending = true;
        syncStatus.lastError = syncError(error);
        return { status: 'failed', error: syncStatus.lastError, state: getProgress() };
      }
    }

    function getSyncStatus() {
      return Object.assign({}, syncStatus, {
        lastError: syncStatus.lastError ? Object.assign({}, syncStatus.lastError) : null
      });
    }

    async function writeSyncState(state, revision, successStatus) {
      const record = await syncAdapter.writeLearnerState(learnerId, normalizeLearnerState(state), {
        revision,
        source: 'learner-state-repository',
        now: now()
      });
      const normalizedRecord = normalizeSyncRecord(record);
      syncStatus.pending = false;
      syncStatus.revision = normalizedRecord.revision;
      syncStatus.lastSyncedAt = normalizedRecord.updatedAt;
      syncStatus.lastError = null;
      return { status: successStatus, record: normalizedRecord, state: normalizedRecord.state };
    }

    function updateProgress(mutator) {
      const current = getProgress();
      const next = typeof mutator === 'function' ? mutator(current) || current : current;
      return saveProgress(next);
    }

    function getActiveQuiz() {
      return getProgress().activeQuiz;
    }

    function saveActiveQuiz(activeQuiz) {
      return updateProgress(progress => Object.assign(progress, {
        activeQuiz: normalizeActiveQuiz(activeQuiz)
      })).activeQuiz;
    }

    function clearActiveQuiz() {
      updateProgress(progress => Object.assign(progress, { activeQuiz: null }));
    }

    function appendSavedSession(session) {
      return updateProgress(progress => {
        const reports = normalizeReports(progress.reports);
        reports.sessions = [normalizeReportSession(session)].concat(reports.sessions || []).filter(Boolean).slice(0, 250);
        progress.reports = normalizeReports(reports);
        return progress;
      });
    }

    function upsertQuestionReport(report) {
      return updateProgress(progress => {
        const reports = normalizeReports(progress.reports);
        const normalized = normalizeQuestionReport(report);
        reports.questionReports = [normalized]
          .concat((reports.questionReports || []).filter(item => item && item.id !== normalized.id))
          .slice(0, 500);
        progress.reports = normalizeReports(reports);
        return progress;
      });
    }

    function listQuestionReports(filters = {}) {
      const status = String(filters.status || '').trim();
      const learnerId = String(filters.learnerId || '').trim();
      return getProgress().reports.questionReports
        .map(report => normalizeTriageQuestionReport(report))
        .filter(report => !status || report.status === status)
        .filter(report => !learnerId || report.learnerId === learnerId);
    }

    function getQuestionReport(id) {
      const report = listQuestionReports().find(item => item.id === id);
      if (!report) throw new Error(`question_report_not_found:${id}`);
      return report;
    }

    function transitionQuestionReport(id, transition) {
      let updated = null;
      updateProgress(progress => {
        const reports = normalizeReports(progress.reports);
        reports.questionReports = reports.questionReports.map(report => {
          if (!report || report.id !== id) return report;
          updated = applyQuestionReportTransition(report, transition);
          return updated;
        });
        if (!updated) throw new Error(`question_report_not_found:${id}`);
        progress.reports = normalizeReports(reports);
        return progress;
      });
      return normalizeTriageQuestionReport(updated);
    }

    function listAssignments() {
      return getProgress().assignments;
    }

    function upsertAssignment(assignment) {
      return updateProgress(progress => {
        const normalized = normalizeAssignment(assignment);
        progress.assignments = [normalized]
          .concat((progress.assignments || []).filter(item => item && item.id !== normalized.id))
          .slice(0, 500);
        return progress;
      }).assignments[0];
    }

    function markAssignmentStarted(id, startedAt) {
      return updateAssignment(id, assignment => transitionAssignmentStarted(assignment, startedAt));
    }

    function markAssignmentCompleted(id, sessionRef) {
      return updateAssignment(id, assignment => transitionAssignmentCompleted(assignment, sessionRef));
    }

    function archiveAssignment(id) {
      return updateAssignment(id, assignment => transitionAssignmentArchived(assignment));
    }

    function updateAssignment(id, updater) {
      let updated = null;
      updateProgress(progress => {
        progress.assignments = (progress.assignments || []).map(item => {
          if (!item || item.id !== id) return item;
          updated = normalizeAssignment(updater(item));
          return updated;
        });
        if (!updated) throw new Error(`assignment_not_found:${id}`);
        return progress;
      });
      return updated;
    }

    function getReviewQueue() {
      return getProgress().reviewQueue;
    }

    function getPrivacyPreferences() {
      return getProgress().privacyPreferences;
    }

    function getLearnerGoals() {
      return getProgress().learnerGoals;
    }

    function saveLearnerGoals(goals) {
      return updateProgress(progress => {
        progress.learnerGoals = normalizeLearnerGoals(Object.assign({}, goals || {}, {
          updatedAt: goals && goals.updatedAt || now()
        }));
        return progress;
      }).learnerGoals;
    }

    function getLearnerGoalProgress() {
      const progress = getProgress();
      return buildLearnerGoalProgress(progress, now());
    }

    function savePrivacyPreferences(preferences) {
      return updateProgress(progress => {
        progress.privacyPreferences = normalizePrivacyPreferences(Object.assign({}, preferences || {}, {
          updatedAt: preferences && preferences.updatedAt || now()
        }));
        return progress;
      }).privacyPreferences;
    }

    function clearPrivacyPreferences() {
      return updateProgress(progress => {
        progress.privacyPreferences = normalizePrivacyPreferences();
        return progress;
      }).privacyPreferences;
    }

    function getReviewSchedules() {
      return getProgress().reviewSchedules;
    }

    function getLearnerDashboardSource(learnerId) {
      const state = getProgress();
      return buildLearnerDashboardSource(state, learnerId);
    }

    function listLearnerDashboardSources(learnerIds) {
      return normalizeStringArray(learnerIds).map(getLearnerDashboardSource);
    }

    function saveReviewSchedules(schedules) {
      return updateProgress(progress => {
        progress.reviewSchedules = normalizeReviewSchedules(schedules);
        return progress;
      }).reviewSchedules;
    }

    function updateReviewSchedules(outcomes, reviewedAt) {
      return updateProgress(progress => {
        progress.reviewSchedules = applyReviewOutcomes(progress.reviewSchedules, outcomes, reviewedAt || now());
        return progress;
      }).reviewSchedules;
    }

    function saveReviewQueue(queue) {
      return updateProgress(progress => {
        progress.reviewQueue = normalizeReviewQueue(queue);
        return progress;
      }).reviewQueue;
    }

    function listLessonProgress(filters = {}) {
      const status = safeString(filters.status);
      const setId = safeString(filters.setId);
      return getProgress().lessonProgress
        .filter(record => !status || record.status === status)
        .filter(record => !setId || record.lessonRef.setId === setId);
    }

    function getMissionProgress(missionId) {
      const id = safeString(missionId);
      return getProgress().missionProgress.find(record => record.missionId === id) || null;
    }

    function recordMissionStepEvidence(event) {
      let updated = null;
      updateProgress(progress => {
        const records = normalizeMissionProgress(progress.missionProgress);
        const missionId = safeString(event && event.missionId);
        const existing = records.find(record => record.missionId === missionId) || null;
        updated = missionProgressDomain.recordMissionStepEvidence(existing, event, { now });
        progress.missionProgress = missionProgressDomain.mergeMissionProgressList([updated], records);
        return progress;
      });
      return updated;
    }

    function recordLessonProgressEvent(event) {
      let updated = null;
      updateProgress(progress => {
        const existing = normalizeLessonProgress(progress.lessonProgress);
        const input = event && typeof event === 'object' ? event : {};
        const setId = safeString(input.setId || input.lessonRef && input.lessonRef.setId);
        const grade = Math.round(Number(input.grade || input.lessonRef && input.lessonRef.grade) || 0);
        const current = existing.find(record => record.lessonRef.setId === setId && (!grade || record.lessonRef.grade === grade)) || null;
        updated = lessonProgressDomain.applyLessonProgressEvent(current, input, { now });
        progress.lessonProgress = lessonProgressDomain.mergeLessonProgressRecords([updated].concat(existing));
        return progress;
      });
      return updated;
    }

    function markReviewItemSeen(questionId, seenAt) {
      return updateReviewQueue(queue => transitionReviewItem(queue, questionId, 'seen', seenAt));
    }

    function markReviewItemMastered(questionId, masteredAt) {
      return updateReviewQueue(queue => transitionReviewItem(queue, questionId, 'mastered', masteredAt));
    }

    function updateReviewQueue(updater) {
      return updateProgress(progress => {
        progress.reviewQueue = normalizeReviewQueue(updater(progress.reviewQueue));
        return progress;
      }).reviewQueue;
    }

    function requestLearnerDataDeletion(input) {
      const request = lifecycleDomain.createLearnerDataDeletionRequest(input, {
        now,
        id: () => `delete_${now().replace(/[^0-9]/g, '')}`
      });
      updateProgress(progress => {
        progress.deletionRequests = [request].concat(progress.deletionRequests || []);
        return progress;
      });
      return request;
    }

    function approveLearnerDataDeletion(deletionRequestId, actor) {
      let approved = null;
      updateProgress(progress => {
        progress.deletionRequests = (progress.deletionRequests || []).map(request => {
          if (request.deletionRequestId !== deletionRequestId) return request;
          approved = lifecycleDomain.approveLearnerDataDeletion(request, actor, { now });
          return approved;
        });
        if (!approved) throw new Error(`learner_data_deletion_request_not_found:${deletionRequestId}`);
        return progress;
      });
      return approved;
    }

    function deleteLearnerState(deletionRequestId) {
      const state = getProgress();
      const request = (state.deletionRequests || []).find(item => item.deletionRequestId === deletionRequestId);
      if (!request) throw new Error(`learner_data_deletion_request_not_found:${deletionRequestId}`);
      const completed = lifecycleDomain.completeLearnerDataDeletion(request, { now });
      const next = normalizeLearnerState({
        deletionRequests: [completed].concat((state.deletionRequests || []).filter(item => item.deletionRequestId !== deletionRequestId)),
        deletionTombstones: [completed.tombstone].concat(state.deletionTombstones || []),
        lastUpdatedAt: now()
      });
      adapter.write(next);
      return completed;
    }

    function writeDeletionTombstone(tombstone) {
      const normalized = lifecycleDomain.createDeletionTombstone(tombstone, { now });
      updateProgress(progress => {
        progress.deletionTombstones = [normalized].concat(progress.deletionTombstones || []);
        return progress;
      });
      return normalized;
    }

    function listDeletionRequests() {
      return getProgress().deletionRequests;
    }

    function restoreLearnerStateFromBackup(envelope, options = {}) {
      const backupExportedAt = envelope && envelope.app && envelope.app.exportedAt || envelope && envelope.backup && envelope.backup.createdAt;
      const tombstone = newestTombstone(getProgress().deletionTombstones, options.learnerId || envelope && envelope.learner && envelope.learner.id || 'learner-1');
      const restore = lifecycleDomain.canRestoreBackup({ backupExportedAt, tombstone });
      const result = Object.assign({ valid: true }, restore);
      if (!result.allowed || options.preview === true) return result;
      if (options.confirm !== true) throw new Error('learner_data_restore_requires_confirmation');
      const data = envelope && envelope.data || {};
      const progress = Object.assign({}, data.progress || {}, {
        reports: { sessions: data.sessions || [], questionReports: data.questionReports || [] },
        assignments: data.assignments || [],
        reviewQueue: data.reviewQueue || null,
        reviewSchedules: data.reviewSchedules || [],
        lessonProgress: data.lessonProgress || data.progress && data.progress.lessonProgress,
        missionProgress: data.missionProgress || data.progress && data.progress.missionProgress,
        learnerGoals: data.learnerGoals || data.goals || data.progress && data.progress.learnerGoals,
        activeQuiz: data.activeQuiz || null,
        deletionTombstones: getProgress().deletionTombstones,
        deletionRequests: getProgress().deletionRequests
      });
      saveProgress(progress);
      return result;
    }

    return {
      appendSavedSession,
      archiveAssignment,
      clearActiveQuiz,
      clearPrivacyPreferences,
      flushSync,
      getActiveQuiz,
      getLearnerGoals,
      getLearnerGoalProgress,
      getPrivacyPreferences,
      getProgress,
      getLearnerDashboardSource,
      getMissionProgress,
      listLessonProgress,
      getQuestionReport,
      getReviewSchedules,
      getReviewQueue,
      getSyncStatus,
      listLearnerDashboardSources,
      listAssignments,
      listQuestionReports,
      markAssignmentCompleted,
      markAssignmentStarted,
      markReviewItemMastered,
      markReviewItemSeen,
      recordMissionStepEvidence,
      recordLessonProgressEvent,
      requestLearnerDataDeletion,
      approveLearnerDataDeletion,
      deleteLearnerState,
      writeDeletionTombstone,
      listDeletionRequests,
      restoreLearnerStateFromBackup,
      reconcileSync,
      saveActiveQuiz,
      saveLearnerGoals,
      savePrivacyPreferences,
      saveProgress,
      saveReviewSchedules,
      saveReviewQueue,
      transitionQuestionReport,
      updateReviewSchedules,
      updateProgress,
      upsertAssignment,
      upsertQuestionReport
    };
  }

  function createLocalStorageLearnerStateAdapter(storage, options = {}) {
    const key = options.storageKey || DEFAULT_STORAGE_KEY;
    const corruptBackupKey = options.corruptBackupKey || `${key}.corrupt`;
    return {
      read() {
        if (!storage || typeof storage.getItem !== 'function') return null;
        const value = storage.getItem(key);
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch (error) {
          try {
            if (typeof storage.setItem === 'function') storage.setItem(corruptBackupKey, value);
          } catch (backupError) {}
          return null;
        }
      },
      write(progress) {
        try {
          storage.setItem(key, JSON.stringify(normalizeLearnerState(progress)));
        } catch (error) {
          throw new Error(`learner_state_write_failed: ${error && error.message || 'unknown'}`);
        }
      },
      remove() {
        if (storage && typeof storage.removeItem === 'function') storage.removeItem(key);
      }
    };
  }

  function createIndexedDbLearnerStateAdapter(options = {}) {
    const indexedDB = options.indexedDB || root.indexedDB;
    const databaseName = options.databaseName || 'GrammarQuestLearnerState';
    const databaseVersion = Number(options.databaseVersion) || 1;
    const storeName = options.storeName || 'progress';
    const key = options.storageKey || DEFAULT_STORAGE_KEY;

    async function openDatabase() {
      if (!indexedDB || typeof indexedDB.open !== 'function') {
        throw new Error('learner_state_indexeddb_unavailable');
      }
      const request = indexedDB.open(databaseName, databaseVersion);
      request.onupgradeneeded = event => {
        const db = event && event.target && event.target.result || request.result;
        if (db && db.objectStoreNames && typeof db.objectStoreNames.contains === 'function') {
          if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
        } else if (db && typeof db.createObjectStore === 'function') {
          db.createObjectStore(storeName);
        }
      };
      try {
        return await requestToPromise(request);
      } catch (error) {
        throw new Error(`learner_state_indexeddb_open_failed: ${error && error.message || 'unknown'}`);
      }
    }

    async function withStore(mode, operation) {
      const db = await openDatabase();
      try {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        return await operation(store);
      } finally {
        if (db && typeof db.close === 'function') db.close();
      }
    }

    return {
      async: true,
      read() {
        return withStore('readonly', async store => {
          try {
            const value = await requestToPromise(store.get(key));
            return value || null;
          } catch (error) {
            throw new Error(`learner_state_indexeddb_read_failed: ${error && error.message || 'unknown'}`);
          }
        });
      },
      write(progress) {
        const normalized = normalizeLearnerState(progress);
        return withStore('readwrite', async store => {
          try {
            await requestToPromise(store.put(normalized, key));
          } catch (error) {
            throw new Error(`learner_state_indexeddb_write_failed: ${error && error.message || 'unknown'}`);
          }
        });
      },
      remove() {
        return withStore('readwrite', async store => {
          try {
            await requestToPromise(store.delete(key));
          } catch (error) {
            throw new Error(`learner_state_indexeddb_remove_failed: ${error && error.message || 'unknown'}`);
          }
        });
      }
    };
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = event => resolve(event && event.target ? event.target.result : request.result);
      request.onerror = event => {
        const target = event && event.target || request;
        reject(target && target.error || new Error('indexeddb_request_failed'));
      };
    });
  }

  function normalizeSyncRecord(record) {
    if (syncDomain && typeof syncDomain.normalizeSyncRecord === 'function') return syncDomain.normalizeSyncRecord(record);
    return {
      schemaVersion: 1,
      learnerId: String(record && record.learnerId || ''),
      revision: Math.max(0, Number(record && record.revision) || 0),
      updatedAt: record && record.updatedAt || '',
      source: record && record.source || '',
      state: normalizeLearnerState(record && record.state)
    };
  }

  function migrateSyncRecord(record) {
    if (syncMigrations && typeof syncMigrations.migrateLearnerStateServerRecord === 'function') {
      return syncMigrations.migrateLearnerStateServerRecord(record);
    }
    return normalizeSyncRecord(record);
  }

  function mergeSyncRecords(localRecord, remoteRecord, options = {}) {
    if (syncDomain && typeof syncDomain.mergeLearnerStateRecords === 'function') {
      return syncDomain.mergeLearnerStateRecords(localRecord, remoteRecord, options);
    }
    return { state: mergeSyncStates(localRecord.state, remoteRecord.state), conflicts: [], warnings: [] };
  }

  function mergeSyncStates(localState, remoteState) {
    if (syncDomain && typeof syncDomain.mergeLearnerStates === 'function') return syncDomain.mergeLearnerStates(localState, remoteState);
    return normalizeLearnerState(Object.assign({}, localState || {}, remoteState || {}));
  }

  function syncError(error) {
    return {
      code: String(error && error.code || 'sync_failed'),
      message: String(error && error.message || 'learner_state_sync_failed'),
      retryable: error && error.retryable === true
    };
  }

  function normalizeLearnerState(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    return {
      schemaVersion: 2,
      streakDays: Math.max(0, Number(input.streakDays) || 0),
      totalGems: Math.max(0, Number(input.totalGems) || 0),
      quizzesCompleted: Math.max(0, Number(input.quizzesCompleted) || 0),
      bestScore: Math.max(0, Number(input.bestScore) || 0),
      lastPracticeDate: input.lastPracticeDate || '',
      badges: Array.isArray(input.badges) ? input.badges : [],
      reports: normalizeReports(input.reports),
      activeQuiz: normalizeActiveQuiz(input.activeQuiz),
      assignments: normalizeAssignments(input.assignments),
      reviewQueue: normalizeReviewQueue(input.reviewQueue),
      reviewSchedules: normalizeReviewSchedules(input.reviewSchedules),
      lessonProgress: normalizeLessonProgress(input.lessonProgress),
      missionProgress: normalizeMissionProgress(input.missionProgress),
      xp: normalizeXpState(input.xp),
      mastery: normalizeMastery(input.mastery),
      entitlementProjection: normalizeEntitlementProjection(input.entitlementProjection),
      deletionRequests: normalizeDeletionRequests(input.deletionRequests),
      deletionTombstones: normalizeDeletionTombstones(input.deletionTombstones),
      privacyPreferences: normalizePrivacyPreferences(input.privacyPreferences),
      learnerGoals: normalizeLearnerGoals(input.learnerGoals || input.goals),
      lastUpdatedAt: input.lastUpdatedAt || ''
    };
  }

  function normalizeLearnerGoals(goals) {
    if (goalsDomain && typeof goalsDomain.normalizeLearnerGoals === 'function') {
      return goalsDomain.normalizeLearnerGoals(goals);
    }
    return {
      schemaVersion: 1,
      enabled: true,
      dailyQuestionTarget: 10,
      weeklySessionTarget: 4,
      reviewStreakTargetDays: 3,
      assignmentCompletionTargetPercent: 75,
      activeDays: [1, 2, 3, 4, 5],
      updatedAt: '',
      updatedBy: ''
    };
  }

  function buildLearnerGoalProgress(state, timestamp) {
    if (goalsDomain && typeof goalsDomain.buildLearnerGoalProgress === 'function') {
      return goalsDomain.buildLearnerGoalProgress({
        now: timestamp,
        goals: state.learnerGoals,
        sessions: state.reports.sessions,
        assignments: state.assignments,
        reviewQueue: state.reviewQueue,
        reviewSchedules: state.reviewSchedules
      });
    }
    return { schemaVersion: 1, goals: normalizeLearnerGoals(state && state.learnerGoals) };
  }

  function normalizePrivacyPreferences(preferences) {
    if (privacyDomain && typeof privacyDomain.normalizePrivacyPreferences === 'function') {
      return privacyDomain.normalizePrivacyPreferences(preferences);
    }
    return {
      schemaVersion: 1,
      telemetryEnabled: false,
      errorTelemetryEnabled: false,
      performanceTelemetryEnabled: false,
      experimentParticipationEnabled: false,
      updatedAt: '',
      updatedBy: '',
      policyVersion: 1
    };
  }

  function normalizeEntitlementProjection(projection) {
    const input = projection && typeof projection === 'object' ? projection : {};
    const accessState = ['free', 'trial', 'premium', 'expired', 'managed'].includes(input.accessState)
      ? input.accessState
      : 'free';
    return {
      schemaVersion: 1,
      accessState,
      featureEntitlements: normalizeStringArray(input.featureEntitlements),
      source: safeString(input.source || 'static_default'),
      evaluatedAt: safeIso(input.evaluatedAt) || '',
      expiresAt: safeIso(input.expiresAt) || '',
      billingOwnerRef: safeString(input.billingOwnerRef)
    };
  }

  function normalizeDeletionRequests(requests) {
    return (Array.isArray(requests) ? requests : [])
      .map(request => lifecycleDomain && lifecycleDomain.normalizeDeletionRequest ? lifecycleDomain.normalizeDeletionRequest(request) : request)
      .filter(request => request && request.deletionRequestId);
  }

  function normalizeDeletionTombstones(tombstones) {
    return (Array.isArray(tombstones) ? tombstones : [])
      .map(tombstone => lifecycleDomain && lifecycleDomain.createDeletionTombstone ? lifecycleDomain.createDeletionTombstone(tombstone) : tombstone)
      .filter(tombstone => tombstone && tombstone.learnerId && tombstone.deletedAt);
  }

  function newestTombstone(tombstones, learnerId) {
    return normalizeDeletionTombstones(tombstones)
      .filter(tombstone => !learnerId || tombstone.learnerId === learnerId)
      .sort((a, b) => (Date.parse(b.deletedAt) || 0) - (Date.parse(a.deletedAt) || 0))[0] || null;
  }

  function buildLearnerDashboardSource(state, learnerId) {
    const normalized = normalizeLearnerState(state);
    const id = String(learnerId || 'current-learner');
    const sessions = normalized.reports.sessions
      .filter(session => belongsToLearner(session, id))
      .map(sanitizeSessionForDashboard);
    const questionReports = normalized.reports.questionReports
      .filter(report => belongsToLearner(report, id))
      .map(sanitizeQuestionReportForDashboard);
    const assignments = normalized.assignments
      .filter(assignment => assignmentBelongsToLearner(assignment, id))
      .map(sanitizeAssignmentForDashboard);
    return {
      learner: { id },
      sessions,
      assignments,
      reviewQueue: normalized.reviewQueue,
      reviewSchedules: normalized.reviewSchedules,
      goals: normalized.learnerGoals,
      goalProgress: buildLearnerGoalProgress(normalized, new Date().toISOString()),
      questionReports,
      lessonProgress: normalized.lessonProgress.map(sanitizeLessonProgressForDashboard),
      missionProgress: normalized.missionProgress,
      mastery: normalized.mastery
    };
  }

  function belongsToLearner(record, learnerId) {
    const owner = record && (record.learnerId || record.studentId || record.ownerLearnerId);
    return !owner || owner === learnerId;
  }

  function assignmentBelongsToLearner(assignment, learnerId) {
    const assignedTo = assignment && assignment.assignedTo || {};
    const learnerIds = normalizeStringArray(assignedTo.learnerIds);
    return !learnerIds.length || learnerIds.includes(learnerId);
  }

  function sanitizeSessionForDashboard(session) {
    return {
      id: String(session.id || ''),
      learnerId: String(session.learnerId || session.studentId || ''),
      title: String(session.title || ''),
      topic: String(session.topic || ''),
      mode: String(session.mode || session.quizMode || ''),
      quizMode: String(session.quizMode || session.mode || ''),
      score: Number(session.score) || 0,
      total: Number(session.total) || 0,
      percentage: Number(session.percentage) || 0,
      durationSeconds: Number(session.durationSeconds) || 0,
      completedAt: String(session.completedAt || ''),
      attempts: (Array.isArray(session.attempts) ? session.attempts : []).map(attempt => ({
        questionId: String(attempt.questionId || attempt.id || ''),
        questionVersion: Number(attempt.questionVersion) || 0,
        questionHash: String(attempt.questionHash || attempt.contentHash || ''),
        correct: attempt.correct === true,
        grade: String(attempt.grade || ''),
        difficulty: String(attempt.difficulty || ''),
        subtopicId: String(attempt.subtopicId || attempt.sourceSet || ''),
        subtopicTitle: String(attempt.subtopicTitle || ''),
        skillIds: normalizeStringArray(attempt.skillIds),
        standardIds: normalizeStringArray(attempt.standardIds)
      }))
    };
  }

  function sanitizeQuestionReportForDashboard(report) {
    return {
      id: String(report.id || ''),
      learnerId: String(report.learnerId || report.studentId || report.ownerLearnerId || ''),
      questionId: String(report.questionId || ''),
      questionVersion: Number(report.questionVersion) || 0,
      questionHash: String(report.questionHash || report.contentHash || ''),
      status: String(report.status || 'open'),
      category: String(report.category || 'other'),
      createdAt: String(report.createdAt || ''),
      updatedAt: String(report.updatedAt || '')
    };
  }

  function sanitizeAssignmentForDashboard(assignment) {
    return {
      id: String(assignment.id || ''),
      title: String(assignment.title || ''),
      status: String(assignment.status || 'active'),
      assignedTo: assignment.assignedTo || {},
      scope: assignment.scope || {},
      dueAt: String(assignment.dueAt || '')
    };
  }

  function sanitizeLessonProgressForDashboard(record) {
    const normalized = lessonProgressDomain.normalizeLessonProgressRecord(record);
    if (!normalized) return null;
    return {
      setId: normalized.lessonRef.setId,
      grade: normalized.lessonRef.grade,
      status: normalized.status,
      completedAt: normalized.completedAt,
      updatedAt: normalized.updatedAt,
      source: normalized.source
    };
  }

  function normalizeLessonProgress(records) {
    return lessonProgressDomain.mergeLessonProgressRecords(records);
  }

  function normalizeMissionProgress(records) {
    return missionProgressDomain && typeof missionProgressDomain.normalizeMissionProgressList === 'function'
      ? missionProgressDomain.normalizeMissionProgressList(records)
      : [];
  }

  function normalizeXpState(xp) {
    const input = xp && typeof xp === 'object' ? xp : {};
    return {
      schemaVersion: 1,
      projectionRef: safeProjectionRef(input.projectionRef),
      projectionUpdatedAt: safeIso(input.projectionUpdatedAt) || '',
      offlineQueue: xpOfflineQueueDomain && typeof xpOfflineQueueDomain.normalizeXpOfflineQueue === 'function'
        ? xpOfflineQueueDomain.normalizeXpOfflineQueue(input.offlineQueue)
        : []
    };
  }

  function safeProjectionRef(value) {
    const ref = safeString(value);
    return /^xpProjections\/[A-Za-z0-9_-]+$/.test(ref) ? ref : '';
  }

  function normalizeAssignments(assignments) {
    return (Array.isArray(assignments) ? assignments : []).map(normalizeAssignment).filter(item => item.id);
  }

  function normalizeAssignment(assignment) {
    return assignmentDomain && typeof assignmentDomain.normalizeAssignment === 'function'
      ? assignmentDomain.normalizeAssignment(assignment)
      : assignment;
  }

  function normalizeReviewQueue(queue) {
    return reviewDomain && typeof reviewDomain.normalizeReviewQueue === 'function'
      ? reviewDomain.normalizeReviewQueue(queue)
      : {
          queueId: queue && queue.queueId || '',
          generatedAt: queue && queue.generatedAt || '',
          updatedAt: queue && queue.updatedAt || '',
          items: (Array.isArray(queue && queue.items) ? queue.items : []).map(normalizeReviewItemFallback).filter(item => item.questionRef.id)
        };
  }

  function normalizeReviewSchedules(schedules) {
    if (spacedRepetitionDomain && typeof spacedRepetitionDomain.normalizeSchedules === 'function') {
      return spacedRepetitionDomain.normalizeSchedules(schedules);
    }
    return (Array.isArray(schedules) ? schedules : []).map(normalizeScheduleFallback).filter(schedule => schedule.ref.id);
  }

  function normalizeScheduleFallback(schedule) {
    const input = schedule && typeof schedule === 'object' ? schedule : {};
    const ref = input.ref || input.questionRef || {};
    return {
      ref: {
        id: String(ref.id || ref.questionId || ''),
        sourceSet: String(ref.sourceSet || ref.setId || ''),
        version: Number(ref.version || ref.questionVersion) || 0,
        contentHash: String(ref.contentHash || ref.questionHash || ''),
        sequence: Number(ref.sequence) || 0
      },
      skillIds: normalizeStringArray(input.skillIds),
      intervalDays: Math.max(1, Math.round(Number(input.intervalDays) || 1)),
      ease: Math.max(1.6, Number(input.ease) || 2),
      dueAt: safeIso(input.dueAt) || '',
      lastReviewedAt: safeIso(input.lastReviewedAt) || '',
      streak: Math.max(0, Math.round(Number(input.streak) || 0)),
      lapses: Math.max(0, Math.round(Number(input.lapses) || 0))
    };
  }

  function applyReviewOutcomes(existingSchedules, outcomes, reviewedAt) {
    if (spacedRepetitionDomain && typeof spacedRepetitionDomain.applyReviewOutcomes === 'function') {
      return spacedRepetitionDomain.applyReviewOutcomes(existingSchedules, outcomes, { now: reviewedAt });
    }
    const now = safeIso(reviewedAt) || new Date().toISOString();
    const byId = {};
    normalizeReviewSchedules(existingSchedules).forEach(schedule => {
      byId[schedule.ref.id] = schedule;
    });
    (Array.isArray(outcomes) ? outcomes : []).forEach(outcome => {
      const ref = normalizeScheduleQuestionRef(outcome && (outcome.questionRef || outcome.ref || outcome));
      if (!ref.id) return;
      const previous = byId[ref.id] || {};
      const correct = outcome && outcome.correct === true;
      const intervalDays = correct
        ? previous.intervalDays ? Math.max(previous.intervalDays + 1, Math.ceil(previous.intervalDays * (previous.ease || 2.4))) : 2
        : 1;
      byId[ref.id] = normalizeScheduleFallback({
        ref,
        skillIds: outcome && outcome.skillIds || previous.skillIds,
        intervalDays,
        ease: correct ? previous.ease || 2.4 : Math.max(1.6, (previous.ease || 2) - 0.25),
        dueAt: addDays(now, intervalDays),
        lastReviewedAt: now,
        streak: correct ? (previous.streak || 0) + 1 : 0,
        lapses: correct ? previous.lapses || 0 : (previous.lapses || 0) + 1
      });
    });
    return normalizeReviewSchedules(Object.keys(byId).map(id => byId[id]));
  }

  function normalizeScheduleQuestionRef(ref) {
    const input = ref && typeof ref === 'object' ? ref : {};
    return {
      id: String(input.id || input.questionId || ''),
      sourceSet: String(input.sourceSet || input.setId || ''),
      version: Number(input.version || input.questionVersion) || 0,
      contentHash: String(input.contentHash || input.questionHash || ''),
      sequence: Number(input.sequence) || 0
    };
  }

  function addDays(iso, days) {
    const date = new Date(iso);
    date.setTime(date.getTime() + Math.max(1, Number(days) || 1) * 24 * 60 * 60 * 1000);
    return date.toISOString();
  }

  function normalizeReviewItemFallback(item) {
    const input = item && typeof item === 'object' ? item : {};
    const ref = input.questionRef || {};
    return {
      id: input.id || `review-${ref.id || ''}`,
      questionRef: {
        id: String(ref.id || ''),
        sourceSet: String(ref.sourceSet || ''),
        version: Number(ref.version) || 0,
        contentHash: String(ref.contentHash || ''),
        sequence: Number(ref.sequence) || 0
      },
      setId: input.setId || ref.sourceSet || '',
      skillIds: normalizeStringArray(input.skillIds),
      reason: input.reason || 'missed_recently',
      priority: Number(input.priority) || 0,
      dueAt: input.dueAt || '',
      status: input.status || 'queued',
      seenAt: input.seenAt || '',
      masteredAt: input.masteredAt || ''
    };
  }

  function transitionReviewItem(queue, questionId, status, timestamp) {
    if (reviewDomain && status === 'seen' && typeof reviewDomain.markReviewItemSeen === 'function') {
      return reviewDomain.markReviewItemSeen(queue, questionId, timestamp);
    }
    if (reviewDomain && status === 'mastered' && typeof reviewDomain.markReviewItemMastered === 'function') {
      return reviewDomain.markReviewItemMastered(queue, questionId, timestamp);
    }
    const normalized = normalizeReviewQueue(queue);
    const field = status === 'mastered' ? 'masteredAt' : 'seenAt';
    normalized.items = normalized.items.map(item => {
      if (!item || !item.questionRef || item.questionRef.id !== questionId) return item;
      return Object.assign({}, item, {
        status,
        [field]: timestamp || new Date().toISOString()
      });
    });
    normalized.updatedAt = timestamp || new Date().toISOString();
    return normalized;
  }

  function transitionAssignmentStarted(assignment, startedAt) {
    if (assignmentDomain && typeof assignmentDomain.markAssignmentStarted === 'function') {
      return assignmentDomain.markAssignmentStarted(assignment, startedAt);
    }
    const timestamp = startedAt || new Date().toISOString();
    return Object.assign({}, assignment, {
      status: 'in_progress',
      startedAt: timestamp,
      updatedAt: timestamp
    });
  }

  function transitionAssignmentCompleted(assignment, sessionRef) {
    if (assignmentDomain && typeof assignmentDomain.markAssignmentCompleted === 'function') {
      return assignmentDomain.markAssignmentCompleted(assignment, sessionRef);
    }
    const completedAt = sessionRef && (sessionRef.completedAt || sessionRef.completedAtIso) || new Date().toISOString();
    return Object.assign({}, assignment, {
      status: 'completed',
      completedAt,
      completedSessionId: sessionRef && (sessionRef.sessionId || sessionRef.id) || '',
      updatedAt: completedAt
    });
  }

  function transitionAssignmentArchived(assignment) {
    if (assignmentDomain && typeof assignmentDomain.archiveAssignment === 'function') {
      return assignmentDomain.archiveAssignment(assignment);
    }
    return Object.assign({}, assignment, {
      status: 'archived',
      updatedAt: new Date().toISOString()
    });
  }

  function normalizeMastery(mastery) {
    const input = mastery && typeof mastery === 'object' ? mastery : {};
    return {
      domains: normalizeMasteryGroup(input.domains),
      skills: normalizeMasteryGroup(input.skills),
      cognitiveDemand: normalizeMasteryGroup(input.cognitiveDemand),
      difficulty: normalizeMasteryGroup(input.difficulty),
      subtopics: normalizeMasteryGroup(input.subtopics),
      standards: normalizeMasteryGroup(input.standards)
    };
  }

  function normalizeMasteryGroup(group) {
    const normalized = {};
    Object.keys(group || {}).forEach(key => {
      const item = group[key] || {};
      normalized[key] = {
        label: item.label || key,
        correct: Number(item.correct) || 0,
        total: Number(item.total) || 0,
        lastPracticed: item.lastPracticed || '',
        level: item.level || '',
        questionRefs: normalizeStringArray(item.questionRefs)
      };
    });
    return normalized;
  }

  function normalizeReports(reports) {
    const input = reports && typeof reports === 'object' ? reports : {};
    return {
      sessions: (Array.isArray(input.sessions) ? input.sessions : []).map(normalizeReportSession).filter(Boolean),
      questionReports: (Array.isArray(input.questionReports) ? input.questionReports : []).map(normalizeQuestionReport).filter(Boolean)
    };
  }

  function normalizeReportSession(session) {
    if (!session || typeof session !== 'object') return null;
    return Object.assign({}, session, {
      attempts: (Array.isArray(session.attempts) ? session.attempts : []).map(normalizeAttemptRecord)
    });
  }

  function normalizeAttemptRecord(attempt) {
    if (!attempt || typeof attempt !== 'object') return attempt;
    return Object.assign({}, attempt, {
      questionId: attempt.questionId || attempt.id || '',
      questionVersion: Number(attempt.questionVersion) || 0,
      questionHash: attempt.questionHash || attempt.contentHash || '',
      skillIds: normalizeStringArray(attempt.skillIds),
      standardIds: normalizeStringArray(attempt.standardIds)
    });
  }

  function normalizeQuestionReport(report) {
    if (!report || typeof report !== 'object') return null;
    return Object.assign({}, report, {
      questionId: getReportQuestionId(report),
      questionVersion: Number(report.questionVersion) || 0,
      questionHash: report.questionHash || report.contentHash || ''
    });
  }

  function normalizeTriageQuestionReport(report) {
    return questionReportDomain && typeof questionReportDomain.normalizeQuestionReport === 'function'
      ? questionReportDomain.normalizeQuestionReport(report)
      : normalizeQuestionReport(report);
  }

  function applyQuestionReportTransition(report, transition = {}) {
    if (!questionReportDomain) return report;
    const options = Object.assign({}, transition, { now: transition.now || new Date().toISOString() });
    if (transition.type === 'assign') return questionReportDomain.assignQuestionReport(report, options);
    if (transition.type === 'resolve') return questionReportDomain.resolveQuestionReport(report, options);
    if (transition.type === 'duplicate') return questionReportDomain.markDuplicateQuestionReport(report, options);
    if (transition.type === 'defer') return questionReportDomain.deferQuestionReport(report, options);
    if (transition.type === 'reopen') return questionReportDomain.reopenQuestionReport(report, options);
    throw new Error(`unknown_question_report_transition:${transition.type || ''}`);
  }

  function getReportQuestionId(report) {
    if (report.questionId) return String(report.questionId);
    if (looksLikeStableQuestionId(report.id)) return String(report.id);
    if (report.sourceSet && report.sequence) return `${report.sourceSet}-q${String(report.sequence).padStart(4, '0')}`;
    if (report.setId && report.sequence) return `${report.setId}-q${String(report.sequence).padStart(4, '0')}`;
    return '';
  }

  function normalizeActiveQuiz(activeQuiz) {
    if (!activeQuiz || activeQuiz.completed) return null;
    const questions = Array.isArray(activeQuiz.questions) ? activeQuiz.questions : [];
    const questionSnapshots = Array.isArray(activeQuiz.questionSnapshots) ? activeQuiz.questionSnapshots : questions;
    const questionRefs = Array.isArray(activeQuiz.questionRefs) ? activeQuiz.questionRefs : questionSnapshots.map(question => ({
      id: question && question.id || '',
      version: Number(question && question.version) || 0,
      contentHash: question && question.contentHash || '',
      sourceSet: question && question.metadata && question.metadata.sourceSet || '',
      sequence: question && question.metadata && question.metadata.sequence || 0
    }));
    if (!questionRefs.length && !questionSnapshots.length) return null;
    const normalized = Object.assign({}, activeQuiz, {
      schemaVersion: Number(activeQuiz.schemaVersion) || (questions.length ? 1 : 2),
      questionRefs,
      questionSnapshots,
      attempts: (Array.isArray(activeQuiz.attempts) ? activeQuiz.attempts : []).map(normalizeAttemptRecord),
      currentIndex: Math.max(0, Number(activeQuiz.currentIndex) || 0),
      score: Math.max(0, Number(activeQuiz.score) || 0),
      hintsUsed: Math.max(0, Number(activeQuiz.hintsUsed) || 0),
      lastSavedAt: activeQuiz.lastSavedAt || activeQuiz.startedAt || ''
    });
    if (questions.length) normalized.questions = questions;
    else delete normalized.questions;
    return normalized;
  }

  function looksLikeStableQuestionId(id) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*-q\d{4}$/i.test(String(id || ''));
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : [])
      .map(value => String(value || '').trim())
      .filter(Boolean);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  return {
    createIndexedDbLearnerStateAdapter,
    createLearnerStateRepository,
    createLocalStorageLearnerStateAdapter,
    normalizeLearnerState,
    normalizeReports,
    normalizeActiveQuiz,
    normalizeQuestionReport,
    normalizeLearnerGoals,
    buildLearnerGoalProgress,
    buildLearnerDashboardSource,
    normalizeReviewQueue,
    normalizeReviewSchedules
  };
});
