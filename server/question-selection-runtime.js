const {
  buildSelectionResponse,
  selectQuestionRefs
} = require('./question-selection-service');
const {
  createApiError,
  toApiErrorEnvelope
} = require('./api-error-contract');
const { guardApiRequest } = require('./api-request-guard');
const {
  buildSelectionHealthSnapshot
} = require('./question-selection-health');

const DEFAULT_RUNTIME_MODE = 'local';
const DEFAULT_TTL_SECONDS = 300;
const DEFAULT_MAX_QUESTIONS = 60;
const DEFAULT_POLICY_VERSION = 1;
const DEFAULT_MAX_REQUEST_BYTES = 16 * 1024;

function buildRuntimeConfig(env = {}) {
  return {
    mode: env.SELECTION_RUNTIME_MODE || DEFAULT_RUNTIME_MODE,
    selectionPolicyVersion: positiveInteger(env.SELECTION_POLICY_VERSION, DEFAULT_POLICY_VERSION),
    signingKeyId: stringOrEmpty(env.SELECTION_SIGNING_KEY_ID),
    privateKeyRef: stringOrEmpty(env.SELECTION_PRIVATE_KEY_REF),
    responseTtlSeconds: positiveInteger(env.SELECTION_RESPONSE_TTL_SECONDS, DEFAULT_TTL_SECONDS),
    allowedDomains: list(env.SELECTION_ALLOWED_DOMAINS),
    allowedOrigins: list(env.SELECTION_ALLOWED_ORIGINS),
    maxQuestions: positiveInteger(env.SELECTION_MAX_QUESTIONS, DEFAULT_MAX_QUESTIONS),
    maxRequestBytes: positiveInteger(env.SELECTION_MAX_REQUEST_BYTES, DEFAULT_MAX_REQUEST_BYTES)
  };
}

function validateRuntimeConfig(config) {
  const cfg = config || {};
  if (cfg.mode !== 'local' && cfg.mode !== 'production') {
    throw new Error('SELECTION_RUNTIME_MODE must be "local" or "production"');
  }
  if (!Number.isInteger(cfg.selectionPolicyVersion) || cfg.selectionPolicyVersion < 1) {
    throw new Error('SELECTION_POLICY_VERSION must be a positive integer');
  }
  if (!Number.isInteger(cfg.responseTtlSeconds) || cfg.responseTtlSeconds < 1) {
    throw new Error('SELECTION_RESPONSE_TTL_SECONDS must be a positive integer');
  }
  if (!Number.isInteger(cfg.maxQuestions) || cfg.maxQuestions < 1) {
    throw new Error('SELECTION_MAX_QUESTIONS must be a positive integer');
  }
  if (!Number.isInteger(cfg.maxRequestBytes) || cfg.maxRequestBytes < 1) {
    throw new Error('SELECTION_MAX_REQUEST_BYTES must be a positive integer');
  }
  if (!Array.isArray(cfg.allowedDomains) || !cfg.allowedDomains.length) {
    throw new Error('SELECTION_ALLOWED_DOMAINS must list at least one domain');
  }
  if (cfg.mode === 'production') {
    if (!cfg.signingKeyId) throw new Error('SELECTION_SIGNING_KEY_ID is required in production');
    if (!cfg.privateKeyRef) throw new Error('SELECTION_PRIVATE_KEY_REF is required in production');
  }
  return cfg;
}

