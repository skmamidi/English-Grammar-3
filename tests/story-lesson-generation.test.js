const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const questionManifest = require('../assets/question-manifest.json');
const { validateStoryLessonRecord } = require('../assets/story-lesson-domain');
const {
  DEFAULT_STORY_LESSON_CHUNK_DIR,
  DEFAULT_STORY_LESSON_MANIFEST_JS,
  DEFAULT_STORY_LESSON_MANIFEST_JSON,
  DEFAULT_STORY_LESSON_SOURCE_DIR,
  buildStoryLessonChunkScript,
  buildStoryLessonManifestScript,
  generateStoryLessonArtifacts,
  loadStoryLessonSources
} = require('../scripts/generate-story-lessons');

const repoRoot = path.resolve(__dirname, '..');

test('story lesson canonical sources validate against the lesson domain schema', () => {
  const { lessons, coveragePolicy } = loadStoryLessonSources({ root: repoRoot });

  assert.ok(lessons.length >= 1);
  assert.equal(coveragePolicy.mode, 'fixture_only_until_content_prs');
  lessons.forEach(lesson => {
    assert.deepEqual(validateStoryLessonRecord(lesson, { manifest: questionManifest }), []);
    assert.equal(lesson.authoring.assistance.used, false);
  });
});

test('story lesson generation is deterministic and includes provenance route and chunk metadata', () => {
  const first = generateStoryLessonArtifacts({ root: repoRoot, questionManifest });
  const second = generateStoryLessonArtifacts({ root: repoRoot, questionManifest });

  assert.deepEqual(first.manifest, second.manifest);
  assert.deepEqual(first.files.map(file => file.relativePath), second.files.map(file => file.relativePath));
  assert.equal(first.manifest.schemaVersion, 1);
  assert.equal(first.manifest.artifact.type, 'story-lesson-manifest');
  assert.equal(first.manifest.artifact.generatorVersion, 1);
  assert.match(first.manifest.artifact.sourceHash, /^sha256:[a-f0-9]{64}$/);
  const grammarLesson = first.manifest.lessons.find(lesson => lesson.setId === 'grammar-sentence-types');
  assert.equal(grammarLesson.chunkFile, 'assets/story-lesson-chunks/grammar/grammar-sentence-types.js');
  assert.equal(grammarLesson.route.webPath, 'topics/grammar/subtopics/sentence-types.html?learn=1');
  assert.deepEqual(first.manifest.coverage.deferredContentPrs, []);
  assert.equal(first.manifest.coverage.coveredSetCount, 95);
  assert.equal(first.manifest.coverage.totalQuestionManifestSets, questionManifest.sets.length);
});

test('story lesson generated manifest and chunk files are fresh', () => {
  const generated = generateStoryLessonArtifacts({ root: repoRoot, questionManifest });
  const manifestJson = readText(DEFAULT_STORY_LESSON_MANIFEST_JSON);
  const manifestJs = readText(DEFAULT_STORY_LESSON_MANIFEST_JS);
  const chunk = readText(path.join(DEFAULT_STORY_LESSON_CHUNK_DIR, 'grammar', 'grammar-sentence-types.js'));
  const grammarLesson = generated.lessons.find(lesson => lesson.setId === 'grammar-sentence-types');

  assert.equal(manifestJson, `${JSON.stringify(generated.manifest, null, 2)}\n`);
  assert.equal(manifestJs, buildStoryLessonManifestScript(generated.manifest));
  assert.equal(chunk, buildStoryLessonChunkScript(grammarLesson));
  assert.doesNotMatch(manifestJs, /sourceFiles|characterRoles|pedagogyMoves/);
});

test('story lesson runtime artifacts exclude authoring records and prompt metadata', () => {
  const generated = generateStoryLessonArtifacts({ root: repoRoot, questionManifest });
  const runtimeText = generated.files.map(file => file.contents).join('\n');
  const authoringRecordPath = path.join(repoRoot, 'content-review', 'story-lesson-authoring-records.json');

  assert.ok(fs.existsSync(authoringRecordPath));
  assert.doesNotMatch(runtimeText, /promptRecordId|draftRecordId|modelFamily|provider|authoring/i);
  assert.match(runtimeText, /window\.STORY_LESSON_MANIFEST/);
  assert.match(runtimeText, /window\.STORY_LESSON_CHUNKS/);
});

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}
