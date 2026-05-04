#!/usr/bin/env node

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  normalizeLessonSummary,
  normalizeStoryLessonRecord
} = require('../assets/story-lesson-domain');

const repoRoot = path.resolve(__dirname, '..');
const DEFAULT_STORY_LESSON_SOURCE_DIR = path.join('assets', 'story-lesson-source');
const DEFAULT_STORY_LESSON_CHUNK_DIR = path.join('assets', 'story-lesson-chunks');
const DEFAULT_STORY_LESSON_MANIFEST_JSON = path.join('assets', 'story-lesson-manifest.json');
const DEFAULT_STORY_LESSON_MANIFEST_JS = path.join('assets', 'story-lesson-manifest.js');
const GENERATOR_VERSION = 1;
const GENERATED_AT = '2030-05-01T00:00:00.000Z';

function loadStoryLessonSources(options = {}) {
  const root = options.root || repoRoot;
  const sourceDir = path.join(root, options.sourceDir || DEFAULT_STORY_LESSON_SOURCE_DIR);
  const files = fs.existsSync(sourceDir)
    ? fs.readdirSync(sourceDir).filter(file => file.endsWith('.json')).sort()
    : [];
  const lessons = [];
  let coveragePolicy = { schemaVersion: 1, mode: 'strict', domainDeferrals: {} };

  files.forEach(file => {
    const relativePath = path.posix.join(options.sourceDir || DEFAULT_STORY_LESSON_SOURCE_DIR, file);
    const fullPath = path.join(root, relativePath);
    const value = readJson(fullPath);
    if (file === 'coverage-exclusions.json') {
      coveragePolicy = normalizeCoveragePolicy(value);
      return;
    }
    lessons.push(Object.assign({}, value, { sourceFile: relativePath }));
  });

  return { lessons, coveragePolicy, sourceFiles: files.map(file => path.posix.join(options.sourceDir || DEFAULT_STORY_LESSON_SOURCE_DIR, file)) };
}

function generateStoryLessonArtifacts(options = {}) {
  const root = options.root || repoRoot;
  const questionManifest = options.questionManifest || readJson(path.join(root, 'assets', 'question-manifest.json'));
  const sourceLoad = loadStoryLessonSources({ root, sourceDir: options.sourceDir });
  const lessons = sourceLoad.lessons
    .map(lesson => normalizeStoryLessonRecord(lesson, { manifest: questionManifest }))
    .sort((left, right) => left.setId.localeCompare(right.setId));
  const summaries = sourceLoad.lessons
    .map(lesson => normalizeLessonSummary(lesson, { manifest: questionManifest }))
    .sort((left, right) => left.setId.localeCompare(right.setId));
  const sourceHash = hashJson({
    lessons: sourceLoad.lessons.map(stripSourceFile),
    coveragePolicy: sourceLoad.coveragePolicy
  });
  const coverage = buildCoverageSummary({
    questionManifest,
    lessons,
    coveragePolicy: sourceLoad.coveragePolicy
  });
  const manifest = {
    schemaVersion: 1,
    artifact: {
      type: 'story-lesson-manifest',
      artifactSchemaVersion: 1,
      generatorVersion: GENERATOR_VERSION,
      sourceType: 'json',
      sourceHash,
      sourceFiles: sourceLoad.sourceFiles
    },
    generatedAt: GENERATED_AT,
    totalLessons: summaries.length,
    coverage,
    lessons: summaries.map(summary => Object.assign({}, summary, {
      chunkFile: getStoryLessonChunkRelativePath(summary)
    }))
  };
  const files = [
    {
      relativePath: DEFAULT_STORY_LESSON_MANIFEST_JSON,
      contents: `${JSON.stringify(manifest, null, 2)}\n`
    },
    {
      relativePath: DEFAULT_STORY_LESSON_MANIFEST_JS,
      contents: buildStoryLessonManifestScript(manifest)
    },
    ...lessons.map(lesson => ({
      relativePath: getStoryLessonChunkRelativePath(lesson),
      contents: buildStoryLessonChunkScript(lesson)
    }))
  ];
  return { manifest, lessons, coveragePolicy: sourceLoad.coveragePolicy, files };
}

function buildCoverageSummary({ questionManifest, lessons, coveragePolicy }) {
  const lessonSetIds = new Set(lessons.map(lesson => lesson.setId));
  const sets = Array.isArray(questionManifest && questionManifest.sets) ? questionManifest.sets : [];
  const excluded = sets.filter(set => !lessonSetIds.has(set.id) && getDomainDeferral(set.domain, coveragePolicy));
  return {
    mode: coveragePolicy.mode || 'strict',
    totalQuestionManifestSets: sets.length,
    coveredSetCount: lessonSetIds.size,
    excludedSetCount: excluded.length,
    deferredContentPrs: Array.from(new Set(excluded.map(set => getDomainDeferral(set.domain, coveragePolicy).pr)
      .concat(coveragePolicy.additionalDeferredPrs || [])
      .filter(Boolean))).sort((a, b) => a - b)
  };
}

