const assert = require('node:assert/strict');
const test = require('node:test');

const lesson = require('../assets/story-lesson-source/grammar-sentence-types.json');
const {
  buildStoryLessonViewModel,
  renderStoryLessonHtml,
  shouldShowLessonFirst
} = require('../assets/story-lesson-viewer');

const characterCatalog = {
  expressionPresets: {
    curious: {},
    coaching: {},
    puzzled: {},
    confident: {},
    celebrate: {}
  },
  getCharacterById(id) {
    const character = {
      'mina-mapwise': { id, name: 'Mina Mapwise', role: 'sentence sleuth', pet: { id: 'pickle', name: 'Pickle' } },
      'jo-pocket': { id, name: 'Jo Pocket', role: 'detail collector', pet: { id: 'button', name: 'Button' } }
    }[id];
    return character ? { set: { id: 'clue-crew', name: 'The Clue Crew' }, character } : null;
  },
  renderCharacter(character, set, expression) {
    return `<svg class="character-svg" data-character-id="${character.id}" data-set-id="${set.id}" data-expression="${expression}"></svg>`;
  },
  renderPet(pet, expression) {
    return `<svg class="pet-svg" data-pet-id="${pet.id}" data-expression="${expression}"></svg>`;
  }
};

test('story lesson view model selects requested grade with deterministic fallback', () => {
  const gradeFour = buildStoryLessonViewModel(lesson, {
    routeGrade: '4',
    storedGrade: '6',
    characterCatalog
  });
  const fallback = buildStoryLessonViewModel(lesson, {
    routeGrade: '9',
    storedGrade: '5',
    characterCatalog
  });

  assert.equal(gradeFour.grade, '4');
  assert.equal(gradeFour.storyBeats[0].character.name, 'Jo Pocket');
  assert.equal(fallback.grade, '5');
  assert.equal(fallback.quizHandoff.label, 'Practice Sentence Types');
});

test('story lesson html renders beats examples guided checks related lessons and quiz handoff', () => {
  const model = buildStoryLessonViewModel(lesson, { routeGrade: '3', characterCatalog });
  const html = renderStoryLessonHtml(model);

  assert.match(html, /data-story-lesson/);
  assert.match(html, /class="story-character-visual"/);
  assert.match(html, /data-character-id="mina-mapwise"/);
  assert.match(html, /data-expression="coaching"/);
  assert.match(html, /data-pet-id="pickle"/);
  assert.match(html, /Mina Mapwise/);
  assert.match(html, /Please open the case file/);
  assert.match(html, /What should you inspect when checking matching sentences to their jobs/);
  assert.match(html, /Declarative, interrogative, imperative, and exclamatory sentences/);
  assert.match(html, /grammar-subject-predicate/);
  assert.match(html, /id="story-lesson-start-practice"/);
});

test('lesson first routing preserves explicit practice parent assignment and review flows', () => {
  assert.equal(shouldShowLessonFirst({ search: '', hasLesson: true }), true);
  assert.equal(shouldShowLessonFirst({ search: '?practice=1', hasLesson: true }), false);
  assert.equal(shouldShowLessonFirst({ search: '?parentBrowse=1', hasLesson: true }), false);
  assert.equal(shouldShowLessonFirst({ search: '', hasLesson: false }), false);
  assert.equal(shouldShowLessonFirst({
    search: '',
    hasLesson: true,
    storage: { grammarQuestActiveAssignmentRequest: '{"id":"assignment-1"}' }
  }), false);
  assert.equal(shouldShowLessonFirst({
    search: '',
    hasLesson: true,
    storage: { grammarQuestActiveReviewRequest: '{"queueId":"review-1"}' }
  }), false);
});
