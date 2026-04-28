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
    const subtopics = [];
    document.querySelectorAll('.subtopic-item').forEach(item => {
      const label = item.querySelector('[data-practice-label]');
      const href = item.getAttribute('href') || '';
      const setEntry = findQuestionSetEntry(bank, href);
      const set = setEntry && setEntry.set;
      if (label) label.textContent = getPracticeLabel(set);
      renderSubtopicProgress(item, setEntry);
      if (setEntry && set && Array.isArray(set.questions) && set.questions.length) {
        subtopics.push({
          id: setEntry.id,
          title: getSubtopicTitle(item, set),
          href,
          set
        });
      }
    });
    renderMixedQuizLauncher(subtopics);
    applyAuthModeUi(subtopics);
    window.addEventListener('grammarquest:parent-browse', () => applyAuthModeUi(subtopics));
    window.addEventListener('grammarquest:auth-state', () => applyAuthModeUi(subtopics));
  });

  function findQuestionSet(bank, href) {
    const entry = findQuestionSetEntry(bank, href);
    return entry ? entry.set : null;
  }

  function findQuestionSetEntry(bank, href) {
    const slug = (href.split('/').pop() || '').replace(/\.html$/, '');
    const explicit = aliases[slug];
    if (explicit && bank[explicit]) return { id: explicit, set: bank[explicit] };
    if (bank[slug]) return { id: slug, set: bank[slug] };

    const key = Object.keys(bank).find(id => id.endsWith(`-${slug}`));
    return key ? { id: key, set: bank[key] } : null;
  }

  function getPracticeLabel(set) {
    if (!set) return 'Adaptive practice';
    if (set.metadata && set.metadata.gradesSupported && set.metadata.difficultiesSupported) {
      const grades = set.metadata.gradesSupported.map(displayGrade);
      return `Adaptive practice: Grades ${grades[0]}-${grades[grades.length - 1]}`;
    }
    return 'Sound practice';
  }

  function renderMixedQuizLauncher(subtopics) {
    if (subtopics.length < 2 || document.getElementById('quiz-root')) return;

    const main = document.querySelector('main.container');
    const list = document.querySelector('.subtopic-list');
    if (!main || !list) return;

    const topicTitle = (document.querySelector('.page-title') || {}).textContent || 'Topic';
    window.QUIZ_MIXED_TOPIC_CONFIG = {
      title: `${topicTitle} Mixed Quiz`,
      topic: topicTitle,
      questionsPerSubtopic: 4,
      subtopics
    };

    const panel = document.createElement('section');
    panel.className = 'mixed-quiz-panel';
    panel.innerHTML = `
      <div>
        <div class="quest-kicker">Mixed Practice</div>
        <h2>${escapeHtml(topicTitle)} checkpoint</h2>
        <p>Practice across all ${subtopics.length} subtopics in one quiz, with a performance report for each subtopic at the end.</p>
      </div>
      <a class="btn btn-primary" href="#mixed-quiz">Start Mixed Quiz</a>
    `;
    main.insertBefore(panel, list);

    const quizRoot = document.createElement('section');
    quizRoot.id = 'quiz-root';
    quizRoot.className = 'mixed-quiz-root';
    quizRoot.setAttribute('aria-label', `${topicTitle} mixed quiz`);
    quizRoot.hidden = true;
    main.appendChild(quizRoot);

    panel.querySelector('a').addEventListener('click', () => {
      quizRoot.hidden = false;
      quizRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function applyAuthModeUi(subtopics) {
    const auth = window.GrammarQuestAuth;
    const authState = auth && typeof auth.getState === 'function' ? auth.getState() : {};
    const parentMode = !!authState.parentMode;
    document.body.classList.toggle('parent-question-browser', parentMode);
    const title = document.querySelector('.page-title');
    const subtitle = document.querySelector('.page-subtitle');
    if (title && !title.dataset.studentTitle) title.dataset.studentTitle = title.textContent;
    if (subtitle && !subtitle.dataset.studentSubtitle) subtitle.dataset.studentSubtitle = subtitle.textContent;

    if (!parentMode) {
      if (title && title.dataset.studentTitle) title.textContent = title.dataset.studentTitle;
      if (subtitle && subtitle.dataset.studentSubtitle) subtitle.textContent = subtitle.dataset.studentSubtitle;
      document.querySelectorAll('.subtopic-item').forEach(item => {
        const label = item.querySelector('[data-practice-label]');
        const href = item.getAttribute('href') || '';
        const entry = findQuestionSetEntry(window.QUESTION_BANK || {}, href);
        const set = entry && entry.set;
        if (label) label.textContent = getPracticeLabel(set);
        if (!item.querySelector('.sub-mastery')) renderSubtopicProgress(item, entry);
      });
      document.querySelectorAll('.mixed-quiz-panel, .mixed-quiz-root').forEach(node => {
        node.hidden = false;
      });
      renderMixedQuizLauncher(subtopics);
      return;
    }

    const mixedPanel = document.querySelector('.mixed-quiz-panel');
    const mixedRoot = document.getElementById('quiz-root');
    const questionCount = subtopics.reduce((sum, subtopic) => sum + (subtopic.set.questions || []).length, 0);

    if (title) title.textContent = `${title.dataset.studentTitle} Question Bank`;
    if (subtitle) subtitle.textContent = `${questionCount} questions across ${subtopics.length} subtopics. Parent browsing is not saved to student progress.`;
    if (mixedPanel) mixedPanel.hidden = true;
    if (mixedRoot) mixedRoot.hidden = true;

    document.querySelectorAll('.subtopic-item').forEach(item => {
      const href = item.getAttribute('href') || '';
      const entry = findQuestionSetEntry(window.QUESTION_BANK || {}, href);
      const set = entry && entry.set;
      const label = item.querySelector('[data-practice-label]');
      item.querySelectorAll('.sub-mastery').forEach(node => node.remove());
      if (label) {
        const count = Array.isArray(set?.questions) ? set.questions.length : 0;
        label.textContent = count ? `${count} questions` : 'Question preview';
      }
      item.setAttribute('aria-label', `${getSubtopicTitle(item, set || {})} question preview`);
    });
  }

  function renderSubtopicProgress(item, setEntry) {
    const progress = getSubtopicProgress(setEntry);
    const meter = document.createElement('span');
    meter.className = `sub-mastery sub-mastery-${progress.tone}`;
    meter.innerHTML = `
      <span class="sub-mastery-bar" aria-hidden="true"><span style="width: ${progress.percent}%"></span></span>
      <span class="sub-mastery-label">${escapeHtml(progress.label)}</span>
    `;
    item.appendChild(meter);
  }

  function getSubtopicProgress(setEntry) {
    const empty = { percent: 0, label: 'Not started', tone: 'empty' };
    if (!setEntry) return empty;
    const progressStore = window.GrammarQuestProgress;
    const progress = progressStore && typeof progressStore.loadLocalProgress === 'function'
      ? progressStore.loadLocalProgress()
      : loadLocalProgressFallback();
    const record = progress && progress.mastery && progress.mastery.subtopics
      ? progress.mastery.subtopics[setEntry.id]
      : null;
    if (!record || !record.total) return empty;

    const percent = Math.round((record.correct / record.total) * 100);
    const level = record.level || getMasteryLevel(record.correct, record.total);
    return {
      percent,
      label: `${level} · ${percent}%`,
      tone: percent >= 85 ? 'strong' : percent >= 70 ? 'steady' : 'focus'
    };
  }

  function getMasteryLevel(correct, total) {
    if (total < 5) return 'Collecting';
    const accuracy = correct / total;
    if (accuracy >= 0.92 && total >= 12) return 'Elite';
    if (accuracy >= 0.85) return 'Secure';
    if (accuracy >= 0.7) return 'Developing';
    return 'Needs focus';
  }

  function loadLocalProgressFallback() {
    try {
      return JSON.parse(localStorage.getItem('grammarQuestProgress')) || {};
    } catch (error) {
      return {};
    }
  }

  function getSubtopicTitle(item, set) {
    const name = item.querySelector('.sub-name');
    return (name && name.textContent.trim()) || set.title || 'Subtopic';
  }

  function displayGrade(grade) {
    const value = parseInt(grade, 10);
    return Number.isFinite(value) ? String(value - 1) : String(grade || '');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
  }
})();
