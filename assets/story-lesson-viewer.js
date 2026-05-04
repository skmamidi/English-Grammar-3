(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestStoryLessonViewer = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const SUPPORTED_GRADES = ['2', '3', '4', '5', '6'];

  function start(options = {}) {
    const document = options.document || root.document;
    if (!document) return { status: 'unavailable' };
    const setId = options.setId || root.QUIZ_SET_ID || '';
    const lessons = options.lessonChunks || root.STORY_LESSON_CHUNKS || {};
    const lesson = lessons[setId];
    if (root.GRAMMAR_QUEST_OFFLINE_LESSON_MISSING === true) {
      return renderOfflineLessonUnavailable(document, setId);
    }
    const shouldShow = shouldShowLessonFirst({
      search: root.location && root.location.search || '',
      hasLesson: !!lesson,
      storage: getStorageSnapshot(options.storage || root.localStorage)
    });
    if (!shouldShow) return { status: 'practice' };

    const rootElement = document.getElementById('quiz-root');
    if (!rootElement) return { status: 'missing-root' };
    root.GRAMMAR_QUEST_DEFER_QUIZ_START = true;
    const model = buildStoryLessonViewModel(lesson, {
      routeGrade: getSearchParam(root.location && root.location.search, 'grade'),
      storedGrade: readStorage(options.storage || root.localStorage, 'grammarQuestGrade'),
      characterCatalog: options.characterCatalog || root.GrammarQuestCharacters
    });
    rootElement.innerHTML = renderStoryLessonHtml(model);
    wireInteractions(rootElement, model, options);
    return { status: 'lesson', model };
  }

  function renderOfflineLessonUnavailable(document, setId) {
    const rootElement = document.getElementById('quiz-root');
    if (!rootElement) return { status: 'missing-root' };
    root.GRAMMAR_QUEST_DEFER_QUIZ_START = true;
    rootElement.innerHTML = `
      <section class="story-lesson story-lesson-offline" role="alert" data-story-lesson-offline="${escapeHtml(setId)}">
        <div class="quest-kicker">Offline Lesson</div>
        <h2>Lesson unavailable offline</h2>
        <p>Reconnect and open this lesson once before practicing offline.</p>
      </section>
    `;
    return { status: 'offline-unavailable', setId };
  }

  function buildStoryLessonViewModel(lesson, options = {}) {
    const variants = lesson && lesson.gradeVariants || {};
    const grade = chooseGrade(options.routeGrade, options.storedGrade, variants);
    const variant = variants[grade] || {};
    const roles = new Map((Array.isArray(lesson && lesson.characterRoles) ? lesson.characterRoles : []).map(role => [role.roleId, role]));
    const characterCatalog = options.characterCatalog || {};
    const storyBeats = (Array.isArray(variant.storyBeats) ? variant.storyBeats : []).map(beat => {
      const role = roles.get(beat.characterRoleId) || {};
      const character = resolveCharacter(role.characterId, characterCatalog);
      return Object.assign({}, beat, { role, character });
    });
    return {
      setId: lesson.setId,
      title: lesson.title,
      grade,
      readingLevel: variant.readingLevel || '',
      storyBeats,
      conceptRules: arrayOfStrings(variant.conceptRules),
      examples: arrayOfObjects(variant.examples),
      guidedChecks: arrayOfObjects(variant.guidedChecks),
      commonMistakes: arrayOfStrings(variant.commonMistakes),
      relatedSubtopics: arrayOfObjects(lesson.relatedSubtopics),
      quizHandoff: Object.assign({
        label: 'Start practice',
        targetSetId: lesson.setId
      }, variant.quizHandoff || {})
    };
  }

  function renderStoryLessonHtml(model) {
    return `
      <section class="story-lesson" data-story-lesson="${escapeHtml(model.setId)}">
        <div class="story-lesson-header">
          <div class="quest-kicker">Learn First</div>
          <h2>${escapeHtml(model.title)}</h2>
          <label class="story-grade-picker">Grade
            <select id="story-lesson-grade" aria-label="Choose lesson grade">
              ${SUPPORTED_GRADES.map(grade => `<option value="${grade}"${grade === model.grade ? ' selected' : ''}>${grade}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="story-lesson-grid">
          ${model.storyBeats.map(renderStoryBeat).join('')}
        </div>
        <section class="story-lesson-panel">
          <h3>Rules to Try</h3>
          <ul>${model.conceptRules.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </section>
        <section class="story-lesson-panel">
          <h3>Examples</h3>
          ${model.examples.map(renderExample).join('')}
        </section>
        <section class="story-lesson-panel">
          <h3>Guided Checks</h3>
          ${model.guidedChecks.map(renderGuidedCheck).join('')}
        </section>
        <section class="story-lesson-panel">
          <h3>Watch For</h3>
          <ul>${model.commonMistakes.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </section>
        <section class="story-lesson-panel">
          <h3>Related Lessons</h3>
          <ul>${model.relatedSubtopics.map(item => `<li><a href="${escapeHtml(relatedHref(item))}" data-related-set-id="${escapeHtml(item.setId)}">${escapeHtml(item.setId)}</a></li>`).join('')}</ul>
        </section>
        <button class="btn btn-primary" id="story-lesson-start-practice">${escapeHtml(model.quizHandoff.label || 'Start practice')}</button>
      </section>
    `;
  }

  function shouldShowLessonFirst({ search = '', hasLesson = false, storage = {} } = {}) {
    if (!hasLesson) return false;
    const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
    if (params.get('practice') === '1') return false;
    if (params.get('parentBrowse') === '1') return false;
    if (params.get('teacherPreview') === '1') return false;
    if (storage.grammarQuestActiveAssignmentRequest) return false;
    if (storage.grammarQuestActiveReviewRequest) return false;
    return true;
  }

  function wireInteractions(rootElement, model, options) {
    const gradeSelect = rootElement.querySelector('#story-lesson-grade');
    if (gradeSelect) {
      gradeSelect.addEventListener('change', event => {
        const lesson = (options.lessonChunks || root.STORY_LESSON_CHUNKS || {})[model.setId];
        const nextModel = buildStoryLessonViewModel(lesson, {
          routeGrade: event.target.value,
          storedGrade: model.grade,
          characterCatalog: options.characterCatalog || root.GrammarQuestCharacters
        });
        rootElement.innerHTML = renderStoryLessonHtml(nextModel);
        wireInteractions(rootElement, nextModel, options);
      });
    }
    const handoff = rootElement.querySelector('#story-lesson-start-practice');
    if (handoff) {
      handoff.addEventListener('click', () => {
        root.GRAMMAR_QUEST_DEFER_QUIZ_START = false;
        if (root.GrammarQuestQuizEngine && typeof root.GrammarQuestQuizEngine.start === 'function') {
          root.GrammarQuestQuizEngine.start();
        }
      });
    }
    rootElement.querySelectorAll('[data-guided-check-answer]').forEach(button => {
      button.addEventListener('click', () => {
        const target = rootElement.querySelector(`#${button.getAttribute('aria-controls')}`);
        if (target) target.hidden = false;
      });
    });
  }

  function renderStoryBeat(beat) {
    const characterName = beat.character && beat.character.name || beat.role && beat.role.characterId || 'Guide';
    return `<article class="story-beat"><div class="story-character">${escapeHtml(characterName)}</div><p>${escapeHtml(beat.narrative)}</p></article>`;
  }

  function renderExample(example) {
    return `<article class="story-example"><strong>${escapeHtml(example.type || 'example')}</strong><p>${escapeHtml(example.text)}</p><p>${escapeHtml(example.explanation)}</p></article>`;
  }

  function renderGuidedCheck(check, index) {
    const answerId = `story-check-answer-${index}`;
    return `<article class="story-check"><p>${escapeHtml(check.prompt)}</p><button class="btn btn-secondary" data-guided-check-answer aria-controls="${answerId}">Show Hint</button><p id="${answerId}" hidden>${escapeHtml(check.answer)}</p></article>`;
  }

  function resolveCharacter(characterId, catalog) {
    if (catalog && typeof catalog.getCharacterById === 'function') return catalog.getCharacterById(characterId) || { id: characterId, name: characterId };
    return { id: characterId, name: characterId };
  }

  function chooseGrade(routeGrade, storedGrade, variants) {
    const available = SUPPORTED_GRADES.filter(grade => variants && variants[grade]);
    if (available.includes(String(routeGrade || ''))) return String(routeGrade);
    if (available.includes(String(storedGrade || ''))) return String(storedGrade);
    if (available.includes('4')) return '4';
    return available[0] || '4';
  }

  function relatedHref(item) {
    const route = item.route;
    if (route && route.webPath) return `../../../${route.webPath}`;
    return '#';
  }

  function getSearchParam(search, key) {
    return new URLSearchParams(String(search || '').replace(/^\?/, '')).get(key) || '';
  }

  function readStorage(storage, key) {
    try {
      return storage && typeof storage.getItem === 'function' ? storage.getItem(key) || '' : storage && storage[key] || '';
    } catch (error) {
      return '';
    }
  }

  function getStorageSnapshot(storage) {
    return {
      grammarQuestActiveAssignmentRequest: readStorage(storage, 'grammarQuestActiveAssignmentRequest'),
      grammarQuestActiveReviewRequest: readStorage(storage, 'grammarQuestActiveReviewRequest')
    };
  }

  function arrayOfStrings(values) {
    return (Array.isArray(values) ? values : []).map(value => String(value || '')).filter(Boolean);
  }

  function arrayOfObjects(values) {
    return (Array.isArray(values) ? values : []).filter(value => value && typeof value === 'object');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  if (root.document) {
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', () => start());
    else start();
  }

  return {
    buildStoryLessonViewModel,
    renderStoryLessonHtml,
    renderOfflineLessonUnavailable,
    shouldShowLessonFirst,
    start
  };
});
