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
  const progressStore = window.GrammarQuestProgress;

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

    // Shuffle questions so each attempt is different
    currentQuestions = shuffleArray([...set.questions]);
    currentIndex = 0;
    score = 0;
    combo = 0;
    answered = false;

    renderStartScreen(set);
  }

  function renderStartScreen(set) {
    const progress = loadProgress();
    const topicName = set.topic || 'Grammar Quest';
    const rank = getRank(progress.totalGems);

    quizContainer.innerHTML = `
      <div class="start-screen">
        <div class="quest-kicker">Chapter Mission</div>
        <h2>${escapeHtml(set.title)}</h2>
        <p>The Word Woods need a careful sentence scout. Answer ${currentQuestions.length} questions, collect star gems, and keep your practice streak glowing.</p>
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
    document.getElementById('start-btn').addEventListener('click', () => renderQuestion());
  }

  function renderQuestion() {
    answered = false;
    const q = currentQuestions[currentIndex];
    const progress = loadProgress();

    quizContainer.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-progress">Question ${currentIndex + 1} of ${currentQuestions.length}</div>
        <div class="quest-mini-hud" aria-label="Quest progress">
          <span>${progress.streakDays} day streak</span>
          <span>${progress.totalGems} gems</span>
          <span>Combo ${combo}</span>
        </div>
        <div class="quiz-score">Score: ${score} / ${currentIndex}</div>
      </div>

      <div class="question-box">
        <div class="question-text">${escapeHtml(q.question)}</div>
        <div class="choices" id="choices">
          ${q.choices.map((choice, idx) => `
            <button class="choice-btn" data-index="${idx}">
              <span class="choice-letter">${String.fromCharCode(65 + idx)}</span>
              <span>${escapeHtml(choice)}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <div id="feedback-area"></div>
      <div class="controls" id="controls"></div>
    `;

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

    feedbackArea.innerHTML = `
      <div class="feedback-box">
        <div class="feedback-title ${isCorrect ? 'correct' : 'incorrect'}">
          ${isCorrect ? 'Correct! Star gem found.' : 'Not quite. The trail is still open.'}
        </div>
        <div class="feedback-text">
          ${q.explanation && q.explanation.correct ? escapeHtml(q.explanation.correct) : ''}
        </div>
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
    const reward = saveQuestResult(percentage, score, currentQuestions.length);
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
        <div class="quest-kicker">Mission Complete</div>
        <div class="results-score">${score} / ${currentQuestions.length}</div>
        <div class="results-label">${percentage}% correct</div>
        <div class="results-message">${escapeHtml(message)}</div>
        <div class="reward-panel" aria-label="Rewards earned">
          <div class="reward-main">+${reward.gemsEarned} star gems</div>
          <div class="reward-grid">
            <div><strong>${progress.streakDays}</strong><span>day streak</span></div>
            <div><strong>${progress.totalGems}</strong><span>total gems</span></div>
            <div><strong>${escapeHtml(rank.name)}</strong><span>quest rank</span></div>
          </div>
          ${badgeHtml}
          <p>${escapeHtml(reward.message)}</p>
        </div>
        <div class="controls" style="justify-content:center;">
          <button class="btn btn-primary" id="restart-btn">Try Again</button>
          <a href="./" class="btn btn-secondary">Back to Topic</a>
        </div>
      </div>
    `;

    document.getElementById('restart-btn').addEventListener('click', () => {
      initQuiz(window.QUIZ_SET_ID);
    });
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

  // Utility: escape HTML
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
