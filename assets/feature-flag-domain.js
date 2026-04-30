(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestFeatureFlagDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const crypto = typeof require === 'function' ? require('node:crypto') : null;
  const ALLOWED_DOMAINS = ['grammar', 'capitalization', 'punctuation', 'reading-comprehension', 'reference-skills', 'vocabulary'];
  const ALLOWED_STAGES = ['off', 'local', 'pilot', 'staged', 'full'];
  const DEFAULT_FEATURE_FLAGS = Object.freeze({
    serverSelectionEnabled: false,
    serverSelectionPilotDomains: [],
    serverSelectionPilotSubtopics: [],
    snapshotFallbackEnabled: false,
    telemetryEnabled: false,
    preloadingEnabled: false,
    syncEnabled: false,
    strictVisualPerfMode: false,
    rolloutStage: 'off'
  });

  function normalizeFeatureFlags(input = {}) {
    const flags = Object.assign({}, DEFAULT_FEATURE_FLAGS);
    flags.serverSelectionEnabled = input.serverSelectionEnabled === true || input.enableServerQuestionSelection === true;
    flags.serverSelectionPilotDomains = normalizeDomainList(input.serverSelectionPilotDomains || input.serverQuestionSelectionPilotDomains);
    flags.serverSelectionPilotSubtopics = normalizeStringList(input.serverSelectionPilotSubtopics || input.serverQuestionSelectionPilotSubtopics);
    flags.snapshotFallbackEnabled = input.snapshotFallbackEnabled === true || input.allowServerSelectionSnapshots === true;
    flags.telemetryEnabled = input.telemetryEnabled === true;
    flags.preloadingEnabled = input.preloadingEnabled === true || input.enableQuestionChunkPreload === true;
    flags.syncEnabled = input.syncEnabled === true;
    flags.strictVisualPerfMode = input.strictVisualPerfMode === true;
    flags.rolloutStage = ALLOWED_STAGES.includes(input.rolloutStage) ? input.rolloutStage : DEFAULT_FEATURE_FLAGS.rolloutStage;
    return flags;
  }

  function validateFeatureFlags(input) {
    const flags = normalizeFeatureFlags(input);
    const errors = [];
    if (flags.serverSelectionPilotDomains.some(domain => !ALLOWED_DOMAINS.includes(domain))) errors.push('invalid server selection domain');
    if (!ALLOWED_STAGES.includes(flags.rolloutStage)) errors.push('invalid rollout stage');
    return errors;
  }

  function isFeatureEnabled(input, name) {
    const flags = normalizeFeatureFlags(input);
    return flags[name] === true;
  }

  function getFeatureFlagConfigHash(input) {
    const stable = stableStringify(normalizeFeatureFlags(input));
    if (crypto) return `sha256:${crypto.createHash('sha256').update(stable).digest('hex')}`;
    let hash = 0;
    for (let index = 0; index < stable.length; index += 1) hash = ((hash << 5) - hash + stable.charCodeAt(index)) | 0;
    return `sha256:${Math.abs(hash).toString(16).padStart(64, '0').slice(0, 64)}`;
  }

  function normalizeDomainList(values) {
    return normalizeStringList(values).filter(domain => ALLOWED_DOMAINS.includes(domain));
  }

  function normalizeStringList(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))).sort();
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  return {
    ALLOWED_DOMAINS,
    DEFAULT_FEATURE_FLAGS,
    getFeatureFlagConfigHash,
    isFeatureEnabled,
    normalizeFeatureFlags,
    stableStringify,
    validateFeatureFlags
  };
});
