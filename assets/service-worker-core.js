(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestServiceWorkerCore = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const CACHE_PREFIX = 'grammarquest';
  const DEFAULT_SOURCE_HASH = 'dev';
  const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/assets/design-tokens.css',
    '/assets/styles.css',
    '/assets/theme.js',
    '/assets/question-manifest.js',
    '/assets/question-selection-integrity.js',
    '/assets/question-loader.js',
    '/assets/quiz-selection-core.js',
    '/assets/quiz-domain.js',
    '/assets/quiz-engine.js',
    '/assets/learner-state-repository.js',
    '/assets/progress-store.js',
    '/assets/auth-service.js',
    '/assets/firebase-config.js',
    '/assets/service-worker-registration.js',
    '/assets/character-catalog.js',
    '/assets/visual-question-scenes.js'
  ];

  function getSourceHashCacheKey(sourceHash) {
    return String(sourceHash || DEFAULT_SOURCE_HASH)
      .replace(/[^a-zA-Z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || DEFAULT_SOURCE_HASH;
  }

  function buildCacheNames(sourceHash) {
    const key = getSourceHashCacheKey(sourceHash);
    return {
      static: `${CACHE_PREFIX}-static-${key}`,
      chunks: `${CACHE_PREFIX}-chunks-${key}`
    };
  }

  function buildPrecacheUrls() {
    return PRECACHE_URLS.slice();
  }

  function isChunkRequest(url) {
    return /\/assets\/question-chunks\/[^/]+\/[^/]+\.js$/.test(url.pathname);
  }

  function isStaticAssetRequest(url) {
    return buildPrecacheUrls().includes(url.pathname);
  }

  function isRetiredFullBankRequest(url) {
    return /\/assets\/question-banks\/[^/]+\.js$/.test(url.pathname);
  }

  return {
    CACHE_PREFIX,
    buildCacheNames,
    buildPrecacheUrls,
    getSourceHashCacheKey,
    isChunkRequest,
    isRetiredFullBankRequest,
    isStaticAssetRequest
  };
});
