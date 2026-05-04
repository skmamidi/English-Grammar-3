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
const {
  buildCurriculumReleaseChannelFromPublication
} = require('../assets/curriculum-release-channel-policy');
const {
  buildReviewerWorkloadSlaReport
} = require('../assets/reviewer-workload-sla-report');
const {
  getAuthoringFixture
} = require('../assets/authoring-fixture-library');

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

test('source remediation records become release-channel provenance without source excerpts', () => {
  const finding = buildSourceFinding({
    ruleId: 'missing-source-file',
    domain: 'grammar',
    setId: 'grammar-set',
    questionId: 'q-fixed',
    sourceFile: 'source.pdf',
    sourceHash: 'sha256:new'
  });
  const result = evaluateSourceRemediation({
    findings: [finding],
    records: [{
      findingId: finding.findingId,
      status: 'fixed',
      owner: 'reviewer-1',
      rationale: 'Reviewed source catalog entry.',
      sourceHash: 'sha256:new',
      sourceExcerpt: 'do not expose source paragraph'
    }]
  });
  const channel = buildCurriculumReleaseChannelFromPublication({
    publication: {
      id: 'pub-source-1',
      sourceHash: 'sha256:source',
      artifactHash: 'sha256:artifact',
      approvals: [{ actorId: 'reviewer-1', approvedAt: '2030-04-29T12:00:00.000Z' }]
    },
    impactAnalysis: {
      releaseId: 'impact-source-1',
      summary: {
        sourceRemediationRecords: result.records.map(record => record.findingId),
        rollbackRefs: ['release:previous']
      }
    },
    versionId: 'curriculum-source-1',
    channel: 'review',
    questionManifestHash: 'sha256:question',
    chunkManifestHash: 'sha256:chunk',
    deploymentAttestationHash: 'sha256:deployment'
  });

  assert.deepEqual(channel.provenance.sourceRemediationRecordIds, [finding.findingId]);
  assert.doesNotMatch(JSON.stringify(channel), /source paragraph/);
});

test('source remediation findings roll into reviewer workload SLA reports', () => {
  const finding = buildSourceFinding({
    ruleId: 'missing-source-file',
    domain: 'grammar',
    setId: 'grammar-set',
    questionId: 'q-open',
    sourceFile: 'source.pdf',
    sourceHash: 'sha256:new'
  });
  const report = buildReviewerWorkloadSlaReport({
    now: '2030-05-10T00:00:00.000Z',
    sourceRemediation: evaluateSourceRemediation({
      findings: [finding],
      records: []
    })
  });

  assert.equal(report.summary.byIssueType.source_finding, 1);
  assert.equal(report.rows[0].publicationBlockingState, 'blocking');
  assert.doesNotMatch(JSON.stringify(report), /source excerpt|answerKey|learner-/i);
});

test('stale source remediation fixture produces stale remediation blocker', () => {
  const fixture = getAuthoringFixture('stale_source_remediation');
  const finding = buildSourceFinding({
    ruleId: fixture.expectedSignals[0],
    domain: fixture.domain,
    setId: fixture.sourceSet,
    questionId: fixture.metadata.questionId,
    sourceFile: fixture.metadata.sourceFile,
    sourceHash: fixture.metadata.currentSourceHash
  });
  const result = evaluateSourceRemediation({
    findings: [finding],
    records: [{
      findingId: finding.findingId,
      status: 'fixed',
      owner: 'reviewer-1',
      rationale: 'Fixture remediation was reviewed before the source changed.',
      sourceHash: fixture.metadata.previousSourceHash
    }]
  });

  assert.equal(result.errors[0].code, 'source_remediation_stale');
});
