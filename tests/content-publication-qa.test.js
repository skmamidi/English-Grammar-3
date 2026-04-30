const assert = require('node:assert/strict');
const test = require('node:test');

const {
  aggregatePublicationQa,
  buildPublicationGovernanceChecks
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

test('publication QA aggregator blocks source license errors and carries governance reports', () => {
  const result = aggregatePublicationQa({
    checks: [{
      id: 'source-license',
      errors: ['source-publication-denied'],
      warnings: ['unknown-source-license']
    }, {
      id: 'standards-coverage',
      warnings: ['under-covered standard'],
      report: { summary: { questionCount: 10 } }
    }, {
      id: 'source-attribution',
      warnings: [],
      report: { summary: { sourceCount: 2 } }
    }]
  });

  assert.equal(result.status, 'failed');
  assert.ok(result.blocking.some(item => item.id === 'source-license'));
  assert.equal(result.results.find(item => item.id === 'standards-coverage').status, 'passed');
  assert.equal(result.reports['standards-coverage'].summary.questionCount, 10);
  assert.equal(result.reports['source-attribution'].summary.sourceCount, 2);
});

test('publication governance checks include coverage attribution and license QA', () => {
  const checks = buildPublicationGovernanceChecks({
    sources: [{
      domain: 'grammar',
      sets: {
        'grammar-set': {
          questions: [{
            id: 'q1',
            metadata: {
              gradeLevels: [4],
              primaryDifficulty: 'easy',
              skillIds: ['grammar.sentence-analysis'],
              standardIds: ['L.3-6.1'],
              sourceFile: 'allowed.pdf',
              sourceCategory: 'grammar',
              sourceQuestionNumber: 1
            }
          }]
        }
      }
    }],
    sourceLicensePolicy: {
      sources: [{
        id: 'allowed-pdfs',
        pattern: '*.pdf',
        allowedUse: 'reviewed practice',
        attributionRequired: true,
        publicationAllowed: true,
        reviewer: 'content-review'
      }]
    }
  });

  assert.deepEqual(checks.map(check => check.id), [
    'standards-coverage',
    'source-attribution',
    'source-license'
  ]);
  const aggregate = aggregatePublicationQa({ checks });
  assert.equal(aggregate.status, 'passed');
  assert.equal(aggregate.reports['source-attribution'].summary.sourceCount, 1);
});
