const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildAdminOperationsProjection,
  normalizeAuditSummary,
  normalizeCacheHealth
} = require('../assets/admin-operations-domain');

test('admin operations projection exposes operational metadata only', () => {
  const projection = buildAdminOperationsProjection({
    release: {
      releaseId: 'local-2026-04-30',
      appVersion: '1.2.3',
      generatedAt: '2026-04-30T12:00:00.000Z',
      questionManifestSourceHash: 'sha256:questions',
      serviceWorkerCacheVersion: 'gq-questions',
      featureFlagConfigHash: 'sha256:flags',
      privateKey: 'secret'
    },
    artifacts: {
      questionManifestSourceHash: 'sha256:questions',
      chunkCount: 84,
      sourceSetCount: 6,
      question: 'Which answer is correct?'
    },
    featureFlags: {
      serverSelectionEnabled: true,
      serverSelectionPilotDomains: ['grammar', 'vocabulary'],
      telemetryEnabled: true,
      token: 'secret'
    },
    selectionHealth: {
      totalEvents: 4,
      groups: {
        'grammar|mixed': {
          domain: 'grammar',
          mode: 'mixed',
          eventCount: 4,
          apiSuccessRate: 0.75,
          fallbackRate: 0.25,
          fallbackReasons: { integrity_failed: 1 },
          responseBytes: { p50: 1200, p95: 2400 },
          hydrateLatencyMs: { p50: 8, p95: 17 }
        }
      },
      learnerId: 'learner-1'
    },
    cacheHealth: {
      expectedVersion: 'gq-questions',
      activeVersion: 'gq-questions',
      controlled: true,
      staleCaches: ['gq-old'],
      learnerName: 'Hidden Student'
    },
    auditEvents: [{
      id: 'audit-1',
      actorId: 'admin-1',
      actorRole: 'system_admin',
      action: 'feature-flag:update',
      resourceType: 'featureFlag',
      resourceId: 'serverSelectionEnabled',
      createdAt: '2026-04-30T12:05:00.000Z',
      metadata: {
        reason: 'Pilot rollout',
        questionText: 'Do not render this',
        privateKey: 'secret'
      }
    }],
    warnings: ['selection telemetry unavailable']
  });

  assert.equal(projection.release.releaseId, 'local-2026-04-30');
  assert.equal(projection.release.privateKey, undefined);
  assert.equal(projection.artifacts.chunkCount, 84);
  assert.equal(projection.artifacts.question, undefined);
  assert.equal(projection.featureFlags.serverSelectionEnabled.enabled, true);
  assert.deepEqual(projection.featureFlags.serverSelectionPilotDomains.value, ['grammar', 'vocabulary']);
  assert.equal(projection.selectionHealth.groups[0].domain, 'grammar');
  assert.equal(projection.cacheHealth.status, 'warning');
  assert.equal(projection.auditSummary.recentEvents[0].metadata.reason, 'Pilot rollout');
  assert.equal(projection.auditSummary.recentEvents[0].metadata.questionText, undefined);
  assert.equal(JSON.stringify(projection).includes('Hidden Student'), false);
  assert.equal(JSON.stringify(projection).includes('Which answer'), false);
  assert.equal(JSON.stringify(projection).includes('secret'), false);
  assert.ok(projection.warnings.includes('selection telemetry unavailable'));
  assert.ok(projection.warnings.includes('selection fallback rate elevated'));
  assert.ok(projection.warnings.includes('stale service worker caches present'));
});

test('admin operations projection exposes aggregate experiment health without learner drilldown', () => {
  const projection = buildAdminOperationsProjection({
    aggregateAnalytics: {
      status: 'warning',
      suppressedCohortCount: 2,
      reports: [{
        cohortId: 'hidden-classroom',
        learnerId: 'learner-hidden',
        cohortSizeBucket: '10-14',
        assignment: { completionRate: 0.7 },
        featureFlagHealth: {
          adaptiveReview: { fallbackRate: 0.1, errorRate: 0 }
        }
      }]
    },
    experiments: [{
      id: 'adaptive-review-copy',
      status: 'active',
      guardrailHealth: 'healthy',
      learnerName: 'Hidden Learner'
    }]
  });

  assert.equal(projection.aggregateAnalytics.status, 'warning');
  assert.equal(projection.aggregateAnalytics.suppressedCohortCount, 2);
  assert.equal(projection.aggregateAnalytics.reports[0].cohortSizeBucket, '10-14');
  assert.equal(projection.aggregateAnalytics.reports[0].cohortId, undefined);
  assert.equal(projection.experiments[0].id, 'adaptive-review-copy');
  assert.equal(JSON.stringify(projection).includes('learner-hidden'), false);
  assert.equal(JSON.stringify(projection).includes('Hidden Learner'), false);
});

test('cache health classifies version drift and missing cache metadata', () => {
  assert.deepEqual(normalizeCacheHealth({
    expectedVersion: 'gq-current',
    activeVersion: 'gq-current',
    staleCaches: []
  }), {
    expectedVersion: 'gq-current',
    activeVersion: 'gq-current',
    controlled: false,
    staleCaches: [],
    status: 'healthy'
  });

  assert.equal(normalizeCacheHealth({
    expectedVersion: 'gq-current',
    activeVersion: 'gq-old',
    controlled: true
  }).status, 'error');

  assert.equal(normalizeCacheHealth({}).status, 'unknown');
});

test('audit summary keeps recent redacted operational events only', () => {
  const summary = normalizeAuditSummary([
    {
      id: 'old',
      actorId: 'admin-1',
      actorRole: 'system_admin',
      action: 'manageFeatureFlags',
      resourceType: 'featureFlag',
      createdAt: '2026-04-29T10:00:00.000Z'
    },
    {
      id: 'recent',
      actorId: 'admin-2',
      actorRole: 'system_admin',
      action: 'audit-summary:view',
      resourceType: 'auditLog',
      resourceId: 'ops',
      createdAt: '2026-04-30T10:00:00.000Z',
      metadata: { learnerId: 'learner-1', reason: 'review' }
    },
    {
      id: 'learner',
      actorRole: 'teacher',
      action: 'viewAssignedLearnerReports',
      resourceType: 'learnerProgress',
      createdAt: '2026-04-30T11:00:00.000Z'
    }
  ], { limit: 1 });

  assert.equal(summary.totalEvents, 2);
  assert.deepEqual(summary.highRiskActionCounts, {
    'audit-summary:view': 1,
    manageFeatureFlags: 1
  });
  assert.equal(summary.recentEvents.length, 1);
  assert.equal(summary.recentEvents[0].id, 'recent');
  assert.equal(summary.recentEvents[0].metadata.learnerId, undefined);
});
