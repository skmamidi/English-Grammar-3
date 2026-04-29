#!/usr/bin/env node

const {
  flattenQuestionBanks,
  flattenQuestions,
  loadQuestionBanks
} = require('./bank-loader');
const { CHUNK_MIGRATION_ORDER } = require('../question-chunk-config');

function validateJsonQuestionSources(bankLoad = loadQuestionBanks({ sourceType: 'json' })) {
  const errors = [];
  const files = Array.isArray(bankLoad.files) ? bankLoad.files : [];
  const expectedDomains = new Set(CHUNK_MIGRATION_ORDER);
  const actualDomains = new Set(files.map(file => file.domain));

  CHUNK_MIGRATION_ORDER.forEach(domain => {
    if (!actualDomains.has(domain)) errors.push(`${domain}: missing JSON source file.`);
  });
  files.forEach(file => {
    if (file.sourceType !== 'json') {
      errors.push(`${file.relativeFile}: expected JSON sourceType, got ${file.sourceType || 'unknown'}.`);
    }
    if (!expectedDomains.has(file.domain)) {
      errors.push(`${file.relativeFile}: unexpected domain ${file.domain || 'unknown'}.`);
    }
    if (!file.relativeFile || !file.relativeFile.startsWith('assets/question-bank-source/') || !file.relativeFile.endsWith('.json')) {
      errors.push(`${file.relativeFile || file.file}: JSON source must live under assets/question-bank-source/*.json.`);
    }
  });

  flattenQuestionBanks(bankLoad).forEach(record => {
    if (!record.setId) errors.push(`${record.relativeFile}: set id is required.`);
    if (!record.set || typeof record.set !== 'object') {
      errors.push(`${record.relativeFile} | ${record.setId}: set must be an object.`);
      return;
    }
    if (!Array.isArray(record.set.questions) || record.set.questions.length === 0) {
      errors.push(`${record.relativeFile} | ${record.setId}: questions must be a non-empty array.`);
    }
    if (!record.setId.startsWith(`${record.domain}-`)) {
      errors.push(`${record.relativeFile} | ${record.setId}: set id should start with domain "${record.domain}-".`);
    }
  });

  flattenQuestions(bankLoad).forEach(record => {
    const question = record.question || {};
    const metadata = question.metadata || {};
    const label = `${record.relativeFile} | ${record.setId} | question ${record.questionNumber}`;
    if (!question.id) errors.push(`${label}: question id is required.`);
    if (!Number.isInteger(Number(question.version)) || Number(question.version) < 1) {
      errors.push(`${label}: version must be a positive integer.`);
    }
    if (!/^sha256:[a-f0-9]{64}$/.test(question.contentHash || '')) {
      errors.push(`${label}: contentHash must be a sha256 hash.`);
    }
    if (metadata.sourceSet !== record.setId) {
      errors.push(`${label}: metadata.sourceSet is ${metadata.sourceSet || 'missing'}; expected ${record.setId}.`);
    }
    if (!Number.isInteger(Number(metadata.sequence)) || Number(metadata.sequence) < 1) {
      errors.push(`${label}: metadata.sequence must be a positive integer.`);
    }
  });

  return { errors, files: files.length, sets: flattenQuestionBanks(bankLoad).length, questions: flattenQuestions(bankLoad).length };
}

function runCli() {
  const result = validateJsonQuestionSources();
  if (result.errors.length) {
    console.error(`JSON question source validation failed:\n${result.errors.join('\n')}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${result.files} JSON question source files, ${result.sets} sets, and ${result.questions} questions.`);
}

module.exports = {
  validateJsonQuestionSources
};

if (require.main === module) runCli();
