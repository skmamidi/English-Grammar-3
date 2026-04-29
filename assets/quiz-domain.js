(function (root) {
  'use strict';

  let core = root.GrammarQuestSelectionCore;
  if (!core && typeof require === 'function') {
    core = require('./quiz-selection-core');
  }
  if (!core) {
    throw new Error('Quiz domain: assets/quiz-selection-core.js must load before assets/quiz-domain.js');
  }

  if (typeof module === 'object' && module.exports) module.exports = core;
  root.GrammarQuestQuizDomain = core;
})(typeof window !== 'undefined' ? window : globalThis);
