#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  evaluateAuthoringGuardrails,
  normalizeAuthoringRecord
} = require('../../assets/content-authoring-guardrails-domain');

const repoRoot = path.resolve(__dirname, '..', '..');
const DEFAULT_RECORDS_PATH = path.join(repoRoot, 'content-review', 'ai-authoring-records.json');

function loadAiAuthoringRecords(recordsPath = DEFAULT_RECORDS_PATH) {
  if (!fs.existsSync(recordsPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.records)) return parsed.records;
  throw new Error('ai_authoring_records_invalid');
}

function runAiAuthoringGuardrailsQa(options = {}) {
  const records = Array.isArray(options.records)
    ? options.records
    : loadAiAuthoringRecords(options.recordsPath);
  const normalized = records.map(normalizeAuthoringRecord);
  const evaluations = records.map(record => evaluateAuthoringGuardrails(record, {
    allowStoryLessonDraftPurpose: options.allowStoryLessonDraftPurpose === true
  }));
  const errors = evaluations.flatMap(evaluation => evaluation.issues);
  const aiAssistedCount = normalized.filter(record => record.assistance.used).length;

  return {
    status: errors.length ? 'failed' : 'passed',
    errors,
    warnings: [],
    records: normalized,
    summary: {
      recordCount: normalized.length,
      aiAssistedCount,
      errorCount: errors.length,
      warningCount: 0
    }
  };
}

function buildAiAuthoringGuardrailsCheck(options = {}) {
  const report = runAiAuthoringGuardrailsQa(options);
  return {
    id: 'ai-authoring-guardrails',
    errors: report.errors,
    warnings: report.warnings,
    blocking: report.errors.length > 0,
    report
  };
}

if (require.main === module) {
  const json = process.argv.includes('--json');
  const result = runAiAuthoringGuardrailsQa();
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    result.errors.slice(0, 20).forEach(error => {
      console.log(`ERROR: ${error.code} ${[error.sourceSet, error.questionId, error.path].filter(Boolean).join(' | ')}`);
    });
    if (result.errors.length > 20) {
      console.log(`ERROR: ${result.errors.length - 20} additional AI authoring guardrail error(s) hidden. Use --json for full details.`);
    }
    console.log(`${result.errors.length} AI authoring guardrail error(s), ${result.summary.aiAssistedCount} AI-assisted record(s).`);
  }
  if (result.errors.length) process.exitCode = 1;
}

module.exports = {
  DEFAULT_RECORDS_PATH,
  buildAiAuthoringGuardrailsCheck,
  loadAiAuthoringRecords,
  runAiAuthoringGuardrailsQa
};
