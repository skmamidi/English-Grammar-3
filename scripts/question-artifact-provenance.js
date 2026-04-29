#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const { stableStringify } = require('./qa/question-metadata');

const QUESTION_ARTIFACT_SCHEMA_VERSION = 1;
const QUESTION_GENERATOR_VERSION = 1;

function computeQuestionSourceHash(bankLoad) {
  const files = (bankLoad && Array.isArray(bankLoad.files) ? bankLoad.files : [])
    .map(fileRecord => ({
      path: normalizePath(fileRecord.relativeFile || fileRecord.file || ''),
      sourceType: normalizeSourceType(fileRecord.sourceType),
      content: getFileContent(fileRecord)
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  return hashObject({
    artifactSchemaVersion: QUESTION_ARTIFACT_SCHEMA_VERSION,
    generatorVersion: QUESTION_GENERATOR_VERSION,
    files
  });
}

function computeQuestionSetSourceHash(setId, set) {
  return hashObject({
    artifactSchemaVersion: QUESTION_ARTIFACT_SCHEMA_VERSION,
    generatorVersion: QUESTION_GENERATOR_VERSION,
    setId,
    set
  });
}

function buildQuestionManifestProvenance(bankLoad) {
  const files = (bankLoad && Array.isArray(bankLoad.files) ? bankLoad.files : [])
    .map(fileRecord => normalizePath(fileRecord.relativeFile || fileRecord.file || ''))
    .filter(Boolean)
    .sort();

  return {
    type: 'question-manifest',
    artifactSchemaVersion: QUESTION_ARTIFACT_SCHEMA_VERSION,
    generatorVersion: QUESTION_GENERATOR_VERSION,
    sourceType: getBankLoadSourceType(bankLoad),
    sourceHash: computeQuestionSourceHash(bankLoad),
    sourceFiles: files
  };
}

function buildQuestionChunkProvenance({ setId, sourceFile, set }) {
  return {
    type: 'question-chunk',
    artifactSchemaVersion: QUESTION_ARTIFACT_SCHEMA_VERSION,
    generatorVersion: QUESTION_GENERATOR_VERSION,
    sourceType: getSourceTypeFromPath(sourceFile),
    sourceHash: computeQuestionSetSourceHash(setId, set),
    sourceFile: normalizePath(sourceFile)
  };
}

function parseQuestionChunkProvenance(contents) {
  const text = String(contents || '');
  const generatedFrom = text.match(/\* Generated from ([^\n]+)\./);
  const generatorVersion = text.match(/\* Generator version: ([^\n.]+)\./);
  const sourceHash = text.match(/\* Source hash: (sha256:[a-f0-9]{64})\./);
  return {
    sourceFile: generatedFrom ? generatedFrom[1].trim() : '',
    generatorVersion: generatorVersion ? Number(generatorVersion[1]) : NaN,
    sourceHash: sourceHash ? sourceHash[1] : ''
  };
}

function validateManifestProvenance(manifest, bankLoad) {
  const errors = [];
  const artifact = manifest && manifest.artifact;
  const expected = buildQuestionManifestProvenance(bankLoad);

  if (!artifact || typeof artifact !== 'object') {
    return { errors: ['Question manifest artifact provenance is missing.'] };
  }

  if (artifact.type !== expected.type) {
    errors.push(`Question manifest artifact type is ${formatValue(artifact.type)}; expected ${formatValue(expected.type)}.`);
  }
  if (artifact.artifactSchemaVersion !== expected.artifactSchemaVersion) {
    errors.push(`Question manifest artifact schema version is ${formatValue(artifact.artifactSchemaVersion)}; expected ${expected.artifactSchemaVersion}.`);
  }
  if (artifact.generatorVersion !== expected.generatorVersion) {
    errors.push(`Question manifest generator version is ${formatValue(artifact.generatorVersion)}; expected ${expected.generatorVersion}.`);
  }
  if (artifact.sourceType !== expected.sourceType) {
    errors.push(`Question manifest source type is ${formatValue(artifact.sourceType)}; expected ${formatValue(expected.sourceType)}.`);
  }
  if (artifact.sourceHash !== expected.sourceHash) {
    errors.push(`Question manifest source hash is ${formatValue(artifact.sourceHash)}; expected ${expected.sourceHash}.`);
  }
  if (JSON.stringify(artifact.sourceFiles) !== JSON.stringify(expected.sourceFiles)) {
    errors.push(`Question manifest source files are ${formatValue(artifact.sourceFiles)}; expected ${formatValue(expected.sourceFiles)}.`);
  }

  return { errors };
}

function hashObject(value) {
  return `sha256:${crypto
    .createHash('sha256')
    .update(stableStringify(value))
    .digest('hex')}`;
}

function getFileContent(fileRecord) {
  if (fileRecord && fileRecord.file && fs.existsSync(fileRecord.file)) {
    return fs.readFileSync(fileRecord.file, 'utf8');
  }
  return stableStringify(fileRecord && fileRecord.bank || {});
}

function getBankLoadSourceType(bankLoad) {
  const sourceTypes = new Set((bankLoad && bankLoad.files || []).map(file => normalizeSourceType(file.sourceType)));
  if (sourceTypes.size === 1) return Array.from(sourceTypes)[0];
  return sourceTypes.size ? 'mixed' : 'unknown';
}

function normalizeSourceType(sourceType) {
  return sourceType === 'javascript' ? 'legacy' : String(sourceType || 'unknown');
}

function getSourceTypeFromPath(sourceFile) {
  return String(sourceFile || '').endsWith('.json') ? 'json' : 'legacy';
}

function normalizePath(value) {
  return String(value || '').split('\\').join('/');
}

function formatValue(value) {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

module.exports = {
  QUESTION_ARTIFACT_SCHEMA_VERSION,
  QUESTION_GENERATOR_VERSION,
  buildQuestionChunkProvenance,
  buildQuestionManifestProvenance,
  computeQuestionSetSourceHash,
  computeQuestionSourceHash,
  parseQuestionChunkProvenance,
  validateManifestProvenance
};
