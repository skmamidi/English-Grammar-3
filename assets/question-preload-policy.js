(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestQuestionPreloadPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DEFAULT_MAX_PRELOAD_CHUNKS = 2;
  const DEFAULT_MAX_PRELOAD_BYTES = 250 * 1024;
  const DEFAULT_DISABLED_EFFECTIVE_TYPES = ['slow-2g', '2g'];
  const ESTIMATED_BYTES_PER_QUESTION = 4096;

  function buildQuestionPreloadCandidates(input = {}) {
    const options = normalizeOptions(input);
    if (options.sparseQuestionDelivery && options.granularOfflineQuestionStore) return [];
    if (shouldDisableForNetwork(options.networkInfo, options)) return [];

    const candidateIds = getCandidateIds(options);
    const manifestEntries = getManifestEntries(options.manifest);
    const entriesById = manifestEntries.reduce((index, entry) => {
      if (entry && entry.id) index[entry.id] = entry;
      return index;
    }, {});

    const candidates = [];
    let budgetUsed = 0;
    for (const setId of candidateIds) {
      if (candidates.length >= options.maxPreloadChunks) break;
      const entry = entriesById[setId];
      if (!entry || !entry.chunkFile) continue;
      if (options.domain && entry.domain && entry.domain !== options.domain && options.currentRoute !== 'mixed-selection') continue;
      if (isCached(entry, options.cacheState)) continue;
      const estimatedBytes = estimateChunkBytes(entry);
      if (budgetUsed + estimatedBytes > options.maxPreloadBytes) continue;
      candidates.push({
        setId: entry.id,
        chunkFile: entry.chunkFile,
        reason: getReason(options.currentRoute),
        estimatedBytes
      });
      budgetUsed += estimatedBytes;
    }
    return candidates;
  }

  function normalizeOptions(input) {
    return {
      currentRoute: String(input.currentRoute || '').trim(),
      domain: String(input.domain || '').trim(),
      currentSetId: String(input.currentSetId || '').trim(),
      visibleSubtopicIds: uniqueStrings(input.visibleSubtopicIds),
      selectedMixedSubtopicIds: uniqueStrings(input.selectedMixedSubtopicIds),
      manifest: input.manifest || {},
      networkInfo: input.networkInfo || {},
      cacheState: input.cacheState || {},
      maxPreloadBytes: Math.max(0, Number(input.maxPreloadBytes) || DEFAULT_MAX_PRELOAD_BYTES),
      maxPreloadChunks: Math.max(0, Number(input.maxPreloadChunks) || DEFAULT_MAX_PRELOAD_CHUNKS),
      disableWhenSaveData: input.disableWhenSaveData !== false,
      sparseQuestionDelivery: input.sparseQuestionDelivery === true,
      granularOfflineQuestionStore: input.granularOfflineQuestionStore === true,
      disableOnEffectiveType: Array.isArray(input.disableOnEffectiveType)
        ? input.disableOnEffectiveType
        : DEFAULT_DISABLED_EFFECTIVE_TYPES
    };
  }

  function shouldDisableForNetwork(networkInfo, options) {
    if (options.disableWhenSaveData && networkInfo && networkInfo.saveData) return true;
    const effectiveType = String(networkInfo && networkInfo.effectiveType || '').toLowerCase();
    return effectiveType && options.disableOnEffectiveType.includes(effectiveType);
  }

  function getCandidateIds(options) {
    if (options.currentRoute === 'topic-index') return options.visibleSubtopicIds.slice(0, 1);
    if (options.currentRoute === 'subtopic') {
      const index = options.visibleSubtopicIds.indexOf(options.currentSetId);
      return index >= 0 ? options.visibleSubtopicIds.slice(index + 1, index + 2) : [];
    }
    if (options.currentRoute === 'mixed-selection') return options.selectedMixedSubtopicIds;
    return [];
  }

  function getReason(route) {
    if (route === 'topic-index') return 'topic-index-first-visible';
    if (route === 'subtopic') return 'subtopic-next-sibling';
    if (route === 'mixed-selection') return 'mixed-selection-committed';
    return 'unknown';
  }

  function getManifestEntries(manifest) {
    return manifest && Array.isArray(manifest.sets) ? manifest.sets : [];
  }

  function estimateChunkBytes(entry) {
    return Math.max(0, Number(
      entry.estimatedBytes
      || entry.chunkBytes
      || entry.byteSize
      || entry.transferBytes
      || ((Number(entry.questionCount) || 1) * ESTIMATED_BYTES_PER_QUESTION)
    ) || 0);
  }

  function isCached(entry, cacheState) {
    const cached = cacheState && (cacheState.cachedChunkFiles || cacheState.cachedSetIds);
    if (!cached) return false;
    const values = Array.isArray(cached) ? cached : [];
    return values.includes(entry.id) || values.includes(entry.chunkFile);
  }

  function uniqueStrings(values) {
    return Array.from(new Set((Array.isArray(values) ? values : [])
      .map(value => String(value || '').trim())
      .filter(Boolean)));
  }

  return {
    DEFAULT_MAX_PRELOAD_BYTES,
    DEFAULT_MAX_PRELOAD_CHUNKS,
    buildQuestionPreloadCandidates
  };
});
