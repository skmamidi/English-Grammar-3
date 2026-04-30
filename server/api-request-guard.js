const {
  createApiError,
  toApiErrorEnvelope
} = require('./api-error-contract');

const DEFAULT_MAX_BODY_BYTES = 16 * 1024;

async function guardApiRequest(request = {}, options = {}) {
  const requestId = normalizeRequestId(headerValue(request.headers, 'x-request-id') || request.requestId);
  try {
    const allowedMethods = options.allowedMethods || ['POST'];
    const method = String(request.method || 'POST').toUpperCase();
    if (!allowedMethods.includes(method)) {
      throw createApiError('invalid_request', 'Method is not allowed.', { requestId });
    }

    const origin = String(request.origin || headerValue(request.headers, 'origin') || '').trim();
    const allowedOrigins = options.allowedOrigins || [];
    if (allowedOrigins.length && !allowedOrigins.includes(origin)) {
      throw createApiError('unauthorized_origin', 'Origin is not allowed.', { requestId });
    }

    const rawBody = request.rawBody !== undefined ? String(request.rawBody) : JSON.stringify(request.body || {});
    const maxBodyBytes = Number(options.maxBodyBytes) || DEFAULT_MAX_BODY_BYTES;
    if (Buffer.byteLength(rawBody, 'utf8') > maxBodyBytes) {
      throw createApiError('payload_too_large', 'Request payload is too large.', { requestId });
    }

    const rateLimitAdapter = options.rateLimitAdapter;
    if (rateLimitAdapter && typeof rateLimitAdapter.checkLimit === 'function') {
      const actorKey = privacySafeActorKey(request, origin);
      const limit = await rateLimitAdapter.checkLimit(actorKey, { requestId, route: options.route || 'api' });
      if (limit && limit.allow === false) {
        throw createApiError('rate_limited', 'Too many requests.', { requestId, retryable: true });
      }
    }

    return {
      ok: true,
      requestId,
      origin,
      method,
      body: request.body !== undefined ? request.body : parseJsonBody(rawBody, requestId)
    };
  } catch (error) {
    return toApiErrorEnvelope(error, { requestId });
  }
}

function parseJsonBody(rawBody, requestId) {
  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch (error) {
    throw createApiError('invalid_request', 'Request body must be valid JSON.', { requestId });
  }
}

function privacySafeActorKey(request, origin) {
  const explicit = headerValue(request.headers, 'x-rate-limit-key') || request.actorKey || request.sessionKey || request.ipHash;
  return String(explicit || origin || 'anonymous').replace(/[^a-zA-Z0-9_.:-]/g, '').slice(0, 120) || 'anonymous';
}

function headerValue(headers = {}, name) {
  const lower = String(name).toLowerCase();
  const match = Object.keys(headers || {}).find(key => key.toLowerCase() === lower);
  return match ? headers[match] : '';
}

function normalizeRequestId(value) {
  const safe = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  if (!safe) return `req_${Date.now().toString(36)}`;
  return safe.startsWith('req_') ? safe : `req_${safe}`;
}

module.exports = {
  guardApiRequest
};
