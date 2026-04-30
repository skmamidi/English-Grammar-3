(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestOfflineCachePolicy = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;
  const PRIORITY_GROUPS = {
    appShell: 'appShell',
    currentRequiredChunk: 'currentRequiredChunk',
    recentRequiredChunk: 'recentRequiredChunk',
    preloadChunk: 'preloadChunk',
    staleVersion: 'staleVersion'
  };
  const DEFAULT_OFFLINE_CACHE_POLICY = {
    maxBytes: 18 * 1024 * 1024,
    maxPreloadChunks: 8,
    maxRetainedQuizChunks: 18,
    staleVersionTtlDays: 7,
    priorities: {
      appShell: 500,
      currentRequiredChunk: 400,
      recentRequiredChunk: 300,
      preloadChunk: 100,
      staleVersion: 0
    }
  };

  function normalizeOfflineCachePolicy(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const priorities = Object.assign({}, DEFAULT_OFFLINE_CACHE_POLICY.priorities, source.priorities || {});
    return {
      maxBytes: positiveNumber(source.maxBytes, DEFAULT_OFFLINE_CACHE_POLICY.maxBytes),
      maxPreloadChunks: nonNegativeInteger(source.maxPreloadChunks, DEFAULT_OFFLINE_CACHE_POLICY.maxPreloadChunks),
      maxRetainedQuizChunks: nonNegativeInteger(source.maxRetainedQuizChunks, DEFAULT_OFFLINE_CACHE_POLICY.maxRetainedQuizChunks),
      staleVersionTtlDays: positiveNumber(source.staleVersionTtlDays, DEFAULT_OFFLINE_CACHE_POLICY.staleVersionTtlDays),
      priorities
    };
  }

  function classifyOfflineCacheRequest(input = {}) {
    const url = toUrl(input.url);
    const pathname = url ? url.pathname : String(input.url || '').split(/[?#]/)[0];
    const preload = input.preload === true || readHeader(input.request, 'X-GrammarQuest-Cache-Intent') === 'preload';
    const required = pathSet(input.requiredChunkUrls);
    const recent = pathSet(input.recentChunkUrls);
    const pathKey = normalizePath(pathname);
    if (/^\/assets\/question-chunks\/[^/]+\/[^/]+\.js$/.test(pathname)) {
      if (preload) return { priorityGroup: PRIORITY_GROUPS.preloadChunk };
      if (required.has(pathKey)) return { priorityGroup: PRIORITY_GROUPS.currentRequiredChunk };
      if (recent.has(pathKey)) return { priorityGroup: PRIORITY_GROUPS.recentRequiredChunk };
      return { priorityGroup: PRIORITY_GROUPS.currentRequiredChunk };
    }
    return { priorityGroup: PRIORITY_GROUPS.appShell };
  }

  function createCacheMetadataRecord(input = {}) {
    const now = Date.now();
    return {
      url: String(input.url || ''),
      cacheName: String(input.cacheName || ''),
      priorityGroup: normalizePriorityGroup(input.priorityGroup),
      bytes: Math.max(0, Math.round(Number(input.bytes) || 0)),
      cachedAt: finiteNumber(input.cachedAt, now),
      lastAccessedAt: finiteNumber(input.lastAccessedAt, finiteNumber(input.cachedAt, now)),
      sourceHash: input.sourceHash ? String(input.sourceHash) : ''
    };
  }

  function evaluateOfflineCacheCleanup(input = {}) {
    const policy = normalizeOfflineCachePolicy(input.policy);
    const now = finiteNumber(input.now, Date.now());
    const activeCacheNames = new Set(Array.isArray(input.activeCacheNames) ? input.activeCacheNames : []);
    const staleCutoff = now - policy.staleVersionTtlDays * DAY_MS;
    const valid = [];
    let corruptMetadataCount = 0;

    (Array.isArray(input.records) ? input.records : []).forEach(record => {
      const normalized = normalizeRecord(record);
      if (!normalized) {
        corruptMetadataCount += 1;
        return;
      }
      if (activeCacheNames.size && normalized.cacheName && !activeCacheNames.has(normalized.cacheName)) {
        normalized.priorityGroup = PRIORITY_GROUPS.staleVersion;
      } else if (normalized.cachedAt < staleCutoff && normalized.priorityGroup !== PRIORITY_GROUPS.appShell) {
        normalized.priorityGroup = PRIORITY_GROUPS.staleVersion;
      }
      valid.push(normalized);
    });

    const evicted = new Set();
    const evictions = [];
    const markEvicted = record => {
      if (!record || evicted.has(record.url)) return;
      evicted.add(record.url);
      evictions.push(record);
    };

    valid
      .filter(record => record.priorityGroup === PRIORITY_GROUPS.staleVersion)
      .sort(compareEvictionCandidates(policy))
      .forEach(markEvicted);

    valid
      .filter(record => !evicted.has(record.url) && record.priorityGroup === PRIORITY_GROUPS.preloadChunk)
      .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt || a.url.localeCompare(b.url))
      .slice(0, Math.max(0, countGroup(valid, PRIORITY_GROUPS.preloadChunk) - policy.maxPreloadChunks))
      .forEach(markEvicted);

    valid
      .filter(record => !evicted.has(record.url) && isRetainedRequiredChunk(record))
      .sort((a, b) => a.lastAccessedAt - b.lastAccessedAt || a.url.localeCompare(b.url))
      .slice(0, Math.max(0, countRetainedRequiredChunks(valid.filter(record => !evicted.has(record.url))) - policy.maxRetainedQuizChunks))
      .forEach(markEvicted);

    let retained = valid.filter(record => !evicted.has(record.url));
    while (sumBytes(retained) > policy.maxBytes) {
      const candidate = retained
        .filter(record => record.priorityGroup !== PRIORITY_GROUPS.appShell && record.priorityGroup !== PRIORITY_GROUPS.currentRequiredChunk)
        .sort(compareEvictionCandidates(policy))[0];
      if (!candidate) break;
      markEvicted(candidate);
      retained = valid.filter(record => !evicted.has(record.url));
    }

    return {
      retained,
      evictions,
      metrics: buildMetrics(retained, evictions, corruptMetadataCount)
    };
  }

  function classifyQuotaError(error) {
    const name = String(error && error.name || '');
    const message = String(error && error.message || '');
    const quota = /QuotaExceededError|NS_ERROR_DOM_QUOTA_REACHED/i.test(name) || /quota/i.test(message);
    return {
      code: quota ? 'quota_exceeded' : 'cache_write_failed',
      recoverable: quota
    };
  }

  function buildMetrics(retained, evictions, corruptMetadataCount) {
    return {
      requiredCachedBytes: sumBytes(retained.filter(record => record.priorityGroup === PRIORITY_GROUPS.currentRequiredChunk || record.priorityGroup === PRIORITY_GROUPS.recentRequiredChunk)),
      preloadCachedBytes: sumBytes(retained.filter(record => record.priorityGroup === PRIORITY_GROUPS.preloadChunk)),
      evictedChunkCount: evictions.filter(isQuizChunk).length,
      staleCacheCleanupCount: evictions.filter(record => record.priorityGroup === PRIORITY_GROUPS.staleVersion).length,
      corruptMetadataCount
    };
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== 'object') return null;
    const url = String(record.url || '');
    const bytes = Number(record.bytes);
    const cachedAt = Number(record.cachedAt);
    const lastAccessedAt = Number(record.lastAccessedAt);
    if (!url || !Number.isFinite(bytes)) return null;
    return createCacheMetadataRecord({
      url,
      cacheName: record.cacheName,
      priorityGroup: record.priorityGroup,
      bytes,
      cachedAt: Number.isFinite(cachedAt) ? cachedAt : Date.now(),
      lastAccessedAt: Number.isFinite(lastAccessedAt) ? lastAccessedAt : cachedAt
    });
  }

  function compareEvictionCandidates(policy) {
    return (a, b) => {
      const priorityDelta = (policy.priorities[a.priorityGroup] || 0) - (policy.priorities[b.priorityGroup] || 0);
      if (priorityDelta) return priorityDelta;
      return a.lastAccessedAt - b.lastAccessedAt || a.url.localeCompare(b.url);
    };
  }

  function countGroup(records, group) {
    return records.filter(record => record.priorityGroup === group).length;
  }

  function countRetainedRequiredChunks(records) {
    return records.filter(isRetainedRequiredChunk).length;
  }

  function isQuizChunk(record) {
    return /\/assets\/question-chunks\/[^/]+\/[^/]+\.js$/.test(String(record.url || ''));
  }

  function isRetainedRequiredChunk(record) {
    return isQuizChunk(record) && record.priorityGroup === PRIORITY_GROUPS.recentRequiredChunk;
  }

  function sumBytes(records) {
    return records.reduce((sum, record) => sum + (Number(record.bytes) || 0), 0);
  }

  function normalizePriorityGroup(value) {
    return PRIORITY_GROUPS[value] || PRIORITY_GROUPS.preloadChunk;
  }

  function readHeader(request, name) {
    const headers = request && request.headers;
    if (!headers) return '';
    if (typeof headers.get === 'function') return headers.get(name) || headers.get(name.toLowerCase()) || '';
    if (typeof headers === 'object') return headers[name] || headers[name.toLowerCase()] || '';
    return '';
  }

  function pathSet(values) {
    return new Set((Array.isArray(values) ? values : []).map(normalizePath));
  }

  function normalizePath(value) {
    return String(value || '').replace(/^[a-z]+:\/\/[^/]+/i, '').replace(/^\//, '/').split(/[?#]/)[0];
  }

  function toUrl(value) {
    try {
      return new URL(String(value || ''), 'https://grammarquest.local');
    } catch (error) {
      return null;
    }
  }

  function positiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function nonNegativeInteger(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  return {
    DEFAULT_OFFLINE_CACHE_POLICY,
    PRIORITY_GROUPS,
    classifyOfflineCacheRequest,
    classifyQuotaError,
    createCacheMetadataRecord,
    evaluateOfflineCacheCleanup,
    normalizeOfflineCachePolicy
  };
});
