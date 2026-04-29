#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  flattenQuestionBanks,
  loadQuestionBanks
} = require('./qa/bank-loader');

const JSON_SOURCE_ROOT = path.join('assets', 'question-bank-source');

function buildJsonBankSources(bankLoad) {
  const byDomain = {};

  flattenQuestionBanks(bankLoad).forEach(record => {
    const domain = record.domain || getDomainFromRecord(record);
    if (!byDomain[domain]) {
      byDomain[domain] = {
        schemaVersion: 1,
        domain,
        sets: {}
      };
    }
    byDomain[domain].sets[record.setId] = record.set;
  });

  return Object.keys(byDomain).sort().reduce((sorted, domain) => {
    sorted[domain] = byDomain[domain];
    return sorted;
  }, {});
}

function convertQuestionBanksToJson(options = {}) {
  const root = options.repoRoot || repoRoot;
  const dryRun = options.dryRun !== false && options.write !== true;
  const bankLoad = options.bankLoad || loadQuestionBanks({ repoRoot: root, sourceType: 'legacy' });
  const sources = buildJsonBankSources(bankLoad);
  const summary = {
    changed: [],
    unchanged: []
  };

  Object.entries(sources).forEach(([domain, source]) => {
    const file = getJsonSourcePath(domain, root);
    const relativeFile = path.relative(root, file).split(path.sep).join('/');
    const contents = `${JSON.stringify(source, null, 2)}\n`;

    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === contents) {
      summary.unchanged.push({ domain, file, relativeFile });
      return;
    }

    summary.changed.push({ domain, file, relativeFile, contents });
    if (!dryRun) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, contents);
    }
  });

  return summary;
}

function getJsonSourcePath(domain, root = repoRoot) {
  return path.join(root, JSON_SOURCE_ROOT, `${domain}.json`);
}

function getDomainFromRecord(record) {
  const relativeFile = record && (record.runtimeBankFile || record.relativeFile) || '';
  const basename = path.basename(relativeFile, path.extname(relativeFile));
  if (basename) return basename;
  return String(record && record.setId || '').split('-')[0];
}

function formatSummary(summary) {
  return [
    `Question JSON sources changed: ${summary.changed.length}.`,
    `Question JSON sources unchanged: ${summary.unchanged.length}.`
  ].join('\n');
}

function runCli(argv = process.argv.slice(2)) {
  const shouldWrite = argv.includes('--write');
  const summary = convertQuestionBanksToJson({ write: shouldWrite, dryRun: !shouldWrite });

  console.log(formatSummary(summary));
  if (!shouldWrite && summary.changed.length > 0) {
    process.exitCode = 1;
  }
}

module.exports = {
  JSON_SOURCE_ROOT,
  buildJsonBankSources,
  convertQuestionBanksToJson,
  getJsonSourcePath
};

if (require.main === module) runCli();
