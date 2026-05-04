const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildStandardsCoverageReport
} = require('../scripts/reports/standards-coverage');
const {
  buildCurriculumReviewQueueProjection
} = require('../assets/curriculum-review-queue-dashboard');

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

test('standards coverage report counts missing tags without exposing question text', () => {
  const report = buildStandardsCoverageReport({
    sources: [{
      domain: 'vocabulary',
      sets: {
        'vocabulary-set': {
          questions: [{
            id: 'q1',
            question: 'Do not leak this prompt',
            metadata: {
              gradeLevels: [3],
              primaryDifficulty: 'medium',
              skillIds: [],
              standardIds: []
            }
          }, {
            id: 'q2',
            question: 'Do not leak this either',
            metadata: {
              gradeLevels: [3],
              primaryDifficulty: 'medium',
              skillIds: ['vocabulary.context'],
              standardIds: ['L.3.4']
            }
          }]
        }
      }
    }]
  });

  assert.equal(report.summary.questionCount, 2);
  assert.equal(report.summary.warningCount, 1);
  assert.equal(report.rows.find(row => row.skillId === 'vocabulary.context').questionCount, 1);
  assert.equal(report.rows.find(row => row.skillId === '').warningCount, 1);
  assert.equal(JSON.stringify(report).includes('Do not leak'), false);
});

test('standards coverage report marks configurable standards gaps as warnings', () => {
  const report = buildStandardsCoverageReport({
    expectedCoverage: [{
      domain: 'grammar',
      grade: '4',
      standardId: 'L.4.2',
      minQuestionCount: 2
    }],
    sources: [{
      domain: 'grammar',
      sets: {
        'grammar-set': {
          questions: [{
            id: 'q1',
            metadata: {
              gradeLevels: [4],
              primaryDifficulty: 'easy',
              skillIds: ['grammar.mechanics'],
              standardIds: ['L.4.2']
            }
          }]
        }
      }
    }]
  });

  assert.equal(report.gaps.length, 1);
  assert.equal(report.gaps[0].standardId, 'L.4.2');
  assert.equal(report.gaps[0].questionCount, 1);
  assert.equal(report.summary.warningCount, 1);
});

test('standards coverage gaps project into the curriculum review queue', () => {
  const projection = buildCurriculumReviewQueueProjection({
    now: '2030-05-10T00:00:00.000Z',
    standardsGaps: [{
      domain: 'grammar',
      sourceSet: 'grammar-set',
      standardId: 'L.4.2',
      severity: 'medium',
      status: 'needs_review',
      owner: 'standards_owner',
      createdAt: '2030-05-08T00:00:00.000Z'
    }]
  });

  assert.equal(projection.rows[0].issueType, 'standards_gap');
  assert.equal(projection.rows[0].publicationBlockingReason, 'standards_gap:L.4.2');
  assert.equal(projection.summary.byOwner.standards_owner, 1);
});
