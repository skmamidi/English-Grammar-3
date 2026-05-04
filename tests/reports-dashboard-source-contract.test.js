const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');

test('parent reported-question inspector presents immutable question id metadata', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'assets', 'reports-dashboard.js'), 'utf8');
  const inspectorStart = source.indexOf('function renderReportedQuestionInspector(report)');
  const inspectorEnd = source.indexOf('function renderSkillView', inspectorStart);
  const inspector = source.slice(inspectorStart, inspectorEnd);

  assert.ok(inspector.includes('${renderQuestionIdentityMeta(report)}'));
  assert.match(source, /<dt>Question ID<\/dt>/);
});

test('parent full-question modal keeps generated visual scene evidence for canonical rendering', () => {
  const source = fs.readFileSync(path.join(repoRoot, 'assets', 'reports-dashboard.js'), 'utf8');
  const detailStart = source.indexOf('function normalizeFullQuestionDetail(item, context)');
  const detailEnd = source.indexOf('function openFullQuestionModal', detailStart);
  const detail = source.slice(detailStart, detailEnd);

  assert.match(detail, /item\.visualScene \|\| item\.generatedVisualScene/);
});
