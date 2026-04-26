/**
 * English Language Quiz App - Quiz Engine
 * Modular, expandable quiz system
 * 
 * Usage in a subtopic HTML file:
 *   <script>window.QUIZ_SET_ID = 'vocabulary-base-words';</script>
 *   <script src="../../assets/questions_master.js"></script>
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
  const progressStore = window.GrammarQuestProgress;
  const gradeOptions = ['3', '4', '5', '6'];
  const difficultyOptions = ['easy', 'medium', 'hard'];
  const targetQuestionCount = 15;

  // DOM ready
  document.addEventListener('DOMContentLoaded', function () {
    quizContainer = document.getElementById('quiz-root');
    if (!quizContainer) {
      console.error('Quiz engine: #quiz-root element not found');
      return;
    }

    const setId = window.QUIZ_SET_ID;
    if (!setId) {
      console.error('Quiz engine: window.QUIZ_SET_ID is not set');
      quizContainer.innerHTML = '<p class="page-subtitle">Error: No quiz set specified.</p>';
      return;
    }

    initQuiz(setId);
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
    selectedGrade = normalizeOption(loadSetting('grammarQuestGrade', '4'), gradeOptions, '4');
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

    renderStartScreen(set);
  }

  function renderStartScreen(set) {
    const progress = loadProgress();
    const topicName = set.topic || 'Grammar Quest';
    const rank = getRank(progress.totalGems);
    const supportsLevelSelection = setSupportsLevelSelection(set);
    const selectionSummary = getSelectionSummary(baseQuestions, selectedGrade, selectedDifficulty);
    const levelControls = supportsLevelSelection ? `
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

    quizContainer.innerHTML = `
      <div class="start-screen">
        <div class="quest-kicker">Chapter Mission</div>
        <h2>${escapeHtml(set.title)}</h2>
        <p>The Word Woods need a careful sentence scout. ${supportsLevelSelection ? 'Choose a level, answer' : 'Answer'} ${currentQuestions.length} questions, collect star gems, and keep your practice streak glowing.</p>
        ${levelControls}
        <div class="quest-dashboard" aria-label="Saved quest progress">
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
        </div>
        <p class="quest-brief">Today's trail: ${escapeHtml(topicName)}. A score of 75% or higher earns a bonus reward.</p>
        <button class="btn btn-primary" id="start-btn">Start Quiz</button>
      </div>
    `;

    if (supportsLevelSelection) {
      const gradeSelect = document.getElementById('grade-select');
      const difficultySelect = document.getElementById('difficulty-select');
      const updateSelection = () => {
        selectedGrade = gradeSelect.value;
        selectedDifficulty = difficultySelect.value;
        saveSetting('grammarQuestGrade', selectedGrade);
        saveSetting('grammarQuestDifficulty', selectedDifficulty);
        currentQuestions = selectQuestionsForLevel(baseQuestions, selectedGrade, selectedDifficulty);
        const summaryEl = document.getElementById('level-summary');
        if (summaryEl) {
          summaryEl.innerHTML = renderSelectionSummary(getSelectionSummary(baseQuestions, selectedGrade, selectedDifficulty));
        }
      };
      gradeSelect.addEventListener('change', updateSelection);
      difficultySelect.addEventListener('change', updateSelection);
    }

    document.getElementById('start-btn').addEventListener('click', () => {
      currentQuestions = selectQuestionsForLevel(baseQuestions, selectedGrade, selectedDifficulty);
      currentIndex = 0;
      score = 0;
      combo = 0;
      missedQuestions = [];
      reviewMode = false;
      hintsUsed = 0;
      confidenceStats = [];
      renderQuestion();
    });
  }

  function renderQuestion() {
    answered = false;
    currentConfidence = '';
    hintUsedThisQuestion = false;
    const q = currentQuestions[currentIndex];
    const progress = loadProgress();
    const strategyHint = getStrategyHint(q);

    quizContainer.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-progress">${reviewMode ? 'Review' : 'Question'} ${currentIndex + 1} of ${currentQuestions.length}</div>
        <div class="quest-mini-hud" aria-label="Quest progress">
          <span>${progress.streakDays} day streak</span>
          <span>${progress.totalGems} gems</span>
          <span>Combo ${combo}</span>
        </div>
        <div class="quiz-score">Score: ${score} / ${currentIndex}</div>
      </div>

      <div class="question-box">
        <div class="question-text">${escapeHtml(q.question)}</div>
        <div class="thinking-tools">
          <button type="button" class="strategy-btn" id="strategy-btn">Strategy clue</button>
          <div class="confidence-check" aria-label="Choose confidence level before answering">
            <span>How sure are you?</span>
            <button type="button" class="confidence-btn" data-confidence="exploring">Need clues</button>
            <button type="button" class="confidence-btn" data-confidence="thinking">Pretty sure</button>
            <button type="button" class="confidence-btn" data-confidence="certain">I can prove it</button>
          </div>
        </div>
        <div class="strategy-panel" id="strategy-panel" hidden>${escapeHtml(strategyHint)}</div>
        <div class="choices" id="choices">
          ${q.choices.map((choice, idx) => `
            <button class="choice-btn" data-index="${idx}" disabled>
              <span class="choice-letter">${String.fromCharCode(65 + idx)}</span>
              <span>${escapeHtml(choice)}</span>
            </button>
          `).join('')}
        </div>
        <div class="answer-gate" id="answer-gate">Choose how sure you are, then pick an answer.</div>
      </div>

      <div id="feedback-area"></div>
      <div class="controls" id="controls"></div>
    `;

    document.getElementById('strategy-btn').addEventListener('click', () => {
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
        currentConfidence = btn.dataset.confidence;
        document.querySelectorAll('.confidence-btn').forEach(option => {
          option.classList.toggle('selected', option === btn);
        });
        document.querySelectorAll('.choice-btn').forEach(choiceBtn => {
          choiceBtn.disabled = false;
        });
        const gate = document.getElementById('answer-gate');
        if (gate) gate.textContent = getConfidenceNudge(currentConfidence);
      });
    });

    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.addEventListener('click', handleAnswer);
    });
  }

  function handleAnswer(e) {
    if (answered) return;
    answered = true;

    const btn = e.currentTarget;
    const selectedIndex = parseInt(btn.dataset.index, 10);
    const q = currentQuestions[currentIndex];
    const isCorrect = selectedIndex === q.correct;

    if (isCorrect) score++;
    combo = isCorrect ? combo + 1 : 0;
    confidenceStats.push({ confidence: currentConfidence || 'thinking', correct: isCorrect });
    if (!isCorrect && !reviewMode && !missedQuestions.includes(q)) {
      missedQuestions.push(q);
    }

    // Update choice buttons
    document.querySelectorAll('.choice-btn').forEach((b, idx) => {
      b.disabled = true;
      if (idx === q.correct) {
        b.classList.add('correct');
      } else if (idx === selectedIndex && !isCorrect) {
        b.classList.add('incorrect');
      } else {
        b.classList.add('unselected-wrong');
      }
    });

    // Render feedback
    renderFeedback(q, selectedIndex, isCorrect);

    // Update score display in header
    const scoreEl = document.querySelector('.quiz-score');
    if (scoreEl) scoreEl.textContent = `Score: ${score} / ${currentIndex + 1}`;
  }

  function renderFeedback(q, selectedIndex, isCorrect) {
    const feedbackArea = document.getElementById('feedback-area');
    const controls = document.getElementById('controls');
    const comboMessage = isCorrect && combo >= 3
      ? `<div class="quest-reward-note">Combo bonus charged: ${combo} correct answers in a row.</div>`
      : '';

    let choiceExplanations = '';
    if (q.explanation && q.explanation.incorrect) {
      choiceExplanations = q.choices.map((choice, idx) => {
        const isCorrectChoice = idx === q.correct;
        const expText = isCorrectChoice
          ? q.explanation.correct
          : (q.explanation.incorrect[idx] || '');
        return `
          <div class="choice-explanation ${isCorrectChoice ? 'correct-exp' : 'incorrect-exp'}">
            <strong>${String.fromCharCode(65 + idx)})</strong> ${escapeHtml(expText)}
          </div>
        `;
      }).join('');
    }

    const studyAidHtml = renderStudyAid(q.studyAid);
    const selectedExplanation = getSelectedExplanation(q, selectedIndex, isCorrect);
    const learningReflection = renderLearningReflection(isCorrect);

    feedbackArea.innerHTML = `
      <div class="feedback-box">
        <div class="feedback-title ${isCorrect ? 'correct' : 'incorrect'}">
          ${isCorrect ? 'Correct! Star gem found.' : 'Not quite. The trail is still open.'}
        </div>
        <div class="feedback-text">
          ${escapeHtml(selectedExplanation)}
        </div>
        ${learningReflection}
        ${comboMessage}
        ${choiceExplanations ? `<div class="choice-explanations">${choiceExplanations}</div>` : ''}
        ${studyAidHtml}
      </div>
    `;

    const isLast = currentIndex === currentQuestions.length - 1;
    controls.innerHTML = `
      <button class="btn btn-primary" id="next-btn">
        ${isLast ? 'See Results' : 'Next Question'}
      </button>
    `;
    document.getElementById('next-btn').addEventListener('click', () => {
      if (isLast) {
        renderResults();
      } else {
        currentIndex++;
        renderQuestion();
      }
    });
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

  function renderResults() {
    const percentage = Math.round((score / currentQuestions.length) * 100);
    const reward = reviewMode
      ? { gemsEarned: 0, message: 'Review round complete. Mistakes turned into practice.', progress: loadProgress() }
      : saveQuestResult(percentage, score, currentQuestions.length);
    const progress = reward.progress;
    const rank = getRank(progress.totalGems);
    const badgeHtml = progress.badges.length
      ? `<div class="badge-row">${progress.badges.map(badge => `<span>${escapeHtml(badge)}</span>`).join('')}</div>`
      : '';
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
        <div class="quest-kicker">${reviewMode ? 'Review Complete' : 'Mission Complete'}</div>
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
        <div class="reward-panel" aria-label="Rewards earned">
          <div class="reward-main">${reviewMode ? 'Review practice logged' : `+${reward.gemsEarned} star gems`}</div>
          <div class="reward-grid">
            <div><strong>${progress.streakDays}</strong><span>day streak</span></div>
            <div><strong>${progress.totalGems}</strong><span>total gems</span></div>
            <div><strong>${escapeHtml(rank.name)}</strong><span>quest rank</span></div>
          </div>
          ${badgeHtml}
          <p>${escapeHtml(reward.message)}</p>
        </div>
        <div class="controls" style="justify-content:center;">
          ${!reviewMode && missedQuestions.length ? '<button class="btn btn-primary" id="review-missed-btn">Review Missed</button>' : ''}
          <button class="btn btn-primary" id="restart-btn">Try Again</button>
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
        renderQuestion();
      });
    }

    document.getElementById('restart-btn').addEventListener('click', () => {
      if (activeSet) {
        currentQuestions = selectQuestionsForLevel(baseQuestions, selectedGrade, selectedDifficulty);
        currentIndex = 0;
        score = 0;
        combo = 0;
        answered = false;
        missedQuestions = [];
        reviewMode = false;
        hintsUsed = 0;
        confidenceStats = [];
        renderStartScreen(activeSet);
      } else {
        initQuiz(window.QUIZ_SET_ID);
      }
    });
  }

  function setSupportsLevelSelection(set) {
    return !!(set && set.metadata && set.metadata.gradesSupported && set.metadata.difficultiesSupported);
  }

  function selectQuestionsForLevel(questions, grade, difficulty) {
    if (!questions.some(question => question.metadata && question.metadata.difficultyByGrade)) {
      return shuffleArray([...questions]);
    }

    const levelQuestions = questions.filter(q => questionSupportsGrade(q, grade));
    if (!levelQuestions.length) return [...questions];

    const exact = [];
    const adjacent = [];
    const fallback = [];
    levelQuestions.forEach((question, index) => {
      const distance = getDifficultyDistance(question, grade, difficulty);
      const entry = { question, index, distance };
      if (distance === 0) exact.push(entry);
      else if (distance === 1) adjacent.push(entry);
      else fallback.push(entry);
    });

    const ordered = shuffleArray(exact).concat(shuffleArray(adjacent), shuffleArray(fallback))
      .map(entry => entry.question);
    return ordered.slice(0, Math.min(targetQuestionCount, ordered.length));
  }

  function questionSupportsGrade(question, grade) {
    const levels = question.metadata && question.metadata.gradeLevels;
    return !levels || levels.map(String).includes(String(grade));
  }

  function getDifficultyDistance(question, grade, difficulty) {
    const actual = question.metadata && question.metadata.difficultyByGrade
      ? question.metadata.difficultyByGrade[String(grade)] || question.metadata.difficultyByGrade[grade]
      : difficulty;
    return Math.abs(difficultyRank(actual) - difficultyRank(difficulty));
  }

  function difficultyRank(difficulty) {
    const index = difficultyOptions.indexOf(String(difficulty || '').toLowerCase());
    return index === -1 ? 1 : index;
  }

  function getSelectionSummary(questions, grade, difficulty) {
    const supported = questions.filter(q => questionSupportsGrade(q, grade));
    const exactCount = supported.filter(q => getDifficultyDistance(q, grade, difficulty) === 0).length;
    const servedCount = selectQuestionsForLevel(questions, grade, difficulty).length;
    return { exactCount, servedCount, grade, difficulty };
  }

  function renderSelectionSummary(summary) {
    const adaptiveNote = summary.exactCount >= 15
      ? 'The question pool is tightly matched to this level.'
      : 'The quiz prioritizes this level, then adds nearby grade-ready practice so the mission has at least 15 questions.';
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
    const correctChoice = question.choices && question.choices[question.correct]
      ? `Correct answer: ${question.choices[question.correct]}.`
      : '';
    const correctExplanation = question.explanation.correct || '';
    return [wrongExplanation, correctChoice, correctExplanation].filter(Boolean).join(' ');
  }

  function getStrategyHint(question) {
    const focus = question.metadata && question.metadata.feedbackFocus
      ? question.metadata.feedbackFocus
      : 'name the rule, test it against each choice, and explain the deciding clue';
    const rule = question.studyAid && question.studyAid.definition
      ? question.studyAid.definition
      : 'Read the question twice, then eliminate answers that break the rule.';
    return `Try this before answering: ${focus}. Rule to use: ${rule}`;
  }

  function getConfidenceNudge(confidence) {
    if (confidence === 'exploring') return 'Good move. Use the strategy clue, then eliminate one answer at a time.';
    if (confidence === 'certain') return 'Great. Choose the answer you can prove from the rule or sentence clue.';
    return 'Nice. Pick your answer, then check whether the explanation matches your thinking.';
  }

  function renderLearningReflection(isCorrect) {
    const confidenceText = currentConfidence
      ? {
          exploring: 'You chose Need clues.',
          thinking: 'You chose Pretty sure.',
          certain: 'You chose I can prove it.'
        }[currentConfidence]
      : 'No confidence choice was recorded.';
    const hintText = hintUsedThisQuestion
      ? 'You opened the strategy clue. That is useful when you use it to test choices, not just to peek.'
      : 'You answered without opening the strategy clue.';
    const nextMove = isCorrect
      ? 'Before the next question, say the rule in your own words.'
      : 'Before the next question, compare your answer with the correct one and name the exact clue you missed.';
    return `
      <div class="learning-reflection">
        <strong>Learning check:</strong>
        <span>${escapeHtml(confidenceText)} ${escapeHtml(hintText)} ${escapeHtml(nextMove)}</span>
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

  // Utility: shuffle array (Fisher-Yates)
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function loadProgress() {
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

  function saveQuestResult(percentage, correct, total) {
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
    progress.badges = updateBadges(progress);

    if (progressStore) {
      progressStore.saveLocalProgress(progress);
    } else {
      localStorage.setItem('grammarQuestProgress', JSON.stringify(progress));
    }

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

  function getDisplayGrade(grade) {
    const value = parseInt(grade, 10);
    return Number.isFinite(value) ? String(value - 1) : String(grade || '');
  }

  function capitalize(text) {
    const value = String(text || '');
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
  }

  // Utility: escape HTML
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
