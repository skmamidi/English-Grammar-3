#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  repoRoot,
  flattenQuestionBanks,
  loadQuestionBanks
} = require('./bank-loader');
const {
  QUESTION_GENERATOR_VERSION,
  computeQuestionSetSourceHash,
  parseQuestionChunkProvenance
} = require('../question-artifact-provenance');
const {
  enrichQuestionWithSkillTags
} = require('./question-skill-taxonomy');

function getChunkManifestEntries(manifest) {
  return (manifest && Array.isArray(manifest.sets) ? manifest.sets : [])
    .filter(set => set && (set.chunkFile || Array.isArray(set.chunks)));
}

function loadChunkBank(chunkFile, options = {}) {
  const root = options.repoRoot || repoRoot;
  const chunkPath = path.isAbsolute(chunkFile) ? chunkFile : path.join(root, chunkFile);
  const contents = readChunkFile(chunkPath, chunkFile);

  return loadChunkBankFromContents(contents, chunkPath);
}

function readChunkFile(chunkPath, label) {
  if (!fs.existsSync(chunkPath)) {
    throw new Error(`Chunk file does not exist: ${label}`);
  }
  return fs.readFileSync(chunkPath, 'utf8');
}

function loadChunkBankFromContents(contents, filename) {
  const context = {
    window: { QUESTION_BANK: {} },
    console
  };

  vm.createContext(context);
  vm.runInContext(contents, context, { filename });
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
    let chunkContents;
    try {
      const loaded = loadEntryChunkBank(entry, options);
      chunkBank = loaded.chunkBank;
      chunkContents = loaded.chunkContents;
    } catch (error) {
      errors.push(`${entry.id}: chunk file could not be loaded: ${error.message}`);
      return;
    }

    validateChunkProvenance({
      entry,
      sourceRecord,
      chunkContents
    }).errors.forEach(error => errors.push(error));

    const chunkSetIds = Object.keys(chunkBank || {});
    if (chunkSetIds.length !== 1 || chunkSetIds[0] !== entry.id) {
      errors.push(`${entry.id}: chunk populates [${chunkSetIds.join(', ')}]; expected exactly ${entry.id}.`);
    }

    validateQuestionChunkSet({
      setId: entry.id,
      domain: entry.domain || sourceRecord.domain,
      sourceSet: sourceRecord.set,
      chunkSet: chunkBank && chunkBank[entry.id]
    }).errors.forEach(error => errors.push(error));
  });

  return { errors };
}

function loadEntryChunkBank(entry, options = {}) {
  const root = options.repoRoot || repoRoot;
  const chunkFiles = Array.isArray(entry.chunks) && entry.chunks.length
    ? entry.chunks.map(chunk => chunk.chunkFile)
    : [entry.chunkFile];
  const aggregate = {};
  const contents = [];
  chunkFiles.forEach(chunkFile => {
    const chunkPath = path.isAbsolute(chunkFile) ? chunkFile : path.join(root, chunkFile);
    const chunkContents = readChunkFile(chunkPath, chunkFile);
    const bank = loadChunkBankFromContents(chunkContents, chunkPath);
    mergeChunkBank(aggregate, bank);
    contents.push(chunkContents);
  });
  return {
    chunkBank: aggregate,
    chunkContents: contents.join('\n')
  };
}

function mergeChunkBank(target, source) {
  Object.keys(source || {}).forEach(setId => {
    const incoming = source[setId];
    if (!target[setId]) {
      target[setId] = incoming;
      return;
    }
    const existingQuestions = Array.isArray(target[setId].questions) ? target[setId].questions : [];
    const incomingQuestions = Array.isArray(incoming && incoming.questions) ? incoming.questions : [];
    const seen = new Set(existingQuestions.map(question => question && question.id));
    incomingQuestions.forEach(question => {
      if (!seen.has(question && question.id)) existingQuestions.push(question);
    });
    target[setId].questions = existingQuestions;
  });
}

function validateChunkProvenance({ entry, sourceRecord, chunkContents }) {
  const errors = [];
  const provenances = parseQuestionChunkProvenances(chunkContents);
  const expectedHash = computeQuestionSetSourceHash(entry.id, sourceRecord.set);
  const expectedSourceFile = sourceRecord.relativeFile;

  provenances.forEach(provenance => {
    if (provenance.sourceFile !== expectedSourceFile) {
      errors.push(`${entry.id}: chunk provenance source file is ${formatValue(provenance.sourceFile)}; expected ${formatValue(expectedSourceFile)}.`);
    }
    if (provenance.generatorVersion !== QUESTION_GENERATOR_VERSION) {
      errors.push(`${entry.id}: chunk generator version is ${formatValue(provenance.generatorVersion)}; expected ${QUESTION_GENERATOR_VERSION}.`);
    }
    if (provenance.sourceHash !== expectedHash) {
      errors.push(`${entry.id}: chunk source hash is ${formatValue(provenance.sourceHash)}; expected ${expectedHash}.`);
    }
  });

  return { errors };
}

function parseQuestionChunkProvenances(contents) {
  const text = String(contents || '');
  const blocks = text.split('/**').filter(block => block.includes('Generated from'));
  const provenances = blocks.map(block => parseQuestionChunkProvenance(`/**${block}`));
  return provenances.length ? provenances : [parseQuestionChunkProvenance(text)];
}

function validateQuestionChunkSet({ setId, domain, sourceSet, chunkSet }) {
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

  const expectedSet = enrichSetForRuntime(sourceSet, domain || getDomainFromSetId(setId));
  if (JSON.stringify(chunkSet) !== JSON.stringify(expectedSet)) {
    errors.push(`${label}: chunk content differs from source bank.`);
  }

  return { errors };
}

function enrichSetForRuntime(set, domain) {
  const questions = Array.isArray(set && set.questions) ? set.questions : [];
  return Object.assign({}, set || {}, {
    questions: questions.map(question => enrichQuestionWithSkillTags(question, { domain }))
  });
}

function getDomainFromSetId(setId) {
  return String(setId || '').split('-')[0];
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
  compareQuestionSummaries,
  loadEntryChunkBank,
  validateChunkProvenance
};

if (require.main === module) runCli();
