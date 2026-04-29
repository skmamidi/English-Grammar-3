#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  getJsonBankFiles
} = require('./bank-loader');

function loadJsonSources(options = {}) {
  const root = options.repoRoot || repoRoot;
  const files = options.files || getJsonBankFiles(root);

  return files.map(file => {
    const contents = fs.readFileSync(file, 'utf8');
    const source = JSON.parse(contents);
    const relativeFile = path.relative(root, file).split(path.sep).join('/');
    return {
      file,
      relativeFile,
      domain: source.domain || path.basename(file, '.json'),
      source,
      originalContents: contents
    };
  });
}

function writeJsonSource(record) {
  fs.writeFileSync(record.file, serializeJsonSource(record.source));
}

function serializeJsonSource(source) {
  return `${JSON.stringify(source, null, 2)}\n`;
}

function flattenJsonSourceRecords(records) {
  return records.flatMap(record => {
    const sets = record.source && record.source.sets && typeof record.source.sets === 'object'
      ? record.source.sets
      : {};
    return Object.entries(sets).map(([setId, set]) => ({
      file: record.file,
      relativeFile: record.relativeFile,
      domain: record.domain,
      setId,
      set,
      sourceRecord: record
    }));
  });
}

function flattenJsonQuestionRecords(records) {
  return flattenJsonSourceRecords(records).flatMap(setRecord => {
    const questions = Array.isArray(setRecord.set && setRecord.set.questions)
      ? setRecord.set.questions
      : [];
    return questions.map((question, index) => Object.assign({}, setRecord, {
      question,
      questionNumber: index + 1,
      sequence: question && question.metadata ? question.metadata.sequence : undefined
    }));
  });
}

module.exports = {
  loadJsonSources,
  writeJsonSource,
  serializeJsonSource,
  flattenJsonSourceRecords,
  flattenJsonQuestionRecords
};
