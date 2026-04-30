#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { loadQuestionBanks } = require('./bank-loader');

const repoRoot = path.resolve(__dirname, '..', '..');
const DEFAULT_POLICY_PATH = path.join(repoRoot, 'content-review', 'source-license-policy.json');

function loadSourceLicensePolicy(policyPath = DEFAULT_POLICY_PATH) {
  return JSON.parse(fs.readFileSync(policyPath, 'utf8'));
}

function evaluateSourceLicenses(options = {}) {
  const policy = options.policy || loadSourceLicensePolicy(options.policyPath);
  const sources = Array.isArray(options.sources) ? options.sources : normalizeBankLoad(options.bankLoad || loadQuestionBanks({ sourceType: 'json' }));
  const errors = [];
  const warnings = [];
  const seen = new Set();

  sources.forEach(source => {
    Object.entries(source.sets || {}).forEach(([setId, set]) => {
      (Array.isArray(set.questions) ? set.questions : []).forEach(question => {
        const metadata = question && question.metadata || {};
        const sourceFile = safeString(metadata.sourceFile);
        const questionId = safeString(question && question.id);
        if (!sourceFile) {
          addOnce(warnings, seen, 'missing-source-file', source.domain, setId, questionId, sourceFile);
          return;
        }
        const match = matchSourceLicensePolicy(sourceFile, policy);
        if (!match) {
          addOnce(warnings, seen, 'unknown-source-license', source.domain, setId, questionId, sourceFile);
          return;
        }
        if (match.attributionRequired && !safeString(metadata.sourceQuestionNumber)) {
          addOnce(warnings, seen, 'missing-source-attribution', source.domain, setId, questionId, sourceFile);
        }
        if (match.publicationAllowed === false) {
          addOnce(errors, seen, 'source-publication-denied', source.domain, setId, questionId, sourceFile);
        }
      });
    });
  });

  return {
    status: errors.length ? 'failed' : 'passed',
    errors,
    warnings,
    summary: {
      errorCount: errors.length,
      warningCount: warnings.length
    }
  };
}

function matchSourceLicensePolicy(sourceFile, policy = {}) {
  const entries = Array.isArray(policy.sources) ? policy.sources : [];
  return entries.find(entry => {
    const pattern = safeString(entry.pattern || entry.sourceId);
    if (!pattern) return false;
    return globLikeMatch(sourceFile, pattern);
  }) || null;
}

function globLikeMatch(value, pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i').test(value);
}

function normalizeBankLoad(bankLoad) {
  return (Array.isArray(bankLoad.files) ? bankLoad.files : []).map(file => ({
    domain: file.domain,
    sets: file.bank || {}
  }));
}

function addOnce(target, seen, ruleId, domain, setId, questionId, sourceFile) {
  const key = [ruleId, domain, setId, questionId, sourceFile].join('|');
  if (seen.has(key)) return;
  seen.add(key);
  target.push({ ruleId, domain, setId, questionId, sourceFile });
}

function safeString(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

if (require.main === module) {
  const result = evaluateSourceLicenses();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    result.errors.concat(result.warnings.slice(0, 20)).forEach(issue => {
      const level = result.errors.includes(issue) ? 'ERROR' : 'WARNING';
      console.log(`${level}: ${issue.ruleId} ${[issue.domain, issue.setId, issue.questionId, issue.sourceFile].filter(Boolean).join(' | ')}`);
    });
    if (result.warnings.length > 20) {
      console.log(`WARNING: ${result.warnings.length - 20} additional source license warning(s) hidden. Use --json for full details.`);
    }
    console.log(`${result.errors.length} source license error(s), ${result.warnings.length} warning(s).`);
  }
  if (result.errors.length) process.exitCode = 1;
}

module.exports = {
  evaluateSourceLicenses,
  loadSourceLicensePolicy,
  matchSourceLicensePolicy
};
