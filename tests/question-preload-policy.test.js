const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildQuestionPreloadCandidates
} = require('../assets/question-preload-policy');
const {
  buildContentChangeImpactAnalysis
} = require('../assets/content-change-impact-analysis');

test('preload policy selects only the first visible topic-index subtopic within budget', () => {
  const candidates = buildQuestionPreloadCandidates({
    currentRoute: 'topic-index',
    domain: 'grammar',
    visibleSubtopicIds: ['grammar-sentence-types', 'grammar-run-on-sentences', 'grammar-verb-forms'],
    manifest: createManifest(),
    maxPreloadChunks: 2,
    maxPreloadBytes: 100 * 1024
  });

  assert.deepEqual(candidates.map(candidate => candidate.setId), ['grammar-sentence-types']);
  assert.equal(candidates[0].reason, 'topic-index-first-visible');
});

test('preload policy selects the next sibling on subtopic pages', () => {
  const candidates = buildQuestionPreloadCandidates({
    currentRoute: 'subtopic',
    domain: 'grammar',
    currentSetId: 'grammar-sentence-types',
    visibleSubtopicIds: ['grammar-sentence-types', 'grammar-run-on-sentences'],
    manifest: createManifest(),
    maxPreloadChunks: 2,
    maxPreloadBytes: 250 * 1024
  });

  assert.deepEqual(candidates.map(candidate => candidate.setId), ['grammar-run-on-sentences']);
  assert.equal(candidates[0].reason, 'subtopic-next-sibling');
});

test('preload policy uses selected mixed subtopics only after learner commits selections', () => {
  const candidates = buildQuestionPreloadCandidates({
    currentRoute: 'mixed-selection',
    domain: 'grammar',
    selectedMixedSubtopicIds: ['grammar-run-on-sentences', 'grammar-verb-forms'],
    visibleSubtopicIds: ['grammar-sentence-types'],
    manifest: createManifest(),
    maxPreloadChunks: 2,
    maxPreloadBytes: 300 * 1024
  });

  assert.deepEqual(candidates.map(candidate => candidate.setId), ['grammar-run-on-sentences', 'grammar-verb-forms']);
});

test('preload policy disables on save-data and slow network', () => {
  assert.deepEqual(buildQuestionPreloadCandidates({
    currentRoute: 'topic-index',
    visibleSubtopicIds: ['grammar-sentence-types'],
    manifest: createManifest(),
    networkInfo: { saveData: true }
  }), []);
  assert.deepEqual(buildQuestionPreloadCandidates({
    currentRoute: 'topic-index',
    visibleSubtopicIds: ['grammar-sentence-types'],
    manifest: createManifest(),
    networkInfo: { effectiveType: '2g' }
  }), []);
});

test('sparse mode suppresses chunk preloads when granular offline question store is enabled', () => {
  const candidates = buildQuestionPreloadCandidates({
    currentRoute: 'subtopic',
    currentSetId: 'grammar-sentence-types',
    visibleSubtopicIds: ['grammar-sentence-types', 'grammar-run-on-sentences'],
    manifest: createManifest(),
    sparseQuestionDelivery: true,
    granularOfflineQuestionStore: true
  });

  assert.deepEqual(candidates, []);
});

test('preload policy enforces byte and count budgets', () => {
  const candidates = buildQuestionPreloadCandidates({
    currentRoute: 'mixed-selection',
    selectedMixedSubtopicIds: ['grammar-sentence-types', 'grammar-run-on-sentences', 'reading-main-idea'],
    manifest: createManifest(),
    maxPreloadChunks: 2,
    maxPreloadBytes: 130 * 1024
  });

  assert.deepEqual(candidates.map(candidate => candidate.setId), ['grammar-sentence-types', 'grammar-run-on-sentences']);
  assert.ok(candidates.reduce((sum, candidate) => sum + candidate.estimatedBytes, 0) <= 130 * 1024);
});

test('content impact analysis lists affected chunk files for preload review', () => {
  const analysis = buildContentChangeImpactAnalysis({
    changes: [{
      questionId: 'grammar-sentence-types-q0001',
      changeType: 'changed',
      domain: 'grammar',
      setId: 'grammar-sentence-types',
      chunkFile: 'assets/question-chunks/grammar/grammar-sentence-types.js',
      manifestEntryId: 'grammar-sentence-types:q0001',
      rollbackRef: 'release:previous'
    }]
  });

  assert.deepEqual(analysis.summary.chunks, ['assets/question-chunks/grammar/grammar-sentence-types.js']);
});

function createManifest() {
  return {
    sets: [
      entry('grammar-sentence-types', 'grammar', 58 * 1024),
      entry('grammar-run-on-sentences', 'grammar', 64 * 1024),
      entry('grammar-verb-forms', 'grammar', 92 * 1024),
      entry('reading-main-idea', 'reading-comprehension', 360 * 1024)
    ]
  };
}

function entry(id, domain, estimatedBytes) {
  return {
    id,
    domain,
    questionCount: Math.round(estimatedBytes / 4096),
    chunkFile: `assets/question-chunks/${domain}/${id}.js`,
    estimatedBytes
  };
}
