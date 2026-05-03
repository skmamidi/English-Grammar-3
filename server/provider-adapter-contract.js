const SAFE_DIAGNOSTIC_KEYS = new Set(['region', 'source', 'emulator', 'projectAlias']);
const VALID_STATUSES = new Set(['ready', 'degraded', 'disabled', 'unavailable', 'permission_denied', 'stale_schema', 'malformed']);

function createProviderAdapterConfig(env = {}) {
  const provider = safeString(env.GRAMMARQUEST_PROVIDER_PILOT || env.PROVIDER_PILOT || '');
  return {
    enabled: provider === 'firestore',
    provider: provider || 'none',
    healthDocumentPath: safeString(env.GRAMMARQUEST_PROVIDER_HEALTH_PATH) || 'health/metadata',
    expectedSchemaVersion: 1,
    timeoutMs: safePositiveInt(env.GRAMMARQUEST_PROVIDER_TIMEOUT_MS, 1500)
  };
}

async function readProviderHealth(adapter, options = {}) {
  if (!adapter || typeof adapter.readHealthMetadata !== 'function') {
    return failure('unknown', 'unavailable', 'provider_adapter_missing');
  }

  try {
    const record = await adapter.readHealthMetadata(options);
    if (record && record.status === 'disabled') return normalizeProviderHealthRecord(record);
    return normalizeProviderHealthRecord(record, options);
  } catch (error) {
    return normalizeProviderError(adapter.provider || adapter.id || 'unknown', error);
  }
}

function normalizeProviderHealthRecord(record = {}, options = {}) {
  const provider = safeString(record.provider) || 'unknown';
  const status = safeString(record.status) || 'malformed';
  const schemaVersion = Number(record.schemaVersion);
  const expectedSchemaVersion = Number(options.expectedSchemaVersion || 1);

  if (status === 'disabled') {
    return {
      provider,
      status: 'disabled',
      reason: safeString(record.reason) || 'provider_pilot_disabled',
      schemaVersion: Number.isFinite(schemaVersion) ? schemaVersion : 0,
      checkedAt: safeIso(record.checkedAt) || nowIso(options),
      capabilities: [],
      diagnostics: sanitizeDiagnostics(record.diagnostics)
    };
  }

  if (!Number.isFinite(schemaVersion) || schemaVersion < 0) {
    return failure(provider, 'malformed', 'provider_record_malformed');
  }

  if (schemaVersion < expectedSchemaVersion) {
    return failure(provider, 'stale_schema', 'provider_schema_stale', { schemaVersion });
  }

  if (!VALID_STATUSES.has(status)) {
    return failure(provider, 'malformed', 'provider_record_malformed', { schemaVersion });
  }

  return {
    provider,
    status,
    reason: safeString(record.reason) || (status === 'ready' ? 'provider_ready' : status),
    schemaVersion,
    checkedAt: safeIso(record.checkedAt) || nowIso(options),
    capabilities: uniqueStrings(record.capabilities),
    diagnostics: sanitizeDiagnostics(record.diagnostics)
  };
}

function normalizeProviderError(provider, error) {
  const code = safeString(error && error.code).toLowerCase();
  if (code === 'permission-denied' || code === 'permission_denied') {
    return failure(provider, 'permission_denied', 'provider_permission_denied');
  }
  return failure(provider, 'unavailable', 'provider_unavailable');
}

function failure(provider, status, reason, extra = {}) {
  return Object.assign({
    provider,
    status,
    reason,
    schemaVersion: extra.schemaVersion || 0,
    checkedAt: extra.checkedAt || new Date(0).toISOString(),
    capabilities: [],
    diagnostics: {}
  }, extra);
}

function sanitizeDiagnostics(input = {}) {
  if (!input || typeof input !== 'object') return {};
  return Object.keys(input).sort().reduce((safe, key) => {
    if (!SAFE_DIAGNOSTIC_KEYS.has(key)) return safe;
    const value = safeString(input[key]);
    if (value) safe[key] = value;
    return safe;
  }, {});
}

function uniqueStrings(values) {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map(safeString)
    .filter(Boolean))).sort();
}

function safePositiveInt(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function safeIso(value) {
  const text = safeString(value);
  if (!text) return '';
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function nowIso(options) {
  const now = typeof options.now === 'function' ? options.now() : new Date();
  return now.toISOString();
}

function safeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

module.exports = {
  createProviderAdapterConfig,
  normalizeProviderHealthRecord,
  readProviderHealth,
  sanitizeDiagnostics
};
