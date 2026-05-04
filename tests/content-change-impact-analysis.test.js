const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  CONTENT_CHANGE_TYPES,
  DEFAULT_CONTENT_CHANGE_IMPACT_FIXTURE,
  buildContentChangeImpactAnalysis,
  validateContentChangeImpactAnalysis
} = require('../assets/content-change-impact-analysis');

const repoRoot = path.resolve(__dirname, '..');

test('content impact analysis defines required change types and affected surfaces', () => {
  assert.deepEqual(CONTENT_CHANGE_TYPES, ['changed', 'added', 'removed', 'moved', 'remediated']);

  const analysis = buildContentChangeImpactAnalysis(DEFAULT_CONTENT_CHANGE_IMPACT_FIXTURE);

  assert.deepEqual(analysis.summary.changeTypes, ['added', 'changed', 'moved', 'remediated', 'removed']);
  assert.deepEqual(analysis.summary.domains, ['grammar', 'vocabulary']);
  assert.deepEqual(analysis.summary.sets, ['grammar-sentence-types', 'vocabulary-context-clues']);
  assert.deepEqual(analysis.summary.skills, ['grammar.sentence-analysis', 'vocabulary.context']);
  assert.deepEqual(analysis.summary.standards, ['L.4.1', 'L.4.4']);
  assert.deepEqual(analysis.summary.chunks, [
    'assets/question-chunks/grammar/grammar-sentence-types.js',
    'assets/question-chunks/vocabulary/vocabulary-context-clues.js'
  ]);
  assert.deepEqual(validateContentChangeImpactAnalysis(analysis).errors, []);
});

test('content impact rows preserve stable ids risk rollback and review metadata', () => {
  const analysis = buildContentChangeImpactAnalysis(DEFAULT_CONTENT_CHANGE_IMPACT_FIXTURE);

  assert.equal(analysis.summary.learnerStateCompatibilityRisk, 'high');
  assert.equal(analysis.summary.rollbackRefs.length, 2);
  assert.deepEqual(analysis.summary.sourceRemediationRecords, ['source-remediation:grammar-q0003']);
  assert.deepEqual(analysis.summary.reviewStatuses, ['approved', 'needs_review']);

  analysis.rows.forEach(row => {
    assert.ok(row.questionId, 'stable question id is required');
    assert.ok(row.changeType, `${row.questionId} change type is required`);
    assert.ok(row.domain, `${row.questionId} domain is required`);
    assert.ok(row.setId, `${row.questionId} set id is required`);
    assert.ok(row.manifestEntryId, `${row.questionId} manifest entry is required`);
    assert.ok(row.chunkFile, `${row.questionId} chunk file is required`);
    assert.ok(row.rollbackRef, `${row.questionId} rollback ref is required`);
    assert.ok(row.learnerStateCompatibilityRisk, `${row.questionId} compatibility risk is required`);
  });
});

test('content impact analysis excludes learner records answer keys and raw drafts', () => {
  const analysis = buildContentChangeImpactAnalysis({
    releaseId: 'content-impact-unsafe',
    changes: [{
      questionId: 'grammar-q0001',
      changeType: 'changed',
      domain: 'grammar',
      setId: 'grammar-set',
      skillIds: ['grammar.usage'],
      standardIds: ['L.4.1'],
      chunkFile: 'assets/question-chunks/grammar/grammar-set.js',
      manifestEntryId: 'grammar-set:q0001',
      rollbackRef: 'release:previous',
      learnerStateCompatibilityRisk: 'medium',
      answerKey: 'A',
      correctAnswer: 'A',
      learnerId: 'learner-one',
      rawAiDraft: 'draft body'
    }]
  });

  assert.doesNotMatch(JSON.stringify(analysis), /answerKey|correctAnswer|learner-one|rawAiDraft|draft body/i);

  const invalid = validateContentChangeImpactAnalysis({
    rows: [{
      questionId: '',
      changeType: 'deleted',
      domain: '',
      setId: '',
      chunkFile: '',
      manifestEntryId: '',
      rollbackRef: '',
      learnerStateCompatibilityRisk: 'severe',
      answerKey: 'A'
    }]
  });

  assert.ok(invalid.errors.includes('content impact row questionId is required'));
  assert.ok(invalid.errors.includes('content impact row changeType is invalid'));
  assert.ok(invalid.errors.includes('content impact row domain is required'));
  assert.ok(invalid.errors.includes('content impact row setId is required'));
  assert.ok(invalid.errors.includes('content impact row chunkFile is required'));
  assert.ok(invalid.errors.includes('content impact row manifestEntryId is required'));
  assert.ok(invalid.errors.includes('content impact row rollbackRef is required'));
  assert.ok(invalid.errors.includes('content impact row learnerStateCompatibilityRisk is invalid'));
  assert.ok(invalid.errors.includes('content impact row contains sensitive content impact data'));
});

test('content impact docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'content-change-impact-analysis.md'), 'utf8');
  const authoring = fs.readFileSync(path.join(repoRoot, 'docs', 'question-authoring.md'), 'utf8');
  const roadmap = fs.readFileSync(path.join(repoRoot, 'docs', 'milestone-roadmap.md'), 'utf8');
  const ciContract = fs.readFileSync(path.join(repoRoot, 'tests', 'ci-contract.test.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  [
    'affected domains',
    'question sets',
    'skills',
    'standards',
    'chunks',
    'manifest entries',
    'learner-state compatibility',
    'rollback'
  ].forEach(required => assert.match(docs, new RegExp(escapeRegex(required), 'i')));

  assert.match(authoring, /content-change-impact-analysis\.md/);
  assert.match(roadmap, /content-change-impact-analysis\.js/);
  assert.match(ciContract, /tests\\\/content-change-impact-analysis\\\.test\\\.js/);
  assert.match(pkg.scripts['test:unit'], /tests\/content-change-impact-analysis\.test\.js/);
});

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
