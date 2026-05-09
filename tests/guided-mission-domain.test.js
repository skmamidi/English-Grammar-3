const assert = require('node:assert/strict');
const test = require('node:test');

const manifest = require('../assets/question-manifest.json');
const validMission = require('./fixtures/guided-missions/valid-sentence-mission.json');

const {
  MISSION_STEP_TYPES,
  buildMissionRouteDescriptor,
  normalizeGuidedMission,
  normalizeMissionSummary,
  validateGuidedMission,
  validateMissionRouteDescriptor
} = require('../assets/guided-mission-domain');

test('guided mission records normalize ordered lesson practice review and reflection refs', () => {
  const errors = validateGuidedMission(validMission, { manifest });
  assert.deepEqual(errors, []);
  assert.deepEqual(MISSION_STEP_TYPES, ['lesson', 'practice', 'review', 'reflection']);

  const normalized = normalizeGuidedMission(validMission, { manifest });
  assert.equal(normalized.schemaVersion, 1);
  assert.equal(normalized.missionId, 'mission-sentence-detectives');
  assert.equal(normalized.domain, 'grammar');
  assert.deepEqual(normalized.gradeBand, { min: 3, max: 5 });
  assert.deepEqual(normalized.steps.map(step => step.stepId), [
    'lesson-sentence-types',
    'practice-sentence-types',
    'review-sentence-types',
    'reflect-sentence-types'
  ]);
  assert.deepEqual(normalized.steps[0].route, {
    type: 'story_lesson',
    webPath: 'topics/grammar/subtopics/sentence-types.html?learn=1',
    params: {
      domain: 'grammar',
      learn: '1',
      setId: 'grammar-sentence-types',
      subtopic: 'sentence-types'
    }
  });
  assert.deepEqual(normalized.steps[1].route, {
    type: 'practice',
    webPath: 'topics/grammar/subtopics/sentence-types.html?practice=1',
    params: {
      domain: 'grammar',
      practice: '1',
      setId: 'grammar-sentence-types',
      subtopic: 'sentence-types'
    }
  });
  assert.deepEqual(normalized.steps[2].route, {
    type: 'adaptive_review',
    webPath: 'index.html?review=1&setId=grammar-sentence-types',
    params: {
      review: '1',
      setId: 'grammar-sentence-types'
    }
  });
});

test('guided mission records reject copied payloads unsafe routes duplicates and unknown refs', () => {
  const copiedLesson = clone(validMission);
  copiedLesson.steps[0].lessonRef.storyBeats = [{ narrative: 'Full lesson body should stay outside missions.' }];
  assert.ok(validateGuidedMission(copiedLesson, { manifest }).includes('mission_must_not_include_content_payload'));

  const copiedQuestion = clone(validMission);
  copiedQuestion.steps[1].practiceRef.questions = [{ question: 'Which sentence asks something?', answer: 'interrogative' }];
  assert.ok(validateGuidedMission(copiedQuestion, { manifest }).includes('mission_must_not_include_content_payload'));

  const duplicateStep = clone(validMission);
  duplicateStep.steps[1].stepId = 'lesson-sentence-types';
  assert.ok(validateGuidedMission(duplicateStep, { manifest }).includes('mission_step_duplicate:lesson-sentence-types'));

  const unknownSet = clone(validMission);
  unknownSet.steps[0].lessonRef.setId = 'grammar-unknown';
  assert.ok(validateGuidedMission(unknownSet, { manifest }).includes('mission_step_lesson_set_unknown:grammar-unknown'));

  const unsafeRoute = clone(validMission);
  unsafeRoute.steps[1].route = {
    type: 'practice',
    webPath: 'https://evil.example/topics/grammar/subtopics/sentence-types.html?practice=1',
    params: { domain: 'grammar', practice: '1', setId: 'grammar-sentence-types', subtopic: 'sentence-types' }
  };
  assert.ok(validateGuidedMission(unsafeRoute, { manifest }).includes('mission_route_external_url_forbidden'));

  const unsupportedCompletion = clone(validMission);
  unsupportedCompletion.completionPolicy.type = 'client_awarded_xp_total';
  assert.ok(validateGuidedMission(unsupportedCompletion, { manifest }).includes('mission_completion_policy_unsupported:client_awarded_xp_total'));
});

test('mission route descriptors are native-safe and reject external urls', () => {
  const descriptor = buildMissionRouteDescriptor({ missionId: 'mission-sentence-detectives' });

  assert.deepEqual(descriptor, {
    type: 'guided_mission',
    webPath: 'missions.html?missionId=mission-sentence-detectives',
    params: {
      missionId: 'mission-sentence-detectives'
    },
    native: {
      screen: 'GuidedMission',
      params: {
        missionId: 'mission-sentence-detectives'
      }
    }
  });
  assert.deepEqual(validateMissionRouteDescriptor(descriptor), []);
  assert.ok(validateMissionRouteDescriptor({
    type: 'guided_mission',
    webPath: 'https://evil.example/missions.html?missionId=mission-sentence-detectives',
    params: descriptor.params
  }).includes('mission_route_external_url_forbidden'));
  assert.ok(validateMissionRouteDescriptor({
    type: 'guided_mission',
    webPath: 'missions.html?missionId=mission-sentence-detectives&debug=1',
    params: descriptor.params
  }).includes('mission_route_query_param_unsupported:debug'));
});

test('mission summaries are metadata-only and portable across web and native clients', () => {
  const summary = normalizeMissionSummary(validMission, { manifest });
  const serialized = JSON.stringify(summary);

  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.missionId, 'mission-sentence-detectives');
  assert.deepEqual(summary.route, buildMissionRouteDescriptor({ missionId: 'mission-sentence-detectives' }));
  assert.deepEqual(summary.stepSummaries.map(step => step.type), ['lesson', 'practice', 'review', 'reflection']);
  assert.equal(serialized.includes('Learn sentence types, practice with canonical questions'), true);
  assert.equal(serialized.includes('"lessonRef"'), false);
  assert.equal(serialized.includes('"practiceRef"'), false);
  assert.equal(serialized.includes('"reviewRef"'), false);
  assert.equal(serialized.includes('"storyBeats"'), false);
  assert.equal(serialized.includes('"question"'), false);
  assert.equal(serialized.includes('"answer"'), false);
  assert.equal(serialized.includes('"explanation"'), false);
  assert.deepEqual(summary.stepSummaries[0], {
    stepId: 'lesson-sentence-types',
    type: 'lesson',
    title: 'Learn the sentence clue',
    required: true,
    route: {
      type: 'story_lesson',
      webPath: 'topics/grammar/subtopics/sentence-types.html?learn=1',
      params: {
        domain: 'grammar',
        learn: '1',
        setId: 'grammar-sentence-types',
        subtopic: 'sentence-types'
      }
    }
  });
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
