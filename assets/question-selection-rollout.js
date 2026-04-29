(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSelectionRollout = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
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
    if (!cfg.enableServerQuestionSelection) return false;
    if (!MIXED_QUIZ_SERVER_SELECTION_DOMAINS.includes(domain)) return false;
    const enabledDomains = Array.isArray(cfg.serverQuestionSelectionPilotDomains)
      ? cfg.serverQuestionSelectionPilotDomains
      : [];
    return enabledDomains.includes(domain);
  }

  return {
    MIXED_QUIZ_SERVER_SELECTION_DOMAINS,
    isServerSelectionDomainEnabled
  };
});
