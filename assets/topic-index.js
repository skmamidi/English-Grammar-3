/**
 * Topic index helpers.
 * Keeps subtopic cards independent from fixed question counts or grade bands.
 */
(function () {
  'use strict';

  const aliases = {
    'base-words-prefix-suffix': 'vocabulary-base-words'
  };

  document.addEventListener('DOMContentLoaded', function () {
    const bank = window.QUESTION_BANK || {};
    document.querySelectorAll('.subtopic-item').forEach(item => {
      const label = item.querySelector('[data-practice-label]');
      if (!label) return;

      const set = findQuestionSet(bank, item.getAttribute('href') || '');
      label.textContent = getPracticeLabel(set);
    });
  });

  function findQuestionSet(bank, href) {
    const slug = (href.split('/').pop() || '').replace(/\.html$/, '');
    const explicit = aliases[slug];
    if (explicit && bank[explicit]) return bank[explicit];
    if (bank[slug]) return bank[slug];

    const key = Object.keys(bank).find(id => id.endsWith(`-${slug}`));
    return key ? bank[key] : null;
  }

  function getPracticeLabel(set) {
    if (!set) return 'Adaptive practice';
    if (set.metadata && set.metadata.gradesSupported && set.metadata.difficultiesSupported) {
      const grades = set.metadata.gradesSupported.map(displayGrade);
      return `Adaptive practice: Grades ${grades[0]}-${grades[grades.length - 1]}`;
    }
    return 'Sound practice';
  }

  function displayGrade(grade) {
    const value = parseInt(grade, 10);
    return Number.isFinite(value) ? String(value - 1) : String(grade || '');
  }
})();
