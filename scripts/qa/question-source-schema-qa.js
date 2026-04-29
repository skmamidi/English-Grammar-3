#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { repoRoot, getJsonBankFiles } = require('./bank-loader');
const {
  buildQuestionId,
  computeContentHash
} = require('./question-metadata');
const { CHUNK_MIGRATION_ORDER } = require('../question-chunk-config');

const VALID_GRADES = new Set([3, 4, 5, 6]);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

function validateQuestionSourceFiles(options = {}) {
  const root = options.repoRoot || repoRoot;
  const files = options.files || getJsonBankFiles(root);
  const errors = [];
  const seenQuestionIds = new Map();
  let setCount = 0;
  let questionCount = 0;

  files.forEach(file => {
    const relativeFile = path.relative(root, file).split(path.sep).join('/');
    let source;
    try {
      source = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      errors.push(`${relativeFile}: invalid JSON (${error.message}).`);
      return;
    }

    validateDomainSource({
      source,
      file,
      relativeFile,
      errors,
      seenQuestionIds,
      counters: {
        addSet() { setCount += 1; },
        addQuestion() { questionCount += 1; }
      }
    });
  });

  return {
    errors,
    files: files.length,
    sets: setCount,
    questions: questionCount
  };
}

function validateDomainSource({ source, file, relativeFile, errors, seenQuestionIds, counters }) {
  const expectedDomain = path.basename(file, '.json');
  const label = relativeFile || file;

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    errors.push(`${label}: source must be a JSON object.`);
    return;
  }
  if (source.schemaVersion !== 1) {
    errors.push(`${label}: schemaVersion must be 1.`);
  }
  if (!source.domain || typeof source.domain !== 'string') {
    errors.push(`${label}: domain is required.`);
  } else {
    if (source.domain !== expectedDomain) {
      errors.push(`${label}: domain is "${source.domain}"; expected "${expectedDomain}" from filename.`);
    }
    if (!CHUNK_MIGRATION_ORDER.includes(source.domain)) {
      errors.push(`${label}: domain "${source.domain}" is not a known question domain.`);
    }
  }
  if (!source.sets || typeof source.sets !== 'object' || Array.isArray(source.sets)) {
    errors.push(`${label}: sets must be an object.`);
    return;
  }
  if (!Object.keys(source.sets).length) {
    errors.push(`${label}: sets must contain at least one question set.`);
  }

  Object.entries(source.sets).forEach(([setId, set]) => {
    counters.addSet();
    validateSet({
      source,
      setId,
      set,
      relativeFile: label,
      errors,
      seenQuestionIds,
      counters
    });
  });
}

function validateSet({ source, setId, set, relativeFile, errors, seenQuestionIds, counters }) {
  const label = `${relativeFile} | ${setId}`;
  if (!set || typeof set !== 'object' || Array.isArray(set)) {
    errors.push(`${label}: set must be an object.`);
    return;
  }
  if (!setId.startsWith(`${source.domain}-`)) {
    errors.push(`${label}: set id must start with "${source.domain}-".`);
  }
  if (!set.title || typeof set.title !== 'string') {
    errors.push(`${label}: title is required.`);
  }
  if (!set.topic || typeof set.topic !== 'string') {
    errors.push(`${label}: topic is required.`);
  }
  if (!Array.isArray(set.questions) || !set.questions.length) {
    errors.push(`${label}: questions must be a non-empty array.`);
    return;
  }

  const setQuestionIds = new Map();
  const sequences = new Map();
  set.questions.forEach((question, index) => {
    counters.addQuestion();
    validateQuestion({
      question,
      index,
      setId,
      relativeFile,
      errors,
      seenQuestionIds,
      setQuestionIds,
      sequences
    });
  });
}

function validateQuestion({ question, index, setId, relativeFile, errors, seenQuestionIds, setQuestionIds, sequences }) {
  const metadata = question && question.metadata || {};
  const sequence = Number(metadata.sequence);
  const questionLabel = `${relativeFile} | ${setId} | ${question && question.id || `question ${index + 1}`}`;

  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    errors.push(`${relativeFile} | ${setId} | question ${index + 1}: question must be an object.`);
    return;
  }

  validateQuestionIdentity({ question, metadata, sequence, setId, questionLabel, errors, seenQuestionIds, setQuestionIds, sequences });
  validateQuestionShape({ question, metadata, setId, questionLabel, errors });
  validateQuestionHash({ question, questionLabel, errors });
}

