const assert = require('node:assert/strict');
const test = require('node:test');

const dashboard = require('../assets/mission-dashboard-domain');

const now = '2030-05-01T12:00:00.000Z';

test('mission dashboard projects learner and guardian mission states without raw payloads', () => {
  const projection = dashboard.buildMissionDashboardProjection({
    learnerId: 'learner-a',
    now,
    missions: [mission('mission-overdue'), mission('mission-due-soon'), mission('mission-complete')],
    missionProgress: [
      progress('mission-overdue', ['lesson-step']),
      progress('mission-complete', ['lesson-step', 'practice-step'], { completedAt: '2030-04-30T12:00:00.000Z' })
    ],
    assignments: [
      assignment('mission-overdue', '2030-04-30T12:00:00.000Z'),
      assignment('mission-due-soon', '2030-05-02T12:00:00.000Z')
    ],
    recommendations: [{
      missionId: 'mission-due-soon',
      reasonCodes: ['weak_skill'],
      nextAction: { type: 'practice', stepId: 'practice-step', route: { webPath: 'topics/grammar.html?practice=1' } },
      question: 'Raw prompt'
    }]
  });

  assert.equal(projection.summary.totalMissionCount, 3);
  assert.equal(projection.summary.overdueCount, 1);
  assert.equal(projection.summary.dueSoonCount, 1);
  assert.equal(projection.summary.completedCount, 1);
  assert.deepEqual(projection.cards.map(card => [card.missionId, card.state]), [
    ['mission-overdue', 'overdue'],
    ['mission-due-soon', 'due_soon'],
    ['mission-complete', 'completed']
  ]);
  assert.equal(projection.cards[0].progressPercent, 50);
  assert.equal(projection.calendarStates[0].state, 'overdue');
  assert.equal(projection.guardianSummary.copy, '1 mission needs attention, and 1 is coming due soon.');
  assert.equal(JSON.stringify(projection).includes('learner-a'), false);
  assert.equal(JSON.stringify(projection).includes('Raw prompt'), false);
  assert.equal(JSON.stringify(projection).includes('answerKey'), false);
});

test('mission dashboard marks blocked and recommended states from refs only', () => {
  const projection = dashboard.buildMissionDashboardProjection({
    now,
    missions: [
      mission('mission-blocked', { prerequisites: [{ type: 'lesson_completed', setId: 'grammar-basics' }] }),
      mission('mission-recommended')
    ],
    missionProgress: [progress('mission-blocked', [])],
    recommendations: [{ missionId: 'mission-recommended', reasonCodes: ['mastery_gap'] }]
  });

  assert.equal(projection.cards.find(card => card.missionId === 'mission-blocked').state, 'blocked');
  assert.equal(projection.cards.find(card => card.missionId === 'mission-recommended').state, 'recommended');
  assert.deepEqual(projection.cards.find(card => card.missionId === 'mission-recommended').reasonCodes, ['mastery_gap']);
});

function mission(missionId, overrides = {}) {
  return Object.assign({
    missionId,
    title: missionId.replace('mission-', 'Mission '),
    completionPolicy: { requiredStepIds: ['lesson-step', 'practice-step'] },
    stepSummaries: [
      { stepId: 'lesson-step', title: 'Lesson', type: 'lesson', required: true },
      { stepId: 'practice-step', title: 'Practice', type: 'practice', required: true }
    ]
  }, overrides);
}

function progress(missionId, completedStepIds, overrides = {}) {
  return Object.assign({
    missionId,
    completedStepIds,
    stepEvidence: completedStepIds.map(stepId => ({ stepId, status: 'completed', evidenceRef: { type: 'manual_ref' } })),
    question: 'Raw prompt',
    answerKey: 2
  }, overrides);
}

function assignment(missionId, dueAt) {
  return {
    id: `assignment-${missionId}`,
    assignmentType: 'guided_mission',
    status: 'active',
    dueAt,
    scope: { missionRefs: [{ missionId }] },
    learnerName: 'Hidden Learner'
  };
}
