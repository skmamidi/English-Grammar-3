const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildSourceAttributionReport
} = require('../scripts/reports/source-attribution');

test('source attribution report groups source files without question text', () => {
  const report = buildSourceAttributionReport({
    sources: [{
      domain: 'reading-comprehension',
      sets: {
        'main-idea': {
          questions: [{
            id: 'q1',
            question: 'Prompt must not be exported',
            metadata: {
              sourceFile: 'Basic-1_Reading.pdf',
              sourceCategory: 'reading-test',
              sourceGrade: 3,
              sourceQuestionNumber: 4
            }
          }, {
            id: 'q2',
            question: 'Also private',
            metadata: {
              sourceFile: 'Basic-1_Reading.pdf',
              sourceCategory: 'reading-test',
              sourceGrade: 3,
              sourceQuestionNumber: 5
            }
          }]
        }
      }
    }]
  });

  assert.equal(report.rows.length, 1);
  assert.equal(report.rows[0].sourceFile, 'Basic-1_Reading.pdf');
  assert.deepEqual(report.rows[0].domains, ['reading-comprehension']);
  assert.deepEqual(report.rows[0].sets, ['main-idea']);
  assert.equal(report.rows[0].questionCount, 2);
  assert.equal(report.summary.warningCount, 0);
  assert.equal(JSON.stringify(report).includes('Prompt must not be exported'), false);
});

test('source attribution report warns for missing attribution fields', () => {
  const report = buildSourceAttributionReport({
    sources: [{
      domain: 'grammar',
      sets: {
        'grammar-set': {
          questions: [{
            id: 'q1',
            metadata: {
              sourceFile: 'Advanced-1.pdf'
            }
          }, {
            id: 'q2',
            metadata: {}
          }]
        }
      }
    }]
  });

  assert.equal(report.summary.warningCount, 3);
  assert.ok(report.warnings.some(warning => warning.ruleId === 'missing-source-category'));
  assert.ok(report.warnings.some(warning => warning.ruleId === 'missing-source-file'));
});
