const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildStandardsCoverageReport
} = require('../scripts/reports/standards-coverage');

test('standards coverage report summarizes canonical questions deterministically', () => {
  const report = buildStandardsCoverageReport({
    sources: [{
      domain: 'grammar',
      sets: {
        'grammar-set': {
          questions: [{
            id: 'q1',
            metadata: {
              gradeLevels: [4],
              primaryDifficulty: 'easy',
              skills: ['grammar.sentence-analysis'],
              standards: ['L.4.1']
            }
          }]
        }
      }
    }]
  });

  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].domain, 'grammar');
  assert.equal(report.rows[0].standardId, 'L.4.1');
  assert.equal(report.rows[0].questionCount, 1);
});
