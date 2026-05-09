const assert = require('node:assert/strict');
const test = require('node:test');

const catalog = require('../assets/guided-mission-catalog.json');
const missionProgress = require('../assets/mission-progress-domain');

const now = '2030-04-29T12:00:00.000Z';

test('mission progress records step evidence without lesson or question payloads', () => {
  const record = missionProgress.recordMissionStepEvidence(null, {
    missionId: 'mission-sentence-detectives',
    stepId: 'lesson-sentence-types',
    stepType: 'lesson',
    status: 'completed',
    evidenceRef: { type: 'lesson_progress', setId: 'grammar-sentence-types', completedAt: now },
    route: 'topics/grammar/subtopics/sentence-types.html?learn=1',
    storyBeats: [{ text: 'Raw lesson body' }],
    question: 'Raw prompt',
    answer: 'Raw answer'
  }, { now: () => now });

  assert.equal(record.missionId, 'mission-sentence-detectives');
  assert.deepEqual(record.completedStepIds, ['lesson-sentence-types']);
  assert.equal(record.stepEvidence[0].evidenceRef.type, 'lesson_progress');
  assert.equal(JSON.stringify(record).includes('Raw'), false);
});

test('mission resume projects current step from evidence and preserves active quiz ownership', () => {
  const mission = catalog.missions.find(item => item.missionId === 'mission-sentence-detectives');
  let record = missionProgress.recordMissionStepEvidence(null, {
    missionId: mission.missionId,
    stepId: 'lesson-sentence-types',
    stepType: 'lesson',
    status: 'completed',
    evidenceRef: { type: 'lesson_progress', setId: 'grammar-sentence-types' }
  }, { now: () => now });
  record = missionProgress.recordMissionStepEvidence(record, {
    missionId: mission.missionId,
    stepId: 'practice-sentence-types',
    stepType: 'practice',
    status: 'in_progress',
    evidenceRef: {
      type: 'active_quiz',
      activeQuizRef: { setId: 'grammar-sentence-types', questionRefCount: 3, lastSavedAt: now }
    }
  }, { now: () => now });

  const resume = missionProgress.projectMissionResume(record, mission);

  assert.equal(resume.state, 'in_progress');
  assert.equal(resume.currentStep.stepId, 'practice-sentence-types');
  assert.deepEqual(resume.practiceResume, {
    type: 'active_quiz',
    setId: 'grammar-sentence-types',
    questionRefCount: 3,
    lastSavedAt: now
  });
  assert.equal(Object.hasOwn(resume.practiceResume, 'questionSnapshots'), false);
});

test('mission progress merge preserves offline completed evidence and detects conflicts', () => {
  const local = missionProgress.recordMissionStepEvidence(null, {
    missionId: 'mission-sentence-detectives',
    stepId: 'practice-sentence-types',
    stepType: 'practice',
    status: 'completed',
    evidenceRef: { type: 'saved_session', sessionId: 'local-session' }
  }, { now: () => '2030-04-29T12:00:00.000Z' });
  const remote = missionProgress.recordMissionStepEvidence(null, {
    missionId: 'mission-sentence-detectives',
    stepId: 'practice-sentence-types',
    stepType: 'practice',
    status: 'completed',
    evidenceRef: { type: 'saved_session', sessionId: 'remote-session' }
  }, { now: () => '2030-04-29T12:05:00.000Z' });

  const merged = missionProgress.mergeMissionProgressRecords(local, remote, { now: () => '2030-04-29T12:06:00.000Z' });

  assert.equal(merged.record.stepEvidence[0].evidenceRef.sessionId, 'remote-session');
  assert.deepEqual(merged.record.completedStepIds, ['practice-sentence-types']);
  assert.ok(merged.conflicts.some(conflict => conflict.type === 'mission_step_evidence'));
});

test('mission progress projects stale catalog offline and tombstone states', () => {
  const mission = catalog.missions.find(item => item.missionId === 'mission-sentence-detectives');
  const stale = missionProgress.projectMissionResume({
    missionId: mission.missionId,
    catalogSourceHash: 'sha256:old',
    stepEvidence: []
  }, Object.assign({}, mission, { catalogSourceHash: 'sha256:new' }), { online: false });
  const tombstone = missionProgress.createMissionProgressTombstone({
    missionId: mission.missionId,
    learnerId: 'learner-hidden',
    question: 'Raw prompt'
  }, { now: () => now });

  assert.equal(stale.state, 'stale_catalog_offline');
  assert.equal(tombstone.missionId, mission.missionId);
  assert.equal(tombstone.deletedAt, now);
  assert.equal(JSON.stringify(tombstone).includes('learner-hidden'), false);
  assert.equal(JSON.stringify(tombstone).includes('Raw'), false);
});
