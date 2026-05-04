const assert = require('node:assert/strict');
const test = require('node:test');

const manifest = require('../assets/question-manifest.json');
const validLesson = require('./fixtures/story-lessons/valid-sentence-types.json');
const invalidUnsafeLink = require('./fixtures/story-lessons/invalid-unsafe-link.json');

const {
  REQUIRED_LESSON_GRADES,
  buildLessonRouteDescriptor,
  normalizeLessonSummary,
  normalizeStoryLessonRecord,
  validateLessonRouteDescriptor,
  validateStoryLessonRecord
} = require('../assets/story-lesson-domain');

const characterCatalog = {
  sets: [{
    id: 'clue-crew',
    characters: [
      { id: 'mina-mapwise' },
      { id: 'jo-pocket' }
    ]
  }]
};

test('story lesson records validate grade 2-6 variants and normalize metadata', () => {
  const errors = validateStoryLessonRecord(validLesson, { manifest, characterCatalog });
  assert.deepEqual(errors, []);
  assert.deepEqual(REQUIRED_LESSON_GRADES, [2, 3, 4, 5, 6]);

  const normalized = normalizeStoryLessonRecord(validLesson, { manifest, characterCatalog });
  assert.equal(normalized.schemaVersion, 1);
  assert.equal(normalized.setId, 'grammar-sentence-types');
  assert.equal(normalized.domain, 'grammar');
  assert.deepEqual(Object.keys(normalized.gradeVariants), ['2', '3', '4', '5', '6']);
  assert.deepEqual(normalized.gradeVariants['2'].quizHandoff.route.params, {
    domain: 'grammar',
    learn: '1',
    setId: 'grammar-sentence-types',
    subtopic: 'sentence-types'
  });
  assert.deepEqual(normalized.characterRoles.map(role => role.characterId), ['mina-mapwise', 'jo-pocket']);
});

test('story lesson records reject missing grades unknown sets characters duplicates and unsafe links', () => {
  const missingGrade = clone(validLesson);
  delete missingGrade.gradeVariants['2'];
  assert.ok(validateStoryLessonRecord(missingGrade, { manifest, characterCatalog }).includes('lesson_grade_variant_2_required'));

  const unknownSet = clone(validLesson);
  unknownSet.setId = 'grammar-unknown';
  assert.ok(validateStoryLessonRecord(unknownSet, { manifest, characterCatalog }).includes('lesson_set_id_unknown'));

  const unknownCharacter = clone(validLesson);
  unknownCharacter.characterRoles[0].characterId = 'missing-character';
  assert.ok(validateStoryLessonRecord(unknownCharacter, { manifest, characterCatalog }).includes('lesson_character_id_unknown:missing-character'));

  const duplicateRelated = clone(validLesson);
  duplicateRelated.relatedSubtopics.push({ setId: 'grammar-subject-predicate', relationship: 'repeat' });
  assert.ok(validateStoryLessonRecord(duplicateRelated, { manifest, characterCatalog }).includes('lesson_related_subtopic_duplicate:grammar-subject-predicate'));

  const unsafeErrors = validateStoryLessonRecord(invalidUnsafeLink, { manifest, characterCatalog });
  assert.ok(unsafeErrors.includes('lesson_related_subtopic_set_id_unsafe:https://evil.example/lesson'));
  assert.ok(unsafeErrors.includes('lesson_character_id_unknown:unknown-character'));
});

test('lesson route descriptors reject external urls unsafe parameters unknown domains and unknown set ids', () => {
  const descriptor = buildLessonRouteDescriptor({ setId: 'grammar-sentence-types' }, { manifest });

  assert.deepEqual(descriptor, {
    type: 'story_lesson',
    webPath: 'topics/grammar/subtopics/sentence-types.html?learn=1',
    params: {
      domain: 'grammar',
      learn: '1',
      setId: 'grammar-sentence-types',
      subtopic: 'sentence-types'
    }
  });
  assert.deepEqual(validateLessonRouteDescriptor(descriptor, { manifest }), []);
  assert.ok(validateLessonRouteDescriptor({
    type: 'story_lesson',
    webPath: 'https://evil.example/topics/grammar/subtopics/sentence-types.html?learn=1',
    params: descriptor.params
  }, { manifest }).includes('lesson_route_external_url_forbidden'));
  assert.ok(validateLessonRouteDescriptor({
    type: 'story_lesson',
    webPath: 'topics/grammar/subtopics/../secret.html?learn=1',
    params: descriptor.params
  }, { manifest }).includes('lesson_route_web_path_unsafe'));
  assert.ok(validateLessonRouteDescriptor({
    type: 'story_lesson',
    webPath: 'topics/math/subtopics/sentence-types.html?learn=1',
    params: Object.assign({}, descriptor.params, { domain: 'math' })
  }, { manifest }).includes('lesson_route_domain_unknown:math'));
  assert.ok(validateLessonRouteDescriptor({
    type: 'story_lesson',
    webPath: 'topics/grammar/subtopics/unknown.html?learn=1',
    params: Object.assign({}, descriptor.params, { setId: 'grammar-unknown', subtopic: 'unknown' })
  }, { manifest }).includes('lesson_route_set_id_unknown:grammar-unknown'));
  assert.ok(validateLessonRouteDescriptor({
    type: 'story_lesson',
    webPath: 'topics/grammar/subtopics/sentence-types.html?learn=0',
    params: Object.assign({}, descriptor.params, { learn: '0' })
  }, { manifest }).includes('lesson_route_learn_param_required'));
});

test('lesson summaries exclude lesson body text and progress-unsafe payloads', () => {
  const summary = normalizeLessonSummary(validLesson, { manifest, characterCatalog });
  const serialized = JSON.stringify(summary);

  assert.equal(summary.setId, 'grammar-sentence-types');
  assert.deepEqual(summary.availableGrades, [2, 3, 4, 5, 6]);
  assert.deepEqual(summary.route, buildLessonRouteDescriptor({ setId: 'grammar-sentence-types' }, { manifest }));
  assert.equal(serialized.includes('Mina opens the message sorter'), false);
  assert.equal(serialized.includes('"storyBeats"'), false);
  assert.equal(serialized.includes('"conceptRules"'), false);
  assert.equal(serialized.includes('"examples"'), false);
  assert.equal(serialized.includes('"guidedChecks"'), false);
  assert.equal(serialized.includes('"commonMistakes"'), false);
  assert.equal(serialized.includes('"answer"'), false);
  assert.equal(serialized.includes('"explanation"'), false);
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
