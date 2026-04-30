(function (root, factory) {
  'use strict';

  const domain = root.GrammarQuestLearnerProgressTransferDomain ||
    (typeof require === 'function' ? require('./learner-progress-transfer-domain') : null);
  const syncMigrations = root.GrammarQuestLearnerStateServerMigrations ||
    (typeof require === 'function' ? require('./learner-state-server-migrations') : null);
  const lifecycleDomain = root.GrammarQuestLearnerDataLifecycleDomain ||
    (typeof require === 'function' ? require('./learner-data-lifecycle-domain') : null);
  const api = factory(domain, syncMigrations, lifecycleDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearnerProgressTransferService = api;
})(typeof window !== 'undefined' ? window : globalThis, function (domain, syncMigrations, lifecycleDomain) {
  'use strict';

  function exportLearnerProgress(repository, learnerId, options = {}) {
    const source = repository.getLearnerDashboardSource(learnerId);
    const progress = repository.getProgress();
    const envelope = domain.createProgressExportEnvelope({
      learner: { id: learnerId, displayLabel: options.displayLabel || '' },
      includeDisplayLabel: options.includeDisplayLabel === true,
      app: { name: 'Grammar Quest', version: options.appVersion || '', exportedAt: typeof options.now === 'function' ? options.now() : new Date().toISOString() },
      artifactProvenance: options.artifactProvenance || {},
      data: {
        progress: { streakDays: progress.streakDays, totalGems: progress.totalGems, quizzesCompleted: progress.quizzesCompleted, bestScore: progress.bestScore, mastery: progress.mastery },
        sessions: source.sessions,
        activeQuiz: progress.activeQuiz,
        questionReports: source.questionReports,
        assignments: source.assignments,
        reviewQueue: source.reviewQueue,
        reviewSchedules: source.reviewSchedules
      }
    });
    if (options.mode === 'backup') {
      envelope.backup = {
        mode: 'backup',
        createdAt: envelope.app.exportedAt,
        retention: options.retention || 'standard'
      };
      envelope.integrity.digest = domain.digestEnvelope(envelope);
    }
    return envelope;
  }

  function validateProgressExport(envelope) {
    return domain.validateProgressExport(envelope);
  }

  function previewProgressImport(envelope, existingState = {}) {
    const validation = validateProgressExport(envelope);
    const data = envelope && envelope.data || {};
    const existingReports = existingState.reports || {};
    const conflicts = [];
    collectConflicts('session', data.sessions, existingReports.sessions, conflicts);
    collectConflicts('report', data.questionReports, existingReports.questionReports, conflicts);
    collectConflicts('assignment', data.assignments, existingState.assignments, conflicts);
    return {
      valid: validation.valid,
      warnings: validation.errors,
      conflicts,
      counts: {
        sessions: (data.sessions || []).length,
        reports: (data.questionReports || []).length,
        assignments: (data.assignments || []).length,
        reviewItems: data.reviewQueue && Array.isArray(data.reviewQueue.items) ? data.reviewQueue.items.length : 0
      }
    };
  }

  function applyProgressImport(envelope, existingState = {}, options = {}) {
    const validation = validateProgressExport(envelope);
    if (!validation.valid) throw new Error(`invalid_progress_export:${validation.errors.join(',')}`);
    const policy = options.policy || 'skip';
    if (!['skip', 'merge', 'replace'].includes(policy)) throw new Error(`invalid_import_policy:${policy}`);
    const data = envelope.data || {};
    if (policy === 'replace') {
      return { reports: { sessions: data.sessions || [], questionReports: data.questionReports || [] }, assignments: data.assignments || [], reviewQueue: data.reviewQueue || null, reviewSchedules: data.reviewSchedules || [], activeQuiz: data.activeQuiz || null };
    }
    const existingReports = existingState.reports || {};
    return Object.assign({}, existingState, {
      reports: {
        sessions: mergeRecords(existingReports.sessions, data.sessions, policy),
        questionReports: mergeRecords(existingReports.questionReports, data.questionReports, policy)
      },
      assignments: mergeRecords(existingState.assignments, data.assignments, policy),
      reviewQueue: existingState.reviewQueue || data.reviewQueue || null,
      reviewSchedules: mergeRecords(existingState.reviewSchedules, data.reviewSchedules, policy),
      activeQuiz: existingState.activeQuiz || data.activeQuiz || null
    });
  }

  function createSyncRecordFromProgressImport(envelope, options = {}) {
    const validation = validateProgressExport(envelope);
    if (!validation.valid) throw new Error(`invalid_progress_export:${validation.errors.join(',')}`);
    if (!syncMigrations || typeof syncMigrations.createLearnerStateServerRecord !== 'function') {
      throw new Error('learner_state_sync_migrations_unavailable');
    }
    const data = envelope.data || {};
    const state = {
      streakDays: data.progress && data.progress.streakDays,
      totalGems: data.progress && data.progress.totalGems,
      quizzesCompleted: data.progress && data.progress.quizzesCompleted,
      bestScore: data.progress && data.progress.bestScore,
      mastery: data.progress && data.progress.mastery,
      reports: {
        sessions: data.sessions || [],
        questionReports: data.questionReports || []
      },
      assignments: data.assignments || [],
      reviewQueue: data.reviewQueue || null,
      reviewSchedules: data.reviewSchedules || [],
      activeQuiz: data.activeQuiz || null
    };
    return syncMigrations.createLearnerStateServerRecord(options.learnerId || envelope.learner.id, state, {
      revision: options.revision,
      now: options.now,
      source: options.source || 'progress-import'
    });
  }

  function previewBackupRestore(envelope, existingState = {}) {
    const validation = validateProgressExport(envelope);
    const learnerId = envelope && envelope.learner && envelope.learner.id || '';
    const tombstone = newestTombstone(existingState.deletionTombstones, learnerId);
    const restore = lifecycleDomain && lifecycleDomain.canRestoreBackup
      ? lifecycleDomain.canRestoreBackup({
          backupExportedAt: envelope && envelope.app && envelope.app.exportedAt,
          tombstone
        })
      : { allowed: validation.valid, warnings: [] };
    return {
      valid: validation.valid,
      allowed: validation.valid && restore.allowed,
      warnings: validation.errors.concat(restore.warnings || []),
      counts: {
        sessions: envelope && envelope.data && Array.isArray(envelope.data.sessions) ? envelope.data.sessions.length : 0,
        reports: envelope && envelope.data && Array.isArray(envelope.data.questionReports) ? envelope.data.questionReports.length : 0
      }
    };
  }

  function collectConflicts(type, incoming, existing, conflicts) {
    const existingIds = new Set((Array.isArray(existing) ? existing : []).map(item => item && item.id).filter(Boolean));
    (Array.isArray(incoming) ? incoming : []).forEach(item => {
      if (item && existingIds.has(item.id)) conflicts.push({ type, id: item.id });
    });
  }

  function mergeRecords(existing, incoming, policy) {
    const current = Array.isArray(existing) ? existing.slice() : [];
    const byId = new Map(current.map(item => [item && item.id, item]).filter(([id]) => id));
    (Array.isArray(incoming) ? incoming : []).forEach(item => {
      if (!item || !item.id) return;
      if (byId.has(item.id) && policy === 'skip') return;
      byId.set(item.id, item);
    });
    return Array.from(byId.values());
  }

  function newestTombstone(tombstones, learnerId) {
    return (Array.isArray(tombstones) ? tombstones : [])
      .filter(tombstone => !learnerId || tombstone.learnerId === learnerId)
      .sort((a, b) => (Date.parse(b.deletedAt) || 0) - (Date.parse(a.deletedAt) || 0))[0] || null;
  }

  return {
    applyProgressImport,
    createProgressExportEnvelope: domain.createProgressExportEnvelope,
    createSyncRecordFromProgressImport,
    exportLearnerProgress,
    previewBackupRestore,
    previewProgressImport,
    validateProgressExport
  };
});
