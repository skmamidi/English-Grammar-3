#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  loadQuestionBanks,
  flattenQuestionBanks
} = require('./qa/bank-loader');
const {
  loadChunkBank,
  validateQuestionChunkSet,
  validateQuestionChunks
} = require('./qa/chunk-qa');
const { CHUNKED_DOMAINS } = require('./question-chunk-config');
const {
  buildQuestionChunkScript,
  buildSubchunkDescriptors,
  getChunkedSets,
  getExpectedChunkRelativePath,
  writeQuestionChunks
} = require('./generate-question-chunks');
const {
  buildQuestionSkillTags,
  loadSkillTaxonomy
} = require('./qa/question-skill-taxonomy');
const {
  buildQuestionManifestProvenance,
  validateManifestProvenance
} = require('./question-artifact-provenance');

const MANIFEST_SCHEMA_VERSION = 1;
const DEFAULT_MANIFEST_PATH = path.join(repoRoot, 'assets', 'question-manifest.json');
const DEFAULT_MANIFEST_SCRIPT_PATH = path.join(repoRoot, 'assets', 'question-manifest.js');

function generateManifest(bankLoad) {
  const taxonomy = loadSkillTaxonomy();
  const sets = flattenQuestionBanks(bankLoad).map(record => buildSetManifest(record, taxonomy));
  const totalQuestions = sets.reduce((sum, set) => sum + set.questionCount, 0);

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    artifact: buildQuestionManifestProvenance(bankLoad),
    totalQuestions,
    sets
  };
}

function buildSetManifest(record, taxonomy) {
  const set = record.set || {};
  const questions = Array.isArray(set.questions) ? set.questions : [];
  const domain = getDomain(record);
  const questionManifests = questions.map((question, index) => buildQuestionManifest(question, index + 1, domain, taxonomy));
  const manifest = {
    id: record.setId,
    title: set.title || '',
    topic: set.topic || '',
    domain,
    questionCount: questionManifests.length,
    gradesSupported: getSupportedGrades(set, questionManifests),
    difficultiesSupported: getSupportedDifficulties(set, questionManifests),
    skillCoverage: buildCoverage(questionManifests, 'skillIds', 'skillId'),
    standardCoverage: buildCoverage(questionManifests, 'standardIds', 'standardId'),
    questions: questionManifests
  };

  if (CHUNKED_DOMAINS.has(domain)) {
    const chunks = buildSubchunkDescriptors({
      domain,
      setId: record.setId,
      sourceFile: record.relativeFile,
      set
    });
    if (chunks.length) {
      manifest.chunks = chunks;
      manifest.chunkFile = chunks[0].chunkFile;
    } else {
      manifest.chunkFile = getExpectedChunkRelativePath({ domain, setId: record.setId });
    }
  }

  return manifest;
}

function buildQuestionManifest(question, fallbackSequence, domain, taxonomy) {
  const metadata = question && question.metadata || {};
  const tags = buildQuestionSkillTags({ question, domain, taxonomy });
  const sequence = Number.isInteger(Number(metadata.sequence)) && Number(metadata.sequence) > 0
    ? Number(metadata.sequence)
    : fallbackSequence;

  return {
    id: question && question.id || '',
    version: question && question.version || 1,
    contentHash: question && question.contentHash || '',
    sequence,
    gradeLevels: normalizeSortedNumbers(metadata.gradeLevels),
    difficultyByGrade: sortObjectValues(metadata.difficultyByGrade),
    skills: normalizeSortedStrings(metadata.skills),
    skillIds: tags.skillIds,
    standardIds: tags.standardIds
  };
}

function getDomain(record) {
  if (record.domain) return record.domain;
  const basename = path.basename(record.relativeFile || '', '.js');
  if (basename) return basename;
  return String(record.setId || '').split('-')[0];
}

function getSupportedGrades(set, questionManifests) {
  const configured = set && set.metadata && set.metadata.gradesSupported;
  if (Array.isArray(configured) && configured.length) return normalizeSortedNumbers(configured);

  const grades = [];
  questionManifests.forEach(question => {
    grades.push(...question.gradeLevels);
  });
  return normalizeSortedNumbers(grades);
}

function getSupportedDifficulties(set, questionManifests) {
  const configured = set && set.metadata && set.metadata.difficultiesSupported;
  if (Array.isArray(configured) && configured.length) return normalizeSortedStrings(configured);

  const difficulties = [];
  questionManifests.forEach(question => {
    difficulties.push(...Object.values(question.difficultyByGrade));
  });
  return normalizeSortedStrings(difficulties);
}

function normalizeSortedNumbers(values) {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map(value => Number(value))
    .filter(value => Number.isFinite(value))))
    .sort((a, b) => a - b);
}

function normalizeSortedStrings(values) {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .filter(value => value !== undefined && value !== null && String(value).trim())
    .map(value => String(value))))
    .sort();
}

function sortObjectValues(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.keys(value).sort().reduce((sorted, key) => {
    sorted[key] = String(value[key]);
    return sorted;
  }, {});
}

