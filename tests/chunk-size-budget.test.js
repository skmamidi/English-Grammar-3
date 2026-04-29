const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DEFAULT_FAILURE_BYTES,
  DEFAULT_WARNING_BYTES,
  collectChunkSizeBudget
} = require('../scripts/qa/chunk-size-budget');

test('generated browser question chunks stay below the hard size budget', () => {
  const report = collectChunkSizeBudget();

  assert.equal(report.failureBytes, DEFAULT_FAILURE_BYTES);
  assert.equal(report.warningBytes, DEFAULT_WARNING_BYTES);
  assert.deepEqual(
    report.failures.map(file => file.path),
    [],
    `oversized chunks:\n${report.failures.map(file => `${file.sizeBytes} ${file.path}`).join('\n')}`
  );
});

test('chunk size budget reports largest generated chunks for diagnostics', () => {
  const report = collectChunkSizeBudget({ limit: 5 });

  assert.ok(report.largest.length > 0, 'expected generated chunk files');
  assert.ok(report.largest.every(file => file.path.startsWith('assets/question-chunks/')));
  assert.ok(report.largest.every(file => Number.isInteger(file.sizeBytes) && file.sizeBytes > 0));
});
