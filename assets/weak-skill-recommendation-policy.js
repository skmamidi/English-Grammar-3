(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestWeakSkillRecommendationPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DEFAULT_WEAK_SKILL_POLICY = Object.freeze({
    minimumAttempts: 3,
    lowAccuracyThreshold: 0.7,
    recencyWindowDays: 14,
    maxRecommendations: 3,
    reasonPriority: Object.freeze([
      'overdue_review',
      'assignment_struggle',
      'low_recent_accuracy',
      'missed_recently',
      'low_attempt_count'
    ])
  });

  return { DEFAULT_WEAK_SKILL_POLICY };
});
