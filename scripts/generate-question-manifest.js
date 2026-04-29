#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  repoRoot,
  loadQuestionBanks,
  flattenQuestionBanks
} = require('./qa/bank-loader');

const MANIFEST_SCHEMA_VERSION = 1;
const DEFAULT_MANIFEST_PATH = path.join(repoRoot, 'assets', 'question-manifest.json');
const DEFAULT_MANIFEST_SCRIPT_PATH = path.join(repoRoot, 'assets', 'question-manifest.js');
const CHUNKED_DOMAINS = new Set(['capitalization']);

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
  const domain = getDomain(record);
  const manifest = {
    id: record.setId,
    title: set.title || '',
    topic: set.topic || '',
    domain,
    bankFile: record.relativeFile,
    questionCount: questionManifests.length,
    gradesSupported: getSupportedGrades(set, questionManifests),
    difficultiesSupported: getSupportedDifficulties(set, questionManifests),
    questions: questionManifests
  };

  if (CHUNKED_DOMAINS.has(domain)) {
    manifest.chunkFile = `assets/question-chunks/${domain}/${record.setId}.js`;
  }

  return manifest;
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
      chunkFile: set.chunkFile,
      questionCount: set.questionCount,
      gradesSupported: set.gradesSupported,
      difficultiesSupported: set.difficultiesSupported
    }))
  };
}

function getChunkedDomains() {
  return new Set(CHUNKED_DOMAINS);
}

function getChunkedSets(manifest) {
  return (manifest.sets || []).filter(set => set && set.chunkFile);
}

function getSourceSet(bankLoad, setId) {
  const record = flattenQuestionBanks(bankLoad).find(item => item.setId === setId);
  return record ? record.set : null;
}

function getSourceRecord(bankLoad, setId) {
  return flattenQuestionBanks(bankLoad).find(item => item.setId === setId) || null;
}

function buildQuestionChunkScript(setId, set, sourceFile) {
  const domain = getDomain({
    setId,
    relativeFile: sourceFile
  });
  return `/**
 * English Language Quiz App - ${domain} chunk: ${setId}
 * Generated from ${sourceFile}.
 */
(function () {
  'use strict';
  window.QUESTION_BANK = Object.assign(window.QUESTION_BANK || {}, ${JSON.stringify({ [setId]: set }, null, 2)}
  );
})();
`;
}

function writeQuestionChunks(manifest, bankLoad) {
  const expectedFiles = new Set();

  getChunkedSets(manifest).forEach(entry => {
    const sourceRecord = getSourceRecord(bankLoad, entry.id);
    if (!sourceRecord) throw new Error(`${entry.id}: source set missing for chunk generation.`);

    const chunkPath = path.join(repoRoot, entry.chunkFile);
    expectedFiles.add(chunkPath);
    fs.mkdirSync(path.dirname(chunkPath), { recursive: true });
    fs.writeFileSync(
      chunkPath,
      buildQuestionChunkScript(entry.id, sourceRecord.set, sourceRecord.relativeFile)
    );
  });

  getChunkedDomains().forEach(domain => {
    const domainDir = path.join(repoRoot, 'assets', 'question-chunks', domain);
    if (!fs.existsSync(domainDir)) return;

    fs.readdirSync(domainDir)
      .filter(file => file.endsWith('.js'))
      .forEach(file => {
        const chunkPath = path.join(domainDir, file);
        if (!expectedFiles.has(chunkPath)) fs.unlinkSync(chunkPath);
      });
  });
}

function loadChunkBank(chunkFile) {
  const chunkPath = path.isAbsolute(chunkFile) ? chunkFile : path.join(repoRoot, chunkFile);
  const context = {
    window: { QUESTION_BANK: {} },
    console
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(chunkPath, 'utf8'), context, { filename: chunkPath });
  return context.window.QUESTION_BANK || {};
}

function validateQuestionChunks(manifest, bankLoad) {
  const errors = [];

  getChunkedSets(manifest).forEach(entry => {
    const sourceSet = getSourceSet(bankLoad, entry.id);
    let chunkBank = null;

    if (!sourceSet) {
      errors.push(`${entry.id}: source set missing`);
      return;
    }

    try {
      chunkBank = loadChunkBank(entry.chunkFile);
    } catch (error) {
      errors.push(`${entry.id}: chunk file could not be loaded from ${entry.chunkFile}: ${error.message}`);
      return;
    }

    const chunkSet = chunkBank && chunkBank[entry.id];
    validateQuestionChunkSet({
      setId: entry.id,
      sourceSet,
      chunkSet
    }).errors.forEach(error => errors.push(error));
  });

  return { errors };
}

function validateQuestionChunkSet({ setId, sourceSet, chunkSet }) {
  const errors = [];

  if (!sourceSet) errors.push(`${setId}: source set missing`);
  if (!chunkSet) errors.push(`${setId}: chunk set missing`);
  if (!sourceSet || !chunkSet) return { errors };

  if (sourceSet.title !== chunkSet.title) {
    errors.push(`${setId}: title differs between source bank and chunk`);
  }
  if (sourceSet.topic !== chunkSet.topic) {
    errors.push(`${setId}: topic differs between source bank and chunk`);
  }

  const sourceQuestions = Array.isArray(sourceSet.questions) ? sourceSet.questions : [];
  const chunkQuestions = Array.isArray(chunkSet.questions) ? chunkSet.questions : [];
  if (sourceQuestions.length !== chunkQuestions.length) {
    errors.push(`${setId}: question count is ${chunkQuestions.length}; expected ${sourceQuestions.length}`);
  }

  const maxQuestions = Math.min(sourceQuestions.length, chunkQuestions.length);
  for (let index = 0; index < maxQuestions; index += 1) {
    const sourceQuestion = sourceQuestions[index] || {};
    const chunkQuestion = chunkQuestions[index] || {};
    const label = sourceQuestion.id || chunkQuestion.id || `question ${index + 1}`;

    if (sourceQuestion.id !== chunkQuestion.id) {
      errors.push(`${setId}: question ${index + 1} id is ${chunkQuestion.id}; expected ${sourceQuestion.id}`);
      break;
    }
    if (sourceQuestion.version !== chunkQuestion.version) {
      errors.push(`${setId}/${label}: version is ${chunkQuestion.version}; expected ${sourceQuestion.version}`);
      break;
    }
    if (sourceQuestion.contentHash !== chunkQuestion.contentHash) {
      errors.push(`${setId}/${label}: contentHash is ${chunkQuestion.contentHash}; expected ${sourceQuestion.contentHash}`);
      break;
    }
  }

  if (JSON.stringify(chunkSet) !== JSON.stringify(sourceSet)) {
    errors.push(`${setId}: chunk content differs from source bank`);
  }

  return { errors };
}

function validateManifest(manifest, bankLoad = loadQuestionBanks(), options = {}) {
  const expected = generateManifest(bankLoad);
  const actualJson = JSON.stringify(manifest);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(getManifestDriftMessage(manifest, expected));
  }
  if (options.validateChunks) {
    const chunkResult = validateQuestionChunks(manifest, bankLoad);
    if (chunkResult.errors.length) {
      throw new Error(`Question chunk validation failed:\n${chunkResult.errors.join('\n')}`);
    }
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
  getChunkedDomains,
  getChunkedSets,
  getSourceSet,
  loadChunkBank,
  loadManifest,
  validateQuestionChunkSet,
  validateQuestionChunks,
  validateManifest,
  writeManifest,
  writeManifestScript,
  writeQuestionChunks
};
