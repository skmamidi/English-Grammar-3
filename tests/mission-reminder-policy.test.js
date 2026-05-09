const assert = require('node:assert/strict');
const test = require('node:test');

const reminders = require('../assets/mission-reminder-policy');

test('mission reminder preferences default to opt-out bounded channels', () => {
  const prefs = reminders.normalizeMissionReminderPreferences();

  assert.equal(prefs.enabled, false);
  assert.deepEqual(prefs.channels, []);
  assert.equal(prefs.frequencyCap.count, 0);
  assert.equal(prefs.quietHours.enabled, true);
});

test('mission reminder policy allows actionable opted-in reminders outside quiet hours', () => {
  const decision = reminders.evaluateMissionReminderCandidate({
    now: '2030-05-01T14:00:00.000Z',
    preferences: {
      enabled: true,
      channels: ['in_app', 'guardian_email'],
      quietHours: { enabled: true, start: '20:00', end: '07:00' },
      frequencyCap: { count: 2, windowHours: 24 }
    },
    candidate: {
      missionId: 'mission-sentence-detectives',
      state: 'due_soon',
      dueAt: '2030-05-02T12:00:00.000Z',
      channel: 'in_app',
      learnerName: 'Hidden Learner',
      question: 'Raw prompt'
    },
    recentNotifications: [{ sentAt: '2030-04-29T12:00:00.000Z', missionId: 'other' }]
  });

  assert.equal(decision.action, 'send');
  assert.equal(decision.channel, 'in_app');
  assert.equal(decision.missionRef.missionId, 'mission-sentence-detectives');
  assert.deepEqual(decision.reasonCodes, ['mission_due_soon']);
  assert.equal(JSON.stringify(decision).includes('Hidden Learner'), false);
  assert.equal(JSON.stringify(decision).includes('Raw prompt'), false);
});

test('mission reminder policy suppresses disabled channels quiet hours and frequency caps', () => {
  const base = {
    preferences: {
      enabled: true,
      channels: ['in_app'],
      quietHours: { enabled: true, start: '20:00', end: '07:00' },
      frequencyCap: { count: 1, windowHours: 24 }
    },
    candidate: { missionId: 'mission-1', state: 'overdue', dueAt: '2030-04-30T12:00:00.000Z', channel: 'in_app' }
  };

  assert.equal(reminders.evaluateMissionReminderCandidate(Object.assign({}, base, {
    preferences: Object.assign({}, base.preferences, { enabled: false }),
    now: '2030-05-01T14:00:00.000Z'
  })).action, 'suppress');
  assert.deepEqual(reminders.evaluateMissionReminderCandidate(Object.assign({}, base, {
    candidate: Object.assign({}, base.candidate, { channel: 'guardian_email' }),
    now: '2030-05-01T14:00:00.000Z'
  })).reasonCodes, ['channel_not_enabled']);
  assert.deepEqual(reminders.evaluateMissionReminderCandidate(Object.assign({}, base, {
    now: '2030-05-01T22:00:00.000Z'
  })).reasonCodes, ['quiet_hours']);
  assert.deepEqual(reminders.evaluateMissionReminderCandidate(Object.assign({}, base, {
    now: '2030-05-01T14:00:00.000Z',
    recentNotifications: [{ sentAt: '2030-05-01T13:00:00.000Z' }]
  })).reasonCodes, ['frequency_cap_reached']);
});
