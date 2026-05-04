const assert = require('node:assert/strict');
const test = require('node:test');

const {
  approvePublication,
  createPublication,
  publishPublication,
  validatePublication
} = require('../assets/content-publication-domain');
const {
  buildCurriculumReviewQueueProjection
} = require('../assets/curriculum-review-queue-dashboard');
const {
  buildContentChangeImpactAnalysis
} = require('../assets/content-change-impact-analysis');
const {
  buildCurriculumReleaseChannelFromPublication,
  validateCurriculumReleaseChannelVersion
} = require('../assets/curriculum-release-channel-policy');
const {
  buildReviewerWorkloadSlaReport
} = require('../assets/reviewer-workload-sla-report');

test('content publication domain normalizes statuses, hashes, QA, and approvals', () => {
  const publication = createPublication({
    id: 'pub-1',
    sourceHash: 'sha256:source',
    artifactHash: 'sha256:artifact',
    changedFiles: ['assets/question-bank-source/grammar.json'],
    qaResults: [{ id: 'schema', status: 'passed' }],
    createdAt: '2030-04-29T12:00:00.000Z'
  });

  assert.equal(publication.status, 'draft');
  assert.equal(publication.reviewItems.length, 0);
  assert.deepEqual(validatePublication(publication), []);
});

test('content publication blocks publish until QA passes and reviewer approval exists', () => {
  const failed = createPublication({
    id: 'pub-2',
    sourceHash: 'sha256:source',
    artifactHash: 'sha256:artifact',
    qaResults: [{ id: 'content', status: 'failed', blocking: true }]
  });

  assert.throws(() => publishPublication(failed, { actorId: 'reviewer-1' }), /publication_qa_blocking/);

  const approved = approvePublication(createPublication({
    id: 'pub-3',
    sourceHash: 'sha256:source',
    artifactHash: 'sha256:artifact',
    qaResults: [{ id: 'content', status: 'passed' }]
  }), {
    actorId: 'reviewer-1',
    role: 'content_reviewer',
    approvedAt: '2030-04-29T12:00:00.000Z'
  });
  const published = publishPublication(approved, {
    actorId: 'reviewer-1',
    publishedAt: '2030-04-29T12:05:00.000Z'
  });

  assert.equal(published.status, 'published');
  assert.equal(published.approvals[0].actorId, 'reviewer-1');
});

test('content publication blocks failed AI authoring guardrails before release', () => {
  const publication = approvePublication(createPublication({
    id: 'pub-ai',
    sourceHash: 'sha256:source',
    artifactHash: 'sha256:artifact',
    changedFiles: ['assets/question-bank-source/grammar.json'],
    aiAuthoringGuardrails: {
      status: 'failed',
      errorCount: 2,
      warningCount: 0,
      issueCodes: ['ai_review_required', 'ai_source_missing']
    },
    qaResults: [{ id: 'content', status: 'passed' }]
  }), {
    actorId: 'reviewer-1',
    role: 'content_reviewer',
    approvedAt: '2030-04-29T12:00:00.000Z'
  });

  assert.deepEqual(validatePublication(publication), [
    'blocking AI authoring guardrail failed: ai_review_required',
    'blocking AI authoring guardrail failed: ai_source_missing'
  ]);
  assert.throws(() => publishPublication(publication), /publication_ai_guardrails_blocking/);
});

test('content publication blockers project into the curriculum review queue', () => {
  const projection = buildCurriculumReviewQueueProjection({
    now: '2030-05-10T00:00:00.000Z',
    publicationBlockers: [{
      id: 'pub-content-blocked',
      domain: 'grammar',
      sourceSet: 'grammar-set',
      severity: 'critical',
      status: 'needs_review',
      owner: 'content_reviewer',
      createdAt: '2030-05-05T00:00:00.000Z',
      blocker: 'publication_qa_blocking'
    }]
  });

  assert.equal(projection.rows[0].issueType, 'publication_blocker');
  assert.equal(projection.rows[0].publicationBlockingReason, 'publication_qa_blocking');
  assert.equal(projection.rows[0].ageDays, 5);
});

test('content publication plans can carry impact analysis rollback evidence', () => {
  const analysis = buildContentChangeImpactAnalysis({
    releaseId: 'publication-impact-1',
    changes: [{
      questionId: 'grammar-q0001',
      changeType: 'changed',
      domain: 'grammar',
      setId: 'grammar-set',
      chunkFile: 'assets/question-chunks/grammar/grammar-set.js',
      manifestEntryId: 'grammar-set:q0001',
      rollbackRef: 'release:previous'
    }]
  });

  assert.equal(analysis.releaseId, 'publication-impact-1');
  assert.deepEqual(analysis.summary.rollbackRefs, ['release:previous']);
});

test('approved content publications create review-channel release evidence', () => {
  const publication = approvePublication(createPublication({
    id: 'pub-channel-1',
    sourceHash: 'sha256:source',
    artifactHash: 'sha256:artifact',
    changedFiles: ['assets/question-bank-source/grammar.json'],
    qaResults: [{ id: 'content', status: 'passed' }]
  }), {
    actorId: 'reviewer-1',
    role: 'content_reviewer',
    approvedAt: '2030-04-29T12:00:00.000Z'
  });
  const impact = buildContentChangeImpactAnalysis({
    releaseId: 'impact-channel-1',
    changes: [{
      questionId: 'grammar-q0001',
      changeType: 'changed',
      domain: 'grammar',
      setId: 'grammar-set',
      chunkFile: 'assets/question-chunks/grammar/grammar-set.js',
      manifestEntryId: 'grammar-set:q0001',
      rollbackRef: 'release:previous',
      reviewStatus: 'approved'
    }]
  });

  const channel = buildCurriculumReleaseChannelFromPublication({
    publication,
    impactAnalysis: impact,
    versionId: 'curriculum-pub-channel-1',
    channel: 'review',
    questionManifestHash: 'sha256:question-manifest',
    chunkManifestHash: 'sha256:chunk-manifest',
    deploymentAttestationHash: 'sha256:deployment'
  });

  assert.equal(channel.provenance.publicationId, 'pub-channel-1');
  assert.deepEqual(channel.provenance.reviewApprovalIds, ['reviewer-1:2030-04-29T12:00:00.000Z']);
  assert.equal(channel.provenance.contentImpactAnalysisId, 'impact-channel-1');
  assert.deepEqual(validateCurriculumReleaseChannelVersion(channel).errors, []);
});

test('content publication blockers roll into reviewer workload SLA reports', () => {
  const report = buildReviewerWorkloadSlaReport({
    now: '2030-05-10T00:00:00.000Z',
    issues: [{
      issueId: 'pub-blocker-1',
      issueType: 'publication_blocker',
      owner: 'content_reviewer',
      severity: 'critical',
      status: 'blocked',
      createdAt: '2030-05-08T00:00:00.000Z',
      publicationBlockingReason: 'publication_qa_blocking'
    }]
  });

  assert.equal(report.summary.byIssueType.publication_blocker, 1);
  assert.equal(report.summary.byPublicationBlocking.blocking, 1);
  assert.equal(report.rows[0].slaBucket, 'overdue');
});
