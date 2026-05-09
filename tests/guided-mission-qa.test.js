const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_GUIDED_MISSION_CATALOG_JSON,
  generateGuidedMissionArtifacts,
  writeGuidedMissionArtifacts
} = require('../scripts/generate-guided-missions');
const {
  runGuidedMissionQa,
  validateGuidedMissionCatalogCoverage,
  validateGuidedMissionFreshness
} = require('../scripts/qa/guided-mission-qa');
const questionManifest = require('../assets/question-manifest.json');

test('guided mission QA passes current catalog coverage and freshness policy', () => {
  const result = runGuidedMissionQa();

  assert.deepEqual(result.errors, []);
  assert.equal(result.coverage.missionCount, 2);
  assert.equal(result.coverage.coveredDomainCount >= 2, true);
  assert.equal(result.freshness.errors.length, 0);
});

test('guided mission QA rejects copied content payloads and unknown route refs', () => {
  const generated = generateGuidedMissionArtifacts();
  const missions = JSON.parse(JSON.stringify(generated.missions));
  missions[0].steps[0].lessonRef.storyBeats = [{ narrative: 'Copied lesson body.' }];
  missions[1].steps[1].practiceRef.setId = 'grammar-unknown';

  const coverage = validateGuidedMissionCatalogCoverage({
    missions,
    questionManifest: require('../assets/question-manifest.json')
  });

  assert.ok(coverage.errors.some(error => error.code === 'invalid_guided_mission_source' && /mission_must_not_include_content_payload/.test(error.message)));
  assert.ok(coverage.errors.some(error => error.code === 'invalid_guided_mission_source' && /mission_step_practice_set_unknown:grammar-unknown/.test(error.message)));
});

test('guided mission QA detects stale generated catalog artifacts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guided-mission-qa-'));
  copyDir(path.join(__dirname, '..', 'assets', 'guided-mission-source'), path.join(root, 'assets', 'guided-mission-source'));
  writeGuidedMissionArtifacts(generateGuidedMissionArtifacts({ root, questionManifest }), { root });
  fs.writeFileSync(path.join(root, DEFAULT_GUIDED_MISSION_CATALOG_JSON), '{"stale":true}\n');

  const freshness = validateGuidedMissionFreshness({
    root,
    expected: generateGuidedMissionArtifacts({ root, questionManifest })
  });

  assert.ok(freshness.errors.some(error => error.code === 'stale_guided_mission_catalog_json'));
});

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from, { withFileTypes: true }).forEach(entry => {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  });
}
