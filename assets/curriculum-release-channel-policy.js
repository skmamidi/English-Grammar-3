(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestCurriculumReleaseChannelPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const RELEASE_CHANNELS = Object.freeze(['draft', 'review', 'staged', 'published']);
  const CHANNEL_TRANSITIONS = Object.freeze({
    draft: Object.freeze(['review']),
    review: Object.freeze(['staged']),
    staged: Object.freeze(['published', 'review']),
    published: Object.freeze(['staged'])
  });
  const REQUIRED_STAGING_EVIDENCE = Object.freeze(['qa:content', 'qa:questions', 'qa:deployment-attestation']);
  const RISK_LEVELS = Object.freeze(['low', 'medium', 'high', 'critical']);
  const SENSITIVE_FIELD_PATTERN = /(^|_|\b)(learnerId|studentId|learnerState|answerKey|correctAnswer|correct|choices|question|prompt|explanation|rawAiDraft|aiDraft|sourceExcerpt|studentName|email|privateKey|secret)(\b|_|$)/i;
  const SENSITIVE_VALUE_PATTERN = /(answer key|raw ai draft|draft body|do not expose|learner-[a-z0-9-]+|student-[a-z0-9-]+)/i;

  const DEFAULT_CURRICULUM_RELEASE_CHANNEL_FIXTURE = Object.freeze({
    versionId: 'curriculum-2030.04.29',
    channel: 'review',
    provenance: Object.freeze({
      publicationId: 'pub-curriculum-2030-04-29',
      sourceHash: 'sha256:source',
      questionManifestHash: 'sha256:question-manifest',
      chunkManifestHash: 'sha256:chunk-manifest',
      reviewApprovalIds: Object.freeze(['approval-content-reviewer-1']),
      sourceRemediationRecordIds: Object.freeze(['source-remediation:grammar-q0003']),
      deploymentAttestationHash: 'sha256:deployment-attestation',
      contentImpactAnalysisId: 'content-impact-1',
      chunkManifestFresh: true
    }),
    rollback: Object.freeze({
      previousVersionId: 'curriculum-2030.04.22',
      rollbackRef: 'release:curriculum-2030.04.22'
    }),
    compatibility: Object.freeze({
      learnerStateCompatibilityRisk: 'medium',
      learnerStateMigrationRequired: false
    }),
    transitionHistory: Object.freeze([
      Object.freeze({
        from: 'draft',
        to: 'review',
        actorId: 'content-reviewer-1',
        transitionedAt: '2030-04-29T13:00:00.000Z',
        validationEvidenceIds: Object.freeze(['qa:content', 'qa:questions'])
      })
    ])
  });

  function buildCurriculumReleaseChannelVersion(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const provenance = normalizeProvenance(source.provenance || source);
    const rollback = normalizeRollback(source.rollback || source);
    const compatibility = normalizeCompatibility(source.compatibility || source);
    return Object.freeze({
      schemaVersion: 1,
      versionId: safeString(source.versionId || source.releaseId || source.id),
      channel: normalizeChannel(source.channel),
      historyMode: safeString(source.historyMode || 'append_only'),
      createdAt: safeString(source.createdAt),
      provenance: Object.freeze(provenance),
      rollback: Object.freeze(rollback),
      compatibility: Object.freeze(compatibility),
      transitionHistory: Object.freeze(normalizeTransitions(source.transitionHistory))
    });
  }

  function buildCurriculumReleaseChannelFromPublication(input = {}) {
    const publication = input.publication && typeof input.publication === 'object' ? input.publication : {};
    const impact = input.impactAnalysis && typeof input.impactAnalysis === 'object' ? input.impactAnalysis : {};
    const summary = impact.summary && typeof impact.summary === 'object' ? impact.summary : {};
    return buildCurriculumReleaseChannelVersion({
      versionId: input.versionId || `curriculum-${publication.id || 'local'}`,
      channel: input.channel || 'review',
      createdAt: input.createdAt,
      provenance: {
        publicationId: publication.id,
        sourceHash: publication.sourceHash,
        questionManifestHash: input.questionManifestHash || publication.questionManifestHash,
        chunkManifestHash: input.chunkManifestHash || publication.artifactHash,
        reviewApprovalIds: approvalIds(publication.approvals),
        sourceRemediationRecordIds: summary.sourceRemediationRecords || input.sourceRemediationRecordIds,
        deploymentAttestationHash: input.deploymentAttestationHash,
        contentImpactAnalysisId: impact.releaseId,
        chunkManifestFresh: input.chunkManifestFresh !== false
      },
      rollback: {
        previousVersionId: input.previousVersionId,
        rollbackRef: first(summary.rollbackRefs) || input.rollbackRef
      },
      compatibility: {
        learnerStateCompatibilityRisk: summary.learnerStateCompatibilityRisk || input.learnerStateCompatibilityRisk,
        learnerStateMigrationRequired: input.learnerStateMigrationRequired === true
      },
      transitionHistory: input.transitionHistory
    });
  }

  function validateCurriculumReleaseChannelVersion(version = {}) {
    const input = version && typeof version === 'object' ? version : {};
    const provenance = input.provenance && typeof input.provenance === 'object' ? input.provenance : {};
    const rollback = input.rollback && typeof input.rollback === 'object' ? input.rollback : {};
    const compatibility = input.compatibility && typeof input.compatibility === 'object' ? input.compatibility : {};
    const errors = [];

    if (!safeString(input.versionId)) errors.push(issue('missing_version_id', 'versionId is required.'));
    if (!RELEASE_CHANNELS.includes(safeString(input.channel))) errors.push(issue('invalid_channel', 'channel must be draft, review, staged, or published.'));
    if (safeString(input.historyMode || 'append_only') !== 'append_only') errors.push(issue('mutable_history_forbidden', 'release channel history must be append-only.'));
    if (!safeString(provenance.publicationId)) errors.push(issue('missing_publication_id', 'publicationId is required.'));
    if (!safeString(provenance.sourceHash)) errors.push(issue('missing_source_hash', 'sourceHash is required.'));
    if (!safeString(provenance.questionManifestHash)) errors.push(issue('missing_question_manifest_hash', 'questionManifestHash is required.'));
    if (!safeString(provenance.chunkManifestHash)) errors.push(issue('missing_chunk_manifest_hash', 'chunkManifestHash is required.'));
    if (!normalizeStringArray(provenance.reviewApprovalIds).length) errors.push(issue('missing_review_approval', 'review approval evidence is required.'));
    if (!safeString(provenance.deploymentAttestationHash)) errors.push(issue('missing_deployment_attestation', 'deployment attestation hash is required.'));
    if (!safeString(provenance.contentImpactAnalysisId)) errors.push(issue('missing_content_impact_analysis', 'content impact analysis id is required.'));
    if (provenance.chunkManifestFresh === false) errors.push(issue('stale_generated_artifacts', 'generated manifest and chunk artifacts must be fresh.'));
    if (!safeString(rollback.rollbackRef)) errors.push(issue('missing_rollback_ref', 'rollbackRef is required.'));
    if (!RISK_LEVELS.includes(safeString(compatibility.learnerStateCompatibilityRisk || 'low'))) errors.push(issue('invalid_learner_state_compatibility', 'learner-state compatibility risk is invalid.'));
    if (compatibility.learnerStateMigrationRequired === true) errors.push(issue('learner_state_migration_required', 'release channel cannot promote while learner-state migration is required.'));
    if (containsSensitiveChannelData(input)) errors.push(issue('unsafe_channel_payload', 'release channel payload contains learner, answer, prompt, secret, or source-excerpt data.'));

    return { valid: errors.length === 0, errors };
  }

  function validateCurriculumReleaseChannelTransition(version = {}, targetChannel, evidence = {}) {
    const source = buildCurriculumReleaseChannelVersion(version);
    const target = normalizeChannel(targetChannel);
    const errors = [];
    if (!target) {
      errors.push(issue('invalid_channel', 'target channel is invalid.'));
      return { valid: false, errors };
    }
    if (!((CHANNEL_TRANSITIONS[source.channel] || []).includes(target))) {
      errors.push(issue('invalid_channel_transition', `${source.channel} cannot transition directly to ${target}.`));
    }
    requiredTransitionEvidence(source.channel, target).forEach(requiredId => {
      if (!normalizeStringArray(evidence.validationEvidenceIds).includes(requiredId)) {
        errors.push(issue('missing_transition_evidence', `${requiredId} evidence is required for ${source.channel} to ${target}.`));
      }
    });
    return { valid: errors.length === 0, errors };
  }

  function transitionCurriculumReleaseChannel(version = {}, targetChannel, evidence = {}) {
    const source = buildCurriculumReleaseChannelVersion(version);
    const result = validateCurriculumReleaseChannelTransition(source, targetChannel, evidence);
    if (result.errors.length) {
      throw new Error(result.errors.map(error => error.code).join(','));
    }
    return buildCurriculumReleaseChannelVersion(Object.assign({}, source, {
      channel: targetChannel,
      transitionHistory: source.transitionHistory.concat({
        from: source.channel,
        to: targetChannel,
        actorId: safeString(evidence.actorId),
        transitionedAt: safeString(evidence.transitionedAt || new Date().toISOString()),
        validationEvidenceIds: normalizeStringArray(evidence.validationEvidenceIds)
      })
    }));
  }

  function normalizeProvenance(input = {}) {
    return {
      publicationId: safeString(input.publicationId),
      sourceHash: safeString(input.sourceHash),
      questionManifestHash: safeString(input.questionManifestHash),
      chunkManifestHash: safeString(input.chunkManifestHash || input.artifactHash),
      reviewApprovalIds: Object.freeze(normalizeStringArray(input.reviewApprovalIds)),
      sourceRemediationRecordIds: Object.freeze(normalizeStringArray(input.sourceRemediationRecordIds)),
      deploymentAttestationHash: safeString(input.deploymentAttestationHash),
      contentImpactAnalysisId: safeString(input.contentImpactAnalysisId),
      chunkManifestFresh: input.chunkManifestFresh !== false
    };
  }

  function normalizeRollback(input = {}) {
    return {
      previousVersionId: safeString(input.previousVersionId),
      rollbackRef: safeString(input.rollbackRef)
    };
  }

  function normalizeCompatibility(input = {}) {
    const risk = safeString(input.learnerStateCompatibilityRisk || 'low');
    return {
      learnerStateCompatibilityRisk: RISK_LEVELS.includes(risk) ? risk : 'low',
      learnerStateMigrationRequired: input.learnerStateMigrationRequired === true
    };
  }

  function normalizeTransitions(values) {
    return (Array.isArray(values) ? values : []).map(transition => Object.freeze({
      from: normalizeChannel(transition && transition.from),
      to: normalizeChannel(transition && transition.to),
      actorId: safeString(transition && transition.actorId),
      transitionedAt: safeString(transition && transition.transitionedAt),
      validationEvidenceIds: Object.freeze(normalizeStringArray(transition && transition.validationEvidenceIds))
    })).filter(transition => transition.from || transition.to);
  }

  function requiredTransitionEvidence(from, to) {
    if (from === 'review' && to === 'staged') return REQUIRED_STAGING_EVIDENCE;
    if (from === 'staged' && to === 'published') return REQUIRED_STAGING_EVIDENCE;
    if (from === 'published' && to === 'staged') return Object.freeze(['rollback:approved', 'qa:deployment-attestation']);
    return Object.freeze([]);
  }

  function approvalIds(approvals) {
    return (Array.isArray(approvals) ? approvals : []).map(approval => {
      const actorId = safeString(approval && approval.actorId || approval && approval.id);
      const approvedAt = safeString(approval && approval.approvedAt);
      return approvedAt ? `${actorId}:${approvedAt}` : actorId;
    }).filter(Boolean);
  }

  function containsSensitiveChannelData(value) {
    const path = findSensitivePath(value);
    if (path) return true;
    return SENSITIVE_VALUE_PATTERN.test(JSON.stringify(value || {}));
  }

  function findSensitivePath(value, trail = []) {
    if (!value || typeof value !== 'object') return '';
    return Object.keys(value).map(key => {
      const nextTrail = trail.concat(key);
      if (SENSITIVE_FIELD_PATTERN.test(key)) return nextTrail.join('.');
      return findSensitivePath(value[key], nextTrail);
    }).find(Boolean) || '';
  }

  function normalizeChannel(value) {
    const channel = safeString(value || 'draft');
    return RELEASE_CHANNELS.includes(channel) ? channel : '';
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
  }

  function first(values) {
    return Array.isArray(values) && values.length ? safeString(values[0]) : '';
  }

  function issue(code, message) {
    return { code, message };
  }

  function safeString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
  }

  return {
    CHANNEL_TRANSITIONS,
    DEFAULT_CURRICULUM_RELEASE_CHANNEL_FIXTURE,
    RELEASE_CHANNELS,
    buildCurriculumReleaseChannelFromPublication,
    buildCurriculumReleaseChannelVersion,
    transitionCurriculumReleaseChannel,
    validateCurriculumReleaseChannelTransition,
    validateCurriculumReleaseChannelVersion
  };
});
