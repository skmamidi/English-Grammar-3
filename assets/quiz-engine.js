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
  let answered = false;
  let quizContainer = null;

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
    answered = false;

    renderStartScreen(set.title);
  }

  function renderStartScreen(title) {
    quizContainer.innerHTML = `
      <div class="start-screen">
        <h2>${escapeHtml(title)}</h2>
        <p>You will answer ${currentQuestions.length} questions. 
           Each question has 4 choices. Read carefully and pick the best answer. 
           You will get feedback and study tips after each question.</p>
        <button class="btn btn-primary" id="start-btn">Start Quiz</button>
      </div>
    `;
    document.getElementById('start-btn').addEventListener('click', () => renderQuestion());
  }

  function renderQuestion() {
    answered = false;
    const q = currentQuestions[currentIndex];

    quizContainer.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-progress">Question ${currentIndex + 1} of ${currentQuestions.length}</div>
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
          ${isCorrect ? '✓ Correct!' : '✗ Not quite.'}
        </div>
        <div class="feedback-text">
          ${q.explanation && q.explanation.correct ? escapeHtml(q.explanation.correct) : ''}
        </div>
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
        <div class="results-score">${score} / ${currentQuestions.length}</div>
        <div class="results-label">${percentage}% correct</div>
        <div class="results-message">${escapeHtml(message)}</div>
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

  // Utility: escape HTML
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
