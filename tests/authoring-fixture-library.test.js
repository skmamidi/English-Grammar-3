const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  AUTHORING_FIXTURE_CATEGORIES,
  DEFAULT_AUTHORING_FIXTURE_LIBRARY,
  buildAuthoringFixturePublicationBlockers,
  getAuthoringFixture,
  validateAuthoringFixtureLibrary
} = require('../assets/authoring-fixture-library');

const repoRoot = path.resolve(__dirname, '..');

test('authoring fixture library covers required deterministic content error categories', () => {
  assert.deepEqual(AUTHORING_FIXTURE_CATEGORIES, [
    'duplicated_prompt',
    'invalid_ai_assistance_metadata',
    'malformed_answer',
    'missing_attribution',
    'publication_blocker',
    'stale_source_remediation',
    'weak_explanation'
  ]);

  const categories = DEFAULT_AUTHORING_FIXTURE_LIBRARY.map(fixture => fixture.category);
  AUTHORING_FIXTURE_CATEGORIES.forEach(category => assert.ok(categories.includes(category), `missing ${category}`));
  assert.deepEqual(validateAuthoringFixtureLibrary(DEFAULT_AUTHORING_FIXTURE_LIBRARY).errors, []);
});

test('authoring fixtures are minimal safe descriptors rather than learner-facing question payloads', () => {
  const serialized = JSON.stringify(DEFAULT_AUTHORING_FIXTURE_LIBRARY);

  assert.doesNotMatch(serialized, /answerKey|correctAnswer|"\s*correct"\s*:|choices|questionText|promptText|rawAiDraft|sourceExcerpt|learner-|student-|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i);
  DEFAULT_AUTHORING_FIXTURE_LIBRARY.forEach(fixture => {
    assert.ok(fixture.id.startsWith(`authoring-fixture:${fixture.category}:`));
    assert.ok(fixture.expectedSignals.length >= 1);
    assert.ok(fixture.safeSummary);
  });
});

test('authoring fixture library exposes category lookup and publication blockers', () => {
  const malformed = getAuthoringFixture('malformed_answer');
  const blockers = buildAuthoringFixturePublicationBlockers(DEFAULT_AUTHORING_FIXTURE_LIBRARY);

  assert.equal(malformed.expectedSignals[0], 'invalid-correct-index');
  assert.ok(blockers.some(blocker => blocker.blocker === 'fixture:malformed_answer'));
  assert.ok(blockers.every(blocker => blocker.owner === 'content_reviewer'));
  assert.ok(blockers.every(blocker => blocker.status === 'needs_review'));
});

test('authoring fixture library docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'authoring-fixture-library.md'), 'utf8');
  const authoring = fs.readFileSync(path.join(repoRoot, 'docs', 'question-authoring.md'), 'utf8');
  const roadmap = fs.readFileSync(path.join(repoRoot, 'docs', 'milestone-roadmap.md'), 'utf8');
  const ciContract = fs.readFileSync(path.join(repoRoot, 'tests', 'ci-contract.test.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'malformed answers',
    'weak explanations',
    'duplicated prompts',
    'missing attribution',
    'stale source remediation',
    'invalid AI assistance metadata',
    'publication-blocking examples'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(authoring, /authoring-fixture-library\.md/);
  assert.match(roadmap, /✅.*19\.7.*authoring-fixture-library\.js/);
  assert.match(ciContract, /authoring-fixture-library/);
  assert.match(pkg.scripts['test:unit'], /tests\/authoring-fixture-library\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
