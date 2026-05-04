const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  CHANNEL_TRANSITIONS,
  DEFAULT_CURRICULUM_RELEASE_CHANNEL_FIXTURE,
  RELEASE_CHANNELS,
  buildCurriculumReleaseChannelVersion,
  buildCurriculumReleaseChannelFromPublication,
  transitionCurriculumReleaseChannel,
  validateCurriculumReleaseChannelTransition,
  validateCurriculumReleaseChannelVersion
} = require('../assets/curriculum-release-channel-policy');

const repoRoot = path.resolve(__dirname, '..');

test('curriculum release channel policy defines draft review staged and published channels', () => {
  assert.deepEqual(RELEASE_CHANNELS, ['draft', 'review', 'staged', 'published']);
  assert.deepEqual(CHANNEL_TRANSITIONS.draft, ['review']);
  assert.deepEqual(CHANNEL_TRANSITIONS.review, ['staged']);
  assert.deepEqual(CHANNEL_TRANSITIONS.staged, ['published', 'review']);
  assert.deepEqual(CHANNEL_TRANSITIONS.published, ['staged']);
});

test('curriculum release channel versions keep public-safe provenance and rollback metadata', () => {
  const version = buildCurriculumReleaseChannelVersion(DEFAULT_CURRICULUM_RELEASE_CHANNEL_FIXTURE);

  assert.equal(version.schemaVersion, 1);
  assert.equal(version.versionId, 'curriculum-2030.04.29');
  assert.equal(version.channel, 'review');
  assert.match(version.provenance.questionManifestHash, /^sha256:/);
  assert.match(version.provenance.chunkManifestHash, /^sha256:/);
  assert.match(version.provenance.sourceHash, /^sha256:/);
  assert.equal(version.provenance.publicationId, 'pub-curriculum-2030-04-29');
  assert.deepEqual(version.provenance.reviewApprovalIds, ['approval-content-reviewer-1']);
  assert.deepEqual(version.provenance.sourceRemediationRecordIds, ['source-remediation:grammar-q0003']);
  assert.equal(version.provenance.deploymentAttestationHash, 'sha256:deployment-attestation');
  assert.equal(version.provenance.contentImpactAnalysisId, 'content-impact-1');
  assert.equal(version.rollback.previousVersionId, 'curriculum-2030.04.22');
  assert.equal(version.rollback.rollbackRef, 'release:curriculum-2030.04.22');
  assert.equal(version.compatibility.learnerStateCompatibilityRisk, 'medium');
  assert.deepEqual(validateCurriculumReleaseChannelVersion(version).errors, []);
  assert.equal(JSON.stringify(version).includes('answerKey'), false);
  assert.equal(JSON.stringify(version).includes('rawAiDraft'), false);
});

test('curriculum release channel validation blocks incomplete stale and unsafe versions', () => {
  const version = buildCurriculumReleaseChannelVersion(DEFAULT_CURRICULUM_RELEASE_CHANNEL_FIXTURE);

  assert.ok(validateCurriculumReleaseChannelVersion(Object.assign({}, version, { versionId: '' })).errors.some(error => error.code === 'missing_version_id'));
  assert.ok(validateCurriculumReleaseChannelVersion(setPath(version, ['provenance', 'reviewApprovalIds'], [])).errors.some(error => error.code === 'missing_review_approval'));
  assert.ok(validateCurriculumReleaseChannelVersion(setPath(version, ['provenance', 'chunkManifestFresh'], false)).errors.some(error => error.code === 'stale_generated_artifacts'));
  assert.ok(validateCurriculumReleaseChannelVersion(setPath(version, ['rollback', 'rollbackRef'], '')).errors.some(error => error.code === 'missing_rollback_ref'));
  assert.ok(validateCurriculumReleaseChannelVersion(setPath(version, ['compatibility', 'learnerStateMigrationRequired'], true)).errors.some(error => error.code === 'learner_state_migration_required'));
  assert.ok(validateCurriculumReleaseChannelVersion(setPath(version, ['historyMode'], 'overwrite')).errors.some(error => error.code === 'mutable_history_forbidden'));
  assert.ok(validateCurriculumReleaseChannelVersion(setPath(version, ['provenance', 'rawAiDraft'], 'draft body')).errors.some(error => error.code === 'unsafe_channel_payload'));
});

