(function (root, factory) {
  'use strict';

  const syncDomain = root.GrammarQuestLearnerStateSyncDomain ||
    (typeof require === 'function' ? require('./learner-state-sync-domain') : null);
  const api = factory(syncDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestNativeLearnerSyncAcceptance = api;
})(typeof window !== 'undefined' ? window : globalThis, function (syncDomain) {
  'use strict';

  const NATIVE_SYNC_CLIENT_SCHEMA_VERSION = 1;

  function buildNativeLearnerSyncFixtures(options = {}) {
    const now = safeIso(options.now) || '2030-04-29T12:00:00.000Z';
    const learnerId = 'learner-native-1';
    const webCurrent = {
      schemaVersion: syncDomain.CURRENT_SYNC_SCHEMA_VERSION,
      nativeClientSchemaVersion: NATIVE_SYNC_CLIENT_SCHEMA_VERSION,
      learnerId,
      revision: 5,
      updatedAt: now,
      source: 'web',
      state: {
        activeQuiz: {
          id: 'active-web-quiz',
          startedAt: addMinutes(now, -10),
          updatedAt: addMinutes(now, -5),
          questionRefs: [questionRef('grammar-sentence-types-q0001', 1)]
        },
        assignments: [{
          id: 'assignment-native-1',
          status: 'in_progress',
          updatedAt: addMinutes(now, -5),
          scope: { setIds: ['grammar-sentence-types'] },
          quizOptions: { count: 3 }
        }],
        reviewSchedules: [{
          ref: questionRef('grammar-sentence-types-q0001', 1),
          skillIds: ['grammar.sentence_types'],
          intervalDays: 2,
          dueAt: addMinutes(now, 60),
          lastReviewedAt: addMinutes(now, -10)
        }],
        learnerGoals: {
          dailyQuestionTarget: 8,
          weeklySessionTarget: 3,
          updatedAt: addMinutes(now, -5)
        },
        privacyPreferences: {
          telemetryEnabled: true,
          errorTelemetryEnabled: true,
          performanceTelemetryEnabled: false,
          experimentParticipationEnabled: false,
          updatedAt: addMinutes(now, -5)
        },
        entitlementProjection: entitlement('free', now),
        deletionTombstones: [{
          learnerId,
          deletionRequestId: 'delete-old',
          deletedAt: addMinutes(now, -60),
          reason: 'prior-reset'
        }],
        reports: { sessions: [] },
        lastUpdatedAt: now
      }
    };
    const nativeOfflineCompletion = {
      schemaVersion: syncDomain.CURRENT_SYNC_SCHEMA_VERSION,
      nativeClientSchemaVersion: NATIVE_SYNC_CLIENT_SCHEMA_VERSION,
      learnerId,
      revision: 7,
      updatedAt: addMinutes(now, 2),
      source: 'ios',
      state: {
        activeQuiz: {
          id: 'active-native-quiz',
          startedAt: addMinutes(now, -20),
          updatedAt: addMinutes(now, 1),
          questionRefs: [questionRef('grammar-sentence-types-q0002', 2)],
          questionSnapshots: [{ id: 'grammar-sentence-types-q0002', question: 'raw prompt should be stripped' }]
        },
        reports: {
          sessions: [{
            id: 'native-session-offline',
            completedAt: addMinutes(now, 2),
            attempts: [{
              questionId: 'grammar-sentence-types-q0002',
              questionHash: 'sha256:grammar-sentence-types-q0002',
              skillIds: ['grammar.sentence_types'],
              correct: true,
              question: 'raw prompt should be stripped'
            }]
          }]
        },
        assignments: [{
          id: 'assignment-native-1',
          status: 'completed',
          updatedAt: addMinutes(now, 2),
          completedAt: addMinutes(now, 2),
          completedSessionId: 'native-session-offline',
          scope: { setIds: ['grammar-sentence-types'] },
          quizOptions: { count: 3 }
        }],
        reviewSchedules: [{
          ref: questionRef('grammar-sentence-types-q0001', 1),
          skillIds: ['grammar.sentence_types'],
          intervalDays: 7,
          dueAt: addMinutes(now, 60 * 24 * 7),
          lastReviewedAt: addMinutes(now, 2)
        }],
        learnerGoals: {
          dailyQuestionTarget: 12,
          weeklySessionTarget: 4,
          updatedAt: addMinutes(now, 2)
        },
        privacyPreferences: {
          telemetryEnabled: false,
          errorTelemetryEnabled: false,
          performanceTelemetryEnabled: false,
          experimentParticipationEnabled: false,
          updatedAt: addMinutes(now, 2)
        },
        entitlementProjection: entitlement('premium', addMinutes(now, 2)),
        deletionTombstones: [{
          learnerId,
          deletionRequestId: 'delete-old',
          deletedAt: addMinutes(now, -60),
          reason: 'prior-reset'
        }],
        lastUpdatedAt: addMinutes(now, 2)
      }
    };
    return {
      webCurrent,
      nativeOfflineCompletion,
      staleNativeClient: Object.assign({}, nativeOfflineCompletion, {
        nativeClientSchemaVersion: NATIVE_SYNC_CLIENT_SCHEMA_VERSION + 1
      })
    };
  }

  function runNativeLearnerSyncAcceptance(webRecord, nativeRecord, options = {}) {
    const validationErrors = validateNativeLearnerSyncEnvelope(nativeRecord);
    if (validationErrors.length) return { status: 'rejected', errors: validationErrors };
    const merged = syncDomain.mergeLearnerStateRecords(webRecord, nativeRecord, options);
    return {
      status: 'accepted',
      conflicts: merged.conflicts,
      record: syncDomain.normalizeSyncedLearnerRecord({
        learnerId: webRecord.learnerId || nativeRecord.learnerId,
        revision: merged.winningRevision,
        updatedAt: merged.mergedAt,
        source: 'native-sync-acceptance',
        state: merged.state
      })
    };
  }

  function validateNativeLearnerSyncEnvelope(record) {
    const errors = [];
    const input = record && typeof record === 'object' ? record : {};
    if (Number(input.nativeClientSchemaVersion || NATIVE_SYNC_CLIENT_SCHEMA_VERSION) > NATIVE_SYNC_CLIENT_SCHEMA_VERSION) {
      errors.push('native_schema_unsupported');
    }
    (input.state && Array.isArray(input.state.deletionTombstones) ? input.state.deletionTombstones : []).forEach(tombstone => {
      if (!safeIso(tombstone && tombstone.deletedAt)) errors.push('deletion_tombstone_deleted_at_required');
      if (!safeString(tombstone && tombstone.learnerId)) errors.push('deletion_tombstone_learner_id_required');
    });
    try {
      syncDomain.normalizeSyncRecord(input);
    } catch (error) {
      errors.push(error && error.message || 'sync_record_invalid');
    }
    return Array.from(new Set(errors));
  }

  function questionRef(id, sequence) {
    return {
      id,
      sourceSet: 'grammar-sentence-types',
      version: 1,
      contentHash: `sha256:${id}`,
      sequence
    };
  }

  function entitlement(accessState, evaluatedAt) {
    return {
      schemaVersion: 1,
      accessState,
      featureEntitlements: accessState === 'premium'
        ? ['core_practice', 'local_progress', 'account_sync']
        : ['core_practice', 'local_progress'],
      source: 'provider_neutral_projection',
      evaluatedAt,
      expiresAt: '',
      billingOwnerRef: accessState === 'premium' ? 'parent:guardian-1' : ''
    };
  }

  function addMinutes(iso, minutes) {
    const date = new Date(iso);
    date.setTime(date.getTime() + Number(minutes || 0) * 60 * 1000);
    return date.toISOString();
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
    NATIVE_SYNC_CLIENT_SCHEMA_VERSION,
    buildNativeLearnerSyncFixtures,
    runNativeLearnerSyncAcceptance,
    validateNativeLearnerSyncEnvelope
  };
});
