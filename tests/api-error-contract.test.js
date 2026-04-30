const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ALLOWED_API_ERROR_CODES,
  createApiError,
  isSafeApiErrorEnvelope,
  toApiErrorEnvelope
} = require('../server/api-error-contract');

test('API error envelope uses stable non-sensitive codes', () => {
  const envelope = toApiErrorEnvelope(createApiError('unauthorized_origin', 'Origin is not allowed.', {
    requestId: 'req_123',
    retryable: false,
    details: {
      stack: 'do not leak',
      question: 'raw prompt',
      privateKeyRef: 'secret/ref'
    }
  }));

  assert.equal(envelope.ok, false);
  assert.equal(envelope.error.code, 'unauthorized_origin');
  assert.equal(envelope.error.message, 'Origin is not allowed.');
  assert.equal(envelope.error.requestId, 'req_123');
  assert.equal(envelope.error.retryable, false);
  assert.equal(Object.hasOwn(envelope.error, 'details'), false);
  assert.equal(JSON.stringify(envelope).includes('raw prompt'), false);
  assert.equal(isSafeApiErrorEnvelope(envelope), true);
});

test('unknown errors normalize to internal_error without raw stack traces', () => {
  const raw = new Error('Database password leaked in stack');
  raw.stack = 'private stack';
  const envelope = toApiErrorEnvelope(raw, { requestId: 'req_456' });

  assert.equal(envelope.error.code, 'internal_error');
  assert.equal(envelope.error.message, 'Request failed.');
  assert.equal(envelope.error.requestId, 'req_456');
  assert.equal(JSON.stringify(envelope).includes('private stack'), false);
});

test('allowed API error code registry is explicit', () => {
  assert.deepEqual(ALLOWED_API_ERROR_CODES, [
    'invalid_request',
    'unauthorized_origin',
    'rate_limited',
    'payload_too_large',
    'selection_unavailable',
    'integrity_failed',
    'internal_error'
  ]);
  assert.throws(() => createApiError('raw_database_error'), /api_error_code_not_allowed/);
});
