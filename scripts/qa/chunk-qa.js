#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  repoRoot,
  flattenQuestionBanks,
  loadQuestionBanks
} = require('./bank-loader');

function getChunkManifestEntries(manifest) {
  return (manifest && Array.isArray(manifest.sets) ? manifest.sets : [])
    .filter(set => set && set.chunkFile);
}

function loadChunkBank(chunkFile, options = {}) {
  const root = options.repoRoot || repoRoot;
  const chunkPath = path.isAbsolute(chunkFile) ? chunkFile : path.join(root, chunkFile);

  if (!fs.existsSync(chunkPath)) {
    throw new Error(`Chunk file does not exist: ${chunkFile}`);
  }

  const context = {
    window: { QUESTION_BANK: {} },
    console
  };

  vm.createContext(context);
  vm.runInContext(fs.readFileSync(chunkPath, 'utf8'), context, { filename: chunkPath });
  return context.window.QUESTION_BANK || {};
}

function validateQuestionChunks(manifest, bankLoad, options = {}) {
  const sourceRecords = new Map(flattenQuestionBanks(bankLoad).map(record => [record.setId, record]));
  const errors = [];

  getChunkManifestEntries(manifest).forEach(entry => {
    const sourceRecord = sourceRecords.get(entry.id);

    if (!sourceRecord) {
      errors.push(`${entry.id}: source set missing.`);
      return;
    }

    let chunkBank;
    try {
      chunkBank = loadChunkBank(entry.chunkFile, options);
    } catch (error) {
      errors.push(`${entry.id}: chunk file could not be loaded from ${entry.chunkFile}: ${error.message}`);
      return;
    }

    const chunkSetIds = Object.keys(chunkBank || {});
    if (chunkSetIds.length !== 1 || chunkSetIds[0] !== entry.id) {
      errors.push(`${entry.id}: chunk populates [${chunkSetIds.join(', ')}]; expected exactly ${entry.id}.`);
    }

    validateQuestionChunkSet({
      setId: entry.id,
      sourceSet: sourceRecord.set,
      chunkSet: chunkBank && chunkBank[entry.id]
    }).errors.forEach(error => errors.push(error));
  });

  return { errors };
}

function validateQuestionChunkSet({ setId, sourceSet, chunkSet }) {
  const errors = [];
  const label = setId || 'unknown set';

  if (!sourceSet) errors.push(`${label}: source set missing.`);
  if (!chunkSet) errors.push(`${label}: chunk set missing.`);
  if (!sourceSet || !chunkSet) return { errors };

  if (sourceSet.title !== chunkSet.title) {
    errors.push(`${label}: title is ${formatValue(chunkSet.title)}; expected ${formatValue(sourceSet.title)}.`);
  }
  if (sourceSet.topic !== chunkSet.topic) {
    errors.push(`${label}: topic is ${formatValue(chunkSet.topic)}; expected ${formatValue(sourceSet.topic)}.`);
  }

  const sourceQuestions = Array.isArray(sourceSet.questions) ? sourceSet.questions : [];
  const chunkQuestions = Array.isArray(chunkSet.questions) ? chunkSet.questions : [];
  if (sourceQuestions.length !== chunkQuestions.length) {
    errors.push(`${label}: question count is ${chunkQuestions.length}; expected ${sourceQuestions.length}.`);
  }

  compareQuestionSummaries({
    setId: label,
    sourceQuestions,
    chunkQuestions
  }).errors.forEach(error => errors.push(error));

  if (JSON.stringify(chunkSet) !== JSON.stringify(sourceSet)) {
    errors.push(`${label}: chunk content differs from source bank.`);
  }

  return { errors };
}

function compareQuestionSummaries(input, legacyChunkQuestions, legacySetId) {
  const options = Array.isArray(input)
    ? {
      sourceQuestions: input,
      chunkQuestions: legacyChunkQuestions,
      setId: legacySetId
    }
    : input || {};
  const setId = options.setId || 'unknown set';
  const sourceQuestions = Array.isArray(options.sourceQuestions) ? options.sourceQuestions : [];
  const chunkQuestions = Array.isArray(options.chunkQuestions) ? options.chunkQuestions : [];
  const errors = [];
  const maxQuestions = Math.min(sourceQuestions.length, chunkQuestions.length);

  for (let index = 0; index < maxQuestions; index += 1) {
    const sourceQuestion = sourceQuestions[index] || {};
    const chunkQuestion = chunkQuestions[index] || {};
    const questionLabel = sourceQuestion.id || chunkQuestion.id || `question ${index + 1}`;

    if (sourceQuestion.id !== chunkQuestion.id) {
      errors.push(`${setId}: question ${index + 1} id is ${formatValue(chunkQuestion.id)}; expected ${formatValue(sourceQuestion.id)}.`);
      continue;
    }
    if (sourceQuestion.version !== chunkQuestion.version) {
      errors.push(`${setId}/${questionLabel}: version is ${formatValue(chunkQuestion.version)}; expected ${formatValue(sourceQuestion.version)}.`);
    }
    if (sourceQuestion.contentHash !== chunkQuestion.contentHash) {
      errors.push(`${setId}/${questionLabel}: contentHash is ${formatValue(chunkQuestion.contentHash)}; expected ${formatValue(sourceQuestion.contentHash)}.`);
    }
  }

  return { errors };
}

function formatValue(value) {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

function runCli(argv = process.argv.slice(2)) {
  const { loadManifest } = require('../generate-question-manifest');
  const manifest = loadManifest();
  const bankLoad = loadQuestionBanks();
  const result = validateQuestionChunks(manifest, bankLoad);

  if (result.errors.length) {
    console.error(`Question chunk validation failed:\n${result.errors.join('\n')}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${getChunkManifestEntries(manifest).length} question chunks.`);
}

module.exports = {
  loadChunkBank,
  validateQuestionChunks,
  validateQuestionChunkSet,
  compareQuestionSummaries
};

if (require.main === module) runCli();