function loadManifest(file = DEFAULT_MANIFEST_PATH) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeManifest(manifest, file = DEFAULT_MANIFEST_PATH) {
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

function writeManifestScript(manifest, file = DEFAULT_MANIFEST_SCRIPT_PATH) {
  fs.writeFileSync(file, buildManifestScript(manifest));
}

function buildManifestScript(manifest) {
  return `window.QUESTION_MANIFEST=${JSON.stringify(buildIndexManifest(manifest))};\n`;
}

function buildIndexManifest(manifest) {
  return {
    schemaVersion: manifest.schemaVersion,
    artifact: manifest.artifact,
    totalQuestions: manifest.totalQuestions,
    sets: (manifest.sets || []).map(set => ({
      id: set.id,
      title: set.title,
      topic: set.topic,
      domain: set.domain,
      chunkFile: set.chunkFile,
      chunks: Array.isArray(set.chunks)
        ? set.chunks.map(chunk => ({
          chunkFile: chunk.chunkFile,
          firstSequence: chunk.firstSequence,
          lastSequence: chunk.lastSequence,
          questionCount: chunk.questionCount
        }))
        : undefined,
      questionCount: set.questionCount,
      gradesSupported: set.gradesSupported,
      difficultiesSupported: set.difficultiesSupported,
      skillCoverage: set.skillCoverage,
      standardCoverage: set.standardCoverage
    }))
  };
}

function buildCoverage(questions, property, keyName) {
  const coverage = new Map();
  questions.forEach(question => {
    (Array.isArray(question[property]) ? question[property] : []).forEach(id => {
      const current = coverage.get(id) || { [keyName]: id, questionCount: 0 };
      current.questionCount += 1;
      coverage.set(id, current);
    });
  });
  return Array.from(coverage.values()).sort((a, b) => a[keyName].localeCompare(b[keyName]));
}

function getChunkedDomains() {
  return new Set(CHUNKED_DOMAINS);
}

function getSourceSet(bankLoad, setId) {
  const record = flattenQuestionBanks(bankLoad).find(item => item.setId === setId);
  return record ? record.set : null;
}

function validateManifest(manifest, bankLoad = loadQuestionBanks(), options = {}) {
  const expected = generateManifest(bankLoad);
  const provenance = validateManifestProvenance(manifest, bankLoad);
  if (provenance.errors.length) {
    throw new Error(`Question manifest provenance is stale:\n${provenance.errors.join('\n')}`);
  }
  if (options.validateChunks) {
    const chunkResult = validateQuestionChunks(manifest, bankLoad);
    if (chunkResult.errors.length) {
      throw new Error(`Question chunk validation failed:\n${chunkResult.errors.join('\n')}`);
    }
  }
  const actualJson = JSON.stringify(manifest);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(getManifestDriftMessage(manifest, expected));
  }
  return expected;
}

function validateManifestScript(manifest, file = DEFAULT_MANIFEST_SCRIPT_PATH) {
  const expectedScript = buildManifestScript(manifest);
  const actualScript = fs.readFileSync(file, 'utf8');
  if (actualScript !== expectedScript) {
    throw new Error(`Question manifest script is stale. Regenerate ${path.relative(repoRoot, file)}.`);
  }
  return expectedScript;
}

function getManifestDriftMessage(actual, expected) {
  if (!actual || typeof actual !== 'object') return 'Question manifest is missing or malformed.';
  if (actual.schemaVersion !== expected.schemaVersion) {
    return `Question manifest schemaVersion is ${actual.schemaVersion}; expected ${expected.schemaVersion}.`;
  }
  if (actual.totalQuestions !== expected.totalQuestions) {
    return `Question manifest totalQuestions is ${actual.totalQuestions}; expected ${expected.totalQuestions}.`;
  }
  if (!Array.isArray(actual.sets)) return 'Question manifest sets must be an array.';
  if (actual.sets.length !== expected.sets.length) {
    return `Question manifest set count is ${actual.sets.length}; expected ${expected.sets.length}.`;
  }

  for (let index = 0; index < expected.sets.length; index += 1) {
    const actualSet = actual.sets[index];
    const expectedSet = expected.sets[index];
    if (!actualSet || actualSet.id !== expectedSet.id) {
      return `Question manifest set ${index + 1} is ${actualSet && actualSet.id}; expected ${expectedSet.id}.`;
    }
    if (JSON.stringify(actualSet) !== JSON.stringify(expectedSet)) {
      return `Question manifest set "${expectedSet.id}" is stale. Regenerate assets/question-manifest.json.`;
    }
  }

  return 'Question manifest is stale. Regenerate assets/question-manifest.json.';
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function runCli(argv = process.argv.slice(2)) {
  const shouldWrite = argv.includes('--write');
  const shouldCheckChunks = shouldWrite || argv.includes('--check-chunks') || !argv.includes('--no-check-chunks');
  const manifestPath = DEFAULT_MANIFEST_PATH;
  const bankLoad = loadQuestionBanks();
  const generated = generateManifest(bankLoad);

  if (shouldWrite) {
    writeManifest(generated, manifestPath);
    writeManifestScript(generated);
    writeQuestionChunks(generated, bankLoad);
  } else {
    validateManifest(loadManifest(manifestPath), bankLoad, { validateChunks: shouldCheckChunks });
    validateManifestScript(generated);
  }

  const stats = fs.statSync(manifestPath);
  const action = shouldWrite ? 'Generated' : 'Validated';
  console.log(`${action} ${path.relative(repoRoot, manifestPath)}.`);
  console.log(`Manifest covers ${generated.sets.length} sets and ${generated.totalQuestions} questions.`);
  console.log(`Manifest size: ${formatBytes(stats.size)}.`);
  if (shouldCheckChunks) console.log(`Validated ${getChunkedSets(generated).length} generated question chunks.`);
}

if (require.main === module) runCli();

module.exports = {
  DEFAULT_MANIFEST_PATH,
  DEFAULT_MANIFEST_SCRIPT_PATH,
  MANIFEST_SCHEMA_VERSION,
  generateManifest,
  buildQuestionChunkScript,
  buildIndexManifest,
  buildManifestScript,
  getChunkedDomains,
  getChunkedSets,
  getSourceSet,
  loadChunkBank,
  loadManifest,
  validateQuestionChunkSet,
  validateQuestionChunks,
  validateManifest,
  validateManifestScript,
  writeManifest,
  writeManifestScript,
  writeQuestionChunks
};
