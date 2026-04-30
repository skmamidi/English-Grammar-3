const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createQuestionPreloader
} = require('../assets/question-preloader');

test('question preloader is disabled unless explicitly enabled', async () => {
  const events = [];
  const preloader = createQuestionPreloader({
    config: { enableQuestionChunkPreload: false },
    fetch: async () => ({ ok: true }),
    dispatchEvent: event => events.push(event)
  });

  const result = await preloader.preload({ candidates: [candidate('grammar-sentence-types')] });

  assert.equal(result.status, 'disabled');
  assert.deepEqual(events.map(event => event.type), ['grammarquest:question-preload-skipped']);
});

test('question preloader accepts central feature flag config with legacy fallback', async () => {
  const fetched = [];
  const preloader = createQuestionPreloader({
    config: {
      GrammarQuestFeatureFlags: {
        preloadingEnabled: true
      }
    },
    fetch: async url => {
      fetched.push(url);
      return { ok: true, headers: { get: () => '64000' } };
    },
    requestIdleCallback: callback => callback()
  });

  const result = await preloader.preload({ candidates: [candidate('grammar-sentence-types')] });

  assert.equal(result.status, 'completed');
  assert.equal(fetched.length, 1);
});

test('question preloader fetches candidates with force-cache and suppresses duplicates', async () => {
  const fetched = [];
  const events = [];
  const preloader = createQuestionPreloader({
    config: { enableQuestionChunkPreload: true },
    fetch: async (url, options) => {
      fetched.push({ url, options });
      return { ok: true, headers: { get: () => '64000' } };
    },
    requestIdleCallback: callback => callback(),
    dispatchEvent: event => events.push(event)
  });

  const first = await preloader.preload({ candidates: [candidate('grammar-sentence-types')] });
  const second = await preloader.preload({ candidates: [candidate('grammar-sentence-types')] });

  assert.equal(first.status, 'completed');
  assert.equal(second.status, 'skipped');
  assert.equal(fetched.length, 1);
  assert.equal(fetched[0].url, 'assets/question-chunks/grammar/grammar-sentence-types.js');
  assert.equal(fetched[0].options.cache, 'force-cache');
  assert.equal(fetched[0].options.headers['X-GrammarQuest-Cache-Intent'], 'preload');
  assert.ok(events.some(event => event.type === 'grammarquest:question-preload-completed'));
  assert.ok(events.some(event => event.detail.reason === 'duplicate'));
});

test('question preloader asks policy for candidates when none are supplied', async () => {
  const fetched = [];
  const preloader = createQuestionPreloader({
    config: { enableQuestionChunkPreload: true },
    fetch: async url => {
      fetched.push(url);
      return { ok: true, headers: { get: () => '58000' } };
    },
    requestIdleCallback: callback => callback()
  });

  await preloader.preload({
    currentRoute: 'topic-index',
    visibleSubtopicIds: ['grammar-sentence-types'],
    manifest: {
      sets: [{
        id: 'grammar-sentence-types',
        domain: 'grammar',
        chunkFile: 'assets/question-chunks/grammar/grammar-sentence-types.js',
        estimatedBytes: 58 * 1024
      }]
    }
  });

  assert.deepEqual(fetched, ['assets/question-chunks/grammar/grammar-sentence-types.js']);
});

function candidate(setId) {
  return {
    setId,
    chunkFile: `assets/question-chunks/grammar/${setId}.js`,
    reason: 'test',
    estimatedBytes: 64 * 1024
  };
}
