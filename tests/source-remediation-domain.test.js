const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildSourceFinding,
  evaluateSourceRemediation,
  normalizeRemediationRecord,
  validateRemediationRecord
} = require('../assets/source-remediation-domain');
const {
  buildCurriculumReviewQueueProjection
} = require('../assets/curriculum-review-queue-dashboard');

test('source remediation findings normalize deterministic identifiers', () => {
  const finding = buildSourceFinding({
    ruleId: 'missing-source-attribution',
    domain: 'grammar',
    setId: 'grammar-set',
    questionId: 'grammar-set-q0001',
    sourceFile: 'allowed-source.pdf',
    sourceHash: 'sha256:source-a'
  });

  assert.equal(finding.findingId, 'missing-source-attribution|grammar|grammar-set|grammar-set-q0001|allowed-source.pdf');
  assert.equal(finding.severity, 'warning');
  assert.equal(finding.sourceHash, 'sha256:source-a');
});

test('deferred source remediation requires owner rationale and future expiry', () => {
  const record = normalizeRemediationRecord({
    findingId: 'missing-source-attribution|grammar|grammar-set|q1|allowed-source.pdf',
    status: 'deferred',
    expiresAt: '2030-04-29T12:00:00.000Z',
    sourceHash: 'sha256:source-a'
  });

  assert.deepEqual(validateRemediationRecord(record, {
    now: new Date('2030-04-28T12:00:00.000Z')
  }), [
    'owner is required for deferred source remediation',
    'rationale is required for deferred source remediation'
  ]);
});

test('source remediation marks expired stale and unresolved findings as blocking', () => {
  const findings = [
    buildSourceFinding({ ruleId: 'missing-source-attribution', domain: 'grammar', setId: 'set-a', questionId: 'q-expired', sourceFile: 'source.pdf', sourceHash: 'sha256:new' }),
    buildSourceFinding({ ruleId: 'unknown-source-license', domain: 'grammar', setId: 'set-a', questionId: 'q-stale', sourceFile: 'source.pdf', sourceHash: 'sha256:new' }),
    buildSourceFinding({ ruleId: 'missing-source-file', domain: 'grammar', setId: 'set-a', questionId: 'q-open', sourceHash: 'sha256:new' })
  ];

  const result = evaluateSourceRemediation({
    findings,
    records: [{
      findingId: findings[0].findingId,
      status: 'deferred',
      owner: 'reviewer-1',
      rationale: 'Waiting on source catalog cleanup.',
      expiresAt: '2030-04-28T12:00:00.000Z',
      sourceHash: 'sha256:new'
    }, {
      findingId: findings[1].findingId,
      status: 'fixed',
      owner: 'reviewer-1',
      rationale: 'Source was reviewed.',
      sourceHash: 'sha256:old'
    }],
    now: new Date('2030-04-29T12:00:00.000Z')
  });

  assert.equal(result.status, 'failed');
  assert.deepEqual(result.errors.map(error => error.code), [
    'source_remediation_expired',
    'source_remediation_stale',
    'source_remediation_required'
  ]);
});

test('source remediation accepts fixed and active deferred records', () => {
  const fixed = buildSourceFinding({ ruleId: 'unknown-source-license', domain: 'grammar', setId: 'set-a', questionId: 'q-fixed', sourceFile: 'source.pdf', sourceHash: 'sha256:new' });
  const deferred = buildSourceFinding({ ruleId: 'missing-source-attribution', domain: 'grammar', setId: 'set-a', questionId: 'q-deferred', sourceFile: 'source.pdf', sourceHash: 'sha256:new' });

  const result = evaluateSourceRemediation({
    findings: [fixed, deferred],
    records: [{
      findingId: fixed.findingId,
      status: 'fixed',
      owner: 'reviewer-1',
      rationale: 'Policy entry added.',
      sourceHash: 'sha256:new'
    }, {
      findingId: deferred.findingId,
      status: 'deferred',
      owner: 'reviewer-2',
      rationale: 'Original source catalog has the page number, cleanup scheduled.',
      expiresAt: '2030-05-29T12:00:00.000Z',
      sourceHash: 'sha256:new'
    }],
    now: new Date('2030-04-29T12:00:00.000Z')
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.errors.length, 0);
  assert.equal(result.summary.resolvedCount, 2);
});

test('source remediation findings project into review queue without source details', () => {
  const projection = buildCurriculumReviewQueueProjection({
    now: '2030-05-10T00:00:00.000Z',
    sourceFindings: [{
      findingId: 'missing-source-file|grammar|grammar-set|q-open|source.pdf',
      ruleId: 'missing-source-file',
      domain: 'grammar',
      sourceSet: 'grammar-set',
      severity: 'critical',
      status: 'needs_review',
      owner: 'source_owner',
      createdAt: '2030-05-01T00:00:00.000Z',
      sourceExcerpt: 'do not show copyrighted source paragraph'
    }]
  });

  assert.equal(projection.rows[0].issueType, 'source_finding');
  assert.equal(projection.rows[0].publicationBlockingReason, 'source_finding:missing-source-file');
  assert.doesNotMatch(JSON.stringify(projection), /copyrighted source paragraph/);
});
