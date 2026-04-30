const ALLOWED_API_ERROR_CODES = [
  'invalid_request',
  'unauthorized_origin',
  'rate_limited',
  'payload_too_large',
  'selection_unavailable',
  'integrity_failed',
  'internal_error'
];

const DEFAULT_MESSAGES = {
  invalid_request: 'Request is invalid.',
  unauthorized_origin: 'Origin is not allowed.',
  rate_limited: 'Too many requests.',
  payload_too_large: 'Request payload is too large.',
  selection_unavailable: 'Selection is unavailable.',
  integrity_failed: 'Selection integrity failed.',
  internal_error: 'Request failed.'
};

function createApiError(code, message, options = {}) {
  if (!ALLOWED_API_ERROR_CODES.includes(code)) throw new Error(`api_error_code_not_allowed:${code}`);
  const error = new Error(message || DEFAULT_MESSAGES[code]);
  error.apiCode = code;
  error.requestId = normalizeRequestId(options.requestId);
  error.retryable = options.retryable === true || code === 'rate_limited' || code === 'selection_unavailable';
  error.status = options.status || statusForCode(code);
  return error;
}

function toApiErrorEnvelope(error, options = {}) {
  const code = ALLOWED_API_ERROR_CODES.includes(error && error.apiCode) ? error.apiCode : 'internal_error';
  const requestId = normalizeRequestId(error && error.requestId || options.requestId);
  const message = code === 'internal_error'
    ? DEFAULT_MESSAGES.internal_error
    : safeMessage(error && error.message, DEFAULT_MESSAGES[code]);
  return {
    ok: false,
    error: {
      code,
      message,
      requestId,
      retryable: error && error.retryable === true
    }
  };
}

function isSafeApiErrorEnvelope(envelope) {
  const serialized = JSON.stringify(envelope || {});
  return !!(envelope && envelope.ok === false && envelope.error && ALLOWED_API_ERROR_CODES.includes(envelope.error.code)) &&
    !/(stack|privateKey|private_key|token|rawBody|question|choices|answer|explanation|learnerId|studentId)/i.test(serialized);
}

function normalizeRequestId(value) {
  const safe = String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  if (!safe) return `req_${Date.now().toString(36)}`;
  return safe.startsWith('req_') ? safe : `req_${safe}`;
}

function safeMessage(value, fallback) {
  const message = String(value || fallback || '').replace(/\s+/g, ' ').trim();
  return message.slice(0, 160) || fallback;
}

function statusForCode(code) {
  return {
    invalid_request: 400,
    unauthorized_origin: 403,
    rate_limited: 429,
    payload_too_large: 413,
    selection_unavailable: 503,
    integrity_failed: 422,
    internal_error: 500
  }[code] || 500;
}

module.exports = {
  ALLOWED_API_ERROR_CODES,
  createApiError,
  isSafeApiErrorEnvelope,
  toApiErrorEnvelope
};
