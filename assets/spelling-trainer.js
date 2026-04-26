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
    results: []
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
    state.words = shuffle([...bank.questions]).slice(0, 50);
    state.index = 0;
    state.score = 0;
    state.combo = 0;
    state.answered = false;
    state.results = [];
  }

  function renderStart() {
    const progress = loadProgress();
    const rank = getRank(progress.totalGems);
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
        <p class="quest-brief">Mission: 50 fourth-grade spelling words with sound, symbol, and syllable power.</p>
        <button class="btn btn-primary" id="start-spelling">Start Spelling Lab</button>
      </div>
    `;
    document.getElementById('start-spelling').addEventListener('click', () => {
      renderQuestion();
      setTimeout(speakCurrentWord, 250);
    });
  }

  function renderQuestion() {
    state.answered = false;
    const word = state.words[state.index];
    const progress = loadProgress();
    root.innerHTML = `
      <div class="quiz-header">
        <div class="quiz-progress">Word ${state.index + 1} of ${state.words.length}</div>
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
        <form id="spelling-form" class="spelling-form" autocomplete="off">
          <label for="spelling-answer">Spell the word</label>
          <input id="spelling-answer" name="answer" type="text" inputmode="text" autocapitalize="none" spellcheck="false" aria-describedby="spelling-help">
          <div id="spelling-help" class="spelling-help">${escapeHtml(word.syllables.split("-").length)} syllable beat${word.syllables.includes("-") ? "s" : ""}</div>
          <button class="btn btn-primary" type="submit">Check Spelling</button>
        </form>
      </div>

      <div id="feedback-area"></div>
      <div class="controls" id="controls"></div>
    `;

    document.getElementById('speak-word').addEventListener('click', speakCurrentWord);
    document.getElementById('speak-clue').addEventListener('click', () => speakText(`${word.clue}. ${word.sentence.replace("____", "blank")}`));
    document.getElementById('spelling-form').addEventListener('submit', handleSubmit);
    document.getElementById('spelling-answer').focus();
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
      detected: analysis.detected
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
        ${targetedHelp}
        <div class="study-aid">
          <div class="study-aid-title">Study Aid</div>
          <p><span class="label">Syllables:</span> ${escapeHtml(word.syllables)}</p>
          <p><span class="label">Memory move:</span> ${escapeHtml(word.memory)}</p>
          <div class="pattern-chip-row">${patternChips}</div>
        </div>
      </div>
    `;

    const isLast = state.index === state.words.length - 1;
    controls.innerHTML = `
      <button class="btn btn-secondary" id="hear-again" type="button">Hear Again</button>
      <button class="btn btn-primary" id="next-word" type="button">${isLast ? 'See Pattern Report' : 'Next Word'}</button>
    `;
    document.getElementById('hear-again').addEventListener('click', speakCurrentWord);
    document.getElementById('next-word').addEventListener('click', () => {
      if (isLast) {
        renderResults();
      } else {
        state.index += 1;
        renderQuestion();
        setTimeout(speakCurrentWord, 250);
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
