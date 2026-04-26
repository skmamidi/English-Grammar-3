(function () {
  'use strict';

  const bank = window.SPELLING_WORD_BANK;
  const root = document.getElementById('spelling-root');
  const progressStore = window.GrammarQuestProgress;
  const state = {
    words: [],
    index: 0,
    score: 0,
    combo: 0,
    answered: false,
    results: [],
    hintLevel: 0,
    selectedCount: 25,
    selectedGrade: 4,
    selectedDifficulty: "all"
  };

  const patternInfo = {
    "tricky-sight": {
      label: "High-frequency memory word",
      advice: "Build a tiny chant for the tricky part, then write it three times while saying each letter."
    },
    "vowel-team": {
      label: "Vowel team",
      advice: "Circle the vowel team and say, 'When two vowels work as a team, I check the team before I write.'"
    },
    "ough": {
      label: "ough pattern",
      advice: "Sort ough words by sound: through, though, enough, thought. Same letters, different sound jobs."
    },
    "augh": {
      label: "augh pattern",
      advice: "For augh words, lock the whole team together before the final t: caught, taught."
    },
    "silent-letter": {
      label: "Silent letter",
      advice: "Give the quiet letter a job in your memory picture so it does not disappear."
    },
    "dge": {
      label: "dge ending",
      advice: "After a short vowel, /j/ often uses dge, as in edge, bridge, and knowledge."
    },
    "schwa": {
      label: "Unstressed vowel",
      advice: "Say the word in slow syllables. The quiet syllable may sound like 'uh,' but it still needs its real vowel."
    },
    "double-consonant": {
      label: "Doubled consonant",
      advice: "Short vowel plus suffix often needs a doubled consonant: stop becomes stopped."
    },
    "silent-e": {
      label: "Silent e",
      advice: "Check whether a final e is helping an earlier vowel say its long sound."
    },
    "r-controlled": {
      label: "R-controlled vowel",
      advice: "When r controls the vowel, write the vowel-r team as a chunk: ar, er, ir, or, ur."
    },
    "vowel-r": {
      label: "Vowel plus r",
      advice: "Say the syllable slowly and mark the vowel before r. The r can make the vowel hard to hear."
    },
    "suffix-ly": {
      label: "-ly suffix",
      advice: "Listen for the base word first, then add -ly as its own spelling piece."
    },
    "suffix-ful": {
      label: "-ful suffix",
      advice: "The suffix -ful means full of, but it ends with one l."
    },
    "suffix-ed": {
      label: "-ed suffix",
      advice: "Past-tense -ed can sound like /t/, /d/, or /id/, but the spelling stays -ed."
    },
    "suffix-ing": {
      label: "-ing suffix",
      advice: "Before adding -ing, check the base word: double, drop e, or just add."
    },
    "y-to-i": {
      label: "Change y to i",
      advice: "When a word ending in consonant-y gets a suffix, the y often changes to i."
    },
    "drop-e": {
      label: "Drop final e",
      advice: "Drop silent e before a vowel suffix like -ing, then add the suffix."
    },
    "ie-ei": {
      label: "ie / ei team",
      advice: "Pause before ie or ei words. Ask whether the letters come after c or form a memory word."
    },
    "homophone": {
      label: "Homophone",
      advice: "Use the meaning clue. Sound alone cannot choose weather or whether."
    },
    "eigh": {
      label: "eigh team",
      advice: "Many eigh words say long a, like eight, weight, and straight. Height is the high exception."
    },
    "qu": {
      label: "qu team",
      advice: "Q almost always brings u along. Write qu as one starting chunk."
    },
    "suffix-ion": {
      label: "-tion / -ion ending",
      advice: "When you hear /shun/ or /chun/ at the end, check for -tion or -ion."
    },
    "suffix-al": {
      label: "-al suffix",
      advice: "Find the base word first, then add -al as the ending."
    },
    "suffix-ous": {
      label: "-ous suffix",
      advice: "The suffix -ous often sounds like /us/. Think 'full of' a quality."
    },
    "soft-g": {
      label: "Soft g",
      advice: "G can say /j/ before e, i, or y. Keep the g even when it sounds soft."
    },
    "soft-c": {
      label: "Soft c",
      advice: "C usually says /s/ before e, i, or y. Check the letter after c before choosing the sound."
    },
    "multisyllable": {
      label: "Multisyllable word",
      advice: "Clap the syllables first, then spell one word part at a time."
    },
    "suffix-y": {
      label: "-y ending",
      advice: "The -y ending can sound like long e. Keep the base word steady, then add y."
    },
    "digraph": {
      label: "Consonant digraph",
      advice: "Two letters can work together for one sound, like ch, th, sh, or ph."
    },
    "suffix": {
      label: "Suffix",
      advice: "Find the base word first, then attach the ending as its own spelling chunk."
    },
    "suffix-ment": {
      label: "-ment suffix",
      advice: "The suffix -ment turns many words into nouns. Spell the base word, then add ment."
    },
    "suffix-s": {
      label: "-s ending",
      advice: "Listen for the base word before the final s so the ending does not hide the spelling."
    },
    "suffix-en": {
      label: "-en ending",
      advice: "The -en ending can show a changed state, as in broken. Spell the base sound, then add en."
    },
    "school-vocabulary": {
      label: "School vocabulary",
      advice: "These are class vocabulary words. Say the syllables, picture where the word appears at school, then write each chunk."
    },
    "compound": {
      label: "Compound word",
      advice: "Break the word into its smaller words or parts, spell each part, then join them."
    },
    "prefix": {
      label: "Prefix",
      advice: "Find the prefix first, then spell the base word after it."
    }
  };

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    if (!root) return;
    if (!bank || !Array.isArray(bank.questions) || bank.questions.length === 0) {
      root.innerHTML = '<div class="card"><p class="page-subtitle">Spelling words are coming soon.</p></div>';
      return;
    }
    reset();
    renderStart();
  }

  function reset() {
    state.words = [];
    state.index = 0;
    state.score = 0;
    state.combo = 0;
    state.answered = false;
    state.hintLevel = 0;
    state.results = [];
  }

  function buildQuestionSet() {
    const available = getAvailableWords();
    const limit = state.selectedCount === "all"
      ? available.length
      : Math.min(state.selectedCount, available.length);
    state.words = shuffle([...available]).slice(0, limit);
    state.index = 0;
    state.score = 0;
    state.combo = 0;
    state.answered = false;
    state.hintLevel = 0;
    state.results = [];
  }

  function getAvailableWords() {
    const gradeWords = getGradeWords();
    if (state.selectedDifficulty === "all") return gradeWords;
    return gradeWords.filter(question => getQuestionLevel(question) === state.selectedDifficulty);
  }

  function getGradeWords() {
    return bank.questions.filter(question => question.levels && question.levels[String(state.selectedGrade)]);
  }

  function getQuestionLevel(question) {
    if (question.levels && question.levels[String(state.selectedGrade)]) {
      return question.levels[String(state.selectedGrade)];
    }
    return question.difficulty || "medium";
  }

  function renderStart() {
    const progress = loadProgress();
    const rank = getRank(progress.totalGems);
    const availableCount = getAvailableWords().length;
    const plannedCount = state.selectedCount === "all"
      ? availableCount
      : Math.min(state.selectedCount, availableCount);
    root.innerHTML = `
      <div class="start-screen spelling-start">
        <div class="quest-kicker">New Trail</div>
        <h2>${escapeHtml(bank.title)}</h2>
        <p>Listen to each word, use the clue, then spell it in the box. The lab will spot patterns in missed words and give you memory tricks after every answer.</p>
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
        <div class="spelling-setup" aria-label="Spelling lab setup">
          <div class="spelling-setup-group">
            <div class="setup-label">Grade Level</div>
            <div class="setup-options" role="group" aria-label="Grade level">
              ${renderGradeOptions()}
            </div>
          </div>
          <div class="spelling-setup-group">
            <div class="setup-label">Question Count</div>
            <div class="setup-options" role="group" aria-label="Question count">
              ${renderCountOptions(availableCount)}
            </div>
          </div>
          <div class="spelling-setup-group">
            <div class="setup-label">Difficulty</div>
            <div class="setup-options" role="group" aria-label="Difficulty level">
              ${renderDifficultyOptions()}
            </div>
          </div>
        </div>
        <p class="quest-brief">Mission: ${plannedCount} ${escapeHtml(getDifficultyLabel(state.selectedDifficulty).toLowerCase())} ${escapeHtml(getGradeLabel(state.selectedGrade))} spelling word${plannedCount === 1 ? "" : "s"} with sound, symbol, and syllable power.</p>
        <button class="btn btn-primary" id="start-spelling">Start Spelling Lab</button>
      </div>
    `;
    document.querySelectorAll('[data-grade-option]').forEach(button => {
      button.addEventListener('click', () => {
        state.selectedGrade = Number(button.dataset.gradeOption);
        renderStart();
      });
    });
    document.querySelectorAll('[data-count-option]').forEach(button => {
      button.addEventListener('click', () => {
        const value = button.dataset.countOption;
        state.selectedCount = value === "all" ? "all" : Number(value);
        renderStart();
      });
    });
    document.querySelectorAll('[data-difficulty-option]').forEach(button => {
      button.addEventListener('click', () => {
        state.selectedDifficulty = button.dataset.difficultyOption;
        if (state.selectedCount !== "all" && getAvailableWords().length < state.selectedCount) {
          state.selectedCount = "all";
        }
        renderStart();
      });
    });
    document.getElementById('start-spelling').addEventListener('click', () => {
      buildQuestionSet();
      renderQuestion();
    });
  }

  function renderGradeOptions() {
    return [3, 4, 5, 6].map(grade => {
      const selected = state.selectedGrade === grade;
      return `
        <button class="setup-chip ${selected ? "selected" : ""}" type="button" data-grade-option="${grade}" aria-pressed="${selected}">
          ${escapeHtml(getGradeLabel(grade))}
        </button>
      `;
    }).join('');
  }

  function getGradeLabel(grade) {
    return `Grade ${grade - 1}`;
  }

  function renderCountOptions(availableCount) {
    const options = [15, 25, 50, 100, "all"];
    return options.map(option => {
      const isAll = option === "all";
      const label = isAll ? `All (${availableCount})` : String(option);
      const disabled = !isAll && availableCount < option;
      const selected = state.selectedCount === option || (!isAll && Number(state.selectedCount) === option);
      return `
        <button class="setup-chip ${selected ? "selected" : ""}" type="button" data-count-option="${option}" ${disabled ? "disabled" : ""} aria-pressed="${selected}">
          ${escapeHtml(label)}
        </button>
      `;
    }).join('');
  }

  function renderDifficultyOptions() {
    const options = ["all", "easy", "medium", "hard"];
    const gradeWords = getGradeWords();
    return options.map(option => {
      const selected = state.selectedDifficulty === option;
      const count = option === "all"
        ? gradeWords.length
        : gradeWords.filter(question => getQuestionLevel(question) === option).length;
      return `
        <button class="setup-chip ${selected ? "selected" : ""}" type="button" data-difficulty-option="${option}" aria-pressed="${selected}">
          ${escapeHtml(getDifficultyLabel(option))} <span>${count}</span>
        </button>
      `;
    }).join('');
  }

  function getDifficultyLabel(difficulty) {
    if (difficulty === "easy") return "Easy";
    if (difficulty === "medium") return "Medium";
    if (difficulty === "hard") return "Hard";
    return "All Levels";
  }

  function renderQuestion() {
    state.answered = false;
    state.hintLevel = 0;
    const word = state.words[state.index];
    const progress = loadProgress();
    root.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-progress">Word ${state.index + 1} of ${state.words.length} · ${escapeHtml(getGradeLabel(state.selectedGrade))} · ${escapeHtml(getDifficultyLabel(state.selectedDifficulty))}</div>
        <div class="quest-mini-hud" aria-label="Quest progress">
          <span>${progress.streakDays} day streak</span>
          <span>${progress.totalGems} gems</span>
          <span>Combo ${state.combo}</span>
        </div>
        <div class="quiz-score">Score: ${state.score} / ${state.index}</div>
      </div>

      <div class="question-box spelling-question">
        <div class="spelling-listen-row">
          <button class="btn btn-primary" id="speak-word" type="button">Play Word</button>
          <button class="btn btn-secondary" id="speak-clue" type="button">Play Clue</button>
        </div>
        <div class="spelling-clue">
          <span class="quest-kicker">Meaning Clue</span>
          <p>${escapeHtml(word.clue)}</p>
        </div>
        <div class="spelling-sentence">${escapeHtml(word.sentence)}</div>
        <div class="spelling-hint-ladder">
          <button class="btn btn-secondary" id="hint-button" type="button">Get Hint</button>
          <div class="hint-panel" id="hint-panel" aria-live="polite"></div>
        </div>
        <form id="spelling-form" class="spelling-form" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">
          <label for="spelling-answer">Spell the word</label>
          <input id="spelling-answer" name="spelling-${state.index + 1}-${Date.now()}" type="text" inputmode="text" autocomplete="new-password" autocorrect="off" autocapitalize="none" spellcheck="false" data-form-type="other" aria-describedby="spelling-help paste-guard-message">
          <div id="spelling-help" class="spelling-help">${escapeHtml(word.syllables.split("-").length)} syllable beat${word.syllables.includes("-") ? "s" : ""}</div>
          <div id="paste-guard-message" class="spelling-help paste-guard-message" aria-live="polite"></div>
          <button class="btn btn-primary" type="submit">Check Spelling</button>
        </form>
      </div>

      <div id="feedback-area"></div>
      <div class="controls" id="controls"></div>
    `;

    document.getElementById('speak-word').addEventListener('click', speakCurrentWord);
    document.getElementById('speak-clue').addEventListener('click', () => speakText(`${word.clue}. ${word.sentence.replace("____", "blank")}`));
    document.getElementById('hint-button').addEventListener('click', () => showNextHint(word));
    document.getElementById('spelling-form').addEventListener('submit', handleSubmit);
    const answerInput = document.getElementById('spelling-answer');
    answerInput.addEventListener('paste', blockPastedAnswer);
    answerInput.addEventListener('drop', blockPastedAnswer);
    answerInput.addEventListener('contextmenu', blockPastedAnswer);
    answerInput.addEventListener('beforeinput', blockInsertedAnswer);
    answerInput.focus();
  }

  function blockPastedAnswer(event) {
    event.preventDefault();
    showPasteGuardMessage();
  }

  function blockInsertedAnswer(event) {
    if (event.inputType === 'insertFromPaste' || event.inputType === 'insertFromDrop') {
      event.preventDefault();
      showPasteGuardMessage();
    }
  }

  function showPasteGuardMessage() {
    const message = document.getElementById('paste-guard-message');
    if (!message) return;
    message.textContent = 'Type the word yourself so your spelling muscles get the workout.';
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (state.answered) return;

    const input = document.getElementById('spelling-answer');
    const attempt = input.value.trim();
    if (!attempt) {
      input.focus();
      input.classList.add('needs-answer');
      return;
    }

    state.answered = true;
    input.disabled = true;
    input.classList.remove('needs-answer');

    const word = state.words[state.index];
    const analysis = analyzeAttempt(word, attempt);
    if (analysis.correct) state.score += 1;
    state.combo = analysis.correct ? state.combo + 1 : 0;
    state.results.push({
      word: word.word,
      attempt,
      correct: analysis.correct,
      patterns: analysis.patterns,
      detected: analysis.detected,
      hintsUsed: state.hintLevel
    });

    const scoreEl = document.querySelector('.quiz-score');
    if (scoreEl) scoreEl.textContent = `Score: ${state.score} / ${state.index + 1}`;

    renderFeedback(word, attempt, analysis);
  }

  function renderFeedback(word, attempt, analysis) {
    const feedbackArea = document.getElementById('feedback-area');
    const controls = document.getElementById('controls');
    const patternChips = analysis.patterns.map(key => {
      const info = patternInfo[key] || { label: key };
      return `<span>${escapeHtml(info.label)}</span>`;
    }).join('');
    const targetedHelp = analysis.detected.length
      ? `<div class="spelling-analysis"><strong>Pattern spotted:</strong> ${analysis.detected.map(escapeHtml).join(' ')}</div>`
      : '';
    const comboMessage = analysis.correct && state.combo >= 3
      ? `<div class="quest-reward-note">Sound-symbol streak: ${state.combo} correct in a row.</div>`
      : '';
    const hintNote = state.hintLevel
      ? `<div class="spelling-analysis"><strong>Hint trail used:</strong> ${state.hintLevel} hint${state.hintLevel === 1 ? "" : "s"}. Try one less hint next time for extra automaticity.</div>`
      : '';
    const spellScan = renderSpellScan(word.word, attempt);
    const correctionReplay = analysis.correct ? '' : renderCorrectionReplay(word);

    feedbackArea.innerHTML = `
      <div class="feedback-box">
        <div class="feedback-title ${analysis.correct ? 'correct' : 'incorrect'}">
          ${analysis.correct ? 'Correct! The word locked into place.' : 'Good try. Let us tune the pattern.'}
        </div>
        <div class="spelling-answer-line">
          <span>Your spelling: <strong>${escapeHtml(attempt)}</strong></span>
          <span>Target word: <strong>${escapeHtml(word.word)}</strong></span>
        </div>
        ${comboMessage}
        ${hintNote}
        ${targetedHelp}
        ${spellScan}
        <div class="study-aid">
          <div class="study-aid-title">Study Aid</div>
          <p><span class="label">Syllables:</span> ${escapeHtml(word.syllables)}</p>
          <p><span class="label">Memory move:</span> ${escapeHtml(word.memory)}</p>
          <div class="pattern-chip-row">${patternChips}</div>
        </div>
        ${correctionReplay}
      </div>
    `;

    const isLast = state.index === state.words.length - 1;
    controls.innerHTML = `
      <button class="btn btn-secondary" id="hear-again" type="button">Hear Again</button>
      <button class="btn btn-primary" id="next-word" type="button" ${analysis.correct ? '' : 'disabled'}>${isLast ? 'See Pattern Report' : 'Next Word'}</button>
    `;
    document.getElementById('hear-again').addEventListener('click', speakCurrentWord);
    if (!analysis.correct) attachCorrectionReplay(word);
    document.getElementById('next-word').addEventListener('click', () => {
      if (isLast) {
        renderResults();
      } else {
        state.index += 1;
        renderQuestion();
      }
    });
  }

  function showNextHint(word) {
    state.hintLevel = Math.min(state.hintLevel + 1, 3);
    const panel = document.getElementById('hint-panel');
    const button = document.getElementById('hint-button');
    if (!panel || !button) return;
    panel.innerHTML = renderHint(word, state.hintLevel);
    if (state.hintLevel >= 3) {
      button.disabled = true;
      button.textContent = 'Hints Open';
    } else {
      button.textContent = 'Get Another Hint';
    }
  }

  function renderHint(word, level) {
    const patternLabels = (word.patterns || []).map(pattern => {
      const info = patternInfo[pattern] || { label: pattern };
      return `<span>${escapeHtml(info.label)}</span>`;
    }).join('');
    const cleanWord = normalize(word.word);
    const first = cleanWord[0] || '';
    const last = cleanWord[cleanWord.length - 1] || '';
    const vowelMap = cleanWord.split('').map(letter => 'aeiou'.includes(letter) ? letter : '_').join(' ');
    const syllableMap = (word.syllables || word.word)
      .split('-')
      .map(part => `${escapeHtml(part[0] || '')}${part.length > 1 ? '•'.repeat(part.length - 1) : ''}`)
      .join(' / ');

    if (level === 1) {
      return `
        <div class="hint-card">
          <strong>Hint 1: Pattern Hunt</strong>
          <p>Watch these spelling jobs in the word.</p>
          <div class="pattern-chip-row">${patternLabels}</div>
        </div>
      `;
    }
    if (level === 2) {
      return `
        <div class="hint-card">
          <strong>Hint 2: Word Shape</strong>
          <p>It starts with <b>${escapeHtml(first)}</b>, ends with <b>${escapeHtml(last)}</b>, and has ${cleanWord.length} letters.</p>
          <div class="word-shape">${escapeHtml(first)}${' _'.repeat(Math.max(0, cleanWord.length - 2))} ${escapeHtml(last)}</div>
        </div>
      `;
    }
    return `
      <div class="hint-card">
        <strong>Hint 3: Vowels and Beats</strong>
        <p>Vowels: ${escapeHtml(vowelMap)}</p>
        <p>Syllable starter map: ${syllableMap}</p>
      </div>
    `;
  }

  function renderSpellScan(expectedWord, attempt) {
    const expected = normalize(expectedWord).split('');
    const actual = normalize(attempt).split('');
    const max = Math.max(expected.length, actual.length);
    const cells = [];
    for (let index = 0; index < max; index++) {
      const expectedLetter = expected[index] || '';
      const actualLetter = actual[index] || '';
      const status = expectedLetter === actualLetter
        ? 'match'
        : actualLetter
          ? 'miss'
          : 'blank';
      cells.push(`
        <div class="spell-scan-cell ${status}">
          <span>${escapeHtml(actualLetter || '·')}</span>
          <small>${escapeHtml(expectedLetter || '+')}</small>
        </div>
      `);
    }
    return `
      <div class="spell-scan">
        <div class="spell-scan-title">Spell Scan</div>
        <div class="spell-scan-grid">${cells.join('')}</div>
        <p>Top letter is what you typed. Bottom letter is the target spelling.</p>
      </div>
    `;
  }

  function renderCorrectionReplay(word) {
    return `
      <form class="correction-replay" id="correction-replay" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false">
        <label for="correction-answer">Lock it in once</label>
        <div class="correction-row">
          <input id="correction-answer" type="text" inputmode="text" autocomplete="new-password" autocorrect="off" autocapitalize="none" spellcheck="false" data-form-type="other" aria-describedby="correction-message">
          <button class="btn btn-secondary" type="submit">Lock In</button>
        </div>
        <div id="correction-message" class="spelling-help" aria-live="polite">Type the correct spelling before moving on.</div>
      </form>
    `;
  }

  function attachCorrectionReplay(word) {
    const form = document.getElementById('correction-replay');
    const input = document.getElementById('correction-answer');
    const message = document.getElementById('correction-message');
    const nextButton = document.getElementById('next-word');
    if (!form || !input || !message || !nextButton) return;

    input.addEventListener('paste', blockPastedAnswer);
    input.addEventListener('drop', blockPastedAnswer);
    input.addEventListener('contextmenu', blockPastedAnswer);
    input.addEventListener('beforeinput', blockInsertedAnswer);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (normalize(input.value) === normalize(word.word)) {
        input.disabled = true;
        nextButton.disabled = false;
        message.textContent = 'Locked in. Nice repair.';
        form.classList.add('locked');
      } else {
        input.classList.add('needs-answer');
        message.textContent = 'Almost. Copy the target spelling exactly once.';
      }
    });
  }

  function renderResults() {
    const percentage = Math.round((state.score / state.words.length) * 100);
    const reward = saveQuestResult(percentage, state.score, state.words.length);
    const progress = reward.progress;
    const rank = getRank(progress.totalGems);
    const patternSummary = getPatternSummary();
    const missed = state.results.filter(item => !item.correct);
    const badgeHtml = progress.badges.length
      ? `<div class="badge-row">${progress.badges.map(badge => `<span>${escapeHtml(badge)}</span>`).join('')}</div>`
      : '';

    root.innerHTML = `
      <div class="results-box spelling-results">
        <div class="quest-kicker">Lab Report Complete</div>
        <div class="results-score">${state.score} / ${state.words.length}</div>
        <div class="results-label">${percentage}% correct</div>
        <div class="results-message">${escapeHtml(getResultMessage(percentage))}</div>
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
        ${renderPatternSummary(patternSummary)}
        ${renderMissedWords(missed)}
        <div class="controls" style="justify-content:center;">
          <button class="btn btn-primary" id="restart-spelling">Try Again</button>
          <a href="../../index.html" class="btn btn-secondary">All Topics</a>
        </div>
      </div>
    `;

    document.getElementById('restart-spelling').addEventListener('click', () => {
      reset();
      renderStart();
    });
  }

  function analyzeAttempt(word, attempt) {
    const expected = normalize(word.word);
    const actual = normalize(attempt);
    const correct = expected === actual;
    const detected = [];

    if (!correct) {
      if (levenshtein(expected, actual) <= 2) {
        detected.push("You were close. This looks like a proofreading miss, so slow-check each syllable.");
      }
      if (word.patterns.includes("silent-letter") && missingLetters(expected, actual).some(letter => "wsk".includes(letter))) {
        detected.push("A silent letter may have slipped away.");
      }
      if (word.patterns.includes("silent-e") && expected.endsWith("e") && actual === expected.slice(0, -1)) {
        detected.push("The final silent e is missing.");
      }
      if (word.patterns.includes("double-consonant") && hasMissedDouble(expected, actual)) {
        detected.push("A doubled consonant needs a second copy.");
      }
      if (word.patterns.includes("y-to-i") && actual.includes("y") && expected.includes("i")) {
        detected.push("Watch the y-to-i change before the suffix.");
      }
      if (word.patterns.includes("drop-e") && actual.includes("e") && !expected.includes("e")) {
        detected.push("This base word drops silent e before the suffix.");
      }
      if (word.patterns.includes("ie-ei") && swappedTeam(expected, actual, "ie", "ei")) {
        detected.push("The ie/ei team is reversed.");
      }
      if (word.patterns.includes("ough") && !actual.includes("ough")) {
        detected.push("The ough team needs to stay together.");
      }
      if (word.patterns.includes("augh") && !actual.includes("augh")) {
        detected.push("The augh team needs to stay together.");
      }
      if (word.patterns.includes("eigh") && !actual.includes("eigh")) {
        detected.push("The eigh team is the tricky sound-symbol chunk here.");
      }
      if (word.patterns.includes("qu") && expected.includes("qu") && !actual.includes("qu")) {
        detected.push("Remember that q usually brings u.");
      }
      if (word.patterns.includes("suffix-ion") && !actual.endsWith("ion") && !actual.endsWith("tion")) {
        detected.push("Listen for the ending and check whether it needs -tion or -ion.");
      }
      if (word.patterns.includes("suffix-ful") && actual.endsWith("full")) {
        detected.push("The suffix -ful ends with one l.");
      }
      if (word.patterns.includes("suffix-ous") && !actual.endsWith("ous")) {
        detected.push("The ending sounds like /us/, but it is spelled -ous.");
      }
      if (word.patterns.includes("homophone")) {
        detected.push("This is a meaning-choice word. Use the clue, not only the sound.");
      }
      if (!detected.length) {
        detected.push("Break the word into syllables, then compare each chunk with the target spelling.");
      }
    }

    return { correct, detected, patterns: word.patterns };
  }

  function getPatternSummary() {
    const missedPatterns = new Map();
    state.results.filter(item => !item.correct).forEach(item => {
      item.patterns.forEach(pattern => {
        missedPatterns.set(pattern, (missedPatterns.get(pattern) || 0) + 1);
      });
    });
    return Array.from(missedPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }

  function renderPatternSummary(summary) {
    if (!summary.length) {
      return `
        <div class="spelling-report">
          <h3>Pattern Power</h3>
          <p>No missed pattern clusters today. That is strong automaticity.</p>
        </div>
      `;
    }
    return `
      <div class="spelling-report">
        <h3>Patterns to Practice Next</h3>
        ${summary.map(([key, count]) => {
          const info = patternInfo[key] || { label: key, advice: "Practice this pattern with three more words." };
          return `
            <div class="pattern-report-item">
              <strong>${escapeHtml(info.label)}</strong>
              <span>${count} missed word${count === 1 ? "" : "s"}</span>
              <p>${escapeHtml(info.advice)}</p>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderMissedWords(missed) {
    if (!missed.length) return '';
    return `
      <div class="spelling-report">
        <h3>Words to Replay</h3>
        <div class="missed-word-grid">
          ${missed.map(item => `
            <div>
              <strong>${escapeHtml(item.word)}</strong>
              <span>you wrote ${escapeHtml(item.attempt)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function speakCurrentWord() {
    const word = state.words[state.index];
    if (!word) return;
    speakText(word.word);
  }

  function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.78;
    utterance.pitch = 1.04;
    window.speechSynthesis.speak(utterance);
  }

  function getResultMessage(percentage) {
    if (percentage >= 90) return "Outstanding spelling control. Your sound-symbol map is glowing.";
    if (percentage >= 75) return "Great work. A few pattern tune-ups will make these words faster.";
    if (percentage >= 60) return "Solid effort. The pattern report shows exactly what to practice next.";
    return "Keep going. Use the memory moves, replay the words, and hunt one pattern at a time.";
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
      return Object.assign(fallback, JSON.parse(localStorage.getItem('grammarQuestProgress')) || {});
    } catch (error) {
      return fallback;
    }
  }

  function saveQuestResult(percentage, correct) {
    const progress = loadProgress();
    const today = getDateKey(0);
    const yesterday = getDateKey(-1);
    let streakBonus = 0;

    if (progress.lastPracticeDate !== today) {
      progress.streakDays = progress.lastPracticeDate === yesterday ? progress.streakDays + 1 : 1;
      progress.lastPracticeDate = today;
    }

    const baseGems = correct * 2;
    const masteryBonus = percentage >= 90 ? 12 : percentage >= 75 ? 6 : 0;
    if (progress.streakDays > 0 && progress.streakDays % 3 === 0) streakBonus = 8;
    const gemsEarned = baseGems + masteryBonus + streakBonus;

    progress.totalGems += gemsEarned;
    progress.quizzesCompleted += 1;
    progress.bestScore = Math.max(progress.bestScore || 0, percentage);
    progress.badges = updateBadges(progress, percentage);

    if (progressStore) {
      progressStore.saveLocalProgress(progress);
    } else {
      localStorage.setItem('grammarQuestProgress', JSON.stringify(progress));
    }

    let message = "Every spelled word strengthens your reading and writing speed.";
    if (streakBonus) message = "Three-day streak bonus unlocked.";
    else if (masteryBonus) message = "Accuracy bonus unlocked for sharp spelling.";

    return { gemsEarned, message, progress };
  }

  function updateBadges(progress, percentage) {
    const badges = new Set(progress.badges || []);
    if (progress.quizzesCompleted >= 1) badges.add('First Quest');
    if (progress.streakDays >= 3) badges.add('3-Day Trail');
    if (progress.bestScore >= 90) badges.add('Sharp-Eyed Editor');
    if (progress.totalGems >= 100) badges.add('Gem Keeper');
    if (percentage >= 90) badges.add('Sound-Symbol Star');
    return Array.from(badges);
  }

  function getRank(gems) {
    if (gems >= 250) return { name: 'Word Wizard' };
    if (gems >= 120) return { name: 'Story Ranger' };
    if (gems >= 50) return { name: 'Sentence Scout' };
    return { name: 'Trail Starter' };
  }

  function getDateKey(offsetDays) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function normalize(value) {
    return String(value).toLowerCase().replace(/[^a-z]/g, '');
  }

  function missingLetters(expected, actual) {
    const missing = [];
    let actualIndex = 0;
    for (let i = 0; i < expected.length; i++) {
      if (expected[i] === actual[actualIndex]) actualIndex += 1;
      else missing.push(expected[i]);
    }
    return missing;
  }

  function hasMissedDouble(expected, actual) {
    for (let i = 1; i < expected.length; i++) {
      if (expected[i] === expected[i - 1] && !actual.includes(expected[i] + expected[i])) return true;
    }
    return false;
  }

  function swappedTeam(expected, actual, first, second) {
    return (expected.includes(first) && actual.includes(second)) ||
      (expected.includes(second) && actual.includes(first));
  }

  function levenshtein(a, b) {
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[b.length][a.length];
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
})();
