const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  createProviderAdapterConfig,
  normalizeProviderHealthRecord,
  readProviderHealth
} = require('../server/provider-adapter-contract');
const {
  createFirestoreHealthMetadataAdapter
} = require('../server/provider-adapters/firestore-health-metadata-adapter');
const { auditModuleBoundaries } = require('../scripts/qa/module-boundary-audit');

const repoRoot = path.resolve(__dirname, '..');
const fixturesDir = path.join(__dirname, 'fixtures', 'provider-adapter');

test('provider adapter pilot is disabled by default and provider neutral', async () => {
  const config = createProviderAdapterConfig({});
  const adapter = createFirestoreHealthMetadataAdapter({ config });
  const result = await readProviderHealth(adapter);

  assert.equal(config.enabled, false);
  assert.equal(result.status, 'disabled');
  assert.equal(result.provider, 'firestore');
  assert.equal(result.reason, 'provider_pilot_disabled');
});

test('firestore health adapter normalizes successful provider metadata', async () => {
  const fixture = readFixture('success.json');
  const adapter = createFirestoreHealthMetadataAdapter({
    config: createProviderAdapterConfig({ GRAMMARQUEST_PROVIDER_PILOT: 'firestore' }),
    client: fakeFirestoreClient(fixture)
  });
  const result = await readProviderHealth(adapter, { now: () => new Date('2026-05-03T00:00:00Z') });

  assert.equal(result.status, 'ready');
  assert.equal(result.provider, 'firestore');
  assert.equal(result.schemaVersion, 1);
  assert.deepEqual(result.capabilities, ['health_metadata']);
  assert.deepEqual(result.diagnostics, {
    region: 'local-emulator',
    source: 'provider_adapter_pilot'
  });
});

test('provider adapter maps unavailable permission denied stale schema and malformed records', async () => {
  const config = createProviderAdapterConfig({ GRAMMARQUEST_PROVIDER_PILOT: 'firestore' });
  const cases = [
    ['unavailable', rejectingClient(Object.assign(new Error('connection refused'), { code: 'unavailable' })), 'unavailable', 'provider_unavailable'],
    ['permission', rejectingClient(Object.assign(new Error('denied'), { code: 'permission-denied' })), 'permission_denied', 'provider_permission_denied'],
    ['stale', fakeFirestoreClient(readFixture('stale-schema.json')), 'stale_schema', 'provider_schema_stale'],
    ['malformed', fakeFirestoreClient(readFixture('malformed-record.json')), 'malformed', 'provider_record_malformed']
  ];

  for (const [_name, client, status, reason] of cases) {
    const adapter = createFirestoreHealthMetadataAdapter({ config, client });
    const result = await readProviderHealth(adapter);
    assert.equal(result.status, status);
    assert.equal(result.reason, reason);
  }
});

test('provider health records are sanitized and reject provider document leakage', () => {
  const normalized = normalizeProviderHealthRecord({
    provider: 'firestore',
    status: 'ready',
    schemaVersion: 1,
    checkedAt: '2026-05-03T00:00:00Z',
    capabilities: ['health_metadata', 'health_metadata'],
    diagnostics: {
      region: 'us-test1',
      authToken: 'secret-token',
      rawDocumentPath: 'projects/demo/databases/(default)/documents/health/metadata',
      source: 'provider_adapter_pilot'
    }
  });

  assert.deepEqual(normalized.capabilities, ['health_metadata']);
  assert.deepEqual(normalized.diagnostics, {
    region: 'us-test1',
    source: 'provider_adapter_pilot'
  });
});

test('provider SDK imports stay behind server provider adapter boundaries', () => {
  const report = auditModuleBoundaries({ root: repoRoot });
  const providerLeakViolations = report.violations.filter(violation => violation.code === 'provider_sdk_in_browser_domain');

  assert.deepEqual(providerLeakViolations, []);
});

test('provider adapter docs and unit wiring are present', () => {
  const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'provider-adapter-pilot.md'), 'utf8');
  const checklist = fs.readFileSync(path.join(repoRoot, 'docs', 'release-checklist.md'), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

  assert.match(docs, /disabled by default/i);
  assert.match(docs, /provider SDK usage stays in server\/provider-adapters/i);
  assert.match(docs, /local fallback/i);
  assert.match(docs, /safe staging enablement/i);
  assert.match(checklist, /provider adapter pilot/i);
  assert.match(pkg.scripts['test:unit'], /tests\/provider-adapter-contract\.test\.js/);
});

function readFixture(file) {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, file), 'utf8'));
}

function fakeFirestoreClient(record) {
  return {
    doc(pathValue) {
      assert.equal(pathValue, 'health/metadata');
      return {
        async get() {
          return {
            exists: true,
            data() {
              return record;
            }
          };
        }
      };
    }
  };
}

function rejectingClient(error) {
  return {
    doc() {
      return {
        async get() {
          throw error;
        }
      };
    }
  };
}
