const assert = require('node:assert/strict');
const test = require('node:test');

const {
  evaluateSourceLicenses,
  loadSourceLicensePolicy,
  matchSourceLicensePolicy
} = require('../scripts/qa/source-license-qa');

test('source license policy matches explicit files and patterns deterministically', () => {
  const policy = {
    sources: [{
      id: 'map-pdfs',
      pattern: '*.pdf',
      allowedUse: 'internal educational practice',
      attributionRequired: true,
      publicationAllowed: true,
      reviewer: 'content-review'
    }]
  };

  const match = matchSourceLicensePolicy('Basic-1_Reading.pdf', policy);

  assert.equal(match.id, 'map-pdfs');
  assert.equal(match.publicationAllowed, true);
});

test('source license QA warns for unknown licenses and blocks denied publication', () => {
  const result = evaluateSourceLicenses({
    policy: {
      sources: [{
        id: 'blocked',
        pattern: 'blocked-*',
        allowedUse: 'not approved',
        attributionRequired: true,
        publicationAllowed: false,
        reviewer: 'content-review'
      }]
    },
    sources: [{
      domain: 'grammar',
      sets: {
        'grammar-set': {
          questions: [{
            id: 'q1',
            metadata: {
              sourceFile: 'unknown-source.pdf',
              sourceQuestionNumber: 1
            }
          }, {
            id: 'q2',
            metadata: {
              sourceFile: 'blocked-source.pdf',
              sourceQuestionNumber: 2
            }
          }]
        }
      }
    }]
  });

  assert.equal(result.errors.length, 1);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.errors[0].ruleId, 'source-publication-denied');
  assert.equal(result.warnings[0].ruleId, 'unknown-source-license');
  assert.equal(JSON.stringify(result).includes('Prompt must not be exported'), false);
});

test('checked-in source license policy is human-reviewable', () => {
  const policy = loadSourceLicensePolicy();

  assert.ok(policy.sources.length >= 1);
  assert.ok(policy.sources.every(entry => entry.id && entry.allowedUse && entry.reviewer));
});
