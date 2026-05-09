const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_GUIDED_MISSION_CATALOG_JS,
  DEFAULT_GUIDED_MISSION_CATALOG_JSON,
  DEFAULT_GUIDED_MISSION_SOURCE_DIR,
  generateGuidedMissionArtifacts,
  loadGuidedMissionSources,
  writeGuidedMissionArtifacts
} = require('../scripts/generate-guided-missions');
const questionManifest = require('../assets/question-manifest.json');

test('guided mission generation is deterministic and includes provenance route and catalog metadata', () => {
  const generated = generateGuidedMissionArtifacts();
  const generatedAgain = generateGuidedMissionArtifacts();

  assert.deepEqual(generated.catalog, generatedAgain.catalog);
  assert.equal(generated.catalog.schemaVersion, 1);
  assert.equal(generated.catalog.artifact.type, 'guided-mission-catalog');
  assert.equal(generated.catalog.artifact.sourceType, 'json');
  assert.match(generated.catalog.artifact.sourceHash, /^sha256:[a-f0-9]{64}$/);
  assert.ok(generated.catalog.artifact.sourceFiles.every(file => file.startsWith(`${DEFAULT_GUIDED_MISSION_SOURCE_DIR}/`)));
  assert.equal(generated.catalog.totalMissions, 2);
  assert.deepEqual(generated.catalog.missions.map(mission => mission.missionId), [
    'mission-capitalization-starter-trail',
    'mission-sentence-detectives'
  ]);
  assert.equal(generated.catalog.missions[0].route.type, 'guided_mission');
  assert.equal(generated.catalog.missions[0].stepSummaries.every(step => step.route && step.route.webPath), true);
  assert.equal(generated.files.some(file => file.relativePath === DEFAULT_GUIDED_MISSION_CATALOG_JSON), true);
  assert.equal(generated.files.some(file => file.relativePath === DEFAULT_GUIDED_MISSION_CATALOG_JS), true);
});

test('guided mission generated catalog excludes lesson question provider and learner payloads', () => {
  const { catalog, files } = generateGuidedMissionArtifacts();
  const serialized = JSON.stringify(catalog);

  assert.equal(serialized.includes('"lessonRef"'), false);
  assert.equal(serialized.includes('"practiceRef"'), false);
  assert.equal(serialized.includes('"reviewRef"'), false);
  assert.equal(serialized.includes('"storyBeats"'), false);
  assert.equal(serialized.includes('"question"'), false);
  assert.equal(serialized.includes('"answer"'), false);
  assert.equal(serialized.includes('"explanation"'), false);
  assert.equal(serialized.includes('"providerPayload"'), false);
  assert.equal(serialized.includes('"learnerName"'), false);
  assert.ok(files.find(file => file.relativePath === DEFAULT_GUIDED_MISSION_CATALOG_JS).contents.includes('window.GUIDED_MISSION_CATALOG='));
});

test('guided mission source loader and writer support isolated fixtures', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guided-mission-generation-'));
  const sourceDir = path.join(root, DEFAULT_GUIDED_MISSION_SOURCE_DIR);
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.copyFileSync(
    path.join(__dirname, 'fixtures', 'guided-missions', 'valid-sentence-mission.json'),
    path.join(sourceDir, 'valid-sentence-mission.json')
  );

  const loaded = loadGuidedMissionSources({ root });
  assert.equal(loaded.missions.length, 1);
  assert.equal(loaded.sourceFiles[0], `${DEFAULT_GUIDED_MISSION_SOURCE_DIR}/valid-sentence-mission.json`);

  const generated = generateGuidedMissionArtifacts({ root, questionManifest });
  const written = writeGuidedMissionArtifacts(generated, { root });
  assert.deepEqual(written.written.sort(), [
    DEFAULT_GUIDED_MISSION_CATALOG_JS,
    DEFAULT_GUIDED_MISSION_CATALOG_JSON
  ].sort());
  assert.equal(fs.existsSync(path.join(root, DEFAULT_GUIDED_MISSION_CATALOG_JSON)), true);
});
