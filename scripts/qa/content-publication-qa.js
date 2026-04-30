#!/usr/bin/env node

const { loadQuestionBanks } = require('./bank-loader');
const { buildStandardsCoverageReport } = require('../reports/standards-coverage');
const { buildSourceAttributionReport } = require('../reports/source-attribution');
const { evaluateSourceLicenses } = require('./source-license-qa');

function aggregatePublicationQa(options = {}) {
  const checks = Array.isArray(options.checks) ? options.checks : [];
  const reports = {};
  const results = checks.map(check => {
    const errors = Array.isArray(check.errors) ? check.errors : [];
    const warnings = Array.isArray(check.warnings) ? check.warnings : [];
    const blocking = errors.length > 0 || check.stale === true || check.blocking === true;
    const id = String(check.id || 'check');
    if (check.report) reports[id] = check.report;
    return {
      id,
      status: blocking ? 'failed' : 'passed',
      blocking,
      errorCount: errors.length + (check.stale === true ? 1 : 0),
      warningCount: warnings.length
    };
  });
  const blocking = results.filter(result => result.blocking);
  return {
    status: blocking.length ? 'failed' : 'passed',
    results,
    blocking,
    reports
  };
}

function buildPublicationGovernanceChecks(options = {}) {
  const bankLoad = options.bankLoad;
  const sources = Array.isArray(options.sources)
    ? options.sources
    : normalizeBankLoad(bankLoad || loadQuestionBanks({ sourceType: 'json' }));
  const standards = buildStandardsCoverageReport({
    sources,
    expectedCoverage: options.expectedCoverage
  });
  const attribution = buildSourceAttributionReport({ sources });
  const licensing = evaluateSourceLicenses({
    sources,
    policy: options.sourceLicensePolicy
  });

  return [{
    id: 'standards-coverage',
    warnings: standards.warnings,
    errors: [],
    report: standards
  }, {
    id: 'source-attribution',
    warnings: attribution.warnings,
    errors: [],
    report: attribution
  }, {
    id: 'source-license',
    warnings: licensing.warnings,
    errors: licensing.errors,
    report: licensing
  }];
}

function normalizeBankLoad(bankLoad) {
  return (Array.isArray(bankLoad.files) ? bankLoad.files : []).map(file => ({
    domain: file.domain,
    sets: file.bank || {}
  }));
}

if (require.main === module) {
  const result = aggregatePublicationQa({ checks: [] });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  aggregatePublicationQa,
  buildPublicationGovernanceChecks
};
