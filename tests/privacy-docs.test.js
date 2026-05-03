const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DATA_INVENTORY
} = require('../assets/data-inventory-classification');

const repoRoot = path.resolve(__dirname, '..');
const processingDocPath = path.join(repoRoot, 'docs', 'security', 'records-of-processing.md');

test('records of processing cover every non-public data classification', () => {
  const doc = readProcessingDoc();
  const requiredCategories = DATA_INVENTORY
    .filter(entry => entry.sensitivity !== 'public')
    .map(entry => entry.id);

  requiredCategories.forEach(category => {
    assert.match(doc, new RegExp('\\| `' + escapeRegex(category) + '` \\|', 'i'), `missing processing row for ${category}`);
  });
});

test('processing records include required purpose retention deletion export owner and subprocessor fields', () => {
  const rows = parseProcessingRows(readProcessingDoc());
  const requiredCategories = DATA_INVENTORY
    .filter(entry => entry.sensitivity !== 'public')
    .map(entry => entry.id);

  requiredCategories.forEach(category => {
    const row = rows.get(category);
    assert.ok(row, `${category} processing row is required`);
    ['purpose', 'reason', 'source', 'storage', 'subprocessor', 'retention', 'deletionExport', 'owner', 'releaseReview'].forEach(field => {
      assert.ok(row[field], `${category} ${field} is required`);
      assert.doesNotMatch(row[field], /\bTBD\b|unknown|later/i, `${category} ${field} must not be stale placeholder`);
    });
  });
});

test('subprocessor documentation separates current and future providers', () => {
  const doc = readProcessingDoc();
  [
    'Current subprocessors',
    'Static hosting',
    'Build and test automation',
    'No live analytics vendor',
    'Future not-yet-selected subprocessors',
    'Optional auth/sync provider',
    'Telemetry endpoint',
    'Email/transactional provider',
    'Native platform services',
    'Future payment provider',
    'not selected yet'
  ].forEach(required => assert.match(doc, new RegExp(escapeRegex(required), 'i')));
});

test('processing docs are privacy-safe and linked from release checklist', () => {
  const doc = readProcessingDoc();
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.doesNotMatch(doc, /learnerId\s*=|studentId\s*=|token\s*=|secret\s*=|password\s*=|customer_[A-Za-z0-9]+|subscription_[A-Za-z0-9]+|@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i);
  assert.match(doc, /does not provide legal advice/i);
  assert.match(doc, /data-inventory\.md/);
  assert.match(doc, /data-access-requests\.md/);
  assert.match(doc, /learner-data-lifecycle\.md/);
  assert.match(checklist, /records of processing/i);
  assert.match(checklist, /subprocessors/i);
  assert.match(pkg.scripts['test:unit'], /tests\/privacy-docs\.test\.js/);
});

function readProcessingDoc() {
  return fs.readFileSync(processingDocPath, 'utf8');
}

function parseProcessingRows(source) {
  const rows = new Map();
  source.split(/\r?\n/).forEach(line => {
    if (!line.startsWith('| `')) return;
    const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
    if (cells.length < 10) return;
    const category = cells[0].replace(/`/g, '');
    rows.set(category, {
      purpose: cells[1],
      reason: cells[2],
      source: cells[3],
      storage: cells[4],
      subprocessor: cells[5],
      retention: cells[6],
      deletionExport: cells[7],
      owner: cells[8],
      releaseReview: cells[9]
    });
  });
  return rows;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
