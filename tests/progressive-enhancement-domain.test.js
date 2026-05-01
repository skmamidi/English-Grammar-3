const assert = require('node:assert/strict');
const test = require('node:test');

const policy = require('../assets/progressive-enhancement-domain');

test('progressive enhancement policy separates critical and optional features', () => {
  assert.equal(policy.getFeature('page-shell').critical, true);
  assert.equal(policy.getFeature('topic-navigation').critical, true);
  assert.equal(policy.getFeature('manifest-loading').critical, true);
  assert.equal(policy.getFeature('quiz-loader').critical, true);
  assert.equal(policy.getFeature('question-chunk').critical, true);

  assert.equal(policy.getFeature('telemetry').critical, false);
  assert.equal(policy.getFeature('preloading').critical, false);
  assert.equal(policy.getFeature('sync-adapter').critical, false);
  assert.equal(policy.getFeature('auth-provider').critical, false);
  assert.equal(policy.getFeature('service-worker-registration').critical, false);
  assert.equal(policy.getFeature('server-selection').critical, false);
});

test('optional feature failures are recoverable and sanitized', () => {
  const failure = policy.classifyFailure({
    feature: 'telemetry',
    url: 'http://127.0.0.1:4173/assets/question-selection-telemetry.js',
    error: new Error('raw endpoint token should not leak')
  });

  assert.equal(failure.feature, 'telemetry');
  assert.equal(failure.category, 'optional');
  assert.equal(failure.fatal, false);
  assert.equal(failure.code, 'optional_feature_unavailable');
  assert.match(failure.message, /Telemetry is unavailable/i);
  assert.equal(JSON.stringify(failure).includes('token'), false);
});

test('critical feature failures produce explicit recovery state metadata', () => {
  const failure = policy.classifyFailure({
    feature: 'question-chunk',
    url: 'http://127.0.0.1:4173/assets/question-chunks/grammar/grammar-sentence-types.js',
    status: 404
  });

  assert.equal(failure.category, 'critical');
  assert.equal(failure.fatal, true);
  assert.equal(failure.code, 'critical_feature_unavailable');
  assert.match(failure.message, /required question file/i);
  assert.match(failure.recovery, /Refresh/i);
});

test('safe optional boundary returns fallback while critical boundary throws', async () => {
  const events = [];
  const fallback = await policy.runWithBoundary('preloading', () => {
    throw new Error('preload failed with stack details');
  }, {
    fallback: 'skipped',
    emit: event => events.push(event)
  });

  assert.equal(fallback, 'skipped');
  assert.equal(events.length, 1);
  assert.equal(events[0].fatal, false);
  assert.equal(JSON.stringify(events[0]).includes('stack details'), false);

  await assert.rejects(
    () => policy.runWithBoundary('quiz-loader', () => {
      throw new Error('loader missing');
    }),
    error => error && error.code === 'critical_feature_unavailable'
  );
});
