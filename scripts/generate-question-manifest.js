#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  loadQuestionBanks,
  flattenQuestionBanks
} = require('./qa/bank-loader');

const MANIFEST_SCHEMA_VERSION = 1;
const DEFAULT_MANIFEST_PATH = path.join(repoRoot, 'assets', 'question-manifest.json');
const DEFAULT_MANIFEST_SCRIPT_PATH = path.join(repoRoot, 'assets', 'question-manifest.js');

function generateManifest(bankLoad) {
  const sets = flattenQuestionBanks(bankLoad).map(record => buildSetManifest(record));
  const totalQuestions = sets.reduce((sum, set) => sum + set.questionCount, 0);

  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    totalQuestions,
    sets
  };
}

function buildSetManifest(record) {
  const set = record.set || {};
  const questions = Array.isArray(set.questions) ? set.questions : [];
  const questionManifests = questions.map((question, index) => buildQuestionManifest(question, index + 1));

  return {
    id: record.setId,
    title: set.title || '',
    topic: set.topic || '',
    domain: getDomain(record),
    bankFile: record.relativeFile,
    questionCount: questionManifests.length,
    gradesSupported: getSupportedGrades(set, questionManifests),
    difficultiesSupported: getSupportedDifficulties(set, questionManifests),
    questions: questionManifests
  };
}

function buildQuestionManifest(question, fallbackSequence) {
  const metadata = question && question.metadata || {};
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
    skills: normalizeSortedStrings(metadata.skills)
  };
}

function getDomain(record) {
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
  fs.writeFileSync(file, `window.QUESTION_MANIFEST = ${JSON.stringify(buildIndexManifest(manifest), null, 2)};\n`);
}

function buildIndexManifest(manifest) {
  return {
    schemaVersion: manifest.schemaVersion,
    totalQuestions: manifest.totalQuestions,
    sets: (manifest.sets || []).map(set => ({
      id: set.id,
      title: set.title,
      topic: set.topic,
      domain: set.domain,
      bankFile: set.bankFile,
      questionCount: set.questionCount,
      gradesSupported: set.gradesSupported,
      difficultiesSupported: set.difficultiesSupported
    }))
  };
}

function validateManifest(manifest, bankLoad = loadQuestionBanks()) {
  const expected = generateManifest(bankLoad);
  const actualJson = JSON.stringify(manifest);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(getManifestDriftMessage(manifest, expected));
  }
  return expected;
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
  const manifestPath = DEFAULT_MANIFEST_PATH;
  const bankLoad = loadQuestionBanks();
  const generated = generateManifest(bankLoad);

  if (shouldWrite) {
    writeManifest(generated, manifestPath);
    writeManifestScript(generated);
  } else {
    validateManifest(loadManifest(manifestPath), bankLoad);
  }

  const stats = fs.statSync(manifestPath);
  const action = shouldWrite ? 'Generated' : 'Validated';
  console.log(`${action} ${path.relative(repoRoot, manifestPath)}.`);
  console.log(`Manifest covers ${generated.sets.length} sets and ${generated.totalQuestions} questions.`);
  console.log(`Manifest size: ${formatBytes(stats.size)}.`);
}

if (require.main === module) runCli();

module.exports = {
  DEFAULT_MANIFEST_PATH,
  DEFAULT_MANIFEST_SCRIPT_PATH,
  MANIFEST_SCHEMA_VERSION,
  generateManifest,
  buildIndexManifest,
  loadManifest,
  validateManifest,
  writeManifest,
  writeManifestScript
};
