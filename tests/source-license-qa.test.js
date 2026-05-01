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

test('source license QA can require remediation for attribution warnings', () => {
  const result = evaluateSourceLicenses({
    policy: {
      sources: [{
        id: 'allowed',
        pattern: '*.pdf',
        allowedUse: 'reviewed practice',
        attributionRequired: true,
        publicationAllowed: true,
        reviewer: 'content-review'
      }]
    },
    requireRemediationForWarnings: true,
    sources: [{
      domain: 'grammar',
      sets: {
        'grammar-set': {
          questions: [{
            id: 'q1',
            metadata: {
              sourceFile: 'allowed-source.pdf'
            }
          }]
        }
      }
    }]
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.errors[0].ruleId, 'source-remediation-required');
  assert.equal(result.errors[0].remediationCode, 'source_remediation_required');
  assert.equal(result.remediation.summary.openCount, 1);
});

test('source license QA accepts fixed remediation and rejects expired or stale deferrals', () => {
  const base = {
    policy: {
      sources: [{
        id: 'allowed',
        pattern: '*.pdf',
        allowedUse: 'reviewed practice',
        attributionRequired: true,
        publicationAllowed: true,
        reviewer: 'content-review'
      }]
    },
    requireRemediationForWarnings: true,
    now: new Date('2030-04-29T12:00:00.000Z'),
    sources: [{
      domain: 'grammar',
      sets: {
        'grammar-set': {
          questions: [{
            id: 'q-fixed',
            metadata: { sourceFile: 'allowed-source.pdf' }
          }, {
            id: 'q-expired',
            metadata: { sourceFile: 'allowed-source.pdf' }
          }, {
            id: 'q-stale',
            metadata: { sourceFile: 'allowed-source.pdf' }
          }]
        }
      }
    }]
  };

  const fixedId = 'missing-source-attribution|grammar|grammar-set|q-fixed|allowed-source.pdf';
  const expiredId = 'missing-source-attribution|grammar|grammar-set|q-expired|allowed-source.pdf';
  const staleId = 'missing-source-attribution|grammar|grammar-set|q-stale|allowed-source.pdf';
  const result = evaluateSourceLicenses({
    ...base,
    remediationRecords: [{
      findingId: fixedId,
      status: 'fixed',
      owner: 'reviewer-1',
      rationale: 'Source attribution was added in the catalog.',
      sourceHash: ''
    }, {
      findingId: expiredId,
      status: 'deferred',
      owner: 'reviewer-1',
      rationale: 'Cleanup scheduled.',
      expiresAt: '2030-04-28T12:00:00.000Z'
    }, {
      findingId: staleId,
      status: 'deferred',
      owner: 'reviewer-1',
      rationale: 'Cleanup scheduled.',
      expiresAt: '2030-05-29T12:00:00.000Z',
      sourceHash: 'sha256:old'
    }],
    sourceHash: 'sha256:new'
  });

  assert.equal(result.status, 'failed');
  assert.deepEqual(result.errors.map(error => error.remediationCode), [
    'source_remediation_expired',
    'source_remediation_stale'
  ]);
  assert.equal(result.remediation.summary.resolvedCount, 1);
});

test('checked-in source license policy is human-reviewable', () => {
  const policy = loadSourceLicensePolicy();

  assert.ok(policy.sources.length >= 1);
  assert.ok(policy.sources.every(entry => entry.id && entry.allowedUse && entry.reviewer));
});
