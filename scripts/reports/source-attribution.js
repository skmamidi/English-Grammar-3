#!/usr/bin/env node

const { loadQuestionBanks } = require('../qa/bank-loader');

function buildSourceAttributionReport(options = {}) {
  const sources = Array.isArray(options.sources) ? options.sources : normalizeBankLoad(options.bankLoad || loadQuestionBanks({ sourceType: 'json' }));
  const bySource = new Map();
  const warnings = [];
  let questionCount = 0;

  sources.forEach(source => {
    Object.entries(source.sets || {}).forEach(([setId, set]) => {
      (Array.isArray(set.questions) ? set.questions : []).forEach(question => {
        questionCount += 1;
        const metadata = question && question.metadata || {};
        const sourceFile = safeString(metadata.sourceFile);
        const missing = getMissingAttributionFields(metadata);
        if (missing.length) {
          missing.forEach(field => warnings.push({
            ruleId: `missing-${field.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}`,
            domain: source.domain,
            setId,
            questionId: safeString(question && question.id),
            sourceFile,
            field
          }));
        }
        const key = sourceFile || '(missing source file)';
        if (!bySource.has(key)) {
          bySource.set(key, {
            sourceFile: key,
            sourceCategory: safeString(metadata.sourceCategory),
            sourceGrade: safeString(metadata.sourceGrade),
            domains: new Set(),
            sets: new Set(),
            questionCount: 0,
            missingAttributionFields: new Set()
          });
        }
        const row = bySource.get(key);
        row.domains.add(source.domain);
        row.sets.add(setId);
        row.questionCount += 1;
        missing.forEach(field => row.missingAttributionFields.add(field));
      });
    });
  });

  const rows = Array.from(bySource.values()).map(row => ({
    sourceFile: row.sourceFile,
    sourceCategory: row.sourceCategory,
    sourceGrade: row.sourceGrade,
    domains: Array.from(row.domains).sort(),
    sets: Array.from(row.sets).sort(),
    questionCount: row.questionCount,
    missingAttributionFields: Array.from(row.missingAttributionFields).sort()
  })).sort((a, b) => a.sourceFile.localeCompare(b.sourceFile));

  return {
    rows,
    warnings,
    summary: {
      sourceCount: rows.length,
      questionCount,
      warningCount: warnings.length,
      errorCount: 0
    }
  };
}

function normalizeBankLoad(bankLoad) {
  return (Array.isArray(bankLoad.files) ? bankLoad.files : []).map(file => ({
    domain: file.domain,
    sets: file.bank || {}
  }));
}

function getMissingAttributionFields(metadata = {}) {
  const missing = [];
  if (!safeString(metadata.sourceFile)) missing.push('sourceFile');
  if (safeString(metadata.sourceFile)) {
    if (!safeString(metadata.sourceCategory)) missing.push('sourceCategory');
    if (!safeString(metadata.sourceQuestionNumber)) missing.push('sourceQuestionNumber');
  }
  return missing;
}

function safeString(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

if (require.main === module) {
  console.log(JSON.stringify(buildSourceAttributionReport(), null, 2));
}

module.exports = {
  buildSourceAttributionReport,
  getMissingAttributionFields
};
