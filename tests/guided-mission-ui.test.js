const assert = require('node:assert/strict');
const test = require('node:test');

const catalog = require('../assets/guided-mission-catalog.json');
const {
  buildGuidedMissionRouteViewModel,
  renderCatalogUnavailable,
  renderGuidedMissionHtml,
  shouldStartMissionRoute
} = require('../assets/guided-mission-ui');

test('guided mission route view model selects mission and current resumable step', () => {
  const model = buildGuidedMissionRouteViewModel({
    catalog,
    missionId: 'mission-sentence-detectives',
    progress: {
      missionId: 'mission-sentence-detectives',
      completedStepIds: ['lesson-sentence-types']
    },
    online: true
  });

  assert.equal(model.state, 'in_progress');
  assert.equal(model.missionId, 'mission-sentence-detectives');
  assert.equal(model.currentStep.stepId, 'practice-sentence-types');
  assert.deepEqual(model.steps.map(step => ({ id: step.stepId, status: step.status })), [
    { id: 'lesson-sentence-types', status: 'completed' },
    { id: 'practice-sentence-types', status: 'current' },
    { id: 'review-sentence-types', status: 'upcoming' },
    { id: 'reflect-sentence-types', status: 'optional' }
  ]);
  assert.equal(model.steps[1].route.webPath, 'topics/grammar/subtopics/sentence-types.html?practice=1');
});

test('guided mission html renders overview handoffs review checkpoint and completion state without payloads', () => {
  const active = buildGuidedMissionRouteViewModel({ catalog, missionId: 'mission-sentence-detectives' });
  const completed = buildGuidedMissionRouteViewModel({
    catalog,
    missionId: 'mission-sentence-detectives',
    progress: {
      completedStepIds: ['lesson-sentence-types', 'practice-sentence-types', 'review-sentence-types']
    }
  });
  const html = renderGuidedMissionHtml(active);
  const completedHtml = renderGuidedMissionHtml(completed);

  assert.match(html, /data-guided-mission="mission-sentence-detectives"/);
  assert.match(html, /Learn the sentence clue/);
  assert.match(html, /Practice with sentence questions/);
  assert.match(html, /Review missed sentence clues/);
  assert.match(html, /href="topics\/grammar\/subtopics\/sentence-types.html\?learn=1"/);
  assert.match(html, /href="topics\/grammar\/subtopics\/sentence-types.html\?practice=1"/);
  assert.match(html, /href="index.html\?review=1&amp;setId=grammar-sentence-types"/);
  assert.match(completedHtml, /Mission complete/);
  assert.equal(/"lessonRef"|"practiceRef"|"reviewRef"|"question"|"answer"|"explanation"|"storyBeats"/.test(html), false);
});

test('guided mission route preserves direct practice assignment preview and offline fallback behavior', () => {
  assert.equal(shouldStartMissionRoute({ search: '?missionId=mission-sentence-detectives' }), true);
  assert.equal(shouldStartMissionRoute({ search: '?missionId=mission-sentence-detectives&practice=1' }), false);
  assert.equal(shouldStartMissionRoute({ search: '?missionId=mission-sentence-detectives&parentBrowse=1' }), false);
  assert.equal(shouldStartMissionRoute({
    search: '?missionId=mission-sentence-detectives',
    storage: { grammarQuestActiveAssignmentRequest: '{"id":"assignment-1"}' }
  }), false);

  const offline = buildGuidedMissionRouteViewModel({
    catalog,
    missionId: 'mission-sentence-detectives',
    online: false
  });
  assert.equal(offline.state, 'offline');
  assert.match(renderGuidedMissionHtml(offline), /available offline after the catalog loads/);
  assert.match(renderCatalogUnavailable('mission-sentence-detectives'), /Mission catalog unavailable/);
});
