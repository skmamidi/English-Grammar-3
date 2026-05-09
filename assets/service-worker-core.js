(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestServiceWorkerCore = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const offlinePolicy = getOfflinePolicyApi();
  const CACHE_PREFIX = 'grammarquest';
  const DEFAULT_SOURCE_HASH = 'dev';
  const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/assets/design-tokens.css',
    '/assets/styles.css',
    '/assets/theme.js',
    '/assets/question-manifest.js',
    '/assets/story-lesson-manifest.js',
    '/assets/static-asset-manifest.json',
    '/assets/question-selection-integrity.js',
    '/assets/question-preload-policy.js',
    '/assets/question-preloader.js',
    '/assets/question-loader.js',
    '/assets/story-lesson-viewer.js',
    '/assets/study-aid-link-domain.js',
    '/assets/quiz-selection-core.js',
    '/assets/quiz-domain.js',
    '/assets/quiz-engine.js',
    '/assets/session-domain.js',
    '/assets/learner-state-repository.js',
    '/assets/lesson-progress-domain.js',
    '/assets/learner-state-migration.js',
    '/assets/progress-store.js',
    '/assets/auth-service.js',
    '/assets/firebase-config.js',
    '/assets/service-worker-registration.js',
    '/assets/character-catalog.js',
    '/assets/visual-question-scenes.js'
  ];
  const RUNTIME_STATIC_URLS = [
    '/mission.html',
    '/assets/page-shell.js',
    '/assets/guided-mission-catalog.js',
    '/assets/guided-mission-domain.js',
    '/assets/guided-mission-ui.js'
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
      chunks: `${CACHE_PREFIX}-chunks-${key}`,
      metadata: `${CACHE_PREFIX}-metadata-${key}`
      ,
      questionObjects: `grammarquest-question-objects-${key}`
    };
  }

  function buildPrecacheUrls() {
    return PRECACHE_URLS.slice();
  }

  function buildRuntimeStaticUrls() {
    return Array.from(new Set(PRECACHE_URLS.concat(RUNTIME_STATIC_URLS)));
  }

  function isChunkRequest(url) {
    return isQuestionChunkRequest(url) || isStoryLessonChunkRequest(url);
  }

  function isQuestionChunkRequest(url) {
    return /\/assets\/question-chunks\/[^/]+\/[^/]+\.js$/.test(url.pathname);
  }

  function isStoryLessonChunkRequest(url) {
    return /\/assets\/story-lesson-chunks\/[^/]+\/[^/]+\.js$/.test(url.pathname);
  }

  function isStaticAssetRequest(url) {
    return buildRuntimeStaticUrls().includes(url.pathname);
  }

  function isSparseQuestionDataRequest(url) {
    return /^\/api\/questions\/sparse(?:\/|$)/.test(url.pathname) || /^\/assets\/offline-question-records\/[^/]+\.json$/.test(url.pathname);
  }

  function isImmutableMediaRequest(url) {
    return /^\/assets\/(?:audio|images)\/[^?#]+\.(?:wav|mp3|ogg|m4a|png|jpe?g|webp|svg)$/.test(url.pathname);
  }

  function isRetiredFullBankRequest(url) {
    return /\/assets\/question-banks\/[^/]+\.js$/.test(url.pathname);
  }

  function classifyServiceWorkerCacheRequest(input = {}) {
    return offlinePolicy.classifyOfflineCacheRequest(input);
  }

  function createServiceWorkerCacheRecord(input = {}) {
    return offlinePolicy.createCacheMetadataRecord(input);
  }

  function evaluateServiceWorkerCacheCleanup(input = {}) {
    return offlinePolicy.evaluateOfflineCacheCleanup(input);
  }

  function isQuotaExceededError(error) {
    return offlinePolicy.classifyQuotaError(error).code === 'quota_exceeded';
  }

  function getOfflineCachePolicy(input) {
    return offlinePolicy.normalizeOfflineCachePolicy(input);
  }

  function getOfflinePolicyApi() {
    if (typeof self !== 'undefined' && self.GrammarQuestOfflineCachePolicy) return self.GrammarQuestOfflineCachePolicy;
    if (typeof globalThis !== 'undefined' && globalThis.GrammarQuestOfflineCachePolicy) return globalThis.GrammarQuestOfflineCachePolicy;
    if (typeof require === 'function') return require('./offline-cache-policy');
    return null;
  }

  return {
    CACHE_PREFIX,
    buildCacheNames,
    buildPrecacheUrls,
    buildRuntimeStaticUrls,
    classifyServiceWorkerCacheRequest,
    createServiceWorkerCacheRecord,
    evaluateServiceWorkerCacheCleanup,
    getSourceHashCacheKey,
    getOfflineCachePolicy,
    isQuotaExceededError,
    isChunkRequest,
    isQuestionChunkRequest,
    isImmutableMediaRequest,
    isStoryLessonChunkRequest,
    isRetiredFullBankRequest,
    isSparseQuestionDataRequest,
    isStaticAssetRequest
  };
});
