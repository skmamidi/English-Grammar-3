const assert = require('node:assert/strict');
const test = require('node:test');

const access = require('../assets/access-control');
const {
  createAdminOperationsService
} = require('../assets/admin-operations-service');

const admin = { id: 'admin-1', role: access.Roles.SYSTEM_ADMIN };
const teacher = { id: 'teacher-1', role: access.Roles.TEACHER, assignedLearnerIds: ['learner-1'] };

test('admin operations service denies non-admin actors and returns operational projection for admins', async () => {
  const service = createAdminOperationsService({
    releaseManifest: () => ({ releaseId: 'local', appVersion: '1.0.0', serviceWorkerCacheVersion: 'gq-local' }),
    featureFlags: () => ({ serverSelectionEnabled: true, serverSelectionPilotDomains: ['grammar'] }),
    selectionTelemetrySummary: () => ({ totalEvents: 1, groups: {} }),
    cacheMetadata: () => ({ expectedVersion: 'gq-local', activeVersion: 'gq-local', controlled: true }),
    artifactMetadata: () => ({ chunkCount: 12, sourceSetCount: 6 }),
    auditEvents: () => ([{
      id: 'audit-1',
      actorId: 'admin-1',
      actorRole: 'system_admin',
      action: access.Capabilities.manageFeatureFlags,
      resourceType: access.ResourceTypes.FEATURE_FLAG,
      createdAt: '2026-04-30T12:00:00.000Z',
      metadata: { reason: 'rollout' }
    }])
  });

  await assert.rejects(
    () => service.getConsoleProjection({ actor: teacher }),
    /access_denied:admin-console:view/
  );

  const projection = await service.getConsoleProjection({ actor: admin });
  assert.equal(projection.release.releaseId, 'local');
  assert.equal(projection.featureFlags.serverSelectionEnabled.enabled, true);
  assert.equal(projection.cacheHealth.status, 'healthy');
  assert.equal(projection.auditSummary.totalEvents, 1);
});

test('admin operations service normalizes source failures into warnings', async () => {
  const service = createAdminOperationsService({
    releaseManifest: () => { throw new Error('disk unavailable'); },
    featureFlags: () => ({ telemetryEnabled: true }),
    selectionTelemetrySummary: () => Promise.reject(new Error('network timeout')),
    cacheMetadata: () => null,
    artifactMetadata: () => ({ chunkCount: 0 }),
    auditEvents: () => []
  });

  const projection = await service.getConsoleProjection({ actor: admin });
  assert.deepEqual(projection.release, {});
  assert.ok(projection.warnings.includes('release unavailable'));
  assert.ok(projection.warnings.includes('selection health unavailable'));
  assert.equal(projection.featureFlags.telemetryEnabled.enabled, true);
});

test('feature flag updates validate config and emit audit events when writable', async () => {
  const writes = [];
  const audits = [];
  const service = createAdminOperationsService({
    featureFlags: () => ({ serverSelectionEnabled: false }),
    writeFeatureFlags: async flags => {
      writes.push(flags);
      return flags;
    },
    appendAuditEvent: async event => audits.push(event)
  });

  const preview = await service.previewFeatureFlagUpdate({
    actor: admin,
    patch: { serverSelectionEnabled: true, rolloutStage: 'pilot' },
    reason: 'Pilot grammar rollout'
  });

  assert.equal(preview.next.serverSelectionEnabled, true);
  assert.equal(preview.auditRequired, true);
  assert.deepEqual(preview.validationErrors, []);

  const result = await service.updateFeatureFlags({
    actor: admin,
    patch: { serverSelectionEnabled: true, rolloutStage: 'pilot' },
    reason: 'Pilot grammar rollout',
    now: () => '2026-04-30T12:00:00.000Z',
    id: () => 'audit-flag-1'
  });

  assert.equal(writes.length, 1);
  assert.equal(writes[0].serverSelectionEnabled, true);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].id, 'audit-flag-1');
  assert.equal(audits[0].action, access.Capabilities.updateFeatureFlags);
  assert.equal(audits[0].metadata.reason, 'Pilot grammar rollout');
});

test('feature flag writes are disabled when no adapter exists', async () => {
  const service = createAdminOperationsService({
    featureFlags: () => ({ serverSelectionEnabled: false })
  });

  const preview = await service.previewFeatureFlagUpdate({
    actor: admin,
    patch: { serverSelectionEnabled: true },
    reason: 'Need API pilot'
  });

  assert.equal(preview.writable, false);
  await assert.rejects(
    () => service.updateFeatureFlags({ actor: admin, patch: { serverSelectionEnabled: true }, reason: 'Need API pilot' }),
    /feature_flags_read_only/
  );
});
