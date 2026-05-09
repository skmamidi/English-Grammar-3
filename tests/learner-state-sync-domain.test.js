const assert = require('node:assert/strict');
const test = require('node:test');

const {
  CURRENT_SYNC_SCHEMA_VERSION,
  containsQuestionPayload,
  mergeLearnerStateRecords,
  mergeLearnerStates,
  normalizeSyncedLearnerRecord,
  normalizeSyncRecord,
  resolveSyncConflict,
  resolveLearnerStateConflict
} = require('../assets/learner-state-sync-domain');

test('sync merge appends stable saved sessions and merges reports by report id', () => {
  const merged = mergeLearnerStates({
    reports: {
      sessions: [{ id: 'session-local', completedAt: '2030-04-29T12:00:00.000Z' }],
      questionReports: [{ id: 'report-1', questionId: 'question-a', status: 'open', updatedAt: '2030-04-29T12:00:00.000Z' }]
    }
  }, {
    reports: {
      sessions: [
        { id: 'session-local', completedAt: '2030-04-29T12:00:00.000Z' },
        { id: 'session-remote', completedAt: '2030-04-30T12:00:00.000Z' }
      ],
      questionReports: [
        { id: 'report-1', questionId: 'question-a', status: 'resolved', updatedAt: '2030-05-01T12:00:00.000Z' },
        { id: 'report-2', questionId: 'question-b', status: 'open', updatedAt: '2030-04-30T12:00:00.000Z' }
      ]
    }
  });

  assert.deepEqual(merged.reports.sessions.map(session => session.id), ['session-remote', 'session-local']);
  assert.equal(merged.reports.questionReports.length, 2);
  assert.equal(merged.reports.questionReports.find(report => report.id === 'report-1').status, 'resolved');
  assert.equal(merged.reports.questionReports.find(report => report.id === 'report-1').questionId, 'question-a');
});

test('sync merge chooses newest active quiz and preserves snapshot fallback', () => {
  const merged = mergeLearnerStates({
    activeQuiz: {
      setId: 'grammar',
      lastSavedAt: '2030-04-29T12:00:00.000Z',
      questionRefs: [{ id: 'q1', contentHash: 'sha256:one' }],
      questionSnapshots: [{ id: 'q1', question: 'snapshot fallback' }]
    }
  }, {
    activeQuiz: {
      setId: 'grammar',
      updatedAt: '2030-04-30T12:00:00.000Z',
      questionRefs: [{ id: 'q2', contentHash: 'sha256:two' }],
      questionSnapshots: [{ id: 'q2', question: 'new fallback' }]
    }
  });

  assert.equal(merged.activeQuiz.questionRefs[0].id, 'q2');
  assert.equal(merged.activeQuiz.questionSnapshots[0].question, 'new fallback');
});

test('sync merge applies timestamp-aware assignment queue and schedule conflict rules', () => {
  const merged = mergeLearnerStates({
    assignments: [{ id: 'assignment-1', status: 'in_progress', updatedAt: '2030-04-29T12:00:00.000Z' }],
    reviewQueue: {
      queueId: 'queue-1',
      items: [{ questionRef: { id: 'q1' }, status: 'seen', seenAt: '2030-04-29T12:00:00.000Z' }]
    },
    reviewSchedules: [{ ref: { id: 'q1' }, lastReviewedAt: '2030-04-29T12:00:00.000Z', intervalDays: 2 }]
  }, {
    assignments: [{ id: 'assignment-1', status: 'completed', updatedAt: '2030-04-30T12:00:00.000Z', completedAt: '2030-04-30T12:00:00.000Z' }],
    reviewQueue: {
      queueId: 'queue-1',
      items: [{ questionRef: { id: 'q1' }, status: 'mastered', masteredAt: '2030-04-30T12:00:00.000Z' }]
    },
    reviewSchedules: [{ ref: { id: 'q1' }, lastReviewedAt: '2030-05-01T12:00:00.000Z', intervalDays: 7 }]
  });

  assert.equal(merged.assignments[0].status, 'completed');
  assert.equal(merged.reviewQueue.items[0].status, 'mastered');
  assert.equal(merged.reviewSchedules[0].intervalDays, 7);
});

test('sync merge preserves newest mission progress evidence without payloads', () => {
  const merged = mergeLearnerStates({
    missionProgress: [{
      missionId: 'mission-sentence-detectives',
      stepEvidence: [{
        stepId: 'practice-sentence-types',
        stepType: 'practice',
        status: 'completed',
        completedAt: '2030-04-29T12:00:00.000Z',
        evidenceRef: { type: 'saved_session', sessionId: 'local-session' },
        question: 'Raw prompt'
      }]
    }]
  }, {
    missionProgress: [{
      missionId: 'mission-sentence-detectives',
      stepEvidence: [{
        stepId: 'review-sentence-types',
        stepType: 'review',
        status: 'completed',
        completedAt: '2030-04-30T12:00:00.000Z',
        evidenceRef: { type: 'review_item', queueId: 'review-1' },
        answer: 'Raw answer'
      }]
    }]
  });

  assert.equal(merged.missionProgress.length, 1);
  assert.deepEqual(merged.missionProgress[0].completedStepIds, ['practice-sentence-types', 'review-sentence-types']);
  assert.equal(JSON.stringify(merged.missionProgress).includes('Raw'), false);
});

