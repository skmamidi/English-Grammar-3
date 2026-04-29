/**
 * English Language Quiz App - Quiz Engine
 * Modular, expandable quiz system
 * 
 * Usage in a subtopic HTML file:
 *   <script>window.QUIZ_SET_ID = 'vocabulary-base-words';</script>
 *   <script src="../../assets/question-banks/grammar.js"></script>
 *   <script src="../../assets/quiz-engine.js"></script>
 */

(function () {
  'use strict';

  // State
  let currentQuestions = [];
  let currentIndex = 0;
  let score = 0;
  let combo = 0;
  let answered = false;
  let quizContainer = null;
  let activeSet = null;
  let baseQuestions = [];
  let selectedGrade = '4';
  let selectedDifficulty = 'medium';
  let missedQuestions = [];
  let reviewMode = false;
  let currentConfidence = '';
  let hintUsedThisQuestion = false;
  let hintsUsed = 0;
  let confidenceStats = [];
  let attemptRecords = [];
  let reviewAttemptRecords = [];
  let sessionStartedAt = 0;
  let questionStartedAt = 0;
  let mixedQuizConfig = null;
  let selectedMixedSubtopicIds = [];
  let selectedMixedQuestionLimit = '4';
  const progressStore = window.GrammarQuestProgress;
  const assessmentGuard = progressStore && progressStore.activeAssessment;
  const gradeOptions = ['3', '4', '5', '6'];
  const difficultyOptions = ['easy', 'medium', 'hard'];
  const targetQuestionCount = getConfiguredQuestionCount();
  const quizDomain = window.GrammarQuestQuizDomain;

  // DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    quizContainer = document.getElementById('quiz-root');
    if (!quizContainer) {
      console.error('Quiz engine: #quiz-root element not found');
      return;
    }
    if (!quizDomain) {
      console.error('Quiz engine: assets/quiz-domain.js must load before assets/quiz-engine.js');
      quizContainer.innerHTML = '<p class="page-subtitle">Error: Quiz domain failed to load.</p>';
      return;
    }
    const shell = quizContainer.closest('.container');
    if (shell) shell.classList.add('quiz-shell');

    const setId = window.QUIZ_SET_ID;
    if (!setId && window.QUIZ_MIXED_TOPIC_CONFIG) {
      initMixedQuiz(window.QUIZ_MIXED_TOPIC_CONFIG);
      return;
    }

    if (!setId) {
      console.error('Quiz engine: window.QUIZ_SET_ID is not set');
      quizContainer.innerHTML = '<p class="page-subtitle">Error: No quiz set specified.</p>';
      return;
    }

    initQuiz(setId);
  });

  window.addEventListener('grammarquest:parent-browse', () => {
    if (activeSet && currentIndex === 0 && !answered) {
      currentQuestions = selectCurrentQuestions();
      renderStartScreen(activeSet);
    }
  });

  function initQuiz(setId) {
    const set = window.QUESTION_BANK && window.QUESTION_BANK[setId];
    if (!set || !Array.isArray(set.questions) || set.questions.length === 0) {
      quizContainer.innerHTML = `
        <div class="card">
          <p class="page-subtitle">Questions for this topic are coming soon!</p>
          <a href="./" class="btn btn-secondary">Back to Topic</a>
        </div>
      `;
      return;
    }

    activeSet = set;
    baseQuestions = [...set.questions];
    selectedGrade = getInitialGrade();
    selectedDifficulty = normalizeOption(loadSetting('grammarQuestDifficulty', 'medium'), difficultyOptions, 'medium');
    currentQuestions = selectQuestionsForLevel(baseQuestions, selectedGrade, selectedDifficulty);
    currentIndex = 0;
    score = 0;
    combo = 0;
    answered = false;
    missedQuestions = [];
    reviewMode = false;
    hintsUsed = 0;
    confidenceStats = [];
    attemptRecords = [];
    reviewAttemptRecords = [];

    renderStartScreen(set);
  }

  function initMixedQuiz(config) {
    const subtopics = normalizeMixedSubtopics(config);
    if (!subtopics.length) {
      quizContainer.innerHTML = '';
      return;
    }

    mixedQuizConfig = Object.assign({
      questionsPerSubtopic: getConfiguredQuestionsPerSubtopic(),
      subtopics
    }, config || {}, { subtopics });
    activeSet = {
      title: mixedQuizConfig.title || 'Mixed Topic Quiz',
      topic: mixedQuizConfig.topic || 'Mixed Topic Practice',
      metadata: getMergedMetadata(subtopics),
      questions: subtopics.flatMap(subtopic => subtopic.questions)
    };
    baseQuestions = [...activeSet.questions];
    selectedGrade = getInitialGrade();
    selectedDifficulty = normalizeOption(loadSetting('grammarQuestDifficulty', 'medium'), difficultyOptions, 'medium');
    selectedMixedSubtopicIds = subtopics.map(subtopic => subtopic.id);
    selectedMixedQuestionLimit = normalizeMixedQuestionLimit(loadSetting('grammarQuestMixedQuestionLimit', mixedQuizConfig.questionsPerSubtopic || '4'));
    currentQuestions = selectMixedQuestions(selectedGrade, selectedDifficulty);
    currentIndex = 0;
    score = 0;
    combo = 0;
    answered = false;
    missedQuestions = [];
    reviewMode = false;
    hintsUsed = 0;
    confidenceStats = [];
    attemptRecords = [];
    reviewAttemptRecords = [];

    renderStartScreen(activeSet);
  }

  function renderStartScreen(set) {
    const progress = loadProgress();
    const parentMode = isParentMode();
    const topicName = set.topic || 'Grammar Quest';
    const rank = getRank(progress.totalGems);
    const supportsLevelSelection = setSupportsLevelSelection(set);
    const selectionSummary = getSelectionSummary(baseQuestions, selectedGrade, selectedDifficulty);
    const levelControls = parentMode ? `
        <div class="level-summary">
          <strong>${baseQuestions.length}</strong> questions available in this question bank.
          <span>Parent preview includes the full question pool and stays separate from student progress.</span>
        </div>
      ` : supportsLevelSelection ? `
        <div class="level-picker" aria-label="Choose quiz level">
          <div class="level-picker-group">
            <label for="grade-select">Grade</label>
            <select id="grade-select">
              ${gradeOptions.map(grade => `<option value="${grade}" ${grade === selectedGrade ? 'selected' : ''}>Grade ${getDisplayGrade(grade)}</option>`).join('')}
            </select>
          </div>
          <div class="level-picker-group">
            <label for="difficulty-select">Difficulty</label>
            <select id="difficulty-select">
              ${difficultyOptions.map(level => `<option value="${level}" ${level === selectedDifficulty ? 'selected' : ''}>${capitalize(level)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="level-summary" id="level-summary">
          ${renderSelectionSummary(selectionSummary)}
        </div>
      ` : `
        <div class="level-summary">
          This pronunciation practice uses the full sound-focused question set.
        </div>
      `;
    const mixedSubtopicSelector = mixedQuizConfig ? renderMixedSubtopicSelector() : '';
    const characterSetControls = renderCharacterSetControls();
    const resumableQuiz = parentMode ? null : getResumableQuiz();
    const resumeCard = resumableQuiz ? `
        <div class="resume-quiz-card">
          <div>
            <strong>Resume unfinished quiz</strong>
            <span>${escapeHtml(resumableQuiz.title || set.title)} · ${getResumePositionLabel(resumableQuiz)}</span>
          </div>
          <button class="btn btn-secondary" id="resume-quiz-btn" type="button">Resume</button>
          <button class="btn btn-secondary" id="discard-resume-btn" type="button">Discard</button>
        </div>
      ` : '';

    quizContainer.innerHTML = `
      <div class="start-screen">
        <div class="quest-kicker">${parentMode ? 'Parent Question Preview' : mixedQuizConfig ? 'Topic Checkpoint' : 'Chapter Mission'}</div>
        <h2>${escapeHtml(set.title)}</h2>
        <p>${getStartScreenCopy(supportsLevelSelection)}</p>
        ${levelControls}
        ${mixedSubtopicSelector}
        ${characterSetControls}
        ${parentMode ? '<div class="parent-preview-note">Preview mode is separate from student practice. Answers here do not change reports, gems, streaks, or mastery.</div>' : `<div class="quest-dashboard" aria-label="Saved quest progress">
          <div class="quest-stat">
            <span class="quest-stat-value">${progress.streakDays}</span>
            <span class="quest-stat-label">day streak</span>
          </div>
          <div class="quest-stat">
            <span class="quest-stat-value">${progress.totalGems}</span>
            <span class="quest-stat-label">star gems</span>
          </div>
          <div class="quest-stat">
            <span class="quest-stat-value">${escapeHtml(rank.name)}</span>
            <span class="quest-stat-label">rank</span>
          </div>
        </div>`}
        ${resumeCard}
        <p class="quest-brief">${parentMode ? `Question preview: ${escapeHtml(topicName)}.` : `Today's trail: ${escapeHtml(topicName)}. A score of 75% or higher earns a bonus reward.`}</p>
        <button class="btn btn-primary" id="start-btn">${parentMode ? 'Preview Questions' : 'Start Quiz'}</button>
      </div>
    `;

    if (supportsLevelSelection && !parentMode) {
      const gradeSelect = document.getElementById('grade-select');
      const difficultySelect = document.getElementById('difficulty-select');
      const updateSelection = () => {
        selectedGrade = gradeSelect.value;
        selectedDifficulty = difficultySelect.value;
        saveSetting('grammarQuestGrade', selectedGrade);
        saveSetting('grammarQuestDifficulty', selectedDifficulty);
        currentQuestions = selectCurrentQuestions();
        const summaryEl = document.getElementById('level-summary');
        if (summaryEl) {
          summaryEl.innerHTML = renderSelectionSummary(getSelectionSummary(baseQuestions, selectedGrade, selectedDifficulty));
        }
      };
      gradeSelect.addEventListener('change', updateSelection);
      difficultySelect.addEventListener('change', updateSelection);
    }
    if (mixedQuizConfig) attachMixedSelectorHandlers();
    attachCharacterSetHandlers();

    const resumeButton = document.getElementById('resume-quiz-btn');
    if (resumeButton) {
      resumeButton.addEventListener('click', () => resumeQuiz(resumableQuiz));
    }
    const discardButton = document.getElementById('discard-resume-btn');
    if (discardButton) {
      discardButton.addEventListener('click', () => {
        clearActiveQuiz();
        renderStartScreen(set);
      });
    }

    document.getElementById('start-btn').addEventListener('click', () => {
      currentQuestions = selectCurrentQuestions();
      currentIndex = 0;
      score = 0;
      combo = 0;
      missedQuestions = [];
      reviewMode = false;
      hintsUsed = 0;
      confidenceStats = [];
      attemptRecords = [];
      reviewAttemptRecords = [];
      sessionStartedAt = Date.now();
      questionStartedAt = 0;
      if (!isParentMode()) saveActiveQuiz();
      startAssessmentGuard('quiz');
      renderQuestion();
    });
  }

  function resumeQuiz(savedQuiz) {
    if (!savedQuiz || !Array.isArray(savedQuiz.questions) || !savedQuiz.questions.length) return;
    currentQuestions = savedQuiz.questions;
    warnOnChangedQuestionRefs(savedQuiz);
    currentIndex = Math.min(Math.max(0, Number(savedQuiz.currentIndex) || 0), currentQuestions.length);
    score = Number(savedQuiz.score) || 0;
    combo = Number(savedQuiz.combo) || 0;
    missedQuestions = Array.isArray(savedQuiz.missedQuestions) ? savedQuiz.missedQuestions : [];
    reviewMode = !!savedQuiz.reviewMode;
    hintsUsed = Number(savedQuiz.hintsUsed) || 0;
    confidenceStats = Array.isArray(savedQuiz.confidenceStats) ? savedQuiz.confidenceStats : [];
    attemptRecords = Array.isArray(savedQuiz.attempts) ? savedQuiz.attempts : [];
    reviewAttemptRecords = Array.isArray(savedQuiz.reviewAttempts) ? savedQuiz.reviewAttempts : [];
    sessionStartedAt = savedQuiz.startedAt ? Date.parse(savedQuiz.startedAt) || Date.now() : Date.now();
    questionStartedAt = savedQuiz.questionStartedAt ? Date.parse(savedQuiz.questionStartedAt) || Date.now() : Date.now();
    startAssessmentGuard('quiz');
    if (currentIndex >= currentQuestions.length) {
      renderResults();
      return;
    }
    renderQuestion();
  }

  function renderQuestion() {
    const q = currentQuestions[currentIndex];
    const completedAttempt = getCompletedAttemptForIndex(currentIndex);
    const isCompletedView = !!completedAttempt;
    answered = isCompletedView;
    currentConfidence = isCompletedView ? (completedAttempt.confidence || '') : '';
    hintUsedThisQuestion = isCompletedView ? !!completedAttempt.hintUsed : false;
    if (!isCompletedView) questionStartedAt = Date.now();
    const progress = loadProgress();
    const strategyHint = getStrategyHint(q);
    const questionPrompt = renderQuestionPrompt(q, {
      question: q,
      index: currentIndex,
      mode: 'question'
    });

    quizContainer.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-status">
          <div class="quiz-progress">${reviewMode ? 'Review' : 'Question'} ${currentIndex + 1} of ${currentQuestions.length}</div>
          <div class="quiz-progress-track" aria-hidden="true">
            <span style="width: ${Math.round(((currentIndex + 1) / currentQuestions.length) * 100)}%"></span>
          </div>
        </div>
        <div class="quest-mini-hud" aria-label="Quest progress">
          <span>${progress.streakDays} day streak</span>
          <span>${progress.totalGems} gems</span>
          <span>Combo ${combo}</span>
        </div>
        <div class="quiz-score">Score: ${score} / ${getCompletedQuestionCount()}</div>
      </div>

      <div class="question-box">
        ${questionPrompt}
        ${isCompletedView ? '<div class="answered-lock-note">Answered and locked for this attempt.</div>' : `
          <div class="thinking-tools">
            <button type="button" class="strategy-btn" id="strategy-btn">Strategy clue</button>
            <div class="confidence-check" aria-label="Choose confidence level before answering">
              <span>How sure are you?</span>
              <button type="button" class="confidence-btn" data-confidence="exploring">Need clues</button>
              <button type="button" class="confidence-btn" data-confidence="thinking">Pretty sure</button>
              <button type="button" class="confidence-btn" data-confidence="certain">I can prove it</button>
            </div>
          </div>
        `}
        <div class="strategy-panel" id="strategy-panel" hidden>${escapeHtml(strategyHint)}</div>
        <div class="choices" id="choices">
          ${q.choices.map((choice, idx) => `
            <button class="choice-btn" data-index="${idx}" disabled>
              <span class="choice-letter">${String.fromCharCode(65 + idx)}</span>
              <span>${escapeHtml(choice)}</span>
            </button>
          `).join('')}
        </div>
        <div class="question-report-actions">
          <button class="report-question-btn" id="report-question-btn" type="button">Report this question</button>
          <span id="question-report-status" aria-live="polite"></span>
        </div>
      </div>

      <div id="feedback-area"></div>
      <div class="controls" id="controls"></div>
    `;

    const strategyButton = document.getElementById('strategy-btn');
    if (strategyButton) strategyButton.addEventListener('click', () => {
      const panel = document.getElementById('strategy-panel');
      if (!panel) return;
      panel.hidden = !panel.hidden;
      if (!panel.hidden && !hintUsedThisQuestion) {
        hintUsedThisQuestion = true;
        hintsUsed++;
      }
    });

    document.querySelectorAll('.confidence-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        currentConfidence = btn.dataset.confidence;
        document.querySelectorAll('.confidence-btn').forEach(option => {
          option.classList.toggle('selected', option === btn);
        });
        document.querySelectorAll('.choice-btn').forEach(choiceBtn => {
          choiceBtn.disabled = false;
        });
      });
    });

    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', handleAnswer);
    });
    const reportButton = document.getElementById('report-question-btn');
    if (reportButton) {
      reportButton.addEventListener('click', () => openQuestionReportDialog(q));
    }

    if (isCompletedView) {
      lockQuestionChoices(q, completedAttempt.selectedIndex);
      renderFeedback(q, completedAttempt.selectedIndex, completedAttempt.correct, { completedView: true });
    } else {
      renderPreAnswerControls();
    }

    scrollQuizIntoView();
  }

  function handleAnswer(e) {
    if (answered) return;
    answered = true;

    const btn = e.currentTarget;
    const selectedIndex = parseInt(btn.dataset.index, 10);
    const q = currentQuestions[currentIndex];
    const isCorrect = selectedIndex === q.correct;
    const durationSeconds = questionStartedAt ? Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000)) : 0;
    const questionRef = getQuestionRef(q);
    const attemptRecord = {
      id: questionRef.id,
      questionId: questionRef.id,
      questionVersion: questionRef.version,
      questionHash: questionRef.contentHash,
      sourceSet: questionRef.sourceSet,
      sequence: questionRef.sequence,
      question: q,
      selectedIndex,
      correct: isCorrect,
      confidence: currentConfidence || 'thinking',
      hintUsed: hintUsedThisQuestion,
      grade: selectedGrade,
      difficulty: selectedDifficulty,
      durationSeconds,
      trapTypes: getSelectedTrapTypes(q, selectedIndex)
    };

    if (isCorrect) score++;
    combo = isCorrect ? combo + 1 : 0;
    confidenceStats.push({ confidence: currentConfidence || 'thinking', correct: isCorrect });
    if (reviewMode) reviewAttemptRecords.push(attemptRecord);
    else attemptRecords.push(attemptRecord);
    if (!isCorrect && !reviewMode && !missedQuestions.includes(q)) {
      missedQuestions.push(q);
    }

    const nextIndex = currentIndex + 1;
    if (!reviewMode && nextIndex >= currentQuestions.length) {
      renderResults();
      return;
    }

    saveActiveQuiz({ nextIndex });

    lockConfidenceChoice();

    lockQuestionChoices(q, selectedIndex);

    // Render feedback
    renderFeedback(q, selectedIndex, isCorrect);

    // Update score display in header
    const scoreEl = document.querySelector('.quiz-score');
    if (scoreEl) scoreEl.textContent = `Score: ${score} / ${currentIndex + 1}`;
  }

  function lockQuestionChoices(q, selectedIndex) {
    document.querySelectorAll('.choice-btn').forEach((b, idx) => {
      b.disabled = true;
      if (idx === q.correct) {
        b.classList.add('correct');
      } else if (idx === selectedIndex && !isCorrectAnswerIndex(q, selectedIndex)) {
        b.classList.add('incorrect');
      } else {
        b.classList.add('unselected-wrong');
      }
    });
  }

  function isCorrectAnswerIndex(question, selectedIndex) {
    return Number(selectedIndex) === Number(question && question.correct);
  }

  function getCompletedQuestionCount() {
    return Math.min(attemptRecords.length, currentQuestions.length);
  }

  function getActiveUnansweredIndex() {
    return Math.min(getCompletedQuestionCount(), currentQuestions.length - 1);
  }

  function getCompletedAttemptForIndex(index) {
    if (reviewMode) return null;
    if (index < 0 || index >= getCompletedQuestionCount()) return null;
    return attemptRecords[index] || null;
  }

  function renderFeedback(q, selectedIndex, isCorrect, options) {
    const feedbackArea = document.getElementById('feedback-area');
    const controls = document.getElementById('controls');
    const completedView = !!(options && options.completedView);
    const comboMessage = isCorrect && combo >= 3
      ? `<div class="quest-reward-note">Combo bonus charged: ${combo} correct answers in a row.</div>`
      : '';
    const syllableFeedback = renderSyllableFeedback(q, selectedIndex);

    let choiceExplanations = '';
    if (syllableFeedback) {
      choiceExplanations = renderSyllableChoiceExplanations(q);
    } else if (q.explanation && q.explanation.incorrect) {
      choiceExplanations = q.choices.map((choice, idx) => {
        const isCorrectChoice = idx === q.correct;
        const expText = isCorrectChoice
          ? q.explanation.correct
          : (q.explanation.incorrect[idx] || '');
        const displayText = cleanExplanationText(expText, q);
        return `
          <div class="choice-explanation ${isCorrectChoice ? 'correct-exp' : 'incorrect-exp'}">
            <strong>${String.fromCharCode(65 + idx)})</strong> ${escapeHtml(displayText)}
          </div>
        `;
      }).join('');
    }

    const studyAidHtml = renderStudyAid(q.studyAid);
    const characterNotesHtml = renderCharacterNotes(q, currentIndex);

    feedbackArea.innerHTML = `
      <div class="feedback-box">
        <div class="feedback-summary">
          <div class="feedback-title ${isCorrect ? 'correct' : 'incorrect'}">
            ${isCorrect ? 'Correct! Star gem found.' : 'Not quite. The trail is still open.'}
          </div>
          <div class="feedback-answer-pill">${escapeHtml(String.fromCharCode(65 + selectedIndex))}</div>
        </div>
        ${comboMessage}
        ${syllableFeedback}
        ${choiceExplanations ? `<div class="choice-explanations">${choiceExplanations}</div>` : ''}
        ${studyAidHtml}
        ${characterNotesHtml}
      </div>
    `;

    const isLast = currentIndex === currentQuestions.length - 1;
    controls.innerHTML = renderQuestionControls(completedView);
    attachQuestionControlHandlers();
  }

  function renderQuestionControls(completedView) {
    const buttons = [];
    const activeUnansweredIndex = getActiveUnansweredIndex();
    if (!reviewMode && currentIndex > 0) {
      buttons.push('<button class="btn btn-secondary" id="previous-question-btn" type="button">Previous Question</button>');
    }
    if (completedView && currentIndex < activeUnansweredIndex) {
      const label = currentIndex + 1 === activeUnansweredIndex ? 'Return to Current Question' : 'Next Question';
      buttons.push(`<button class="btn btn-primary" id="next-question-btn" type="button">${label}</button>`);
    } else if (!completedView) {
      buttons.push(`<button class="btn btn-primary" id="next-question-btn" type="button">${currentIndex === currentQuestions.length - 1 ? 'See Results' : 'Next Question'}</button>`);
    }
    return buttons.join('');
  }

  function renderPreAnswerControls() {
    if (reviewMode || currentIndex <= 0 || getCompletedQuestionCount() <= 0) return;
    const controls = document.getElementById('controls');
    if (!controls) return;
    controls.innerHTML = '<button class="btn btn-secondary" id="previous-question-btn" type="button">Previous Question</button>';
    attachQuestionControlHandlers();
  }

  function attachQuestionControlHandlers() {
    const previousButton = document.getElementById('previous-question-btn');
    if (previousButton) {
      previousButton.addEventListener('click', () => {
        currentIndex = Math.max(0, currentIndex - 1);
        renderQuestion();
      });
    }

    const nextButton = document.getElementById('next-question-btn');
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        const activeUnansweredIndex = getActiveUnansweredIndex();
        if (!reviewMode && currentIndex < activeUnansweredIndex) {
          currentIndex++;
          renderQuestion();
          return;
        }
        if (currentIndex === currentQuestions.length - 1) {
          renderResults();
        } else {
          currentIndex++;
          saveActiveQuiz();
          renderQuestion();
        }
      });
    }
  }

  function openQuestionReportDialog(question) {
    const dialog = ensureQuestionReportDialog();
    const reason = dialog.querySelector('[data-question-report-reason]');
    const note = dialog.querySelector('[data-question-report-note]');
    const message = dialog.querySelector('[data-question-report-message]');
    const prompt = dialog.querySelector('[data-question-report-prompt]');
    if (reason) reason.value = 'answer_or_explanation';
    if (note) note.value = '';
    if (message) message.textContent = '';
    if (prompt) prompt.textContent = stripPromptLeadIns(question && question.question ? question.question : '');
    dialog.classList.remove('hidden');
    document.body.classList.add('question-report-open');
    if (note) note.focus();
  }

  function ensureQuestionReportDialog() {
    let dialog = document.getElementById('question-report-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('div');
    dialog.id = 'question-report-dialog';
    dialog.className = 'question-report-modal hidden';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'question-report-title');
    dialog.innerHTML = `
      <div class="question-report-dialog">
        <button class="auth-close" type="button" data-question-report-close aria-label="Close report dialog">x</button>
        <div class="quest-kicker">Question report</div>
        <h2 id="question-report-title">Tell a grown-up what looks wrong</h2>
        <p class="question-report-prompt" data-question-report-prompt></p>
        <label>
          <span>What should they check?</span>
          <select data-question-report-reason>
            <option value="answer_or_explanation">Answer or explanation does not make sense</option>
            <option value="typo">Typo or unclear wording</option>
            <option value="audio_visual">Picture, audio, or layout issue</option>
            <option value="other">Something else</option>
          </select>
        </label>
        <label>
          <span>Optional note</span>
          <textarea data-question-report-note rows="4" maxlength="800" placeholder="What seemed confusing?"></textarea>
        </label>
        <p class="question-report-message" data-question-report-message></p>
        <div class="question-report-dialog-actions">
          <button class="btn btn-secondary" type="button" data-question-report-close>Cancel</button>
          <button class="btn btn-primary" type="button" data-question-report-save>Send report</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    dialog.addEventListener('click', event => {
      if (event.target === dialog || event.target.closest('[data-question-report-close]')) {
        closeQuestionReportDialog();
      }
      if (event.target.closest('[data-question-report-save]')) {
        saveQuestionReportFromDialog(dialog);
      }
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeQuestionReportDialog();
    });
    return dialog;
  }

  function closeQuestionReportDialog() {
    const dialog = document.getElementById('question-report-dialog');
    if (dialog) dialog.classList.add('hidden');
    document.body.classList.remove('question-report-open');
    const button = document.getElementById('report-question-btn');
    if (button) button.focus();
  }

  function saveQuestionReportFromDialog(dialog) {
    const message = dialog.querySelector('[data-question-report-message]');
    const saveButton = dialog.querySelector('[data-question-report-save]');
    const reason = dialog.querySelector('[data-question-report-reason]');
    const note = dialog.querySelector('[data-question-report-note]');
    try {
      if (isParentMode()) {
        throw new Error('Question reports are saved from student practice, so they appear under the student profile.');
      }
      if (saveButton) saveButton.disabled = true;
      const report = buildQuestionReportPayload({
        reason: reason ? reason.value : '',
        note: note ? note.value : ''
      });
      const progress = loadProgress();
      const reports = progressStore && typeof progressStore.normalizeReports === 'function'
        ? progressStore.normalizeReports(progress.reports)
        : Object.assign({ sessions: [], questionReports: [] }, progress.reports || {});
      reports.questionReports = [report]
        .concat(Array.isArray(reports.questionReports) ? reports.questionReports : [])
        .slice(0, 500);
      progress.reports = reports;
      saveProgress(progress, { sync: true });
      updateQuestionReportStatus('Report sent for grown-up review.');
      if (message) message.textContent = 'Report sent for grown-up review.';
      window.setTimeout(closeQuestionReportDialog, 600);
    } catch (error) {
      if (message) message.textContent = error.message || 'Could not send this report.';
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }

  function buildQuestionReportPayload(details) {
    const question = currentQuestions[currentIndex] || {};
    const choices = Array.isArray(question.choices) ? question.choices : [];
    const correctIndex = Number.isFinite(question.correct) ? question.correct : -1;
    const selectedAttempt = getCurrentQuestionAttempt();
    const selectedIndex = selectedAttempt && Number.isFinite(selectedAttempt.selectedIndex)
      ? selectedAttempt.selectedIndex
      : -1;
    const metadata = question.metadata || {};
    const subtopic = getQuestionSubtopic(question);
    const createdAt = new Date().toISOString();
    return {
      id: `question-report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'open',
      reason: String(details && details.reason || 'answer_or_explanation'),
      note: String(details && details.note || '').trim().slice(0, 800),
      createdAt,
      updatedAt: createdAt,
      studentId: getActiveStudentId(),
      studentName: getActiveStudentName(),
      setId: window.QUIZ_SET_ID || '',
      title: activeSet && activeSet.title || 'Practice Quiz',
      topic: activeSet && activeSet.topic || 'English Language Arts',
      grade: selectedGrade,
      difficulty: selectedDifficulty,
      questionId: getQuestionId(question),
      questionVersion: question.version || 0,
      questionHash: question.contentHash || '',
      sourceSet: metadata.sourceSet || subtopic.id || '',
      sequence: metadata.sequence || currentIndex + 1,
      questionSnapshot: getQuestionSnapshot(question, selectedIndex),
      question: question.question || '',
      choices,
      selectedIndex,
      selectedChoice: choices[selectedIndex] || '',
      correctIndex,
      correctChoice: choices[correctIndex] || '',
      explanation: question.explanation || null,
      studyAid: question.studyAid || null,
      visualScene: question.visualScene || null,
      subtopicId: subtopic.id,
      subtopicTitle: subtopic.title,
      skills: Array.isArray(metadata.skills) ? metadata.skills : [],
      pagePath: window.location.pathname,
      pageUrl: window.location.href
    };
  }

  function getCurrentQuestionAttempt() {
    if (reviewMode) {
      return reviewAttemptRecords[reviewAttemptRecords.length - 1] || null;
    }
    return attemptRecords[currentIndex] || attemptRecords[attemptRecords.length - 1] || null;
  }

  function updateQuestionReportStatus(text) {
    const status = document.getElementById('question-report-status');
    if (status) status.textContent = text || '';
  }

  function renderStudyAid(aid) {
    if (!aid) return '';
    let html = '<div class="study-aid">';
    html += '<div class="study-aid-title">📚 Study Aid</div>';
    if (aid.definition) {
      html += `<p><span class="label">Definition:</span> ${escapeHtml(aid.definition)}</p>`;
    }
    if (aid.example) {
      html += `<p><span class="label">Example:</span> ${escapeHtml(aid.example)}</p>`;
    }
    if (aid.link && aid.linkText) {
      html += `<p><span class="label">Learn more:</span> <a href="${escapeHtml(aid.link)}" target="_blank" rel="noopener">${escapeHtml(aid.linkText)}</a></p>`;
    }
    html += '</div>';
    return html;
  }

  function renderCharacterScene(options) {
    const catalog = window.GrammarQuestCharacters;
    if (!catalog || typeof catalog.renderSceneCard !== 'function') return '';
    return catalog.renderSceneCard(Object.assign({
      set: activeSet,
      total: currentQuestions.length,
      reviewMode
    }, options));
  }

  function renderCharacterNotes(question, index) {
    const catalog = window.GrammarQuestCharacters;
    if (!catalog) return '';
    const scene = question && question.visualScene && question.visualScene.type === 'dialogue-scene'
      ? question.visualScene
      : null;
    const dialogue = scene && Array.isArray(scene.dialogue) ? scene.dialogue.slice(0, 2) : [];
    const entries = dialogue.length
      ? dialogue.map((entry, slot) => getSceneCharacter(entry && entry.characterId, slot))
      : [catalog.getQuestionScene && catalog.getQuestionScene({
          question,
          index,
          mode: 'question'
        })].filter(Boolean).map(sceneData => ({
          set: sceneData.set,
          character: sceneData.character
        }));
    const unique = [];
    entries.forEach(resolved => {
      if (!resolved || !resolved.character || unique.some(item => item.character.id === resolved.character.id)) return;
      unique.push(resolved);
    });
    if (!unique.length) return '';
    return `
      <details class="character-note-footer">
        <summary>Character notes</summary>
        <div class="character-note-grid">
          ${unique.map(resolved => {
            const name = typeof catalog.getCharacterDisplayName === 'function'
              ? catalog.getCharacterDisplayName(resolved.character)
              : resolved.character.name;
            const petName = resolved.character.pet && typeof catalog.getPetDisplayName === 'function'
              ? catalog.getPetDisplayName(resolved.character.pet)
              : (resolved.character.pet ? resolved.character.pet.name : '');
            return `
              <article class="character-note-card">
                <strong>${escapeHtml(name)}</strong>
                <span>${escapeHtml(resolved.character.role || resolved.set.name)}</span>
                <p>${escapeHtml(resolved.character.backstory || '')}</p>
                ${petName ? `<em>Companion: ${escapeHtml(petName)}</em>` : ''}
              </article>
            `;
          }).join('')}
        </div>
      </details>
    `;
  }

  function renderCharacterSetControls() {
    const catalog = window.GrammarQuestCharacters;
    if (!catalog || !Array.isArray(catalog.sets) || typeof catalog.getSelectedCharacterSetId !== 'function') {
      return '';
    }
    const selectedId = catalog.getSelectedCharacterSetId();
    return `
      <div class="character-set-picker">
        <label for="character-set-select">Character cast</label>
        <select id="character-set-select">
          <option value="auto" ${selectedId === 'auto' ? 'selected' : ''}>Auto rotate casts</option>
          ${catalog.sets.map(set => `
            <option value="${escapeHtml(set.id)}" ${selectedId === set.id ? 'selected' : ''}>${escapeHtml(set.name)}</option>
          `).join('')}
        </select>
      </div>
    `;
  }

  function attachCharacterSetHandlers() {
    const select = document.getElementById('character-set-select');
    const catalog = window.GrammarQuestCharacters;
    if (!select || !catalog || typeof catalog.setSelectedCharacterSetId !== 'function') return;
    select.addEventListener('change', () => {
      catalog.setSelectedCharacterSetId(select.value);
    });
  }

  function renderQuestionPrompt(question, options) {
    if (question && question.visualScene && question.visualScene.type === 'dialogue-scene') {
      return renderVisualQuestionScene(question.visualScene, question);
    }
    const prompt = getDisplayPromptParts(question && question.question);
    return `
      ${renderCharacterScene(options)}
      ${renderDisplayPrompt(prompt, 'question')}
    `;
  }

  function renderVisualQuestionScene(scene, question) {
    const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue.slice(0, 2) : [];
    const actorSlotOffset = currentIndex * 2;
    const nameSubstitutions = getSceneNameSubstitutions(dialogue, actorSlotOffset);
    const localize = value => applySceneNameSubstitutions(value, nameSubstitutions);
    const safeSceneText = value => scrubAnswerChoiceText(localize(value), question);
    const prompt = getDisplayPromptParts(localize(scene.prompt || question.question));
    const promptText = prompt.task || prompt.fullText;
    const guidanceText = safeSceneText(getQuestionStrategyClue(question, scene));
    const visualPrompt = prompt.type === 'passage'
      ? renderVisualPassagePrompt(prompt)
      : renderVisualPlainPrompt(prompt);
    const integratedDialogue = getIntegratedSceneDialogue(dialogue, promptText, guidanceText);
    return `
      <section class="visual-question-scene visual-scene-${escapeHtml(scene.setting || 'classroom')}" aria-label="${escapeHtml(scene.title || 'Illustrated question scene')}">
        <div class="visual-scene-intro">
          <h3>${escapeHtml(scene.title || 'Question Scene')}</h3>
        </div>
        ${visualPrompt}
        <div class="visual-stage">
          ${renderSceneSetPiece(scene, question)}
          <div class="visual-dialogue-strip">
            ${integratedDialogue.map((entry, index) => renderDialogueActor(entry, index, value => value, actorSlotOffset)).join('')}
          </div>
        </div>
      </section>
    `;
  }

  function getDisplayPromptParts(value) {
    const fullText = normalizePromptText(value);
    const withoutLeadIn = stripPromptLeadIns(fullText);
    const passageMatch = withoutLeadIn.match(/^Read the passage\.\s*(?:Grade\s+\d+\s+[a-z-]+\s+passage:\s*)?([\s\S]+)$/i);
    const passageSource = passageMatch ? passageMatch[1].trim() : withoutLeadIn;
    const split = passageSource.split(/\n\s*\n/);
    if (passageMatch && split.length > 1) {
      const task = stripPromptLeadIns(split.slice(1).join('\n\n')).trim();
      const passageParts = split[0].trim().split(/(?<=[.!?])\s+/).filter(Boolean);
      const annotationIndex = passageParts.findIndex(part => isPassageAnnotation(part));
      const annotation = annotationIndex >= 0 ? passageParts.splice(annotationIndex).join(' ') : '';
      return {
        type: 'passage',
        fullText: [passageParts.join(' '), annotation, task].filter(Boolean).join(' '),
        passage: passageParts.join(' '),
        annotation,
        task
      };
    }
    return {
      type: 'plain',
      fullText: withoutLeadIn,
      passage: '',
      annotation: '',
      task: withoutLeadIn
    };
  }

  function renderDisplayPrompt(prompt, variant) {
    if (!prompt || !prompt.fullText) return '';
    if (prompt.type !== 'passage') {
      return `<div class="${variant}-prompt-card ${variant}-prompt-card-plain"><div class="question-text">${escapeHtml(prompt.task || prompt.fullText)}</div></div>`;
    }
    return `
      <div class="${variant}-prompt-card ${variant}-prompt-card-passage">
        <div class="prompt-passage">
          <span>Passage</span>
          <p>${escapeHtml(prompt.passage)}</p>
        </div>
        ${prompt.annotation ? `
          <p class="prompt-annotation">${escapeHtml(prompt.annotation)}</p>
        ` : ''}
        <div class="prompt-task">
          <span>Question</span>
          <strong>${escapeHtml(prompt.task)}</strong>
        </div>
      </div>
    `;
  }

  function renderVisualPassagePrompt(prompt) {
    return `
      <div class="visual-prompt-card visual-prompt-card-passage">
        <div class="prompt-passage">
          <span>Passage</span>
          <p>${escapeHtml(prompt.passage)}</p>
        </div>
        ${prompt.annotation ? `
          <p class="prompt-annotation">${escapeHtml(prompt.annotation)}</p>
        ` : ''}
        ${prompt.task ? `
          <div class="prompt-task">
            <span>Question</span>
            <strong>${escapeHtml(prompt.task)}</strong>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderVisualPlainPrompt(prompt) {
    const text = prompt && (prompt.task || prompt.fullText);
    if (!text) return '';
    return `
      <div class="visual-prompt-card visual-prompt-card-plain">
        <div class="prompt-task">
          <span>Question</span>
          <strong>${escapeHtml(text)}</strong>
        </div>
      </div>
    `;
  }

  function normalizePromptText(value) {
    return String(value == null ? '' : value)
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .trim();
  }

  function stripPromptLeadIns(value) {
    let text = normalizePromptText(value);
    const leadIns = [
      /^Grade\s+\d+\s+(Easy|Medium|Hard):\s*/i,
      /^Choose the best answer\.\s*/i,
      /^Use the context to choose the best answer\.\s*/i,
      /^Analyze the details and choose the strongest answer\.\s*/i
    ];
    let changed = true;
    while (changed) {
      changed = false;
      leadIns.forEach(pattern => {
        if (!pattern.test(text)) return;
        text = text.replace(pattern, '').trim();
        changed = true;
      });
    }
    return text;
  }

  function isPassageAnnotation(value) {
    return /^(These details show|The details show|This shows|Together, these details show|Because the passage|Readers can see|The author (presents|adds|includes))\b/i.test(String(value || '').trim());
  }

  function getIntegratedSceneDialogue(dialogue, promptText, guidanceText) {
    const baseDialogue = Array.isArray(dialogue) ? dialogue.slice(0, 2) : [];
    const fallbackCharacters = ['dex-decoder', 'piper-prism'];
    return [0, 1].map(index => {
      const source = baseDialogue[index] || {};
      const isQuestion = index === 0;
      return Object.assign({}, source, {
        characterId: source.characterId || fallbackCharacters[index],
        emotion: source.emotion || (isQuestion ? 'curious' : 'coaching'),
        label: isQuestion ? 'asks' : 'shares a clue',
        text: isQuestion ? promptText : guidanceText
      });
    });
  }

  function scrubAnswerChoiceText(value, question) {
    let text = String(value == null ? '' : value);
    const choices = question && Array.isArray(question.choices) ? question.choices : [];
    choices.forEach(choice => {
      const choiceText = cleanComparableText(choice);
      if (choiceText.length < 12) return;
      text = text.replace(new RegExp(escapeRegExp(choiceText), 'gi'), 'one answer choice');
    });
    return text;
  }

  function cleanComparableText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function getSceneNameSubstitutions(dialogue, slotOffset) {
    const catalog = window.GrammarQuestCharacters;
    if (!catalog || !Array.isArray(dialogue)) return [];
    return dialogue.map((entry, index) => {
      const original = entry && entry.characterId && typeof catalog.getCharacterById === 'function'
        ? catalog.getCharacterById(entry.characterId)
        : null;
      const resolved = getSceneCharacter(entry && entry.characterId, (slotOffset || 0) + index);
      const replacement = resolved && typeof catalog.getCharacterDisplayName === 'function'
        ? catalog.getCharacterDisplayName(resolved.character)
        : (resolved ? resolved.character.name : '');
      if (!original || !original.character || !replacement) return null;
      return {
        full: original.character.name,
        first: original.character.name.split(/\s+/)[0],
        replacement
      };
    }).filter(Boolean);
  }

  function applySceneNameSubstitutions(value, substitutions) {
    let text = String(value == null ? '' : value);
    substitutions.forEach(item => {
      if (!item || !item.replacement) return;
      [item.full, item.first].filter(Boolean).forEach(name => {
        if (name === item.replacement) return;
        text = text.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g'), item.replacement);
      });
    });
    return text;
  }

  function renderSceneSetPiece(scene, question) {
    const setting = scene && scene.setting ? String(scene.setting) : 'classroom';
    const questionSvg = getQuestionSetPieceSvg(question, scene);
    return `
      <div class="visual-set-piece visual-set-piece-${escapeHtml(setting)}" aria-hidden="true">
        ${questionSvg || getSceneSetPieceSvg(setting)}
      </div>
    `;
  }

  function getQuestionSetPieceSvg(question, scene) {
    const prompt = stripPromptLeadIns(question && question.question ? question.question : '');
    const choices = question && Array.isArray(question.choices) ? question.choices : [];
    const contextMeaning = getContextMeaningDetails(prompt);
    if (contextMeaning && choices.length) {
      return getMeaningChoiceSvg(contextMeaning, choices, question.correct);
    }
    const wordPart = getWordPartDetails(prompt);
    if (wordPart) {
      return getWordPartSvg(wordPart, choices, question && question.correct);
    }
    const skills = question && question.metadata && Array.isArray(question.metadata.skills)
      ? question.metadata.skills.join(' ').toLowerCase()
      : '';
    if (/punctuation|comma|apostrophe|quotation|period|colon/.test(skills)) {
      return getMechanicsSvg(prompt, 'Mark the exact punctuation clue.');
    }
    if (/capital|proper/.test(skills)) {
      return getMechanicsSvg(prompt, 'Find the word that names something specific.');
    }
    if (/sentence|noun|verb|adjective|adverb|pronoun|tense|subject|predicate/.test(skills)) {
      return getMechanicsSvg(prompt, 'Test the word job inside the sentence.');
    }
    if (/reading|inference|theme|evidence|main idea|detail/.test(skills)) {
      return getEvidenceSvg(prompt);
    }
    return '';
  }

  function getContextMeaningDetails(prompt) {
    const quoted = String(prompt || '').match(/["']([^"']+)["']/);
    const target = String(prompt || '').match(/\bwhat does\s+["']?([A-Za-z'-]+)["']?\s+(?:mean|most nearly mean)\b/i);
    if (!quoted || !target) return null;
    return {
      sentence: quoted[1].trim(),
      word: target[1].trim(),
      clues: getSalientContextWords(quoted[1], target[1])
    };
  }

  function getWordPartDetails(prompt) {
    const text = String(prompt || '');
    const rootMatch = text.match(/\broot\s+([A-Za-z'-]+)\s+means\s+([^.?!]+)[.?!]/i);
    if (rootMatch) {
      return { kind: 'root', part: rootMatch[1], meaning: rootMatch[2].trim(), prompt: text };
    }
    const partMatch = text.match(/\b(prefix|suffix)\s+(-?[A-Za-z]+-?)\s+(?:mean|means)\s+([^.?!]+)[.?!]/i);
    if (partMatch) {
      return { kind: partMatch[1].toLowerCase(), part: partMatch[2], meaning: partMatch[3].trim(), prompt: text };
    }
    const asksPart = text.match(/\bwhat does the\s+(prefix|suffix|root)\s+(-?[A-Za-z]+-?)\s+mean\b/i);
    if (asksPart) {
      return { kind: asksPart[1].toLowerCase(), part: asksPart[2], meaning: 'meaning clue', prompt: text };
    }
    return null;
  }

  function getMeaningChoiceSvg(details, choices, correctIndex) {
    const sentenceParts = splitSentenceAroundWord(details.sentence, details.word);
    const clueText = details.clues.length
      ? `Context clue: ${details.clues.join(' + ')}`
      : 'Context clue: quoted sentence';
    const cards = choices.slice(0, 4).map((choice, index) => {
      const x = index % 2 === 0 ? 58 : 392;
      const y = index < 2 ? 118 : 188;
      const selected = index === correctIndex;
      return `
        <g>
          <rect x="${x}" y="${y}" width="292" height="52" rx="14" fill="${selected ? '#dcfce7' : '#ffffff'}" stroke="${selected ? '#16a34a' : '#cbd5e1'}" stroke-width="${selected ? '5' : '3'}" />
          ${getChoiceIconSvg(choice, x + 28, y + 26, selected)}
          <text x="${x + 62}" y="${y + 33}" fill="#1f2937" font-size="17" font-weight="900">${escapeSvgText(shortenSvgText(choice, 25))}</text>
        </g>
      `;
    }).join('');
    return `
      <svg viewBox="0 0 760 260" role="presentation">
        <rect x="34" y="28" width="692" height="72" rx="18" fill="#eff6ff" stroke="#60a5fa" stroke-width="4" />
        <text x="58" y="58" fill="#1e3a8a" font-size="17" font-weight="900">Use the sentence context</text>
        <text x="58" y="84" fill="#111827" font-size="20" font-weight="900">
          ${sentenceParts.before ? `<tspan>${escapeSvgText(shortenSvgText(sentenceParts.before, 18))} </tspan>` : ''}
          <tspan fill="#2563eb">${escapeSvgText(details.word)}</tspan>
          ${sentenceParts.after ? `<tspan> ${escapeSvgText(shortenSvgText(sentenceParts.after, 28))}</tspan>` : ''}
        </text>
        <rect x="458" y="45" width="226" height="36" rx="18" fill="#fef3c7" stroke="#f59e0b" stroke-width="3" />
        <text x="571" y="69" text-anchor="middle" fill="#92400e" font-size="16" font-weight="900">${escapeSvgText(shortenSvgText(clueText, 28))}</text>
        ${cards}
      </svg>
    `;
  }

  function getChoiceIconSvg(choice, cx, cy, selected) {
    const text = String(choice || '').toLowerCase();
    const stroke = selected ? '#15803d' : '#475569';
    if (/flying mammal|animal|bat\b/.test(text) && !/baseball|stick/.test(text)) {
      return `
        <path d="M${cx - 24} ${cy - 2} C${cx - 15} ${cy - 24} ${cx - 5} ${cy - 8} ${cx} ${cy - 17} C${cx + 5} ${cy - 8} ${cx + 15} ${cy - 24} ${cx + 24} ${cy - 2} C${cx + 12} ${cy - 8} ${cx + 8} ${cy + 11} ${cx} ${cy + 4} C${cx - 8} ${cy + 11} ${cx - 12} ${cy - 8} ${cx - 24} ${cy - 2} Z" fill="#334155" />
        <circle cx="${cx}" cy="${cy - 5}" r="7" fill="#111827" />
      `;
    }
    if (/baseball|stick|cricket|club/.test(text)) {
      return `
        <path d="M${cx - 18} ${cy + 15} L${cx + 19} ${cy - 20}" stroke="${stroke}" stroke-width="10" stroke-linecap="round" />
        <path d="M${cx + 10} ${cy - 28} L${cx + 28} ${cy - 10}" stroke="#f59e0b" stroke-width="9" stroke-linecap="round" />
      `;
    }
    if (/hit|strike|swing/.test(text)) {
      return `
        <circle cx="${cx - 8}" cy="${cy + 6}" r="9" fill="#f8fafc" stroke="${stroke}" stroke-width="3" />
        <path d="M${cx + 2} ${cy + 6} L${cx + 24} ${cy - 12}" stroke="${stroke}" stroke-width="8" stroke-linecap="round" />
        <path d="M${cx - 24} ${cy - 9} H${cx - 9}" stroke="#ef4444" stroke-width="5" stroke-linecap="round" />
      `;
    }
    if (/paper|fold/.test(text)) {
      return `
        <path d="M${cx - 19} ${cy + 18} L${cx + 20} ${cy - 18} L${cx + 13} ${cy + 17} Z" fill="#e0f2fe" stroke="${stroke}" stroke-width="3" />
        <path d="M${cx + 20} ${cy - 18} L${cx - 2} ${cy + 3}" stroke="${stroke}" stroke-width="3" />
      `;
    }
    return `
      <circle cx="${cx}" cy="${cy}" r="20" fill="#eef2ff" stroke="${stroke}" stroke-width="3" />
      <text x="${cx}" y="${cy + 7}" text-anchor="middle" fill="${stroke}" font-size="22" font-weight="900">?</text>
    `;
  }

  function getWordPartSvg(details, choices, correctIndex) {
    const correct = Array.isArray(choices) && choices[correctIndex] ? choices[correctIndex] : details.meaning;
    return `
      <svg viewBox="0 0 760 260" role="presentation">
        <rect x="46" y="42" width="668" height="176" rx="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="4" />
        <text x="80" y="78" fill="#334155" font-size="18" font-weight="900">${escapeSvgText(titleCase(details.kind))} clue</text>
        <rect x="82" y="102" width="158" height="72" rx="16" fill="#dbeafe" stroke="#2563eb" stroke-width="5" />
        <text x="161" y="146" text-anchor="middle" fill="#1e3a8a" font-size="29" font-weight="900">${escapeSvgText(shortenSvgText(details.part, 12))}</text>
        <text x="290" y="148" text-anchor="middle" fill="#64748b" font-size="38" font-weight="900">means</text>
        <rect x="356" y="102" width="210" height="72" rx="16" fill="#fef3c7" stroke="#f59e0b" stroke-width="5" />
        <text x="461" y="146" text-anchor="middle" fill="#92400e" font-size="24" font-weight="900">${escapeSvgText(shortenSvgText(details.meaning, 18))}</text>
        <path d="M583 138 H640" stroke="#16a34a" stroke-width="8" stroke-linecap="round" />
        <path d="M620 116 L644 138 L620 160" fill="none" stroke="#16a34a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
        <text x="644" y="204" text-anchor="end" fill="#166534" font-size="19" font-weight="900">Answer must match: ${escapeSvgText(shortenSvgText(correct, 24))}</text>
      </svg>
    `;
  }

  function getMechanicsSvg(prompt, clue) {
    const display = stripPromptLeadIns(prompt).replace(/\s+/g, ' ');
    return `
      <svg viewBox="0 0 760 260" role="presentation">
        <rect x="58" y="46" width="644" height="154" rx="18" fill="#ffffff" stroke="#cbd5e1" stroke-width="4" />
        <path d="M96 92 H664 M96 132 H664 M96 172 H520" stroke="#e2e8f0" stroke-width="7" stroke-linecap="round" />
        <rect x="86" y="64" width="236" height="36" rx="18" fill="#dcfce7" stroke="#16a34a" stroke-width="3" />
        <text x="204" y="88" text-anchor="middle" fill="#166534" font-size="16" font-weight="900">${escapeSvgText(shortenSvgText(clue, 29))}</text>
        <text x="96" y="130" fill="#111827" font-size="20" font-weight="900">${escapeSvgText(shortenSvgText(display, 56))}</text>
        <circle cx="628" cy="166" r="28" fill="#fef3c7" stroke="#f59e0b" stroke-width="4" />
        <text x="628" y="176" text-anchor="middle" fill="#92400e" font-size="34" font-weight="900">?</text>
      </svg>
    `;
  }

  function getEvidenceSvg(prompt) {
    const display = stripPromptLeadIns(prompt).replace(/\s+/g, ' ');
    return `
      <svg viewBox="0 0 760 260" role="presentation">
        <rect x="70" y="38" width="394" height="182" rx="16" fill="#fffbeb" stroke="#ca8a04" stroke-width="4" />
        <path d="M108 82 H425 M108 118 H402 M108 154 H430" stroke="#f59e0b" stroke-width="7" stroke-linecap="round" opacity="0.45" />
        <rect x="116" y="102" width="248" height="31" rx="15" fill="#bfdbfe" opacity="0.9" />
        <text x="108" y="191" fill="#111827" font-size="17" font-weight="900">${escapeSvgText(shortenSvgText(display, 42))}</text>
        <circle cx="594" cy="126" r="56" fill="none" stroke="#2563eb" stroke-width="12" />
        <path d="M633 165 L676 208" stroke="#2563eb" stroke-width="14" stroke-linecap="round" />
      </svg>
    `;
  }

  function splitSentenceAroundWord(sentence, word) {
    const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    const match = String(sentence || '').match(pattern);
    if (!match) return { before: '', after: String(sentence || '') };
    const start = match.index;
    const end = start + match[0].length;
    return {
      before: sentence.slice(0, start).trim(),
      after: sentence.slice(end).trim()
    };
  }

  function shortenSvgText(value, maxLength) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return text.slice(0, Math.max(0, maxLength - 3)).replace(/\s+\S*$/, '') + '...';
  }

  function escapeSvgText(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
  }

  function getSceneSetPieceSvg(setting) {
    const pieces = {
      library: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="38" y="46" width="210" height="124" rx="14" fill="#bfdbfe" opacity="0.8" />
          <rect x="56" y="65" width="174" height="13" rx="5" fill="#2563eb" opacity="0.42" />
          <rect x="56" y="95" width="174" height="13" rx="5" fill="#14b8a6" opacity="0.42" />
          <rect x="56" y="125" width="174" height="13" rx="5" fill="#f97316" opacity="0.42" />
          <rect x="548" y="90" width="116" height="94" rx="12" fill="#fef3c7" stroke="#92400e" stroke-width="5" />
          <path d="M568 112 H644" stroke="#92400e" stroke-width="6" stroke-linecap="round" />
          <text x="606" y="150" text-anchor="middle" fill="#92400e" font-size="20" font-weight="800">RETURN</text>
        </svg>
      `,
      storm: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="70" y="35" width="220" height="154" rx="16" fill="#dbeafe" stroke="#60a5fa" stroke-width="6" />
          <path d="M180 37 V189 M72 112 H288" stroke="#60a5fa" stroke-width="5" opacity="0.8" />
          <path d="M118 70 L104 98 M154 142 L140 171 M234 78 L220 106" stroke="#2563eb" stroke-width="6" stroke-linecap="round" opacity="0.55" />
          <path d="M505 53 C540 23 600 37 611 82 C653 84 674 119 655 152 C624 204 516 174 493 145 C465 111 472 79 505 53 Z" fill="#94a3b8" opacity="0.36" />
          <path d="M548 91 L520 134 H553 L529 184 L601 112 H561 L585 91 Z" fill="#facc15" opacity="0.78" />
        </svg>
      `,
      bus: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="55" y="88" width="236" height="92" rx="18" fill="#facc15" stroke="#ca8a04" stroke-width="6" />
          <rect x="79" y="105" width="58" height="34" rx="7" fill="#dbeafe" />
          <rect x="149" y="105" width="58" height="34" rx="7" fill="#dbeafe" />
          <circle cx="110" cy="184" r="18" fill="#111827" />
          <circle cx="233" cy="184" r="18" fill="#111827" />
          <rect x="548" y="48" width="94" height="106" rx="10" fill="#2563eb" />
          <text x="595" y="84" text-anchor="middle" fill="#ffffff" font-size="19" font-weight="900">BUS</text>
          <text x="595" y="116" text-anchor="middle" fill="#bfdbfe" font-size="16" font-weight="800">LATE?</text>
          <path d="M595 154 V218" stroke="#475569" stroke-width="8" stroke-linecap="round" />
        </svg>
      `,
      notebook: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="65" y="42" width="210" height="158" rx="16" fill="#fef3c7" stroke="#92400e" stroke-width="5" />
          <path d="M109 42 V200" stroke="#92400e" stroke-width="5" opacity="0.7" />
          <path d="M132 82 H238 M132 114 H220 M132 146 H248" stroke="#2563eb" stroke-width="6" stroke-linecap="round" opacity="0.48" />
          <circle cx="95" cy="78" r="5" fill="#92400e" />
          <circle cx="95" cy="122" r="5" fill="#92400e" />
          <circle cx="95" cy="166" r="5" fill="#92400e" />
          <rect x="514" y="70" width="150" height="100" rx="12" fill="#ede9fe" stroke="#7c3aed" stroke-width="5" />
          <text x="589" y="130" text-anchor="middle" fill="#4c1d95" font-size="54" font-weight="900">?</text>
        </svg>
      `,
      classroom: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="50" y="55" width="130" height="155" rx="8" fill="#bfdbfe" stroke="#2563eb" stroke-width="5" />
          <path d="M178 60 L248 38 V205 L178 210 Z" fill="#fed7aa" stroke="#c2410c" stroke-width="5" />
          <circle cx="225" cy="124" r="7" fill="#92400e" />
          <rect x="480" y="132" width="196" height="50" rx="10" fill="#fef3c7" stroke="#92400e" stroke-width="5" />
          <path d="M506 116 H650 M528 96 H627" stroke="#2563eb" stroke-width="11" stroke-linecap="round" />
          <path d="M505 181 L490 220 M650 181 L665 220" stroke="#92400e" stroke-width="7" stroke-linecap="round" />
        </svg>
      `,
      science: `
        <svg viewBox="0 0 760 260" role="presentation">
          <path d="M62 48 H256 V196 H62 Z" fill="#e0f2fe" stroke="#0e7490" stroke-width="5" />
          <path d="M62 48 L106 74 V222 L62 196 Z M256 48 L212 74 V222 L256 196 Z" fill="#bae6fd" stroke="#0e7490" stroke-width="5" />
          <text x="159" y="103" text-anchor="middle" fill="#155e75" font-size="21" font-weight="900">SCIENCE</text>
          <circle cx="132" cy="143" r="16" fill="#22c55e" opacity="0.72" />
          <path d="M536 68 H622 L650 174 H508 Z" fill="#fef3c7" stroke="#ca8a04" stroke-width="5" />
          <path d="M554 95 H608 M546 126 H620" stroke="#ca8a04" stroke-width="6" stroke-linecap="round" />
        </svg>
      `,
      hallway: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="52" y="42" width="210" height="164" rx="8" fill="#dbeafe" stroke="#2563eb" stroke-width="5" />
          <path d="M122 42 V206 M192 42 V206 M72 82 H242 M72 122 H242 M72 162 H242" stroke="#2563eb" stroke-width="5" opacity="0.62" />
          <rect x="516" y="54" width="128" height="158" rx="8" fill="#f8fafc" stroke="#64748b" stroke-width="5" />
          <text x="580" y="126" text-anchor="middle" fill="#334155" font-size="20" font-weight="900">OFFICE</text>
          <path d="M543 157 H618 M595 135 L622 157 L595 179" stroke="#16a34a" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      `,
      trail: `
        <svg viewBox="0 0 760 260" role="presentation">
          <path d="M0 205 C155 125 232 246 364 158 C476 82 590 140 760 78 V260 H0 Z" fill="#bbf7d0" opacity="0.82" />
          <path d="M216 260 C261 211 301 190 355 169 C380 196 427 218 484 260 Z" fill="#92400e" opacity="0.55" />
          <path d="M114 78 L101 108 M156 116 L143 146 M592 69 L579 99 M631 107 L618 137" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" opacity="0.76" />
          <circle cx="535" cy="188" r="18" fill="#854d0e" opacity="0.5" />
          <circle cx="414" cy="212" r="13" fill="#854d0e" opacity="0.5" />
        </svg>
      `,
      desk: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="63" y="100" width="230" height="82" rx="12" fill="#fef3c7" stroke="#92400e" stroke-width="5" />
          <path d="M93 182 L78 223 M263 182 L278 223" stroke="#92400e" stroke-width="8" stroke-linecap="round" />
          <path d="M126 78 L208 78" stroke="#facc15" stroke-width="12" stroke-linecap="round" />
          <path d="M166 58 L231 100" stroke="#ef4444" stroke-width="10" stroke-linecap="round" />
          <rect x="526" y="76" width="104" height="112" rx="12" fill="#dcfce7" stroke="#16a34a" stroke-width="5" />
          <text x="578" y="133" text-anchor="middle" fill="#166534" font-size="20" font-weight="900">PLACE</text>
        </svg>
      `,
      gym: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="62" y="58" width="168" height="128" rx="12" fill="#ffedd5" stroke="#ea580c" stroke-width="5" />
          <text x="146" y="103" text-anchor="middle" fill="#9a3412" font-size="22" font-weight="900">PRACTICE</text>
          <path d="M95 129 H198 M95 157 H178" stroke="#ea580c" stroke-width="7" stroke-linecap="round" opacity="0.66" />
          <rect x="538" y="45" width="120" height="164" rx="8" fill="#bfdbfe" stroke="#2563eb" stroke-width="5" />
          <path d="M656 49 L704 35 V203 L656 209 Z" fill="#fef3c7" stroke="#ca8a04" stroke-width="5" />
        </svg>
      `,
      badge: `
        <svg viewBox="0 0 760 260" role="presentation">
          <circle cx="157" cy="128" r="78" fill="#fef3c7" stroke="#f59e0b" stroke-width="7" />
          <path d="M157 72 L174 111 L216 116 L184 143 L193 185 L157 163 L121 185 L130 143 L98 116 L140 111 Z" fill="#facc15" stroke="#ca8a04" stroke-width="5" />
          <rect x="490" y="69" width="178" height="112" rx="14" fill="#ede9fe" stroke="#7c3aed" stroke-width="5" />
          <text x="579" y="122" text-anchor="middle" fill="#4c1d95" font-size="24" font-weight="900">READER</text>
        </svg>
      `,
      mascot: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="74" y="52" width="210" height="146" rx="14" fill="#dbeafe" stroke="#2563eb" stroke-width="5" />
          <text x="179" y="93" text-anchor="middle" fill="#1e40af" font-size="22" font-weight="900">VOTE</text>
          <path d="M113 129 H242 M113 160 H221" stroke="#2563eb" stroke-width="7" stroke-linecap="round" opacity="0.58" />
          <rect x="535" y="84" width="96" height="96" rx="48" fill="#fed7aa" stroke="#c2410c" stroke-width="5" />
          <path d="M559 139 Q584 164 609 139" fill="none" stroke="#7c2d12" stroke-width="6" stroke-linecap="round" />
        </svg>
      `,
      bell: `
        <svg viewBox="0 0 760 260" role="presentation">
          <path d="M116 100 C116 62 148 38 180 38 C212 38 244 62 244 100 V150 L268 184 H92 L116 150 Z" fill="#facc15" stroke="#ca8a04" stroke-width="6" />
          <circle cx="180" cy="193" r="16" fill="#ca8a04" />
          <path d="M90 67 C61 43 54 111 82 95 M270 67 C299 43 306 111 278 95" fill="none" stroke="#f59e0b" stroke-width="8" stroke-linecap="round" />
          <rect x="494" y="61" width="178" height="125" rx="12" fill="#f1f5f9" stroke="#64748b" stroke-width="5" />
          <text x="583" y="124" text-anchor="middle" fill="#334155" font-size="24" font-weight="900">RING?</text>
        </svg>
      `,
      office: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="64" y="46" width="148" height="166" rx="8" fill="#bfdbfe" stroke="#2563eb" stroke-width="5" />
          <path d="M212 50 L279 35 V205 L212 212 Z" fill="#fed7aa" stroke="#c2410c" stroke-width="5" />
          <circle cx="255" cy="124" r="7" fill="#92400e" />
          <rect x="511" y="68" width="160" height="88" rx="12" fill="#fef3c7" stroke="#92400e" stroke-width="5" />
          <text x="591" y="121" text-anchor="middle" fill="#92400e" font-size="21" font-weight="900">FRONT OFFICE</text>
        </svg>
      `,
      branch: `
        <svg viewBox="0 0 760 260" role="presentation">
          <path d="M147 225 V73" stroke="#854d0e" stroke-width="22" stroke-linecap="round" />
          <circle cx="111" cy="75" r="48" fill="#22c55e" opacity="0.68" />
          <circle cx="174" cy="61" r="54" fill="#16a34a" opacity="0.68" />
          <circle cx="209" cy="106" r="44" fill="#22c55e" opacity="0.68" />
          <path d="M448 76 C513 88 559 118 613 151" stroke="#854d0e" stroke-width="16" stroke-linecap="round" />
          <path d="M545 119 L585 96 M562 132 L616 128" stroke="#854d0e" stroke-width="9" stroke-linecap="round" />
          <path d="M447 102 L429 134 M505 132 L486 164" stroke="#ef4444" stroke-width="6" stroke-linecap="round" opacity="0.72" />
        </svg>
      `,
      museum: `
        <svg viewBox="0 0 760 260" role="presentation">
          <path d="M76 88 L188 38 L300 88 Z" fill="#e2e8f0" stroke="#64748b" stroke-width="5" />
          <rect x="93" y="88" width="194" height="108" fill="#f8fafc" stroke="#64748b" stroke-width="5" />
          <path d="M124 97 V190 M172 97 V190 M220 97 V190 M268 97 V190" stroke="#94a3b8" stroke-width="10" />
          <rect x="516" y="73" width="136" height="91" rx="12" fill="#dcfce7" stroke="#16a34a" stroke-width="5" />
          <text x="584" y="125" text-anchor="middle" fill="#166534" font-size="22" font-weight="900">OPEN 12</text>
        </svg>
      `,
      postcard: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="62" y="52" width="252" height="152" rx="12" fill="#fffbeb" stroke="#ca8a04" stroke-width="5" />
          <path d="M83 166 C121 111 150 145 182 105 C214 63 256 103 293 65 V204 H83 Z" fill="#f97316" opacity="0.32" />
          <path d="M84 173 C126 136 157 156 194 118 C227 84 253 108 294 80" fill="none" stroke="#c2410c" stroke-width="6" stroke-linecap="round" />
          <rect x="530" y="70" width="102" height="72" fill="#dbeafe" stroke="#2563eb" stroke-width="5" />
          <path d="M546 125 L619 85" stroke="#2563eb" stroke-width="5" />
        </svg>
      `,
      street: `
        <svg viewBox="0 0 760 260" role="presentation">
          <path d="M0 182 H760 V260 H0 Z" fill="#94a3b8" opacity="0.62" />
          <path d="M82 202 H180 M240 202 H338 M398 202 H496 M556 202 H654" stroke="#ffffff" stroke-width="11" stroke-linecap="round" opacity="0.88" />
          <rect x="484" y="98" width="154" height="62" rx="18" fill="#ef4444" stroke="#991b1b" stroke-width="5" />
          <path d="M519 98 L543 68 H591 L617 98 Z" fill="#fecaca" stroke="#991b1b" stroke-width="5" />
          <circle cx="519" cy="164" r="16" fill="#111827" />
          <circle cx="608" cy="164" r="16" fill="#111827" />
        </svg>
      `,
      shop: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="62" y="58" width="202" height="130" rx="12" fill="#dcfce7" stroke="#16a34a" stroke-width="5" />
          <text x="163" y="101" text-anchor="middle" fill="#166534" font-size="22" font-weight="900">SCHOOL STORE</text>
          <text x="163" y="145" text-anchor="middle" fill="#166534" font-size="34" font-weight="900">50c</text>
          <circle cx="546" cy="116" r="36" fill="#facc15" stroke="#ca8a04" stroke-width="5" />
          <circle cx="606" cy="146" r="28" fill="#fde68a" stroke="#ca8a04" stroke-width="5" />
        </svg>
      `,
      studio: `
        <svg viewBox="0 0 760 260" role="presentation">
          <rect x="58" y="50" width="128" height="160" rx="8" fill="#bfdbfe" stroke="#2563eb" stroke-width="5" />
          <path d="M185 54 L258 35 V205 L185 210 Z" fill="#fed7aa" stroke="#c2410c" stroke-width="5" />
          <circle cx="235" cy="124" r="7" fill="#92400e" />
          <circle cx="583" cy="129" r="58" fill="#e2e8f0" stroke="#64748b" stroke-width="6" />
          <path d="M583 129 L623 95" stroke="#16a34a" stroke-width="9" stroke-linecap="round" />
          <path d="M527 130 H484 M639 130 H682 M584 73 V42 M584 187 V218" stroke="#94a3b8" stroke-width="7" stroke-linecap="round" />
        </svg>
      `,
      lab: `
        <svg viewBox="0 0 760 260" role="presentation">
          <path d="M134 47 H202 M168 47 V113 L107 202 H229 L168 113" fill="#bae6fd" stroke="#0e7490" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M128 166 H208 L229 202 H107 Z" fill="#22c55e" opacity="0.66" />
          <path d="M515 129 C545 101 585 106 608 134 C631 162 579 190 526 173 C491 161 488 147 515 129 Z" fill="#38bdf8" opacity="0.5" />
          <text x="568" y="155" text-anchor="middle" fill="#075985" font-size="42" font-weight="900">!</text>
        </svg>
      `,
      map: `
        <svg viewBox="0 0 760 260" role="presentation">
          <path d="M65 62 L190 37 L316 62 V199 L190 174 L65 199 Z" fill="#fef3c7" stroke="#92400e" stroke-width="5" />
          <path d="M190 39 V174 M109 96 H278 M92 153 H247" stroke="#ca8a04" stroke-width="5" opacity="0.5" />
          <rect x="133" y="104" width="38" height="34" fill="#2563eb" opacity="0.7" />
          <rect x="236" y="81" width="44" height="36" fill="#16a34a" opacity="0.7" />
          <path d="M536 163 V112 H609 V163 M523 113 L572 75 L622 113" fill="#fed7aa" stroke="#c2410c" stroke-width="5" stroke-linejoin="round" />
          <rect x="557" y="131" width="30" height="32" fill="#92400e" />
        </svg>
      `
    };
    return pieces[setting] || pieces.classroom;
  }

  function renderDialogueActor(entry, index, localizeText, slotOffset) {
    const resolved = getSceneCharacter(entry && entry.characterId, (slotOffset || 0) + index);
    const catalog = window.GrammarQuestCharacters;
    const name = resolved && catalog && typeof catalog.getCharacterDisplayName === 'function'
      ? catalog.getCharacterDisplayName(resolved.character)
      : (resolved ? resolved.character.name : 'Guide');
    const art = resolved
      ? window.GrammarQuestCharacters.renderCharacter(resolved.character, resolved.set, entry.emotion || 'curious')
      : '';
    const petArt = resolved && resolved.character.pet && catalog && typeof catalog.renderPet === 'function'
      ? catalog.renderPet(resolved.character.pet, entry.emotion || 'curious')
      : '';
    const petName = resolved && resolved.character.pet && catalog && typeof catalog.getPetDisplayName === 'function'
      ? catalog.getPetDisplayName(resolved.character.pet)
      : (resolved && resolved.character.pet ? resolved.character.pet.name : '');
    return `
      <div class="visual-actor visual-actor-${index + 1}">
        <div class="visual-actor-art">
          ${art}
          ${petArt ? `<div class="visual-pet-badge"><span>${escapeHtml(petName)}</span>${petArt}</div>` : ''}
        </div>
        <div class="visual-speech-bubble">
          <span>${escapeHtml(entry && entry.label ? `${name} ${entry.label}` : name)}</span>
          <p>${escapeHtml(localizeText ? localizeText(entry && entry.text ? entry.text : '') : (entry && entry.text ? entry.text : ''))}</p>
        </div>
      </div>
    `;
  }

  function getSceneCharacter(characterId, slot) {
    const catalog = window.GrammarQuestCharacters;
    if (!catalog) return null;
    if (typeof catalog.getCharacterForSlot === 'function') {
      return catalog.getCharacterForSlot(slot || 0, characterId);
    }
    if (typeof catalog.getCharacterById !== 'function') return null;
    return catalog.getCharacterById(characterId);
  }

  function scrollQuizIntoView() {
    if (!quizContainer) return;
    const header = document.querySelector('.app-header');
    const offset = (header ? header.offsetHeight : 0) + 16;
    const top = quizContainer.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }

  function renderResults() {
    endAssessmentGuard();
    const percentage = Math.round((score / currentQuestions.length) * 100);
    const parentMode = isParentMode();
    const displayedAttempts = reviewMode ? reviewAttemptRecords : attemptRecords;
    const reward = parentMode
      ? { gemsEarned: 0, message: 'Preview complete. No student progress was changed.', progress: loadProgress() }
    : reviewMode
      ? saveReviewOutcome(reviewAttemptRecords)
      : saveQuestResult(percentage, score, currentQuestions.length, attemptRecords);
    const progress = reward.progress;
    const rank = getRank(progress.totalGems);
    const badgeHtml = progress.badges.length
      ? `<div class="badge-row">${progress.badges.map(badge => `<span>${escapeHtml(badge)}</span>`).join('')}</div>`
      : '';
    const confidenceReport = renderConfidenceReport(displayedAttempts);
    const subtopicReport = renderSubtopicReport(displayedAttempts);
    let message = '';
    if (percentage >= 90) {
      message = 'Outstanding work! You have mastered this skill!';
    } else if (percentage >= 75) {
      message = 'Great job! You are on your way to mastering this skill.';
    } else if (percentage >= 60) {
      message = 'Good effort! Review the study aids and try again to improve your score.';
    } else {
      message = 'Keep practicing! Use the study aids to learn more, then try the quiz again.';
    }

    quizContainer.innerHTML = `
      <div class="results-box">
        <div class="quest-kicker">${parentMode ? 'Preview Complete' : reviewMode ? 'Review Complete' : 'Mission Complete'}</div>
        <div class="results-score">${score} / ${currentQuestions.length}</div>
        <div class="results-label">${percentage}% correct</div>
        <div class="results-message">${escapeHtml(message)}</div>
        <div class="learning-summary">
          <div>
            <strong>${missedQuestions.length}</strong>
            <span>questions marked for review</span>
          </div>
          <div>
            <strong>${hintsUsed}</strong>
            <span>strategy clues opened</span>
          </div>
          <div>
            <strong>${getCalibrationLabel()}</strong>
            <span>confidence check</span>
          </div>
        </div>
        ${confidenceReport}
        ${subtopicReport}
        ${parentMode ? '<div class="parent-preview-note">Parent preview is read-only. Reports, streaks, gems, and mastery were not updated.</div>' : `<div class="reward-panel" aria-label="Rewards earned">
          <div class="reward-main">${reviewMode ? 'Review practice logged' : `+${reward.gemsEarned} star gems`}</div>
          <div class="reward-grid">
            <div><strong>${progress.streakDays}</strong><span>day streak</span></div>
            <div><strong>${progress.totalGems}</strong><span>total gems</span></div>
            <div><strong>${escapeHtml(rank.name)}</strong><span>quest rank</span></div>
          </div>
          ${badgeHtml}
          <p>${escapeHtml(reward.message)}</p>
        </div>`}
        <div class="controls" style="justify-content:center;">
          ${!parentMode && !reviewMode && missedQuestions.length ? '<button class="btn btn-primary" id="review-missed-btn">Review Missed</button>' : ''}
          <button class="btn btn-primary" id="restart-btn">${parentMode ? 'Preview Again' : 'Try Again'}</button>
          <a href="./" class="btn btn-secondary">Back to Topic</a>
        </div>
      </div>
    `;

    const reviewBtn = document.getElementById('review-missed-btn');
    if (reviewBtn) {
      reviewBtn.addEventListener('click', () => {
        currentQuestions = shuffleArray([...missedQuestions]);
        currentIndex = 0;
        score = 0;
        combo = 0;
        answered = false;
        reviewMode = true;
        reviewAttemptRecords = [];
        questionStartedAt = 0;
        startAssessmentGuard('review round');
        renderQuestion();
      });
    }

    document.getElementById('restart-btn').addEventListener('click', () => {
      if (activeSet) {
        currentQuestions = selectCurrentQuestions();
        currentIndex = 0;
        score = 0;
        combo = 0;
        answered = false;
        missedQuestions = [];
        reviewMode = false;
        hintsUsed = 0;
        confidenceStats = [];
        attemptRecords = [];
        reviewAttemptRecords = [];
        sessionStartedAt = 0;
        questionStartedAt = 0;
        endAssessmentGuard();
        renderStartScreen(activeSet);
      } else {
        endAssessmentGuard();
        initQuiz(window.QUIZ_SET_ID);
      }
    });
  }

  function startAssessmentGuard(label) {
    if (!assessmentGuard || typeof assessmentGuard.start !== 'function') return;
    assessmentGuard.start({
      label: label || 'quiz',
      message: 'A quiz is still in progress. Leave this page and lose your current quiz answers?'
    });
  }

  function endAssessmentGuard() {
    if (!assessmentGuard || typeof assessmentGuard.end !== 'function') return;
    assessmentGuard.end();
  }

  function setSupportsLevelSelection(set) {
    return !!(set && set.metadata && set.metadata.gradesSupported && set.metadata.difficultiesSupported);
  }

  function selectQuestionsForLevel(questions, grade, difficulty) {
    return quizDomain.selectQuestionsForLevel(questions, grade, difficulty, getQuizDomainOptions());
  }

  function selectCurrentQuestions() {
    return quizDomain.selectCurrentQuestions(getQuizSelectionState(), getQuizDomainOptions());
  }

  function selectMixedQuestions(grade, difficulty) {
    return quizDomain.selectMixedQuestions(Object.assign(getQuizSelectionState(), {
      selectedGrade: grade,
      selectedDifficulty: difficulty
    }), getQuizDomainOptions());
  }

  function fillQuestionGroup(preferred, allQuestions, count) {
    return quizDomain.fillQuestionGroup(preferred, allQuestions, count, shuffleArray);
  }

  function questionSupportsGrade(question, grade) {
    return quizDomain.questionSupportsGrade(question, grade);
  }

  function getDifficultyDistance(question, grade, difficulty) {
    return quizDomain.getDifficultyDistance(question, grade, difficulty);
  }

  function getQuizSelectionState() {
    return {
      parentMode: isParentMode(),
      mixedQuizConfig,
      baseQuestions,
      selectedGrade,
      selectedDifficulty,
      selectedMixedSubtopicIds,
      selectedMixedQuestionLimit
    };
  }

  function getQuizDomainOptions() {
    return {
      targetQuestionCount,
      shuffle: shuffleArray
    };
  }

  function getSelectionSummary(questions, grade, difficulty) {
    if (mixedQuizConfig) {
      const limit = getSelectedMixedQuestionLimit();
      const servedCount = selectMixedQuestions(grade, difficulty).length;
      const activeCount = getActiveMixedSubtopics().length;
      return {
        exactCount: activeCount,
        servedCount,
        grade,
        difficulty,
        mixedSubtopicCount: activeCount,
        perSubtopic: limit
      };
    }
    const supported = questions.filter(q => questionSupportsGrade(q, grade));
    const exactCount = supported.filter(q => getDifficultyDistance(q, grade, difficulty) === 0).length;
    const servedCount = selectQuestionsForLevel(questions, grade, difficulty).length;
    return { exactCount, servedCount, grade, difficulty };
  }

  function renderSelectionSummary(summary) {
    if (summary.mixedSubtopicCount) {
      if (summary.perSubtopic === 'max') {
        return `
          <strong>${summary.servedCount}</strong> questions ready across ${summary.mixedSubtopicCount} subtopics.
          <span>Max mode includes every available question from the selected subtopics, randomized into one checkpoint.</span>
        `;
      }
      return `
        <strong>${summary.servedCount}</strong> questions ready across ${summary.mixedSubtopicCount} subtopics.
        <span>Includes ${summary.perSubtopic} questions from each subtopic, randomized for Grade ${escapeHtml(getDisplayGrade(summary.grade))} ${escapeHtml(capitalize(summary.difficulty))} practice.</span>
      `;
    }
    const adaptiveNote = summary.exactCount >= 15
      ? 'The question pool is tightly matched to this level.'
      : 'The quiz prioritizes this level, then adds nearby grade-ready practice to fill the mission.';
    return `
      <strong>${summary.servedCount}</strong> questions ready for Grade ${escapeHtml(getDisplayGrade(summary.grade))} ${escapeHtml(capitalize(summary.difficulty))}.
      <span>${escapeHtml(adaptiveNote)}</span>
    `;
  }

  function getSelectedExplanation(question, selectedIndex, isCorrect) {
    if (!question.explanation) return '';
    if (isCorrect) return question.explanation.correct || '';
    const wrongExplanation = question.explanation.incorrect && question.explanation.incorrect[selectedIndex]
      ? question.explanation.incorrect[selectedIndex]
      : '';
    const answer = question.choices && question.choices[question.correct]
      ? String(question.choices[question.correct]).trim()
      : '';
    const correctChoice = answer
      ? `Correct: ${answer}${/[.!?]$/.test(answer) ? '' : '.'}`
      : '';
    return [cleanExplanationText(wrongExplanation, question), correctChoice].filter(Boolean).join(' ');
  }

  function cleanExplanationText(value, question) {
    const text = normalizePromptText(value);
    if (!/Leaves a capitalization, punctuation, spelling, grammar, or meaning error\./i.test(text)) return text;
    const skills = question && question.metadata && Array.isArray(question.metadata.skills)
      ? question.metadata.skills.join(' ').toLowerCase()
      : '';
    const replacement = /context clues|vocabulary|inference/.test(skills)
      ? 'This choice does not match the context clues.'
      : /spelling|homophone|vowel|syllable/.test(skills)
        ? 'This choice does not use the correct spelling or word pattern.'
        : /capital/.test(skills)
          ? 'This choice does not follow the capitalization rule.'
          : /punctuation|comma|apostrophe|quotation|period|colon/.test(skills)
            ? 'This choice does not follow the punctuation rule.'
            : 'This choice does not match the rule or clue in the question.';
    return text.replace(/Leaves a capitalization, punctuation, spelling, grammar, or meaning error\./gi, replacement);
  }

  function getStrategyHint(question) {
    return `Clue to use: ${getQuestionStrategyClue(question)}`;
  }

  function getQuestionStrategyClue(question, scene) {
    const prompt = stripPromptLeadIns(question && question.question ? question.question : '');
    const skills = question && question.metadata && Array.isArray(question.metadata.skills)
      ? question.metadata.skills.join(' ').toLowerCase()
      : '';
    const studyExample = question && question.studyAid && question.studyAid.example
      ? normalizePromptText(question.studyAid.example)
      : '';
    const fallback = scene && scene.clue
      ? normalizePromptText(scene.clue)
      : '';

    const contextMeaning = getContextMeaningClue(prompt);
    if (contextMeaning) return contextMeaning;

    const wordPart = getWordPartClue(prompt);
    if (wordPart) return wordPart;

    const syllableClue = getSyllableStrategyClue(question, prompt);
    if (syllableClue) return syllableClue;

    if (/homophone/.test(skills)) {
      return 'Use the sentence meaning, not just the sound. Choose the word whose meaning fits the context.';
    }
    if (/synonym/.test(skills)) {
      return 'Find the choice with nearly the same meaning as the target word, then check it in the sentence.';
    }
    if (/antonym/.test(skills)) {
      return 'Find the choice with the opposite meaning of the target word, then check it in the sentence.';
    }
    if (/context|meaning/.test(skills)) {
      return 'Use the surrounding words as evidence. Pick the meaning that makes the whole sentence make sense.';
    }
    if (/root|prefix|suffix|morphology|word origins/.test(skills)) {
      return studyExample || 'Break the word into meaningful parts, then choose the answer that preserves those parts.';
    }

    return studyExample || fallback || 'Use the exact clue in the question, then eliminate choices that do not match it.';
  }

  const syllableDivisionMap = {
    computer: 'com-pu-ter',
    pencil: 'pen-cil',
    conversation: 'con-ver-sa-tion',
    rotate: 'ro-tate',
    huddle: 'hud-dle',
    rabbit: 'rab-bit',
    paper: 'pa-per',
    tiger: 'ti-ger',
    music: 'mu-sic',
    enormous: 'e-nor-mous',
    predicate: 'pred-i-cate',
    recycle: 're-cy-cle',
    playground: 'play-ground',
    summer: 'sum-mer',
    number: 'num-ber',
    holler: 'hol-ler',
    rainbow: 'rain-bow',
    lipstick: 'lip-stick',
    interested: 'in-ter-est-ed',
    alligator: 'al-li-ga-tor',
    earthquake: 'earth-quake',
    adjective: 'ad-jec-tive',
    forest: 'for-est',
    charming: 'charm-ing',
    marigold: 'mar-i-gold',
    participate: 'par-tic-i-pate',
    teacher: 'teach-er',
    frozen: 'fro-zen',
    latitude: 'lat-i-tude',
    flipper: 'flip-per',
    indent: 'in-dent'
  };

  const numberWordMap = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6
  };

  function isSyllableQuestion(question) {
    const prompt = stripPromptLeadIns(question && question.question ? question.question : '');
    if (!/\bsyllables?\b/i.test(prompt)) return false;
    if (/\breference source\b|\bsource would be best\b/i.test(prompt)) return false;
    return /how many syllables|closed first syllable|divide .*syllables|syllables:|has \d+ syllables|with \d+ syllables|has (one|two|three|four|five|six) syllables|with (one|two|three|four|five|six) syllables/i.test(prompt);
  }

  function getSyllableStrategyClue(question, prompt) {
    if (!isSyllableQuestion(question)) return '';
    const cleanPrompt = prompt || stripPromptLeadIns(question && question.question ? question.question : '');
    const target = getSyllableTargetWord(question, cleanPrompt);
    const division = target ? getSyllableDivision(target, question) : '';
    const count = division ? getSyllableCountFromDivision(division) : 0;

    if (/how many syllables/i.test(cleanPrompt) && target) {
      return `Say "${target}" naturally. Count the vowel beats you hear, then check the printed chunks: ${division || target}${count ? ` has ${count} beats` : ''}.`;
    }
    if (/closed first syllable/i.test(cleanPrompt)) {
      return 'Mark the first vowel sound in each word. A closed first syllable ends with a consonant after the vowel, so the vowel is usually short: rab-bit.';
    }
    if (/divide/i.test(cleanPrompt)) {
      return 'Say the word naturally, mark each vowel sound, then split between chunks so every syllable has one vowel sound.';
    }
    const targetCount = getRequestedSyllableCount(cleanPrompt);
    if (targetCount) {
      return `Say each choice naturally and count vowel beats. Keep the word with ${targetCount} syllable${targetCount === 1 ? '' : 's'}, then check that each beat has a vowel sound.`;
    }
    return 'Say the word naturally, count vowel beats, and connect each beat to a printed vowel chunk before choosing.';
  }

  function renderSyllableFeedback(question, selectedIndex) {
    if (!isSyllableQuestion(question)) return '';
    const prompt = stripPromptLeadIns(question && question.question ? question.question : '');
    const selectedChoice = question.choices && question.choices[selectedIndex] ? String(question.choices[selectedIndex]) : '';
    const correctChoice = question.choices && question.choices[question.correct] ? String(question.choices[question.correct]) : '';
    const target = getSyllableTargetWord(question, prompt) || stripSyllableMarks(correctChoice);
    const division = getSyllableDivision(target, question) || (/-/.test(correctChoice) ? correctChoice : '');
    const count = division ? getSyllableCountFromDivision(division) : getSyllableCountForWord(target, question);
    const targetCount = getRequestedSyllableCount(prompt);
    const isClosedQuestion = /closed first syllable/i.test(prompt);
    const heading = isClosedQuestion
      ? 'Syllable type proof'
      : /divide/i.test(prompt)
        ? 'Division proof'
        : 'Syllable count proof';
    const proofLine = getSyllableProofLine(question, prompt, target, division, count, correctChoice, targetCount);

    return `
      <section class="syllable-breakdown" aria-label="${escapeHtml(heading)}">
        <div class="syllable-breakdown-header">
          <span>Structured syllable check</span>
          <strong>${escapeHtml(heading)}</strong>
        </div>
        <div class="syllable-steps">
          <div><strong>1. Listen</strong><span>Say the word naturally. Do not stretch extra sounds into it.</span></div>
          <div><strong>2. Count</strong><span>Each syllable has one vowel sound, so count the vowel beats you hear.</span></div>
          <div><strong>3. Map</strong><span>${escapeHtml(proofLine)}</span></div>
        </div>
        ${selectedChoice ? `<p class="syllable-selection-note">You chose <strong>${escapeHtml(selectedChoice)}</strong>. The proof answer is <strong>${escapeHtml(correctChoice)}</strong>.</p>` : ''}
      </section>
    `;
  }

  function renderSyllableChoiceExplanations(question) {
    if (!question || !Array.isArray(question.choices)) return '';
    return question.choices.map((choice, idx) => {
      const isCorrectChoice = idx === question.correct;
      return `
        <div class="choice-explanation syllable-choice-explanation ${isCorrectChoice ? 'correct-exp' : 'incorrect-exp'}">
          <strong>${String.fromCharCode(65 + idx)}) ${escapeHtml(String(choice))}</strong>
          <span>${escapeHtml(getSyllableChoiceReason(question, choice, isCorrectChoice))}</span>
        </div>
      `;
    }).join('');
  }

  function getSyllableChoiceReason(question, choice, isCorrectChoice) {
    const prompt = stripPromptLeadIns(question && question.question ? question.question : '');
    const cleanChoice = stripSyllableMarks(choice);
    const division = getSyllableDivision(cleanChoice, question) || (/-/.test(String(choice)) ? String(choice) : '');
    const count = division ? getSyllableCountFromDivision(division) : getSyllableCountForWord(cleanChoice, question);

    if (/closed first syllable/i.test(prompt)) {
      const first = division ? division.split('-')[0] : cleanChoice;
      const type = isClosedFirstSyllable(cleanChoice, question) ? 'closed' : 'not closed';
      return isCorrectChoice
        ? `${division || cleanChoice}: the first syllable "${first}" closes with a consonant after the vowel.`
        : `${division || cleanChoice}: the first syllable is ${type}, so it does not prove the closed-first-syllable answer.`;
    }
    if (/how many syllables/i.test(prompt)) {
      const target = getSyllableTargetWord(question, prompt);
      const correctDivision = getSyllableDivision(target, question);
      const correctCount = correctDivision ? getSyllableCountFromDivision(correctDivision) : 0;
      return isCorrectChoice
        ? `${correctDivision || target}: ${correctCount} vowel beats.`
        : `${choice} does not match ${correctDivision || target}, which has ${correctCount} vowel beats.`;
    }
    if (/divide/i.test(prompt)) {
      return isCorrectChoice
        ? `${choice} keeps one vowel sound in each syllable chunk.`
        : `${choice} splits the letters away from the spoken vowel chunks.`;
    }
    const requested = getRequestedSyllableCount(prompt);
    if (requested) {
      return isCorrectChoice
        ? `${division || cleanChoice}: ${count} vowel beats, matching the target count.`
        : `${division || cleanChoice}: ${count || 'not the target number of'} vowel beats, so it does not match ${requested}.`;
    }
    return isCorrectChoice
      ? 'This choice matches the spoken vowel beats and printed syllable chunks.'
      : 'This choice does not match the spoken vowel beats and printed syllable chunks.';
  }

  function getSyllableProofLine(question, prompt, target, division, count, correctChoice, requestedCount) {
    if (/closed first syllable/i.test(prompt)) {
      const correctWord = stripSyllableMarks(correctChoice);
      const correctDivision = getSyllableDivision(correctWord, question) || correctWord;
      const first = correctDivision.split('-')[0];
      return `${correctDivision}: "${first}" ends with a consonant after the vowel, so the first syllable is closed.`;
    }
    if (/divide/i.test(prompt)) {
      return `${correctChoice} follows the spoken chunks and keeps a vowel sound in each syllable.`;
    }
    if (requestedCount) {
      return `${correctChoice} is ${getSyllableDivision(correctChoice, question) || correctChoice}, which has ${requestedCount} vowel beats.`;
    }
    return `${division || target}: ${count} vowel beat${count === 1 ? '' : 's'}.`;
  }

  function getSyllableTargetWord(question, prompt) {
    const text = prompt || stripPromptLeadIns(question && question.question ? question.question : '');
    const countMatch = text.match(/\bsyllables?\s+are\s+in\s+["']?([A-Za-z'-]+)["']?/i);
    if (countMatch) return countMatch[1].toLowerCase();
    const divideMatch = text.match(/\bsyllables?:\s*["']?([A-Za-z'-]+)["']?/i);
    if (divideMatch) return divideMatch[1].toLowerCase();
    const correctChoice = question && question.choices ? String(question.choices[question.correct] || '') : '';
    if (/-/.test(correctChoice)) return stripSyllableMarks(correctChoice).toLowerCase();
    return '';
  }

  function getSyllableDivision(word, question) {
    const cleanWord = stripSyllableMarks(word).toLowerCase();
    if (!cleanWord) return '';
    if (syllableDivisionMap[cleanWord]) return syllableDivisionMap[cleanWord];
    const correctChoice = question && question.choices ? String(question.choices[question.correct] || '') : '';
    if (stripSyllableMarks(correctChoice).toLowerCase() === cleanWord && /-/.test(correctChoice)) {
      return correctChoice.toLowerCase();
    }
    const studyExample = question && question.studyAid && question.studyAid.example ? String(question.studyAid.example) : '';
    const markedWords = studyExample.match(/\b[A-Za-z]+(?:-[A-Za-z]+)+\b/g) || [];
    const marked = markedWords.find(item => stripSyllableMarks(item).toLowerCase() === cleanWord);
    return marked ? marked.toLowerCase() : '';
  }

  function getSyllableCountForWord(word, question) {
    const division = getSyllableDivision(word, question);
    return division ? getSyllableCountFromDivision(division) : 0;
  }

  function getSyllableCountFromDivision(division) {
    return String(division || '').split('-').filter(Boolean).length;
  }

  function getRequestedSyllableCount(prompt) {
    const digitMatch = String(prompt || '').match(/\bhas\s+(\d+)\s+syllables?\b|\bwith\s+(\d+)\s+syllables?\b/i);
    if (digitMatch) return Number(digitMatch[1] || digitMatch[2]);
    const wordMatch = String(prompt || '').match(/\bhas\s+(one|two|three|four|five|six)\s+syllables?\b|\bwith\s+(one|two|three|four|five|six)\s+syllables?\b/i);
    return wordMatch ? numberWordMap[String(wordMatch[1] || wordMatch[2]).toLowerCase()] : 0;
  }

  function stripSyllableMarks(value) {
    return String(value || '').replace(/-/g, '').replace(/[^A-Za-z']/g, '');
  }

  function isClosedFirstSyllable(word, question) {
    const division = getSyllableDivision(word, question);
    const first = (division || String(word || '')).split('-')[0].toLowerCase();
    return /[aeiou][^aeiouy]$/.test(first);
  }

  function getContextMeaningClue(prompt) {
    const quoted = prompt.match(/"([^"]+)"/);
    const target = prompt.match(/\bwhat does\s+([A-Za-z'-]+)\s+(?:mean|most nearly mean)\b/i);
    if (!quoted || !target) return '';
    const sentence = quoted[1].trim();
    const word = target[1].trim();
    const clues = getSalientContextWords(sentence, word);
    if (!clues.length) {
      return `Use the quoted sentence to decide which meaning of "${word}" fits the context.`;
    }
    return `Use the context words "${clues.join('" and "')}" to decide which meaning of "${word}" fits.`;
  }

  function getWordPartClue(prompt) {
    const rootMatch = prompt.match(/\broot\s+([A-Za-z'-]+)\s+means\s+([^.?!]+)[.?!]/i);
    if (rootMatch) {
      return `Use the root: ${rootMatch[1]} means ${rootMatch[2].trim()}. Choose the answer that keeps that meaning.`;
    }
    const partMatch = prompt.match(/\b(prefix|suffix)\s+(-?[A-Za-z]+-?)\s+(?:mean|means)\s+([^.?!]+)[.?!]/i);
    if (partMatch) {
      return `Use the ${partMatch[1]} ${partMatch[2]}: it means ${partMatch[3].trim()}. Choose the word or meaning that matches.`;
    }
    const asksPart = prompt.match(/\bwhat does the\s+(prefix|suffix|root)\s+(-?[A-Za-z]+-?)\s+mean\b/i);
    if (asksPart) {
      return `Focus on the ${asksPart[1]} ${asksPart[2]}. Choose its meaning, not a distractor from the whole word.`;
    }
    return '';
  }

  function getSalientContextWords(sentence, targetWord) {
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'at', 'but', 'by', 'for', 'from', 'in', 'is', 'it', 'of',
      'on', 'or', 'the', 'to', 'was', 'were', 'with', 'this', 'that', 'these', 'those'
    ]);
    const target = String(targetWord || '').toLowerCase();
    const words = String(sentence || '').toLowerCase().match(/[a-z']+/g) || [];
    return words
      .filter(word => word !== target && !stopWords.has(word))
      .slice(0, 3);
  }

  function getConfidenceNudge(confidence) {
    if (confidence === 'exploring') return 'Good move. Use the strategy clue, then eliminate one answer at a time.';
    if (confidence === 'certain') return 'Great. Choose the answer you can prove from the rule or sentence clue.';
    return 'Nice. Pick your answer, then check whether the explanation matches your thinking.';
  }

  function lockConfidenceChoice() {
    document.querySelectorAll('.confidence-btn').forEach(btn => {
      btn.disabled = true;
      btn.setAttribute('aria-disabled', 'true');
      btn.classList.toggle('locked', btn.dataset.confidence === (currentConfidence || 'thinking'));
    });
  }

  function renderLearningReflection(isCorrect) {
    const confidenceText = currentConfidence
      ? {
          exploring: 'Need clues',
          thinking: 'Pretty sure',
          certain: 'I can prove it'
        }[currentConfidence]
      : 'No confidence choice';
    const hintText = hintUsedThisQuestion
      ? 'clue used'
      : 'no clue used';
    const nextMove = isCorrect
      ? 'Say the rule once before moving on.'
      : 'Name the exact clue that rules out your choice.';
    return `
      <div class="learning-reflection">
        <strong>Learning check:</strong>
        <span>${escapeHtml(confidenceText)} - ${escapeHtml(hintText)}. ${escapeHtml(nextMove)}</span>
      </div>
    `;
  }

  function getCalibrationLabel() {
    if (!confidenceStats.length) return 'Ready';
    const certain = confidenceStats.filter(item => item.confidence === 'certain');
    if (certain.length) {
      const certainCorrect = certain.filter(item => item.correct).length / certain.length;
      if (certainCorrect >= 0.85) return 'Well calibrated';
      if (certainCorrect < 0.6) return 'Slow down';
    }
    const unsureCorrect = confidenceStats.filter(item => item.confidence === 'exploring' && item.correct).length;
    if (unsureCorrect >= 2) return 'Trust your reasoning';
    return 'Building';
  }

  function renderConfidenceReport(attempts) {
    if (!attempts.length) return '';
    const rows = [
      { key: 'exploring', label: 'Need clues' },
      { key: 'thinking', label: 'Pretty sure' },
      { key: 'certain', label: 'I can prove it' }
    ].map(option => {
      const matching = attempts.filter(attempt => (attempt.confidence || 'thinking') === option.key);
      const correct = matching.filter(attempt => attempt.correct).length;
      const total = matching.length;
      const percent = total ? Math.round((correct / total) * 100) : 0;
      return `
        <div class="confidence-report-row">
          <div>
            <strong>${escapeHtml(option.label)}</strong>
            <span>${total ? `${correct} of ${total} correct` : 'No answers selected'}</span>
          </div>
          <b>${total ? `${percent}%` : '-'}</b>
        </div>
      `;
    }).join('');

    return `
      <div class="confidence-report" aria-label="Confidence score breakdown">
        <h3>Confidence breakdown</h3>
        <div class="confidence-report-list">${rows}</div>
      </div>
    `;
  }

  function renderSubtopicReport(attempts) {
    if (!mixedQuizConfig || !attempts.length) return '';
    const groups = {};
    attempts.forEach(attempt => {
      const subtopic = getQuestionSubtopic(attempt.question);
      const key = subtopic.id || 'mixed';
      if (!groups[key]) groups[key] = { title: subtopic.title || 'Mixed practice', correct: 0, total: 0 };
      groups[key].correct += attempt.correct ? 1 : 0;
      groups[key].total += 1;
    });

    const rows = Object.keys(groups).map(key => {
      const item = groups[key];
      const percent = item.total ? Math.round((item.correct / item.total) * 100) : 0;
      return `
        <div class="sub-report-row">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <span>${item.correct} of ${item.total} correct</span>
          </div>
          <b>${percent}%</b>
        </div>
      `;
    }).join('');

    return `
      <div class="sub-report" aria-label="Subtopic performance report">
        <h3>Subtopic report</h3>
        <div class="sub-report-list">${rows}</div>
      </div>
    `;
  }

  function renderMixedSubtopicSelector() {
    const limit = getSelectedMixedQuestionLimit();
    const limitOptions = ['4', '5', '6', '7', '8', '9', '10']
      .map(value => `<option value="${value}" ${limit === Number(value) ? 'selected' : ''}>${value} per subtopic</option>`)
      .join('');
    const options = mixedQuizConfig.subtopics.map(subtopic => `
      <label class="mixed-subtopic-option">
        <input type="checkbox" value="${escapeHtml(subtopic.id)}" checked>
        <span>${escapeHtml(subtopic.title)}</span>
      </label>
    `).join('');
    return `
      <div class="mixed-subtopic-picker" aria-label="Choose subtopics for mixed quiz">
        <div class="mixed-subtopic-picker-head">
          <strong>Subtopics in this quiz</strong>
          <button type="button" class="mini-action" id="mixed-select-all">Select all</button>
        </div>
        <label class="mixed-question-limit">
          <span>Questions per selected subtopic</span>
          <select id="mixed-question-limit">
            ${limitOptions}
            <option value="max" ${limit === 'max' ? 'selected' : ''}>Max - all available questions</option>
          </select>
        </label>
        <div class="mixed-subtopic-options">${options}</div>
        <div class="level-summary mixed-subtopic-warning" id="mixed-subtopic-warning" hidden>
          Choose at least two subtopics for mixed practice.
        </div>
      </div>
    `;
  }

  function attachMixedSelectorHandlers() {
    const checkboxes = Array.from(document.querySelectorAll('.mixed-subtopic-option input'));
    const selectAll = document.getElementById('mixed-select-all');
    const limitSelect = document.getElementById('mixed-question-limit');
    const startBtn = document.getElementById('start-btn');
    const warning = document.getElementById('mixed-subtopic-warning');
    const summaryEl = document.getElementById('level-summary');

    const update = () => {
      selectedMixedSubtopicIds = checkboxes
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
      selectedMixedQuestionLimit = normalizeMixedQuestionLimit(limitSelect ? limitSelect.value : selectedMixedQuestionLimit);
      saveSetting('grammarQuestMixedQuestionLimit', selectedMixedQuestionLimit);
      currentQuestions = selectCurrentQuestions();
      const tooFew = selectedMixedSubtopicIds.length < 2;
      if (startBtn) startBtn.disabled = tooFew;
      if (warning) warning.hidden = !tooFew;
      if (summaryEl) {
        summaryEl.innerHTML = renderSelectionSummary(getSelectionSummary(baseQuestions, selectedGrade, selectedDifficulty));
      }
    };

    checkboxes.forEach(checkbox => checkbox.addEventListener('change', update));
    if (limitSelect) limitSelect.addEventListener('change', update);
    if (selectAll) {
      selectAll.addEventListener('click', () => {
        checkboxes.forEach(checkbox => {
          checkbox.checked = true;
        });
        update();
      });
    }
    update();
  }

  function getActiveMixedSubtopics() {
    return quizDomain.getActiveMixedSubtopics(getQuizSelectionState());
  }

  function getSelectedMixedQuestionLimit() {
    const normalized = normalizeMixedQuestionLimit(selectedMixedQuestionLimit);
    return normalized === 'max' ? 'max' : parseInt(normalized, 10);
  }

  // Utility: shuffle array (Fisher-Yates)
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function loadProgress() {
    if (isParentMode() && progressStore && typeof progressStore.getDefaultProgress === 'function') {
      return progressStore.getDefaultProgress();
    }
    if (progressStore) return progressStore.loadLocalProgress();

    const fallback = {
      streakDays: 0,
      totalGems: 0,
      quizzesCompleted: 0,
      bestScore: 0,
      lastPracticeDate: '',
      badges: []
    };

    try {
      const saved = JSON.parse(localStorage.getItem('grammarQuestProgress'));
      return Object.assign(fallback, saved || {});
    } catch (error) {
      return fallback;
    }
  }

  function getInitialGrade() {
    const savedGrade = loadSetting('grammarQuestGrade', '');
    if (savedGrade) return normalizeOption(savedGrade, gradeOptions, '4');
    const auth = window.GrammarQuestAuth;
    const authState = auth && typeof auth.getState === 'function' ? auth.getState() : {};
    const defaultGrade = authState.studentMode && authState.activeStudent
      ? authState.activeStudent.defaultGrade
      : loadSetting('grammarQuestActiveStudentDefaultGrade', '');
    return normalizeOption(defaultGrade || '4', gradeOptions, '4');
  }

  function saveQuestResult(percentage, correct, total, attempts) {
    const progress = loadProgress();
    const today = getTodayKey();
    const yesterday = getDateKey(-1);
    let streakBonus = 0;

    if (progress.lastPracticeDate !== today) {
      progress.streakDays = progress.lastPracticeDate === yesterday ? progress.streakDays + 1 : 1;
      progress.lastPracticeDate = today;
    }

    const baseGems = correct * 2;
    const masteryBonus = percentage >= 90 ? 10 : percentage >= 75 ? 5 : 0;
    if (progress.streakDays > 0 && progress.streakDays % 3 === 0) streakBonus = 8;
    const gemsEarned = baseGems + masteryBonus + streakBonus;

    progress.totalGems += gemsEarned;
    progress.quizzesCompleted += 1;
    progress.bestScore = Math.max(progress.bestScore || 0, percentage);
    progress.mastery = updateMastery(progress.mastery, attempts || [], today);
    progress.reports = updateReports(progress.reports, attempts || [], {
      percentage,
      correct,
      total,
      completedAt: new Date().toISOString(),
      startedAt: sessionStartedAt ? new Date(sessionStartedAt).toISOString() : '',
      durationSeconds: sessionStartedAt ? Math.max(1, Math.round((Date.now() - sessionStartedAt) / 1000)) : 0
    });
    progress.activeQuiz = null;
    progress.badges = updateBadges(progress);

    saveProgress(progress);

    let message = 'Every answer moves your story forward.';
    if (streakBonus) {
      message = 'Streak bonus unlocked for practicing three days in a row.';
    } else if (masteryBonus) {
      message = 'Accuracy bonus unlocked for strong focus.';
    } else if (progress.streakDays > 1) {
      message = 'Your practice streak is saved. Come back tomorrow to grow it.';
    }

    return { gemsEarned, message, progress };
  }

  function updateReports(existingReports, attempts, summary) {
    const reports = progressStore && typeof progressStore.normalizeReports === 'function'
      ? progressStore.normalizeReports(existingReports)
      : { sessions: Array.isArray(existingReports && existingReports.sessions) ? existingReports.sessions : [] };
    const completedAt = summary.completedAt || new Date().toISOString();
    const session = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentId: getActiveStudentId(),
      studentName: getActiveStudentName(),
      title: activeSet && activeSet.title || 'Practice Quiz',
      topic: activeSet && activeSet.topic || 'English Language Arts',
      grade: selectedGrade,
      difficulty: selectedDifficulty,
      score: summary.correct,
      total: summary.total,
      percentage: summary.percentage,
      startedAt: summary.startedAt,
      completedAt,
      durationSeconds: summary.durationSeconds,
      attempts: attempts.map((attempt, index) => serializeAttempt(attempt, index + 1, completedAt))
    };

    return enrichReports({
      sessions: [session].concat(reports.sessions || []).slice(0, 250),
      questionReports: Array.isArray(reports.questionReports) ? reports.questionReports : []
    });
  }

  function enrichReports(reports) {
    const sessions = Array.isArray(reports.sessions) ? reports.sessions : [];
    const daily = {};
    const questions = {};
    const topics = {};

    sessions.forEach(session => {
      const day = String(session.completedAt || '').slice(0, 10) || 'unknown';
      if (!daily[day]) daily[day] = { date: day, sessions: 0, questions: 0, correct: 0, minutes: 0, topics: {} };
      daily[day].sessions += 1;
      daily[day].questions += Number(session.total) || 0;
      daily[day].correct += Number(session.score) || 0;
      daily[day].minutes += Math.round((Number(session.durationSeconds) || 0) / 60);
      daily[day].topics[session.topic || 'English Language Arts'] = true;

      const topicKey = session.topic || 'English Language Arts';
      if (!topics[topicKey]) topics[topicKey] = { label: topicKey, attempted: 0, correct: 0, sessions: 0 };
      topics[topicKey].attempted += Number(session.total) || 0;
      topics[topicKey].correct += Number(session.score) || 0;
      topics[topicKey].sessions += 1;

      (session.attempts || []).forEach(attempt => {
        const key = getAttemptQuestionId(attempt);
        if (!key) return;
        if (!questions[key]) {
          questions[key] = {
            id: key,
            question: attempt.question || '',
            correctChoice: attempt.correctChoice || '',
            subtopicTitle: attempt.subtopicTitle || '',
            attempts: 0,
            misses: 0,
            lastMissedAt: ''
          };
        }
        questions[key].attempts += 1;
        if (!attempt.correct) {
          questions[key].misses += 1;
          questions[key].lastMissedAt = session.completedAt || '';
        }
      });
    });

    return Object.assign({}, reports, {
      sessions,
      daily: Object.keys(daily).map(key => Object.assign(daily[key], {
        topicCount: Object.keys(daily[key].topics).length,
        accuracy: daily[key].questions ? daily[key].correct / daily[key].questions : 0
      })).sort((a, b) => b.date.localeCompare(a.date)),
      topics: Object.keys(topics).map(key => Object.assign(topics[key], {
        accuracy: topics[key].attempted ? topics[key].correct / topics[key].attempted : 0
      })).sort((a, b) => a.label.localeCompare(b.label)),
      questions: Object.keys(questions).map(key => Object.assign(questions[key], {
        missRate: questions[key].attempts ? questions[key].misses / questions[key].attempts : 0
      })).sort((a, b) => b.misses - a.misses || b.missRate - a.missRate)
    });
  }

  function getResumableQuiz() {
    const progress = loadProgress();
    const activeQuiz = progressStore && typeof progressStore.normalizeActiveQuiz === 'function'
      ? progressStore.normalizeActiveQuiz(progress.activeQuiz)
      : progress.activeQuiz;
    if (!activeQuiz || !activeSet) return null;
    const sameQuiz = activeQuiz.setId === (window.QUIZ_SET_ID || '')
      || (mixedQuizConfig && activeQuiz.mixedTitle === mixedQuizConfig.title);
    return sameQuiz ? activeQuiz : null;
  }

  function warnOnChangedQuestionRefs(savedQuiz) {
    const refs = Array.isArray(savedQuiz && savedQuiz.questionRefs) ? savedQuiz.questionRefs : [];
    if (!refs.length || !Array.isArray(currentQuestions)) return;
    const byId = {};
    currentQuestions.forEach(question => {
      const ref = getQuestionRef(question);
      if (ref.id) byId[ref.id] = ref;
    });
    refs.forEach(ref => {
      if (!ref || !ref.id || !byId[ref.id]) return;
      if (ref.contentHash && byId[ref.id].contentHash && ref.contentHash !== byId[ref.id].contentHash) {
        console.warn('Saved quiz question content changed since the active quiz was saved:', ref.id);
      }
    });
  }

  function getQuestionId(question, fallbackPosition, subtopic) {
    return quizDomain.getQuestionId(question, fallbackPosition, subtopic);
  }

  function getAttemptQuestionId(attempt) {
    return quizDomain.getAttemptQuestionId(attempt);
  }

  function getQuestionRef(question, fallbackPosition, subtopic) {
    return quizDomain.getQuestionRef(question, fallbackPosition, subtopic);
  }

  function getQuestionSnapshot(question, selectedIndex) {
    const choices = Array.isArray(question && question.choices) ? question.choices : [];
    const correctIndex = Number.isFinite(question && question.correct) ? question.correct : -1;
    return {
      question: question && question.question || '',
      choices,
      selectedIndex: Number.isFinite(selectedIndex) ? selectedIndex : -1,
      selectedChoice: choices[selectedIndex] || '',
      correctIndex,
      correctChoice: choices[correctIndex] || '',
      explanation: question && question.explanation || null,
      studyAid: question && question.studyAid || null,
      visualScene: question && question.visualScene || null
    };
  }

  function saveActiveQuiz(options) {
    if (isParentMode()) return;
    const progress = loadProgress();
    const nextIndex = options && Number.isFinite(options.nextIndex) ? options.nextIndex : currentIndex;
    progress.activeQuiz = {
      setId: window.QUIZ_SET_ID || '',
      mixedTitle: mixedQuizConfig ? mixedQuizConfig.title : '',
      title: activeSet && activeSet.title || 'Practice Quiz',
      topic: activeSet && activeSet.topic || 'English Language Arts',
      grade: selectedGrade,
      difficulty: selectedDifficulty,
      questions: currentQuestions,
      questionRefs: currentQuestions.map(question => getQuestionRef(question)),
      currentIndex: Math.min(Math.max(0, nextIndex), currentQuestions.length),
      score,
      combo,
      reviewMode,
      hintsUsed,
      confidenceStats,
      attempts: attemptRecords,
      reviewAttempts: reviewAttemptRecords,
      missedQuestions,
      startedAt: sessionStartedAt ? new Date(sessionStartedAt).toISOString() : new Date().toISOString(),
      questionStartedAt: questionStartedAt ? new Date(questionStartedAt).toISOString() : '',
      lastSavedAt: new Date().toISOString()
    };
    saveProgress(progress, { sync: true });
  }

  function getResumePositionLabel(activeQuiz) {
    const index = Number(activeQuiz.currentIndex) || 0;
    const total = Array.isArray(activeQuiz.questions) ? activeQuiz.questions.length : 0;
    if (index >= total) return 'ready for results';
    return `Question ${index + 1} of ${total}`;
  }

  function clearActiveQuiz() {
    if (isParentMode()) return;
    const progress = loadProgress();
    progress.activeQuiz = null;
    saveProgress(progress, { sync: true });
  }

  function saveProgress(progress, options) {
    if (isParentMode()) return;
    if (progressStore) {
      progressStore.saveLocalProgress(progress, options);
    } else {
      localStorage.setItem('grammarQuestProgress', JSON.stringify(progress));
    }
  }

  function serializeAttempt(attempt, position, completedAt) {
    const question = attempt.question || {};
    const metadata = question.metadata || {};
    const choices = Array.isArray(question.choices) ? question.choices : [];
    const selectedIndex = Number.isFinite(attempt.selectedIndex) ? attempt.selectedIndex : -1;
    const correctIndex = Number.isFinite(question.correct) ? question.correct : -1;
    const subtopic = getQuestionSubtopic(question);
    const questionRef = getQuestionRef(question, position, subtopic);

    return {
      id: questionRef.id,
      questionId: questionRef.id,
      questionVersion: questionRef.version,
      questionHash: questionRef.contentHash,
      sourceSet: questionRef.sourceSet,
      sequence: questionRef.sequence,
      position,
      question: question.question || '',
      choices,
      selectedIndex,
      selectedChoice: choices[selectedIndex] || '',
      correctIndex,
      correctChoice: choices[correctIndex] || '',
      explanation: question.explanation || null,
      studyAid: question.studyAid || null,
      visualScene: question.visualScene || null,
      correct: !!attempt.correct,
      firstAttemptCorrect: !!attempt.correct,
      confidence: attempt.confidence || 'thinking',
      hintUsed: !!attempt.hintUsed,
      durationSeconds: Number(attempt.durationSeconds) || 0,
      trapTypes: Array.isArray(attempt.trapTypes) ? attempt.trapTypes : [],
      grade: attempt.grade || selectedGrade,
      difficulty: attempt.difficulty || selectedDifficulty,
      subtopicId: subtopic.id,
      subtopicTitle: subtopic.title,
      skills: Array.isArray(metadata.skills) ? metadata.skills : [],
      standards: getQuestionStandards(question),
      completedAt
    };
  }

  function getActiveStudentId() {
    return loadSetting('grammarQuestActiveStudentId', 'current-learner');
  }

  function getActiveStudentName() {
    return loadSetting('grammarQuestActiveStudentName', 'Current Learner');
  }

  function updateMastery(existingMastery, attempts, today) {
    const mastery = normalizeMastery(existingMastery);
    attempts.forEach(attempt => {
      const question = attempt.question || {};
      const metadata = question.metadata || {};
      const isCorrect = !!attempt.correct;
      const difficulty = metadata.primaryDifficulty || selectedDifficulty;
      const entries = [
        { group: 'domains', key: slugify(activeSet && activeSet.topic || metadata.sourceSet || 'English Language Arts'), label: activeSet && activeSet.topic || 'English Language Arts' },
        { group: 'cognitiveDemand', key: metadata.cognitiveDemand || 'practice', label: titleCase(metadata.cognitiveDemand || 'Practice') },
        { group: 'difficulty', key: difficulty || 'medium', label: titleCase(difficulty || 'Medium') },
        { group: 'subtopics', key: getQuestionSubtopic(question).id, label: getQuestionSubtopic(question).title }
      ];

      (metadata.skills || []).forEach(skill => {
        entries.push({ group: 'skills', key: slugify(skill), label: titleCase(skill) });
      });

      (metadata.testFocus || metadata['Test focus'] || []).forEach(focus => {
        entries.push({ group: 'testFocus', key: slugify(focus), label: String(focus) });
      });

      getQuestionStandards(question).forEach(standard => {
        entries.push({ group: 'standards', key: standard.id, label: standard.label || standard.id });
      });

      entries.forEach(entry => recordMastery(mastery, entry.group, entry.key, entry.label, isCorrect, today));
    });
    return mastery;
  }

  function saveReviewOutcome(reviewAttempts) {
    const attempts = Array.isArray(reviewAttempts) ? reviewAttempts : [];
    const progress = loadProgress();
    if (!attempts.length || isParentMode()) {
      return { gemsEarned: 0, message: 'Review round complete. Mistakes turned into practice.', progress };
    }

    const completedAt = new Date().toISOString();
    const latestSession = progress.reports
      && Array.isArray(progress.reports.sessions)
      && progress.reports.sessions.find(session => session && Array.isArray(session.attempts));
    if (!latestSession) {
      return { gemsEarned: 0, message: 'Review round complete. No matching session was found to update.', progress };
    }

    const serialized = attempts.map((attempt, index) => serializeAttempt(attempt, index + 1, completedAt));
    const byQuestionId = {};
    serialized.forEach(attempt => {
      const key = getAttemptQuestionId(attempt);
      if (!key) return;
      byQuestionId[key] = attempt;
    });

    latestSession.attempts = latestSession.attempts.map(original => {
      const key = getAttemptQuestionId(original);
      const review = byQuestionId[key];
      if (!review) return original;
      const reviewEntry = {
        completedAt,
        correct: !!review.correct,
        selectedIndex: review.selectedIndex,
        selectedChoice: review.selectedChoice,
        confidence: review.confidence,
        hintUsed: !!review.hintUsed,
        durationSeconds: Number(review.durationSeconds) || 0,
        trapTypes: Array.isArray(review.trapTypes) ? review.trapTypes : []
      };
      return Object.assign({}, original, {
        reviewedAt: completedAt,
        reviewCorrect: !!review.correct,
        reviewAttempts: (Array.isArray(original.reviewAttempts) ? original.reviewAttempts : []).concat(reviewEntry)
      });
    });
    latestSession.reviewedAt = completedAt;
    latestSession.reviewSummary = buildReviewSummary(latestSession.attempts);
    progress.reports = enrichReports(progress.reports);
    progress.activeQuiz = null;
    saveProgress(progress);
    return { gemsEarned: 0, message: 'Review round saved. Mistakes turned into targeted practice evidence.', progress };
  }

  function buildReviewSummary(attempts) {
    const reviewed = (attempts || []).filter(attempt => Array.isArray(attempt.reviewAttempts) && attempt.reviewAttempts.length);
    const latest = reviewed.map(attempt => attempt.reviewAttempts[attempt.reviewAttempts.length - 1]);
    return {
      reviewed: reviewed.length,
      corrected: latest.filter(attempt => attempt.correct).length,
      stillMissed: latest.filter(attempt => !attempt.correct).length
    };
  }

  function getSelectedTrapTypes(question, selectedIndex) {
    const metadata = question && question.metadata || {};
    const choiceTrap = getChoiceMetadataValue(metadata.choiceTrapTypes || metadata.distractorTypes || metadata.trapsByChoice, selectedIndex);
    if (choiceTrap) return normalizeTrapList(choiceTrap);
    if (Number(selectedIndex) !== Number(question && question.correct)) {
      const general = metadata.trapTypes || metadata.commonTrapTypes || metadata.misconceptions;
      if (general) return normalizeTrapList(general);
      const explanation = question && question.explanation && question.explanation.incorrect
        ? question.explanation.incorrect[selectedIndex]
        : '';
      return inferTrapTypes(question, explanation);
    }
    return [];
  }

  function getChoiceMetadataValue(value, selectedIndex) {
    if (!value) return null;
    if (Array.isArray(value)) return value[selectedIndex] || null;
    if (typeof value === 'object') {
      return value[selectedIndex] || value[String(selectedIndex)] || value[String.fromCharCode(65 + Number(selectedIndex))] || null;
    }
    return null;
  }

  function normalizeTrapList(value) {
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value === 'string') return value.split(/[,|]/).map(item => item.trim()).filter(Boolean);
    return [];
  }

  function inferTrapTypes(question, explanation) {
    const metadata = question && question.metadata || {};
    const text = `${question && question.question || ''} ${explanation || ''} ${(metadata.skills || []).join(' ')}`.toLowerCase();
    const traps = [];
    if (/too broad|main idea|theme/.test(text)) traps.push('too broad or vague');
    if (/unsupported|evidence|infer|inference|detail/.test(text)) traps.push('unsupported inference');
    if (/capital/.test(text)) traps.push('capitalization rule confusion');
    if (/comma|apostrophe|quotation|period|punctuat/.test(text)) traps.push('punctuation rule confusion');
    if (/verb|tense|agreement|pronoun|noun|adjective|adverb/.test(text)) traps.push('grammar role confusion');
    if (/prefix|suffix|root|meaning|context|vocabulary/.test(text)) traps.push('word meaning or word-part confusion');
    return traps.length ? traps : ['incorrect distractor selected'];
  }

  function normalizeMastery(mastery) {
    if (progressStore && typeof progressStore.normalizeMastery === 'function') {
      return progressStore.normalizeMastery(mastery);
    }
    const groups = ['domains', 'skills', 'cognitiveDemand', 'difficulty', 'subtopics', 'standards'];
    return groups.reduce((acc, group) => {
      acc[group] = Object.assign({}, mastery && mastery[group] || {});
      return acc;
    }, {});
  }

  function recordMastery(mastery, group, key, label, isCorrect, today) {
    if (!key) return;
    if (!mastery[group]) mastery[group] = {};
    const current = mastery[group][key] || { label, correct: 0, total: 0, lastPracticed: '', level: '' };
    current.label = current.label || label || key;
    current.correct += isCorrect ? 1 : 0;
    current.total += 1;
    current.lastPracticed = today;
    current.level = getMasteryLevel(current.correct, current.total);
    mastery[group][key] = current;
  }

  function getQuestionStandards(question) {
    const metadata = question.metadata || {};
    const direct = metadata.standards || metadata.standardIds || [];
    if (Array.isArray(direct) && direct.length) {
      return direct.map(id => ({ id: String(id), label: String(id) }));
    }

    const topic = activeSet && activeSet.topic ? activeSet.topic : metadata.sourceSet || '';
    const skills = metadata.skills || [];
    const inferred = [];
    if (/reading/i.test(topic)) inferred.push({ id: 'CCSS.RL/RI.3-6', label: 'Reading: Literature & Informational Text' });
    if (/vocabulary/i.test(topic) || skills.some(skill => /vocabulary|morphology|prefix|suffix|meaning/i.test(skill))) inferred.push({ id: 'CCSS.L.3-6.4-6', label: 'Language: Vocabulary Acquisition' });
    if (/grammar|punctuation|capitalization/i.test(topic) || skills.some(skill => /grammar|punctuation|capitalization|usage|sentence/i.test(skill))) inferred.push({ id: 'CCSS.L.3-6.1-3', label: 'Language: Conventions & Knowledge' });
    if (/reference/i.test(topic) || skills.some(skill => /dictionary|reference|alphabet/i.test(skill))) inferred.push({ id: 'ELA.Reference.3-6', label: 'Reference & Research Skills' });
    return inferred.length ? inferred : [{ id: 'ELA.3-6.Mixed', label: 'Mixed ELA Practice' }];
  }

  function getMasteryLevel(correct, total) {
    if (total < 5) return 'Collecting evidence';
    const accuracy = correct / total;
    if (accuracy >= 0.92 && total >= 12) return 'Elite';
    if (accuracy >= 0.85) return 'Secure';
    if (accuracy >= 0.7) return 'Developing';
    return 'Needs focus';
  }

  function updateBadges(progress) {
    const badges = new Set(progress.badges || []);
    if (progress.quizzesCompleted >= 1) badges.add('First Quest');
    if (progress.streakDays >= 3) badges.add('3-Day Trail');
    if (progress.bestScore >= 90) badges.add('Sharp-Eyed Editor');
    if (progress.totalGems >= 100) badges.add('Gem Keeper');
    return Array.from(badges);
  }

  function getRank(gems) {
    if (gems >= 250) return { name: 'Word Wizard' };
    if (gems >= 120) return { name: 'Story Ranger' };
    if (gems >= 50) return { name: 'Sentence Scout' };
    return { name: 'Trail Starter' };
  }

  function getTodayKey() {
    return getDateKey(0);
  }

  function getDateKey(offsetDays) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function loadSetting(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function saveSetting(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Ignore storage errors so private browsing modes can still run quizzes.
    }
  }

  function normalizeOption(value, options, fallback) {
    const normalized = String(value || '').toLowerCase();
    return options.includes(normalized) ? normalized : fallback;
  }

  function getConfiguredQuestionCount() {
    const configured = parseInt(window.QUIZ_QUESTION_COUNT, 10);
    return Number.isFinite(configured) && configured > 0 ? configured : 15;
  }

  function getConfiguredQuestionsPerSubtopic() {
    const configured = parseInt(window.QUIZ_QUESTIONS_PER_SUBTOPIC, 10);
    return Number.isFinite(configured) && configured >= 4 ? Math.min(configured, 10) : 4;
  }

  function normalizeMixedQuestionLimit(value) {
    if (String(value || '').toLowerCase() === 'max') return 'max';
    const number = parseInt(value, 10);
    if (!Number.isFinite(number)) return '4';
    return String(Math.min(10, Math.max(4, number)));
  }

  function normalizeMixedSubtopics(config) {
    return (config && Array.isArray(config.subtopics) ? config.subtopics : [])
      .map(subtopic => {
        const set = subtopic.set || {};
        const questions = Array.isArray(set.questions)
          ? set.questions.map(question => Object.assign({}, question, {
              __subtopic: {
                id: subtopic.id,
                title: subtopic.title || set.title || 'Subtopic'
              }
            }))
          : [];
        return Object.assign({}, subtopic, { questions });
      })
      .filter(subtopic => subtopic.id && subtopic.questions.length);
  }

  function getMergedMetadata(subtopics) {
    const grades = new Set();
    const difficulties = new Set();
    subtopics.forEach(subtopic => {
      const metadata = subtopic.set && subtopic.set.metadata || {};
      (metadata.gradesSupported || []).forEach(grade => grades.add(String(grade)));
      (metadata.difficultiesSupported || []).forEach(level => difficulties.add(String(level)));
    });
    return {
      gradesSupported: grades.size ? Array.from(grades).sort() : gradeOptions,
      difficultiesSupported: difficulties.size ? Array.from(difficulties) : difficultyOptions
    };
  }

  function getStartScreenCopy(supportsLevelSelection) {
    if (isParentMode()) {
      const parentQuestionCount = getParentQuestionCount();
      if (mixedQuizConfig) {
        return `${supportsLevelSelection ? 'Choose subtopics to preview' : 'Preview'} ${parentQuestionCount} questions across ${getActiveMixedSubtopics().length} subtopics. Nothing here is saved to a student profile.`;
      }
      return `Preview all ${parentQuestionCount} questions. Parent previews are read-only and do not affect student reports.`;
    }
    if (mixedQuizConfig) {
      return `${supportsLevelSelection ? 'Choose a level and subtopics, then answer' : 'Choose subtopics, then answer'} ${currentQuestions.length} questions across ${getActiveMixedSubtopics().length} subtopics. ${getMixedQuestionLimitCopy()} Your results will show both overall and subtopic scores.`;
    }
    return `The Word Woods need a careful sentence scout. ${supportsLevelSelection ? 'Choose a level, answer' : 'Answer'} ${currentQuestions.length} questions, collect star gems, and keep your practice streak glowing.`;
  }

  function isParentMode() {
    const auth = window.GrammarQuestAuth;
    if (!auth || typeof auth.getState !== 'function') return false;
    return !!auth.getState().parentMode;
  }

  function getParentQuestionCount() {
    if (!mixedQuizConfig) return baseQuestions.length;
    return getActiveMixedSubtopics().reduce((total, subtopic) => total + (subtopic.questions || []).length, 0);
  }

  function getMixedQuestionLimitCopy() {
    const limit = getSelectedMixedQuestionLimit();
    if (limit === 'max') return 'Max mode includes every available question from each selected subtopic.';
    return `Each selected subtopic contributes ${limit} questions.`;
  }

  function getQuestionSubtopic(question) {
    const metadata = question && question.metadata || {};
    const subtopic = question && question.__subtopic || {};
    const id = subtopic.id || metadata.sourceSet || (activeSet && window.QUIZ_SET_ID) || '';
    const title = subtopic.title || (activeSet && !mixedQuizConfig && activeSet.title) || titleCase(id);
    return { id, title };
  }

  function getDisplayGrade(grade) {
    const value = parseInt(grade, 10);
    return Number.isFinite(value) ? String(value - 1) : String(grade || '');
  }

  function capitalize(text) {
    const value = String(text || '');
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
  }

  function titleCase(text) {
    return String(text || '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function escapeRegExp(text) {
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Utility: escape HTML
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
