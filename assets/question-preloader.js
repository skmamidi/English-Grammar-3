(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestQuestionPreloader = api.createQuestionPreloader();
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const COMPLETED_EVENT = 'grammarquest:question-preload-completed';
  const SKIPPED_EVENT = 'grammarquest:question-preload-skipped';

  function getPolicyApi() {
    if (root.GrammarQuestQuestionPreloadPolicy) return root.GrammarQuestQuestionPreloadPolicy;
    if (typeof require === 'function') return require('./question-preload-policy');
    return null;
  }

  function createQuestionPreloader(options = {}) {
    const fetched = new Set();
    const policy = options.policy || getPolicyApi();

    async function preload(input = {}) {
      const config = options.config || getConfig();
      const dispatch = typeof options.dispatchEvent === 'function' ? options.dispatchEvent : dispatchWindowEvent;
      const flags = normalizeCentralFlags(config);
      const preloadingEnabled = flags ? flags.preloadingEnabled === true : config.enableQuestionChunkPreload === true;
      if (!preloadingEnabled) {
        dispatch(createEvent(SKIPPED_EVENT, { reason: 'disabled' }));
        return { status: 'disabled', candidates: [] };
      }

      const candidates = Array.isArray(input.candidates)
        ? input.candidates
        : policy && typeof policy.buildQuestionPreloadCandidates === 'function'
          ? policy.buildQuestionPreloadCandidates(Object.assign({}, input, {
            networkInfo: input.networkInfo || getNetworkInfo(),
            maxPreloadBytes: config.maxQuestionPreloadBytes || input.maxPreloadBytes,
            maxPreloadChunks: config.maxQuestionPreloadChunks || input.maxPreloadChunks
          }))
          : [];

      const pending = candidates.filter(candidate => candidate && candidate.chunkFile && !fetched.has(candidate.chunkFile));
      if (!pending.length) {
        dispatch(createEvent(SKIPPED_EVENT, {
          reason: candidates.length ? 'duplicate' : 'no_candidates',
          candidateCount: candidates.length
        }));
        return { status: 'skipped', candidates };
      }

      await waitForIdle(options.requestIdleCallback || root.requestIdleCallback);
      const fetcher = options.fetch || root.fetch;
      if (typeof fetcher !== 'function') {
        dispatch(createEvent(SKIPPED_EVENT, { reason: 'fetch_unavailable', candidateCount: pending.length }));
        return { status: 'skipped', candidates: pending };
      }

      let fetchedBytes = 0;
      const completed = [];
      for (const candidate of pending) {
        fetched.add(candidate.chunkFile);
        try {
          const response = await fetcher(resolveChunkUrl(candidate.chunkFile), { cache: 'force-cache' });
          const headerBytes = response && response.headers && typeof response.headers.get === 'function'
            ? Number(response.headers.get('content-length')) || 0
            : 0;
          fetchedBytes += headerBytes || Number(candidate.estimatedBytes) || 0;
          completed.push(candidate);
        } catch (error) {
          dispatch(createEvent(SKIPPED_EVENT, {
            reason: 'fetch_failed',
            setId: candidate.setId,
            estimatedBytes: Number(candidate.estimatedBytes) || 0
          }));
        }
      }

      dispatch(createEvent(COMPLETED_EVENT, {
        candidateCount: completed.length,
        preloadBytes: fetchedBytes,
        chunks: completed.map(candidate => candidate.chunkFile),
        setIds: completed.map(candidate => candidate.setId)
      }));
      return { status: 'completed', candidates: completed, preloadBytes: fetchedBytes };
    }

    return { preload };
  }

  function getConfig() {
    return root.GRAMMAR_QUEST_CONFIG && typeof root.GRAMMAR_QUEST_CONFIG === 'object'
      ? root.GRAMMAR_QUEST_CONFIG
      : {};
  }

  function normalizeCentralFlags(config) {
    const source = config.GrammarQuestFeatureFlags || config.featureFlags ||
      root.GrammarQuestFeatureFlags || root.GRAMMAR_QUEST_FEATURE_FLAGS;
    if (!source) return null;
    const domainApi = root.GrammarQuestFeatureFlagDomain ||
      (typeof require === 'function' ? require('./feature-flag-domain') : null);
    return domainApi && typeof domainApi.normalizeFeatureFlags === 'function'
      ? domainApi.normalizeFeatureFlags(source)
      : source;
  }

  function getNetworkInfo() {
    return root.navigator && root.navigator.connection || {};
  }

  function waitForIdle(requestIdleCallback) {
    if (typeof requestIdleCallback !== 'function') return Promise.resolve();
    return new Promise(resolve => requestIdleCallback(resolve, { timeout: 1500 }));
  }

  function resolveChunkUrl(chunkFile) {
    const value = String(chunkFile || '');
    if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return value;
    if (root.location && root.location.origin) return new URL(`/${value.replace(/^\//, '')}`, root.location.origin).href;
    return value;
  }

  function dispatchWindowEvent(event) {
    if (root && typeof root.dispatchEvent === 'function') root.dispatchEvent(event);
  }

  function createEvent(type, detail) {
    if (typeof root.CustomEvent === 'function') return new root.CustomEvent(type, { detail });
    if (typeof CustomEvent === 'function') return new CustomEvent(type, { detail });
    return { type, detail };
  }

  return {
    COMPLETED_EVENT,
    SKIPPED_EVENT,
    createQuestionPreloader
  };
});
