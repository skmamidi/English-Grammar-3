const assert = require('node:assert/strict');
const test = require('node:test');

const {
  guardApiRequest
} = require('../server/api-request-guard');

test('API request guard accepts configured origins and normalizes request ids', async () => {
  const result = await guardApiRequest({
    method: 'POST',
    origin: 'https://grammar.example',
    headers: { 'x-request-id': 'request with spaces' },
    body: { domain: 'grammar' }
  }, {
    allowedOrigins: ['https://grammar.example'],
    maxBodyBytes: 1024,
    allowedMethods: ['POST'],
    rateLimitAdapter: createRateLimitAdapter()
  });

  assert.equal(result.ok, true);
  assert.match(result.requestId, /^req_/);
  assert.deepEqual(result.body, { domain: 'grammar' });
});

test('API request guard rejects invalid origin method size and rate limit before domain work', async () => {
  const baseOptions = {
    allowedOrigins: ['https://grammar.example'],
    maxBodyBytes: 20,
    allowedMethods: ['POST'],
    rateLimitAdapter: createRateLimitAdapter()
  };

  assert.equal((await guardApiRequest({ method: 'POST', origin: 'https://evil.example', body: {} }, baseOptions)).error.code, 'unauthorized_origin');
  assert.equal((await guardApiRequest({ method: 'GET', origin: 'https://grammar.example', body: {} }, baseOptions)).error.code, 'invalid_request');
  assert.equal((await guardApiRequest({ method: 'POST', origin: 'https://grammar.example', rawBody: '{"too":"large for this guard"}' }, baseOptions)).error.code, 'payload_too_large');
  assert.equal((await guardApiRequest({ method: 'POST', origin: 'https://grammar.example', body: {} }, Object.assign({}, baseOptions, {
    maxBodyBytes: 1024,
    rateLimitAdapter: createRateLimitAdapter({ allow: false })
  }))).error.code, 'rate_limited');
});

test('API request guard strips unsafe request fields from error envelopes', async () => {
  const result = await guardApiRequest({
    method: 'POST',
    origin: 'https://evil.example',
    body: {
      learnerId: 'learner-1',
      question: 'raw prompt',
      token: 'secret'
    }
  }, {
    allowedOrigins: ['https://grammar.example'],
    maxBodyBytes: 1024,
    allowedMethods: ['POST'],
    rateLimitAdapter: createRateLimitAdapter()
  });

  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes('raw prompt'), false);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});

function createRateLimitAdapter(result = { allow: true }) {
  return {
    async checkLimit() {
      return result;
    }
  };
}