function validateQuestionIdentity({ question, metadata, sequence, setId, questionLabel, errors, seenQuestionIds, setQuestionIds, sequences }) {
  if (!question.id || typeof question.id !== 'string') {
    errors.push(`${questionLabel}: question id is required.`);
  } else {
    if (!question.id.startsWith(`${setId}-q`)) {
      errors.push(`${questionLabel}: question id must start with "${setId}-q".`);
    }
    if (Number.isInteger(sequence) && sequence > 0 && question.id !== buildQuestionId(setId, sequence)) {
      errors.push(`${questionLabel}: question id must match metadata.sequence ${sequence} (${buildQuestionId(setId, sequence)}).`);
    }
    if (setQuestionIds.has(question.id)) {
      errors.push(`${questionLabel}: duplicate question id also appears at question ${setQuestionIds.get(question.id)} in ${setId}.`);
    } else {
      setQuestionIds.set(question.id, sequence || 'unknown');
    }
    if (seenQuestionIds.has(question.id)) {
      errors.push(`${questionLabel}: duplicate question id also appears at ${seenQuestionIds.get(question.id)}.`);
    } else {
      seenQuestionIds.set(question.id, questionLabel);
    }
  }

  if (!Number.isInteger(question.version) || question.version < 1) {
    errors.push(`${questionLabel}: version must be a positive integer.`);
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    errors.push(`${questionLabel}: metadata is required.`);
    return;
  }
  if (metadata.sourceSet !== setId) {
    errors.push(`${questionLabel}: metadata.sourceSet is ${JSON.stringify(metadata.sourceSet)}; expected "${setId}".`);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    errors.push(`${questionLabel}: metadata.sequence must be a positive integer.`);
  } else if (sequences.has(sequence)) {
    errors.push(`${questionLabel}: duplicate metadata.sequence ${sequence} also appears at question ${sequences.get(sequence)} in ${setId}.`);
  } else {
    sequences.set(sequence, question.id || `question ${sequence}`);
  }
}

function validateQuestionShape({ question, metadata, questionLabel, errors }) {
  if (!question.question || typeof question.question !== 'string') {
    errors.push(`${questionLabel}: question prompt is required.`);
  }
  if (!Array.isArray(question.choices) || !question.choices.length) {
    errors.push(`${questionLabel}: choices must be a non-empty array.`);
  } else if (question.choices.some(choice => typeof choice !== 'string')) {
    errors.push(`${questionLabel}: choices must contain strings.`);
  }
  if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= (Array.isArray(question.choices) ? question.choices.length : 0)) {
    errors.push(`${questionLabel}: correct answer must reference a valid choice.`);
  }

  if (!Array.isArray(metadata.gradeLevels) || !metadata.gradeLevels.length) {
    errors.push(`${questionLabel}: metadata.gradeLevels must be a non-empty array.`);
  } else {
    metadata.gradeLevels.forEach(grade => {
      if (!VALID_GRADES.has(Number(grade))) {
        errors.push(`${questionLabel}: invalid grade level ${grade}.`);
      }
    });
  }

  if (!metadata.difficultyByGrade || typeof metadata.difficultyByGrade !== 'object' || Array.isArray(metadata.difficultyByGrade)) {
    errors.push(`${questionLabel}: metadata.difficultyByGrade must be an object.`);
  } else {
    (Array.isArray(metadata.gradeLevels) ? metadata.gradeLevels : []).forEach(grade => {
      const difficulty = metadata.difficultyByGrade[String(grade)];
      if (!difficulty) {
        errors.push(`${questionLabel}: metadata.difficultyByGrade is missing grade ${grade}.`);
      } else if (!VALID_DIFFICULTIES.has(String(difficulty))) {
        errors.push(`${questionLabel}: invalid difficulty "${difficulty}" for grade ${grade}.`);
      }
    });
  }

  if (!Array.isArray(metadata.skills) || !metadata.skills.length || metadata.skills.some(skill => typeof skill !== 'string' || !skill.trim())) {
    errors.push(`${questionLabel}: metadata.skills must be a non-empty string array.`);
  }
}

function validateQuestionHash({ question, questionLabel, errors }) {
  if (!question.contentHash) {
    errors.push(`${questionLabel}: contentHash is required.`);
    return;
  }
  if (typeof question.contentHash !== 'string' || !HASH_PATTERN.test(question.contentHash)) {
    errors.push(`${questionLabel}: contentHash must be a sha256 hash.`);
    return;
  }
  const expectedHash = computeContentHash(question);
  if (question.contentHash !== expectedHash) {
    errors.push(`${questionLabel}: contentHash is stale. Expected ${expectedHash}.`);
  }
}

function runCli() {
  const result = validateQuestionSourceFiles();
  if (result.errors.length) {
    console.error(`Question source schema validation failed:\n${result.errors.join('\n')}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Validated question source schema for ${result.files} files, ${result.sets} sets, and ${result.questions} questions.`);
}

module.exports = {
  validateQuestionSourceFiles
};

if (require.main === module) runCli();