function buildStoryLessonManifestScript(manifest) {
  return `(function () {
  'use strict';
  if (!window.GRAMMAR_QUEST_STORY_LESSON_CHUNK_ERROR_WIRED) {
    window.GRAMMAR_QUEST_STORY_LESSON_CHUNK_ERROR_WIRED = true;
    window.addEventListener('error', function (event) {
      const target = event && event.target;
      const src = target && target.src || '';
      if (/\\/assets\\/story-lesson-chunks\\//.test(src)) window.GRAMMAR_QUEST_OFFLINE_LESSON_MISSING = true;
    }, true);
  }
  window.STORY_LESSON_MANIFEST=${JSON.stringify(stripRuntimeManifest(manifest))};
})();
`;
}

function buildStoryLessonChunkScript(lesson) {
  const runtimeLesson = stripAuthoring(lesson);
  return `/**
 * English Language Quiz App - story lesson chunk: ${runtimeLesson.setId}
 * Generated from canonical story lesson source.
 * Generator version: ${GENERATOR_VERSION}.
 */
(function () {
  'use strict';
  window.STORY_LESSON_CHUNKS = Object.assign(window.STORY_LESSON_CHUNKS || {}, ${JSON.stringify({ [runtimeLesson.setId]: runtimeLesson })});
})();
`;
}

function writeStoryLessonArtifacts(generated = generateStoryLessonArtifacts(), options = {}) {
  const root = options.root || repoRoot;
  const written = [];
  generated.files.forEach(file => {
    const fullPath = path.join(root, file.relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, file.contents);
    written.push(file.relativePath);
  });
  return { written };
}

function getStoryLessonChunkRelativePath(lesson) {
  return path.posix.join(DEFAULT_STORY_LESSON_CHUNK_DIR, lesson.domain, `${lesson.setId}.js`);
}

function normalizeCoveragePolicy(policy) {
  const input = policy && typeof policy === 'object' ? policy : {};
  return {
    schemaVersion: Number(input.schemaVersion) || 1,
    mode: String(input.mode || 'strict'),
    description: String(input.description || ''),
    additionalDeferredPrs: Array.from(new Set((Array.isArray(input.additionalDeferredPrs) ? input.additionalDeferredPrs : [])
      .map(Number)
      .filter(Number.isFinite))).sort((a, b) => a - b),
    domainDeferrals: Object.keys(input.domainDeferrals || {}).sort().reduce((result, domain) => {
      const deferral = input.domainDeferrals[domain] || {};
      result[domain] = {
        pr: Number(deferral.pr) || 0,
        reason: String(deferral.reason || '')
      };
      return result;
    }, {})
  };
}

function getDomainDeferral(domain, coveragePolicy) {
  return coveragePolicy && coveragePolicy.domainDeferrals && coveragePolicy.domainDeferrals[domain] || null;
}

function stripSourceFile(lesson) {
  const clone = Object.assign({}, lesson);
  delete clone.sourceFile;
  return clone;
}

function stripAuthoring(value) {
  if (Array.isArray(value)) return value.map(stripAuthoring);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((result, key) => {
    if (key === 'authoring' || key === 'sourceFile') return result;
    result[key] = stripAuthoring(value[key]);
    return result;
  }, {});
}

function stripRuntimeManifest(manifest) {
  const input = manifest && typeof manifest === 'object' ? manifest : {};
  const artifact = Object.assign({}, input.artifact || {});
  delete artifact.sourceFiles;
  return Object.assign({}, input, {
    artifact,
    lessons: (Array.isArray(input.lessons) ? input.lessons : []).map(lesson => {
      const summary = Object.assign({}, lesson);
      delete summary.tags;
      delete summary.characterRoles;
      delete summary.relatedSubtopics;
      return summary;
    })
  });
}

function hashJson(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

if (require.main === module) {
  const shouldWrite = process.argv.includes('--write');
  const generated = generateStoryLessonArtifacts();
  if (shouldWrite) {
    const result = writeStoryLessonArtifacts(generated);
    console.log(`Wrote ${result.written.length} story lesson artifact(s).`);
  } else {
    console.log(`Generated ${generated.manifest.totalLessons} story lesson(s) in dry run.`);
  }
}

module.exports = {
  DEFAULT_STORY_LESSON_CHUNK_DIR,
  DEFAULT_STORY_LESSON_MANIFEST_JS,
  DEFAULT_STORY_LESSON_MANIFEST_JSON,
  DEFAULT_STORY_LESSON_SOURCE_DIR,
  buildStoryLessonChunkScript,
  buildStoryLessonManifestScript,
  generateStoryLessonArtifacts,
  getStoryLessonChunkRelativePath,
  loadStoryLessonSources,
  writeStoryLessonArtifacts
};