function createSelectionRuntime(dependencies = {}) {
  const config = validateRuntimeConfig(dependencies.config || buildRuntimeConfig());
  if (typeof dependencies.manifestProvider !== 'function') {
    throw new Error('selection runtime requires a manifestProvider');
  }
  if (typeof dependencies.chunkSetProvider !== 'function') {
    throw new Error('selection runtime requires a chunkSetProvider');
  }
  if (config.mode === 'production' && typeof dependencies.signer !== 'function') {
    throw new Error('production runtime requires a signer');
  }

  const clock = typeof dependencies.clock === 'function' ? dependencies.clock : () => new Date();
  const logger = dependencies.logger || console;

  return {
    config,
    async handleSelectionRequest(request) {
      const manifest = await dependencies.manifestProvider();
      const normalized = rejectDisabledDomains(request, config);
      const selection = await selectQuestionRefs(normalized, {
        manifest,
        loadSetById: dependencies.chunkSetProvider,
        now: clock,
        selectionPolicyVersion: config.selectionPolicyVersion,
        maxCount: config.maxQuestions
      });
      const response = await buildSelectionResponse(selection, normalized, {
        manifest,
        loadSetById: dependencies.chunkSetProvider,
        now: clock,
        selectionPolicyVersion: config.selectionPolicyVersion,
        responseTtlSeconds: config.responseTtlSeconds,
        signing: dependencies.signer ? {
          kid: config.signingKeyId,
          sign: dependencies.signer
        } : null
      });
      if (logger && typeof logger.info === 'function') {
        logger.info('selection request completed', {
          domain: normalized.domain,
          setCount: normalized.setIds.length,
          selectedQuestionCount: response.questionRefs.length
        });
      }
      return response;
    },
    async handleSelectionHttpRequest(httpRequest) {
      const guarded = await guardApiRequest(httpRequest, {
        allowedOrigins: config.allowedOrigins,
        allowedMethods: ['POST'],
        maxBodyBytes: config.maxRequestBytes,
        rateLimitAdapter: dependencies.rateLimitAdapter,
        route: 'selection'
      });
      if (!guarded.ok) return guarded;
      try {
        const response = await this.handleSelectionRequest(guarded.body);
        return { ok: true, requestId: guarded.requestId, response };
      } catch (error) {
        return toApiErrorEnvelope(mapSelectionError(error), { requestId: guarded.requestId });
      }
    },
    async handleHealthHttpRequest(httpRequest) {
      const guarded = await guardApiRequest(httpRequest, {
        allowedOrigins: config.allowedOrigins,
        allowedMethods: ['GET'],
        maxBodyBytes: 1024,
        rateLimitAdapter: dependencies.rateLimitAdapter,
        route: 'selection-health'
      });
      if (!guarded.ok) return guarded;
      try {
        const manifest = await dependencies.manifestProvider();
        const healthOptions = Object.assign({}, dependencies.health || {}, {
          signerAvailable: typeof dependencies.signer === 'function' || Boolean(dependencies.health && dependencies.health.signerAvailable),
          publicKeys: dependencies.publicKeys || dependencies.health && dependencies.health.publicKeys || {},
          checkedAt: clock()
        });
        return {
          ok: true,
          requestId: guarded.requestId,
          response: buildSelectionHealthSnapshot(config, manifest, healthOptions)
        };
      } catch (error) {
        return toApiErrorEnvelope(createApiError('selection_unavailable', 'Selection health is unavailable.', {
          requestId: guarded.requestId,
          retryable: true
        }), { requestId: guarded.requestId });
      }
    }
  };
}

function rejectDisabledDomains(request, config) {
  const domain = String(request && request.domain || '').trim();
  if (!config.allowedDomains.includes(domain)) {
    throw new Error(`selection runtime domain "${domain}" is not enabled`);
  }
  return Object.assign({}, request, {
    selectionPolicyVersion: config.selectionPolicyVersion,
    count: Math.min(config.maxQuestions, Number(request && request.count) || config.maxQuestions)
  });
}

function mapSelectionError(error) {
  const message = String(error && error.message || '');
  if (/integrity/i.test(message)) return createApiError('integrity_failed', 'Selection integrity failed.');
  if (/domain|setId|mode|required|unsupported|enabled|chunk-backed|selection request/i.test(message)) {
    return createApiError('invalid_request', 'Selection request is invalid.');
  }
  return createApiError('selection_unavailable', 'Selection is unavailable.', { retryable: true });
}

function list(value) {
  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function stringOrEmpty(value) {
  return String(value || '').trim();
}

function positiveInteger(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : NaN;
}

module.exports = {
  buildRuntimeConfig,
  createSelectionRuntime,
  validateRuntimeConfig
};
