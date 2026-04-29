const assert = require('node:assert/strict');
const test = require('node:test');

const {
  summarizeChunkSizeBudget
} = require('../scripts/qa/chunk-size-budget');

test('chunk size budget report ranks largest chunks and flags preload warnings', () => {
  const summary = summarizeChunkSizeBudget([
    { path: 'assets/question-chunks/grammar/small.js', bytes: 80 * 1024 },
    { path: 'assets/question-chunks/reading-comprehension/large.js', bytes: 420 * 1024 },
    { path: 'assets/question-chunks/vocabulary/medium.js', bytes: 180 * 1024 }
  ], {
    preloadWarningBytes: 250 * 1024
  });

  assert.equal(summary.totalChunks, 3);
  assert.equal(summary.largestChunks[0].path, 'assets/question-chunks/reading-comprehension/large.js');
  assert.deepEqual(summary.preloadWarnings.map(item => item.path), ['assets/question-chunks/reading-comprehension/large.js']);
});
