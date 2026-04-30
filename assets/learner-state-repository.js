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

  function createLearnerStateRepository(adapter, options = {}) {
    if (!adapter || typeof adapter.read !== 'function' || typeof adapter.write !== 'function') {
      throw new Error('learner_state_repository_requires_adapter');
    }
    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();

    function getProgress() {
      const raw = adapter.read();
      return normalizeLearnerState(raw);
    }

    function saveProgress(progress) {
      const normalized = normalizeLearnerState(Object.assign({}, progress || {}, {
        lastUpdatedAt: progress && progress.lastUpdatedAt || now()
      }));
      adapter.write(normalized);
      return normalized;
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

    function getReviewSchedules() {
      return getProgress().reviewSchedules;
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

    return {
      appendSavedSession,
      archiveAssignment,
      clearActiveQuiz,
      getActiveQuiz,
      getProgress,
      getReviewSchedules,
      getReviewQueue,
      listAssignments,
      markAssignmentCompleted,
      markAssignmentStarted,
      markReviewItemMastered,
      markReviewItemSeen,
      saveActiveQuiz,
      saveProgress,
      saveReviewSchedules,
      saveReviewQueue,
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
      mastery: normalizeMastery(input.mastery),
      lastUpdatedAt: input.lastUpdatedAt || ''
    };
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
    normalizeReviewQueue,
    normalizeReviewSchedules
  };
});
