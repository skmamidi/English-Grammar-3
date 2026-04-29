#!/usr/bin/env node

const crypto = require('crypto');

const AUTHORED_SCENE_FIELD = 'visualScene';
const GENERATED_SCENE_FIELD = 'generatedVisualScene';

const HASH_FIELDS = [
  'question',
  'choices',
  'correct',
  'explanation',
  'studyAid',
  AUTHORED_SCENE_FIELD
];

function buildQuestionId(setId, sequence) {
  const number = Number(sequence);
  const suffix = Number.isInteger(number) && number > 0
    ? String(number).padStart(4, '0')
    : String(sequence || '').padStart(4, '0');
  return `${setId}-q${suffix}`;
}

function getLearnerFacingContent(question) {
  const content = {};
  HASH_FIELDS.forEach(field => {
    if (Object.prototype.hasOwnProperty.call(question || {}, field)) {
      content[field] = question[field];
    }
  });
  return content;
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function computeContentHash(question) {
  return `sha256:${crypto
    .createHash('sha256')
    .update(stableStringify(getLearnerFacingContent(question)))
    .digest('hex')}`;
}

function getQuestionSequence(question, fallback) {
  const sequence = question && question.metadata && Number(question.metadata.sequence);
  return Number.isInteger(sequence) && sequence > 0 ? sequence : fallback;
}

function getQuestionSourceSet(question, setId) {
  return question && question.metadata && question.metadata.sourceSet || setId;
}

module.exports = {
  AUTHORED_SCENE_FIELD,
  GENERATED_SCENE_FIELD,
  HASH_FIELDS,
  buildQuestionId,
  computeContentHash,
  getLearnerFacingContent,
  getQuestionSequence,
  getQuestionSourceSet,
  stableStringify
};
