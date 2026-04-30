const assert = require('node:assert/strict');
const test = require('node:test');

const {
  aggregatePublicationQa
} = require('../scripts/qa/content-publication-qa');

test('publication QA aggregator marks blocking failures and stale artifacts', () => {
  const result = aggregatePublicationQa({
    checks: [
      { id: 'schema', errors: [], warnings: [] },
      { id: 'content', errors: ['bad choice'], warnings: [] },
      { id: 'manifest-freshness', stale: true }
    ]
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.blocking.length, 2);
  assert.ok(result.blocking.some(item => item.id === 'content'));
  assert.ok(result.blocking.some(item => item.id === 'manifest-freshness'));
});
