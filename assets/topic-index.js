/**
 * Topic index helpers.
 * Keeps subtopic cards independent from fixed question counts or grade bands.
 */
(function () {
  'use strict';

  const aliases = {
    'base-words-prefix-suffix': 'vocabulary-base-words',
    'contractions': 'vocabulary-contractions'
  };

  document.addEventListener('DOMContentLoaded', function () {
    const manifest = window.QUESTION_MANIFEST;
    const bank = window.QUESTION_BANK || {};
    const subtopics = [];
    document.querySelectorAll('.subtopic-item').forEach(item => {
      const label = item.querySelector('[data-practice-label]');
      const href = item.getAttribute('href') || '';
      const setEntry = findQuestionSetManifestEntry(manifest, href) || findQuestionSetEntry(bank, href);
      const set = setEntry && setEntry.set;
      if (label) label.textContent = getPracticeLabel(set);
      renderSubtopicProgress(item, setEntry);
      if (setEntry && set && getQuestionCount(set)) {
        subtopics.push({
          id: setEntry.id,
          title: getSubtopicTitle(item, set),
          href,
          set,
          questionCount: getQuestionCount(set)
        });
      }
    });
    renderMixedQuizLauncher(subtopics);
    scheduleTopicIndexPreload(subtopics);
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

  function findQuestionSetManifestEntry(manifest, href) {
    if (!manifest || !Array.isArray(manifest.sets)) return null;
    const slug = getHrefSlug(href);
    const explicit = aliases[slug];
    const sets = manifest.sets;
    const set = explicit
      ? sets.find(item => item.id === explicit)
      : sets.find(item => item.id === slug) || sets.find(item => item.id && item.id.endsWith(`-${slug}`));
    return set ? { id: set.id, set } : null;
  }

  function getHrefSlug(href) {
    return (href.split('/').pop() || '').replace(/\.html$/, '');
  }

  function getPracticeLabel(set) {
    if (!set) return 'Adaptive practice';
    const gradesSupported = getGradesSupported(set);
    if (gradesSupported.length && getDifficultiesSupported(set).length) {
      const grades = gradesSupported.map(displayGrade);
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

    panel.querySelector('a').addEventListener('click', event => {
      event.preventDefault();
      if (event.currentTarget.getAttribute('aria-disabled') === 'true') return;
      quizRoot.hidden = false;
      quizRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
      startMixedQuiz(panel, quizRoot, subtopics);
    });
  }

  function startMixedQuiz(panel, quizRoot, subtopics) {
    const button = panel.querySelector('a');
    if (button) {
      button.textContent = 'Loading Mixed Quiz...';
      button.setAttribute('aria-disabled', 'true');
    }

    loadMixedQuizDependencies(subtopics)
      .then(sets => {
        const hydratedSubtopics = hydrateMixedSubtopics(subtopics, sets);
        if (!hydratedSubtopics.length) {
          quizRoot.innerHTML = '<p class="page-subtitle">Questions for this mixed quiz are coming soon.</p>';
          return;
        }
        const quizEngineWasLoaded = !!window.GrammarQuestQuizEngine;
        window.QUIZ_MIXED_TOPIC_CONFIG = Object.assign({}, window.QUIZ_MIXED_TOPIC_CONFIG || {}, {
          subtopics: hydratedSubtopics
        });
        return loadScriptOnce('../../assets/quiz-engine.js').then(() => {
          if (quizEngineWasLoaded && window.GrammarQuestQuizEngine && typeof window.GrammarQuestQuizEngine.start === 'function') {
            window.GrammarQuestQuizEngine.start();
          }
        });
      })
      .catch(error => {
        console.error(error);
        quizRoot.innerHTML = '<p class="page-subtitle">The mixed quiz could not load. Please try a subtopic quiz instead.</p>';
      })
      .finally(() => {
        if (button) {
          button.textContent = 'Start Mixed Quiz';
          button.removeAttribute('aria-disabled');
        }
      });
  }

  function loadMixedQuizDependencies(subtopics) {
    return Promise.all([
      window.GrammarQuestSelectionCore ? Promise.resolve() : loadScriptOnce('../../assets/quiz-selection-core.js'),
      window.GrammarQuestSelectionIntegrity ? Promise.resolve() : loadScriptOnce('../../assets/question-selection-integrity.js'),
      window.GrammarQuestSelectionTelemetry ? Promise.resolve() : loadOptionalScript('telemetry', '../../assets/question-selection-telemetry.js'),
      window.GrammarQuestQuestionLoader ? Promise.resolve() : loadScriptOnce('../../assets/question-loader.js')
    ])
      .then(() => window.GrammarQuestQuizDomain ? Promise.resolve() : loadScriptOnce('../../assets/quiz-domain.js'))
      .then(() => loadMixedQuizSets(subtopics));
  }

  function loadMixedQuizSets(subtopicsOrIds) {
    const subtopics = normalizeMixedQuizLoadInput(subtopicsOrIds);
    const ids = subtopics.map(subtopic => subtopic.id).filter(Boolean);
    if (!window.GrammarQuestQuestionLoader || typeof window.GrammarQuestQuestionLoader.loadSets !== 'function') {
      return Promise.reject(new Error('Question loader is unavailable for mixed quiz hydration.'));
    }
    if (shouldUseServerSelectionPilot(subtopics) && typeof window.GrammarQuestQuestionLoader.loadSelectedQuiz === 'function') {
      return window.GrammarQuestQuestionLoader.loadSelectedQuiz(buildSelectionRequest(subtopics))
        .then(result => result && Array.isArray(result.sets) ? result.sets : []);
    }
    return window.GrammarQuestQuestionLoader.loadSets(ids);
  }

  function normalizeMixedQuizLoadInput(input) {
    if (!Array.isArray(input)) return [];
    return input.map(item => {
      if (item && typeof item === 'object') return item;
      return { id: String(item || '') };
    }).filter(item => item.id);
  }

  function shouldUseServerSelectionPilot(subtopics) {
    const config = getAppConfig();
    const domain = getMixedQuizDomain(subtopics);
    if (window.GrammarQuestSelectionRollout && typeof window.GrammarQuestSelectionRollout.isServerSelectionDomainEnabled === 'function') {
      return window.GrammarQuestSelectionRollout.isServerSelectionDomainEnabled(domain, config);
    }
    if (!config.enableServerQuestionSelection) return false;
    const pilotDomains = Array.isArray(config.serverQuestionSelectionPilotDomains)
      ? config.serverQuestionSelectionPilotDomains
      : [];
    return pilotDomains.includes(domain);
  }

  function buildSelectionRequest(subtopics) {
    const config = getAppConfig();
    const domain = getMixedQuizDomain(subtopics);
    const setIds = subtopics.map(subtopic => subtopic.id).filter(Boolean);
    const selectedLimit = getStoredSetting('grammarQuestMixedQuestionLimit', '4');
    const perSubtopic = Number(selectedLimit) || 4;
    const maxServerSelectionCount = Number(config.maxServerSelectionQuestions) || 60;
    const requestedCount = selectedLimit === 'max' ? maxServerSelectionCount : setIds.length * perSubtopic;
    return {
      mode: 'mixed',
      domain,
      setIds,
      grade: getStoredSetting('grammarQuestGrade', '4'),
      difficulty: getStoredSetting('grammarQuestDifficulty', 'medium'),
      count: Math.min(maxServerSelectionCount, Math.max(1, requestedCount)),
      countMode: selectedLimit === 'max' ? 'max' : 'per-subtopic',
      questionsPerSubtopic: perSubtopic,
      selectionPolicyVersion: 1
    };
  }

  function getMixedQuizDomain(subtopics) {
    const first = (Array.isArray(subtopics) ? subtopics : []).find(subtopic => subtopic && subtopic.set && subtopic.set.domain);
    if (first) return first.set.domain;
    const id = subtopics && subtopics[0] && subtopics[0].id || '';
    return id.split('-')[0] || '';
  }

  function getAppConfig() {
    return window.GRAMMAR_QUEST_CONFIG && typeof window.GRAMMAR_QUEST_CONFIG === 'object'
      ? window.GRAMMAR_QUEST_CONFIG
      : {};
  }

  function getStoredSetting(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function hydrateMixedSubtopics(subtopics, sets) {
    const loadedSets = Array.isArray(sets) ? sets : [];
    const byId = loadedSets.reduce((index, set) => {
      if (set && set.id) index[set.id] = set;
      return index;
    }, {});

    return subtopics.map(subtopic => {
      const set = byId[subtopic.id];
      if (!set || !Array.isArray(set.questions) || !set.questions.length) return null;
      return {
        id: subtopic.id,
        title: subtopic.title,
        href: subtopic.href,
        set
      };
    }).filter(Boolean);
  }

  function loadScriptOnce(src) {
    const absolute = new URL(src, window.location.href).href;
    const existing = Array.from(document.scripts).find(script => script.src === absolute);
    if (existing) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }

  function loadOptionalScript(feature, src) {
    return loadScriptOnce(src).catch(error => {
      dispatchEnhancementFailure(feature, error);
      console.warn(`Optional ${feature} feature skipped.`, error);
    });
  }

  function dispatchEnhancementFailure(feature, error) {
    if (!window.dispatchEvent || typeof CustomEvent !== 'function') return;
    try {
      window.dispatchEvent(new CustomEvent('grammarquest:progressive-enhancement-failure', {
        detail: {
          feature,
          fatal: false,
          code: 'optional_feature_unavailable'
        }
      }));
    } catch (dispatchError) {}
  }

  function scheduleTopicIndexPreload(subtopics) {
    const config = getAppConfig();
    if (!config.enableQuestionChunkPreload || !Array.isArray(subtopics) || !subtopics.length) return;
    Promise.resolve()
      .then(() => window.GrammarQuestQuestionPreloadPolicy ? Promise.resolve() : loadScriptOnce('../../assets/question-preload-policy.js'))
      .then(() => window.GrammarQuestQuestionPreloader ? Promise.resolve() : loadScriptOnce('../../assets/question-preloader.js'))
      .then(() => {
        if (!window.GrammarQuestQuestionPreloader || typeof window.GrammarQuestQuestionPreloader.preload !== 'function') return;
        window.GrammarQuestQuestionPreloader.preload({
          currentRoute: 'topic-index',
          domain: getMixedQuizDomain(subtopics),
          visibleSubtopicIds: subtopics.map(subtopic => subtopic.id),
          manifest: window.QUESTION_MANIFEST
        });
      })
      .catch(error => console.warn('Topic index preload skipped:', error));
  }

  function applyAuthModeUi(subtopics) {
    const auth = window.GrammarQuestAuth;
    const authState = auth && typeof auth.getState === 'function' ? auth.getState() : {};
    const parentMode = !!authState.parentMode && isParentBrowseOpen();
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
        const entry = findQuestionSetManifestEntry(window.QUESTION_MANIFEST, href) || findQuestionSetEntry(window.QUESTION_BANK || {}, href);
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
    const questionCount = subtopics.reduce((sum, subtopic) => sum + getQuestionCount(subtopic.set), 0);

    if (title) title.textContent = `${title.dataset.studentTitle} Question Bank`;
    if (subtitle) subtitle.textContent = `${questionCount} questions across ${subtopics.length} subtopics. Parent browsing is not saved to student progress.`;
    if (mixedPanel) mixedPanel.hidden = true;
    if (mixedRoot) mixedRoot.hidden = true;

    document.querySelectorAll('.subtopic-item').forEach(item => {
      const href = item.getAttribute('href') || '';
      const entry = findQuestionSetManifestEntry(window.QUESTION_MANIFEST, href) || findQuestionSetEntry(window.QUESTION_BANK || {}, href);
      const set = entry && entry.set;
      const label = item.querySelector('[data-practice-label]');
      item.querySelectorAll('.sub-mastery').forEach(node => node.remove());
      if (label) {
        const count = getQuestionCount(set);
        label.textContent = count ? `${count} questions` : 'Question preview';
      }
      item.setAttribute('aria-label', `${getSubtopicTitle(item, set || {})} question preview`);
    });
  }

  function isParentBrowseOpen() {
    try {
      return new URLSearchParams(window.location.search).get('parentBrowse') === '1';
    } catch (error) {
      return false;
    }
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

  function getQuestionCount(set) {
    if (!set) return 0;
    if (Number.isInteger(set.questionCount)) return set.questionCount;
    return Array.isArray(set.questions) ? set.questions.length : 0;
  }

  function getGradesSupported(set) {
    if (!set) return [];
    if (Array.isArray(set.gradesSupported)) return set.gradesSupported;
    return set.metadata && Array.isArray(set.metadata.gradesSupported) ? set.metadata.gradesSupported : [];
  }

  function getDifficultiesSupported(set) {
    if (!set) return [];
    if (Array.isArray(set.difficultiesSupported)) return set.difficultiesSupported;
    return set.metadata && Array.isArray(set.metadata.difficultiesSupported) ? set.metadata.difficultiesSupported : [];
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text || '');
    return div.innerHTML;
  }

  window.GrammarQuestTopicIndex = {
    findQuestionSetEntry,
    findQuestionSetManifestEntry,
    getPracticeLabel,
    getQuestionCount,
    hydrateMixedSubtopics,
    loadMixedQuizSets
  };
})();