test('sync merge preserves newest learner goal preferences by timestamp', () => {
  const merged = mergeLearnerStates({
    learnerGoals: {
      dailyQuestionTarget: 8,
      weeklySessionTarget: 2,
      updatedAt: '2030-04-29T12:00:00.000Z'
    }
  }, {
    learnerGoals: {
      dailyQuestionTarget: 14,
      weeklySessionTarget: 4,
      updatedAt: '2030-04-30T12:00:00.000Z',
      question: 'raw prompt'
    }
  });

  assert.equal(merged.learnerGoals.dailyQuestionTarget, 14);
  assert.equal(merged.learnerGoals.weeklySessionTarget, 4);
  assert.equal(JSON.stringify(merged.learnerGoals).includes('raw prompt'), false);
});

test('sync records are normalized, versioned, and reject copied question payloads', () => {
  const record = normalizeSyncRecord({
    learnerId: 'learner-1',
    revision: 3,
    updatedAt: '2030-04-29T12:00:00.000Z',
    source: 'test',
    state: {
      reports: { sessions: [{ id: 'session-1', attempts: [{ questionId: 'q1', question: 'raw prompt' }] }] }
    }
  });

  assert.equal(record.schemaVersion, CURRENT_SYNC_SCHEMA_VERSION);
  assert.equal(record.learnerId, 'learner-1');
  assert.equal(record.revision, 3);
  assert.equal(containsQuestionPayload(record.state), false);
  assert.equal(JSON.stringify(record).includes('raw prompt'), false);
});

test('sync conflict resolution is deterministic and rejects unsupported future schema', () => {
  const local = normalizeSyncRecord({ learnerId: 'learner-1', revision: 2, state: { totalGems: 1 } });
  const remote = normalizeSyncRecord({ learnerId: 'learner-1', revision: 5, state: { totalGems: 4 } });
  const resolved = resolveSyncConflict(local, remote);

  assert.equal(resolved.status, 'merged');
  assert.equal(resolved.record.revision, 6);
  assert.equal(resolved.record.state.totalGems, 4);
  assert.throws(() => normalizeSyncRecord({
    schemaVersion: CURRENT_SYNC_SCHEMA_VERSION + 1,
    learnerId: 'learner-1',
    state: {}
  }), /learner_state_sync_schema_unsupported/);
});

test('older server sync schema normalizes to the current record contract', () => {
  const record = normalizeSyncRecord({
    schemaVersion: 0.5,
    learnerId: 'learner-1',
    revision: 1,
    state: { badges: ['legacy-sync'], reports: { sessions: [{ id: 'session-1' }] } }
  });

  assert.equal(record.schemaVersion, CURRENT_SYNC_SCHEMA_VERSION);
  assert.equal(record.state.badges[0], 'legacy-sync');
  assert.equal(record.state.reports.sessions[0].id, 'session-1');
});

test('sync record merge returns deterministic conflict metadata and injected merge time', () => {
  const local = normalizeSyncedLearnerRecord({
    learnerId: 'learner-1',
    revision: 2,
    updatedAt: '2030-04-29T12:00:00.000Z',
    state: {
      totalGems: 4,
      reports: { sessions: [{ id: 'session-local', completedAt: '2030-04-29T12:00:00.000Z' }] }
    }
  });
  const remote = normalizeSyncedLearnerRecord({
    learnerId: 'learner-1',
    revision: 5,
    updatedAt: '2030-04-30T12:00:00.000Z',
    state: {
      totalGems: 9,
      reports: { sessions: [{ id: 'session-remote', completedAt: '2030-04-30T12:00:00.000Z' }] }
    }
  });

  const first = mergeLearnerStateRecords(local, remote, { now: () => '2030-05-01T12:00:00.000Z' });
  const second = mergeLearnerStateRecords(remote, local, { now: () => '2030-05-01T12:00:00.000Z' });

  assert.deepEqual(first.state, second.state);
  assert.equal(first.state.totalGems, 9);
  assert.deepEqual(first.state.reports.sessions.map(session => session.id), ['session-remote', 'session-local']);
  assert.equal(first.winningRevision, 6);
  assert.equal(first.mergedAt, '2030-05-01T12:00:00.000Z');
  assert.ok(first.conflicts.some(conflict => conflict.type === 'record_revision'));
});

test('state conflict resolver quarantines corrupt remote records and preserves local state', () => {
  const local = { totalGems: 12, reports: { questionReports: [{ id: 'report-local', questionId: 'q1' }] } };
  const corruptRemote = { totalGems: 99, reports: { questionReports: [{ id: 'report-corrupt', status: 'open' }] } };

  const result = resolveLearnerStateConflict(local, corruptRemote, { now: () => '2030-05-01T12:00:00.000Z' });

  assert.equal(result.state.totalGems, 12);
  assert.equal(result.state.reports.questionReports.length, 1);
  assert.equal(result.warnings[0].code, 'remote_record_corrupt');
});
