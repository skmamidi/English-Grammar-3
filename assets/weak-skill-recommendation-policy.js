(function (root, factory) {
  'use strict';

  const masteryPolicy = root.GrammarQuestMasteryModelPolicy ||
    (typeof require === 'function' ? require('./mastery-model-policy') : null);
  const api = factory(masteryPolicy);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestWeakSkillRecommendationPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function (masteryPolicy) {
  'use strict';

  const DEFAULT_WEAK_SKILL_POLICY = Object.freeze(masteryPolicy.normalizeMasteryModelPolicy());

  return { DEFAULT_WEAK_SKILL_POLICY };
});
