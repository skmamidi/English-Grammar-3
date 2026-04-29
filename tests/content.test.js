const assert = require('node:assert/strict');
const test = require('node:test');

const { validateContent, validateLoadedContent } = require('../scripts/qa/content-qa');
const { loadQuestionBanks, getBankSizeSummary } = require('../scripts/qa/bank-loader');

test('all question banks load and satisfy the content contract', () => {
  const result = validateContent();
  assert.equal(result.errors.length, 0, result.errors.map(issue => `${issue.relativeFile} ${issue.setId} ${issue.location}: ${issue.message}`).join('\n'));
  assert.ok(result.questions.length >= 10000, 'expected current question bank scale to be covered');
  assert.ok(result.sets.length > 50, 'expected many subtopic sets to be loaded');
});

test('content QA reports invalid correct indexes with actionable locations', () => {
  const result = validateContent();
  const first = result.questions[0];
  first.question.correct = first.question.choices.length + 10;

  const rerun = validateLoadedContent(result.bankLoad);
  const issue = rerun.errors.find(item => item.message.includes('Correct index'));
  assert.ok(issue, 'expected invalid correct index to fail');
  assert.ok(issue.relativeFile);
  assert.ok(issue.setId);
  assert.ok(issue.location);
});

test('content QA fails malformed explanation arrays', () => {
  const result = validateContent();
  const first = result.questions.find(item => item.question.explanation && Array.isArray(item.question.explanation.incorrect));
  assert.ok(first, 'expected at least one explanation array fixture');
  first.question.explanation.incorrect = ['too short'];

  const rerun = validateLoadedContent(result.bankLoad);
  const issue = rerun.errors.find(item => item.message.includes('Incorrect explanation count'));
  assert.ok(issue, 'expected malformed explanation array to fail');
});

test('content QA enforces stable question identity metadata', () => {
  const result = validateContent();
  const first = result.questions[0];
  assert.ok(first.question.id, 'fixture should start with a stable id');

  first.question.id = '';
  const missingId = validateLoadedContent(result.bankLoad);
  assert.ok(missingId.errors.find(item => item.message.includes('Missing stable question id')), 'expected missing id to fail');

  first.question.id = 'bad-id';
  const invalidPrefix = validateLoadedContent(result.bankLoad);
  assert.ok(invalidPrefix.errors.find(item => item.message.includes('must start with')), 'expected invalid id prefix to fail');
});

test('content QA fails duplicate question ids', () => {
  const result = validateContent();
  const setRecord = result.sets.find(record => Array.isArray(record.set.questions) && record.set.questions.length > 1);
  assert.ok(setRecord, 'expected at least one multi-question set');
  setRecord.set.questions[1].id = setRecord.set.questions[0].id;

  const rerun = validateLoadedContent(result.bankLoad);
  assert.ok(rerun.errors.find(item => item.message.includes('Duplicate stable question id')), 'expected duplicate id to fail');
});

test('content QA fails invalid version, missing contentHash, and sourceSet drift', () => {
  const result = validateContent();
  const first = result.questions[0];

  first.question.version = 0;
  let rerun = validateLoadedContent(result.bankLoad);
  assert.ok(rerun.errors.find(item => item.message.includes('version must be an integer')), 'expected invalid version to fail');

  first.question.version = 1;
  first.question.contentHash = '';
  rerun = validateLoadedContent(result.bankLoad);
  assert.ok(rerun.errors.find(item => item.message.includes('Missing contentHash')), 'expected missing contentHash to fail');

  first.question.contentHash = 'sha256:0'.padEnd(71, '0');
  first.question.metadata.sourceSet = 'wrong-set';
  rerun = validateLoadedContent(result.bankLoad);
  assert.ok(rerun.errors.find(item => item.message.includes('metadata.sourceSet must match')), 'expected sourceSet mismatch to fail');
});

test('question-bank size snapshot is available for performance budget tracking', () => {
  const bankLoad = loadQuestionBanks();
  const summary = getBankSizeSummary(bankLoad);
  assert.ok(summary.totalBytes > 0);
  assert.ok(summary.largest);
  assert.ok(summary.files.length >= 1);
});
