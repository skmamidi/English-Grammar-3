(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSelectionRollout = api;
})(typeof self !== 'undefined' ? self : globalThis, function (root) {
  'use strict';

  const MIXED_QUIZ_SERVER_SELECTION_DOMAINS = [
    'grammar',
    'capitalization',
    'punctuation',
    'reading-comprehension',
    'reference-skills',
    'vocabulary'
  ];

  function isServerSelectionDomainEnabled(domain, config) {
    const cfg = config && typeof config === 'object' ? config : {};
    const flags = normalizeCentralFlags(cfg);
    if (flags) {
      return flags.serverSelectionEnabled === true &&
        MIXED_QUIZ_SERVER_SELECTION_DOMAINS.includes(domain) &&
        flags.serverSelectionPilotDomains.includes(domain);
    }
    if (!cfg.enableServerQuestionSelection) return false;
    if (!MIXED_QUIZ_SERVER_SELECTION_DOMAINS.includes(domain)) return false;
    const enabledDomains = Array.isArray(cfg.serverQuestionSelectionPilotDomains)
      ? cfg.serverQuestionSelectionPilotDomains
      : [];
    return enabledDomains.includes(domain);
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

  return {
    MIXED_QUIZ_SERVER_SELECTION_DOMAINS,
    isServerSelectionDomainEnabled
  };
});