test('curriculum release channel transitions require adjacent gates and evidence', () => {
  const review = buildCurriculumReleaseChannelVersion(DEFAULT_CURRICULUM_RELEASE_CHANNEL_FIXTURE);
  const staged = transitionCurriculumReleaseChannel(review, 'staged', {
    actorId: 'release-manager-1',
    transitionedAt: '2030-04-29T14:00:00.000Z',
    validationEvidenceIds: ['qa:content', 'qa:questions', 'qa:deployment-attestation']
  });

  assert.equal(staged.channel, 'staged');
  assert.equal(staged.transitionHistory.length, 2);
  assert.equal(staged.transitionHistory[1].from, 'review');
  assert.equal(staged.transitionHistory[1].to, 'staged');
  assert.deepEqual(validateCurriculumReleaseChannelTransition(review, 'staged', {
    validationEvidenceIds: ['qa:content', 'qa:questions', 'qa:deployment-attestation']
  }).errors, []);
  assert.ok(validateCurriculumReleaseChannelTransition(review, 'published', {
    validationEvidenceIds: ['qa:content', 'qa:questions', 'qa:deployment-attestation']
  }).errors.some(error => error.code === 'invalid_channel_transition'));
  assert.ok(validateCurriculumReleaseChannelTransition(review, 'staged', {
    validationEvidenceIds: ['qa:content']
  }).errors.some(error => error.code === 'missing_transition_evidence'));
});

test('curriculum release channel can be built from publication and impact evidence', () => {
  const version = buildCurriculumReleaseChannelFromPublication({
    publication: {
      id: 'pub-1',
      sourceHash: 'sha256:source',
      artifactHash: 'sha256:artifact',
      approvals: [{ actorId: 'reviewer-1', approvedAt: '2030-04-29T12:00:00.000Z' }]
    },
    impactAnalysis: {
      releaseId: 'impact-1',
      summary: {
        sourceRemediationRecords: ['source-remediation:grammar-q0003'],
        rollbackRefs: ['release:previous'],
        learnerStateCompatibilityRisk: 'medium'
      }
    },
    channel: 'review',
    versionId: 'curriculum-pub-1',
    questionManifestHash: 'sha256:question-manifest',
    chunkManifestHash: 'sha256:chunk-manifest',
    deploymentAttestationHash: 'sha256:deployment'
  });

  assert.equal(version.provenance.publicationId, 'pub-1');
  assert.deepEqual(version.provenance.reviewApprovalIds, ['reviewer-1:2030-04-29T12:00:00.000Z']);
  assert.deepEqual(version.provenance.sourceRemediationRecordIds, ['source-remediation:grammar-q0003']);
  assert.equal(version.rollback.rollbackRef, 'release:previous');
  assert.deepEqual(validateCurriculumReleaseChannelVersion(version).errors, []);
});

test('curriculum release channel docs and CI wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'curriculum-release-channels.md'), 'utf8');
  const authoring = fs.readFileSync(path.join(repoRoot, 'docs', 'question-authoring.md'), 'utf8');
  const attestation = fs.readFileSync(path.join(repoRoot, 'docs', 'operations', 'deployment-attestation.md'), 'utf8');
  const roadmap = fs.readFileSync(path.join(repoRoot, 'docs', 'milestone-roadmap.md'), 'utf8');
  const ciContract = fs.readFileSync(path.join(repoRoot, 'tests', 'ci-contract.test.js'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  ['draft', 'review', 'staged', 'published'].forEach(channel => assert.match(docs, new RegExp(channel, 'i')));
  assert.match(docs, /artifact provenance/i);
  assert.match(docs, /rollback metadata/i);
  assert.match(docs, /learner-state compatibility/i);
  assert.match(authoring, /curriculum-release-channels\.md/);
  assert.match(attestation, /curriculum release channel/i);
  assert.match(roadmap, /✅.*19\.5.*curriculum-release-channel-policy\.js/);
  assert.match(ciContract, /curriculum-release-channel-policy/);
  assert.match(pkg.scripts['test:unit'], /tests\/curriculum-release-channel-policy\.test\.js/);
});

function setPath(value, parts, replacement) {
  const clone = JSON.parse(JSON.stringify(value));
  let target = clone;
  parts.slice(0, -1).forEach(part => {
    target = target[part];
  });
  target[parts[parts.length - 1]] = replacement;
  return clone;
}
