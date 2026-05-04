(function () {
  'use strict';

  const bank = window.SPELLING_WORD_BANK;
  const root = document.getElementById('spelling-root');
  const progressStore = window.GrammarQuestProgress;
  const assessmentGuard = progressStore && progressStore.activeAssessment;
  const audioManifest = window.SPELLING_AUDIO_MANIFEST && window.SPELLING_AUDIO_MANIFEST.entries || {};
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
    selectedDifficulty: "all",
    sessionStartedAt: 0,
    questionStartedAt: 0
  };

  const pronunciationOverrides = {
    answer: { speech: "answer", slow: ["an", "ser"] },
    architect: { speech: "architect", slow: ["arc", "uh", "tect"], stressIndex: 0 },
    beautiful: { speech: "beautiful", slow: ["byoo", "ti", "ful"], stressIndex: 0 },
    brought: { speech: "brought", slow: ["brawt"] },
    bureau: { speech: "byoo roh", slow: ["byoo", "roh"], stressIndex: 0 },
    business: { speech: "business", slow: ["biz", "ness"], stressIndex: 0 },
    campaign: { speech: "campaign", slow: ["cam", "pain"], stressIndex: 1 },
    character: { speech: "character", slow: ["care", "ick", "ter"], stressIndex: 0 },
    chronological: { speech: "chronological", slow: ["kron", "uh", "loj", "i", "kul"], stressIndex: 2 },
    colleague: { speech: "colleague", slow: ["kol", "leeg"], stressIndex: 0 },
    conscience: { speech: "conscience", slow: ["kon", "shuns"], stressIndex: 0 },
    conscious: { speech: "conscious", slow: ["kon", "shus"], stressIndex: 0 },
    enough: { speech: "enough", slow: ["en", "uff"], stressIndex: 1 },
    february: { speech: "February", slow: ["feb", "roo", "air", "ee"], stressIndex: 0 },
    foreign: { speech: "foreign", slow: ["for", "in"], stressIndex: 0 },
    height: { speech: "height", slow: ["hite"] },
    honestly: { speech: "honestly", slow: ["on", "est", "lee"], stressIndex: 0 },
    island: { speech: "island", slow: ["eye", "land"], stressIndex: 0 },
    knowledge: { speech: "knowledge", slow: ["nol", "edge"], stressIndex: 0 },
    neighbor: { speech: "neighbor", slow: ["nay", "ber"], stressIndex: 0 },
    question: { speech: "question", slow: ["kwes", "chun"], stressIndex: 0 },
    restaurant: { speech: "restaurant", slow: ["res", "tuh", "ront"], stressIndex: 0 },
    rhythm: { speech: "rhythm", slow: ["rith", "um"], stressIndex: 0 },
    soldier: { speech: "soldier", slow: ["sole", "jer"], stressIndex: 0 },
    sovereignty: { speech: "sovereignty", slow: ["sov", "rin", "tee"], stressIndex: 0 },
    thesaurus: { speech: "thesaurus", slow: ["thuh", "sor", "us"], stressIndex: 1 },
    though: { speech: "though", slow: ["thoh"] },
    thought: { speech: "thought", slow: ["thawt"] },
    through: { speech: "through", slow: ["throo"] },
    vehicle: { speech: "vehicle", slow: ["vee", "uh", "kul"], stressIndex: 0 },
    whole: { speech: "whole", slow: ["hole"] },
    whose: { speech: "whose", slow: ["hooz"] }
  };

  let preferredSpeechVoice = null;
  let speechSequenceTimer = null;
  let activeWordAudio = null;
  let audioSequenceId = 0;

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
    prepareSpeechVoices();
    if (!bank || !Array.isArray(bank.questions) || bank.questions.length === 0) {
      root.innerHTML = '<div class="card"><p class="page-subtitle">Spelling words are coming soon.</p></div>';
      return;
    }
    state.selectedGrade = getInitialGrade();
    state.selectedCount = normalizeCountOption(loadSetting('grammarQuestSpellingCount', state.selectedCount));
    state.selectedDifficulty = normalizeDifficultyOption(loadSetting('grammarQuestSpellingDifficulty', state.selectedDifficulty));
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
    state.sessionStartedAt = 0;
    state.questionStartedAt = 0;
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
    state.sessionStartedAt = Date.now();
    state.questionStartedAt = 0;
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
    const parentMode = isParentMode();
    const rank = getRank(progress.totalGems);
    const availableCount = getAvailableWords().length;
    const plannedCount = state.selectedCount === "all"
      ? availableCount
      : Math.min(state.selectedCount, availableCount);
    const resumableLab = parentMode ? null : getResumableSpellingLab();
    const resumeCard = resumableLab ? `
        <div class="resume-quiz-card">
          <div>
            <strong>Resume unfinished spelling lab</strong>
            <span>${escapeHtml(resumableLab.title || bank.title)} · ${getResumePositionLabel(resumableLab)}</span>
          </div>
          <button class="btn btn-secondary" id="resume-spelling" type="button">Resume</button>
          <button class="btn btn-secondary" id="discard-spelling-resume" type="button">Discard</button>
        </div>
      ` : '';
    root.innerHTML = `
      <div class="start-screen spelling-start">
        <div class="quest-kicker">${parentMode ? 'Parent Question Preview' : 'New Trail'}</div>
        <h2>${escapeHtml(bank.title)}</h2>
        <p>Listen to each word, use the clue, then spell it in the box. The lab will spot patterns in missed words and give you memory tricks after every answer.</p>
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
        ${resumeCard}
        <p class="quest-brief">Mission: ${plannedCount} ${escapeHtml(getDifficultyLabel(state.selectedDifficulty).toLowerCase())} ${escapeHtml(getGradeLabel(state.selectedGrade))} spelling word${plannedCount === 1 ? "" : "s"} with sound, symbol, and syllable power.</p>
        <button class="btn btn-primary" id="start-spelling">${parentMode ? 'Preview Spelling Lab' : 'Start Spelling Lab'}</button>
      </div>
    `;
    document.querySelectorAll('[data-grade-option]').forEach(button => {
      button.addEventListener('click', () => {
        state.selectedGrade = Number(button.dataset.gradeOption);
        saveSetting('grammarQuestSpellingGrade', String(state.selectedGrade));
        renderStart();
      });
    });
    document.querySelectorAll('[data-count-option]').forEach(button => {
      button.addEventListener('click', () => {
        const value = button.dataset.countOption;
        state.selectedCount = value === "all" ? "all" : Number(value);
        saveSetting('grammarQuestSpellingCount', String(state.selectedCount));
        renderStart();
      });
    });
    document.querySelectorAll('[data-difficulty-option]').forEach(button => {
      button.addEventListener('click', () => {
        state.selectedDifficulty = button.dataset.difficultyOption;
        if (state.selectedCount !== "all" && getAvailableWords().length < state.selectedCount) {
          state.selectedCount = "all";
        }
        saveSetting('grammarQuestSpellingDifficulty', state.selectedDifficulty);
        renderStart();
      });
    });
    const resumeButton = document.getElementById('resume-spelling');
    if (resumeButton) {
      resumeButton.addEventListener('click', () => resumeSpellingLab(resumableLab));
    }
    const discardButton = document.getElementById('discard-spelling-resume');
    if (discardButton) {
      discardButton.addEventListener('click', () => {
        clearActiveSpellingLab();
        renderStart();
      });
    }
    document.getElementById('start-spelling').addEventListener('click', () => {
      buildQuestionSet();
      saveActiveSpellingLab();
      startAssessmentGuard();
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
    const word = state.words[state.index];
    const completedResult = getCompletedResultForIndex(state.index);
    const isCompletedView = !!completedResult;
    state.answered = isCompletedView;
    state.hintLevel = isCompletedView ? Number(completedResult.hintsUsed) || 0 : 0;
    if (!isCompletedView) state.questionStartedAt = Date.now();
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
          <button class="btn btn-secondary" id="speak-word-slow" type="button">Play Slowly</button>
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
          <input id="spelling-answer" name="spelling-${state.index + 1}-${Date.now()}" type="text" inputmode="text" autocomplete="new-password" autocorrect="off" autocapitalize="none" spellcheck="false" data-form-type="other" aria-describedby="spelling-help paste-guard-message" value="${escapeHtml(completedResult ? completedResult.attempt : '')}" ${isCompletedView ? 'disabled' : ''}>
          <div id="spelling-help" class="spelling-help">${escapeHtml(word.syllables.split("-").length)} syllable beat${word.syllables.includes("-") ? "s" : ""}</div>
          <div id="paste-guard-message" class="spelling-help paste-guard-message" aria-live="polite"></div>
          ${isCompletedView ? '<div class="answered-lock-note">Answered and locked for this attempt.</div>' : ''}
          <button class="btn btn-primary" type="submit" ${isCompletedView ? 'disabled' : ''}>Check Spelling</button>
        </form>
        <div class="question-report-actions">
          <button class="report-question-btn" id="report-spelling-question-btn" type="button">Report this question</button>
          <span id="question-report-status" aria-live="polite"></span>
        </div>
      </div>

      <div id="feedback-area"></div>
      <div class="controls" id="controls"></div>
    `;

    document.getElementById('speak-word').addEventListener('click', speakCurrentWord);
    document.getElementById('speak-word-slow').addEventListener('click', speakCurrentWordSlowly);
    document.getElementById('speak-clue').addEventListener('click', () => speakText(`${word.clue}. ${word.sentence.replace("____", "blank")}`));
    document.getElementById('hint-button').addEventListener('click', () => showNextHint(word));
    const reportButton = document.getElementById('report-spelling-question-btn');
    if (reportButton) reportButton.addEventListener('click', () => openSpellingQuestionReportDialog(word));
    const answerInput = document.getElementById('spelling-answer');
    if (isCompletedView) {
      renderFeedback(word, completedResult.attempt, getAnalysisFromResult(completedResult), { completedView: true });
    } else {
      document.getElementById('spelling-form').addEventListener('submit', handleSubmit);
      answerInput.addEventListener('paste', blockPastedAnswer);
      answerInput.addEventListener('drop', blockPastedAnswer);
      answerInput.addEventListener('contextmenu', blockPastedAnswer);
      answerInput.addEventListener('beforeinput', blockInsertedAnswer);
      answerInput.focus();
    }
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
    const durationSeconds = state.questionStartedAt ? Math.max(1, Math.round((Date.now() - state.questionStartedAt) / 1000)) : 0;
    if (analysis.correct) state.score += 1;
    state.combo = analysis.correct ? state.combo + 1 : 0;
    state.results.push({
      id: getWordAttemptId(word),
      word: word.word,
      attempt,
      correct: analysis.correct,
      patterns: analysis.patterns,
      detected: analysis.detected,
      hintsUsed: state.hintLevel,
      durationSeconds,
      grade: state.selectedGrade,
      difficulty: getQuestionLevel(word),
      clue: word.clue,
      sentence: word.sentence,
      syllables: word.syllables,
      pronunciation: word.pronunciation || '',
      pronunciationSyllables: Array.isArray(word.pronunciationSyllables) ? word.pronunciationSyllables : [],
      memory: word.memory,
      repaired: analysis.correct,
      metadata: getSpellingAttemptMetadata(word, state.index + 1, analysis)
    });
    saveActiveSpellingLab({ currentIndex: state.index });

    const scoreEl = document.querySelector('.quiz-score');
    if (scoreEl) scoreEl.textContent = `Score: ${state.score} / ${state.index + 1}`;

    renderFeedback(word, attempt, analysis);
  }

  function renderFeedback(word, attempt, analysis, options) {
    const feedbackArea = document.getElementById('feedback-area');
    const controls = document.getElementById('controls');
    const completedView = !!(options && options.completedView);
    const currentResult = getCompletedResultForIndex(state.index);
    const repairComplete = analysis.correct || !!(currentResult && currentResult.repaired);
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
    const correctionReplay = repairComplete ? '' : renderCorrectionReplay(word);

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
      <button class="btn btn-secondary" id="hear-slow" type="button">Hear Slowly</button>
      ${completedView && state.index > 0 ? '<button class="btn btn-secondary" id="previous-word" type="button">Previous Word</button>' : ''}
      <button class="btn btn-primary" id="next-word" type="button" ${repairComplete ? '' : 'disabled'}>${isLast ? 'See Pattern Report' : 'Next Word'}</button>
    `;
    document.getElementById('hear-again').addEventListener('click', speakCurrentWord);
    document.getElementById('hear-slow').addEventListener('click', speakCurrentWordSlowly);
    if (!analysis.correct && !repairComplete) attachCorrectionReplay(word);
    const previousButton = document.getElementById('previous-word');
    if (previousButton) {
      previousButton.addEventListener('click', () => {
        state.index = Math.max(0, state.index - 1);
        renderQuestion();
      });
    }
    document.getElementById('next-word').addEventListener('click', () => {
      if (isLast) {
        renderResults();
      } else {
        state.index += 1;
        saveActiveSpellingLab({ currentIndex: state.index });
        renderQuestion();
      }
    });
  }

  function openSpellingQuestionReportDialog(word) {
    const dialog = ensureSpellingQuestionReportDialog();
    const reason = dialog.querySelector('[data-question-report-reason]');
    const note = dialog.querySelector('[data-question-report-note]');
    const message = dialog.querySelector('[data-question-report-message]');
    const prompt = dialog.querySelector('[data-question-report-prompt]');
    if (reason) reason.value = 'answer_or_explanation';
    if (note) note.value = '';
    if (message) message.textContent = '';
    if (prompt) prompt.textContent = getSpellingReportPrompt(word);
    dialog.classList.remove('hidden');
    document.body.classList.add('question-report-open');
    if (note) note.focus();
  }

  function ensureSpellingQuestionReportDialog() {
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
            <option value="answer_or_explanation">Answer, clue, or explanation does not make sense</option>
            <option value="typo">Typo or unclear wording</option>
            <option value="audio_visual">Audio or layout issue</option>
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
        closeSpellingQuestionReportDialog();
      }
      if (event.target.closest('[data-question-report-save]')) {
        saveSpellingQuestionReportFromDialog(dialog);
      }
    });
    dialog.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeSpellingQuestionReportDialog();
    });
    return dialog;
  }

  function closeSpellingQuestionReportDialog() {
    const dialog = document.getElementById('question-report-dialog');
    if (dialog) dialog.classList.add('hidden');
    document.body.classList.remove('question-report-open');
    const button = document.getElementById('report-spelling-question-btn');
    if (button) button.focus();
  }

  function saveSpellingQuestionReportFromDialog(dialog) {
    const message = dialog.querySelector('[data-question-report-message]');
    const saveButton = dialog.querySelector('[data-question-report-save]');
    const reason = dialog.querySelector('[data-question-report-reason]');
    const note = dialog.querySelector('[data-question-report-note]');
    try {
      if (isParentMode()) {
        throw new Error('Question reports are saved from student practice, so they appear under the student profile.');
      }
      if (saveButton) saveButton.disabled = true;
      const report = buildSpellingQuestionReportPayload({
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
      window.setTimeout(closeSpellingQuestionReportDialog, 600);
    } catch (error) {
      if (message) message.textContent = error.message || 'Could not send this report.';
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }

  function buildSpellingQuestionReportPayload(details) {
    const word = state.words[state.index] || {};
    const result = getCompletedResultForIndex(state.index);
    const input = document.getElementById('spelling-answer');
    const attempt = result && result.attempt ? result.attempt : (input ? input.value.trim() : '');
    const patterns = Array.isArray(word.patterns) ? word.patterns : [];
    const patternLabels = patterns.map(getPatternLabel);
    const createdAt = new Date().toISOString();
    const difficulty = getQuestionLevel(word);
    const analysis = result
      ? getAnalysisFromResult(result)
      : (attempt && word && Array.isArray(word.patterns) ? analyzeAttempt(word, attempt) : { correct: false, detected: [], patterns });
    return {
      id: `question-report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'open',
      reason: String(details && details.reason || 'answer_or_explanation'),
      note: String(details && details.note || '').trim().slice(0, 800),
      createdAt,
      updatedAt: createdAt,
      studentId: getActiveStudentId(),
      studentName: getActiveStudentName(),
      setId: 'sound-symbols-spelling-lab',
      title: bank && bank.title || 'Sound/Symbol Spelling Lab',
      topic: bank && bank.topic || 'Sound/Symbol Correspondences',
      grade: String(state.selectedGrade),
      difficulty: state.selectedDifficulty === 'all' ? difficulty : state.selectedDifficulty,
      questionId: getWordAttemptId(word),
      question: getSpellingReportPrompt(word),
      choices: [],
      selectedIndex: -1,
      selectedChoice: attempt,
      correctIndex: -1,
      correctChoice: word.word || '',
      explanation: {
        correct: getSpellingExplanation(word, analysis),
        incorrect: []
      },
      studyAid: {
        definition: 'Use the sound, syllable, and spelling pattern clues to spell the word.',
        example: `${word.word || ''}${word.syllables ? ` = ${word.syllables}` : ''}`.trim()
      },
      subtopicId: 'sound-symbols-spelling-lab',
      subtopicTitle: 'Sound/Symbol Spelling Lab',
      skills: ['sound-symbol encoding', 'spelling'].concat(patternLabels),
      pagePath: window.location.pathname,
      pageUrl: window.location.href,
      spelling: {
        word: word.word || '',
        attempt,
        clue: word.clue || '',
        sentence: word.sentence || '',
        syllables: word.syllables || '',
        pronunciation: word.pronunciation || '',
        pronunciationSyllables: Array.isArray(word.pronunciationSyllables) ? word.pronunciationSyllables : [],
        patterns,
        patternLabels,
        detected: analysis.detected || [],
        hintsUsed: result ? Number(result.hintsUsed) || 0 : state.hintLevel,
        memory: word.memory || '',
        correct: result ? !!result.correct : normalize(attempt) === normalize(word.word || '')
      }
    };
  }

  function getSpellingReportPrompt(word) {
    return `Spell "${word && word.word || 'the word'}" from the clue: ${word && word.clue || ''}`;
  }

  function getSpellingExplanation(word, analysis) {
    const parts = [`Target spelling: ${word && word.word || ''}.`];
    if (word && word.syllables) parts.push(`Syllables: ${word.syllables}.`);
    if (word && word.memory) parts.push(`Memory move: ${word.memory}`);
    if (analysis && Array.isArray(analysis.detected) && analysis.detected.length) {
      parts.push(`Feedback shown: ${analysis.detected.join(' ')}`);
    }
    return parts.join(' ').trim();
  }

  function updateQuestionReportStatus(text) {
    const status = document.getElementById('question-report-status');
    if (status) status.textContent = text || '';
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
        const currentResult = getCompletedResultForIndex(state.index);
        if (currentResult) {
          currentResult.repaired = true;
          currentResult.repairedAt = new Date().toISOString();
          saveActiveSpellingLab({ currentIndex: state.index });
        }
      } else {
        input.classList.add('needs-answer');
        message.textContent = 'Almost. Copy the target spelling exactly once.';
      }
    });
  }

  function renderResults() {
    endAssessmentGuard();
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
          ${missed.length ? '<button class="btn btn-secondary" id="retry-missed-spelling" type="button">Retry Missed Words</button>' : ''}
          <button class="btn btn-primary" id="restart-spelling">Try Again</button>
          <a href="../../index.html" class="btn btn-secondary">All Topics</a>
        </div>
      </div>
    `;

    const retryButton = document.getElementById('retry-missed-spelling');
    if (retryButton) {
      retryButton.addEventListener('click', retryMissedWords);
    }
    document.getElementById('restart-spelling').addEventListener('click', () => {
      reset();
      endAssessmentGuard();
      renderStart();
    });
  }

  function retryMissedWords() {
    const retryWords = getRetryWordsFromResults();
    if (!retryWords.length) return;
    state.words = retryWords;
    state.index = 0;
    state.score = 0;
    state.combo = 0;
    state.answered = false;
    state.hintLevel = 0;
    state.results = [];
    state.selectedCount = retryWords.length;
    state.sessionStartedAt = Date.now();
    state.questionStartedAt = 0;
    saveActiveSpellingLab({ currentIndex: 0 });
    startAssessmentGuard();
    renderQuestion();
  }

  function getRetryWordsFromResults(results = state.results, words = state.words) {
    const originalWords = new Map((words || []).map(word => [getWordAttemptId(word), word]));
    return (results || [])
      .filter(result => result && result.correct === false)
      .map(result => originalWords.get(result.id) || getRetryWordFromResult(result))
      .filter(Boolean);
  }

  function getRetryWordFromResult(result) {
    if (!result || !result.word) return null;
    return {
      word: result.word,
      clue: result.clue || '',
      sentence: result.sentence || '',
      patterns: Array.isArray(result.patterns) ? result.patterns : [],
      syllables: result.syllables || result.word,
      pronunciation: result.pronunciation || '',
      pronunciationSyllables: Array.isArray(result.pronunciationSyllables) ? result.pronunciationSyllables : [],
      memory: result.memory || '',
      difficulty: result.difficulty || 'medium'
    };
  }

  function startAssessmentGuard() {
    if (!assessmentGuard || typeof assessmentGuard.start !== 'function') return;
    assessmentGuard.start({
      label: 'spelling lab',
      message: 'A spelling lab is still in progress. Leave this page and lose your current answers?'
    });
  }

  function endAssessmentGuard() {
    if (!assessmentGuard || typeof assessmentGuard.end !== 'function') return;
    assessmentGuard.end();
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
    speakWord(word);
  }

  function speakCurrentWordSlowly() {
    const word = state.words[state.index];
    if (!word) return;
    speakWordSlowly(word);
  }

  function speakWordSlowly(word) {
    if (!('speechSynthesis' in window)) return;
    cancelSpeechPlayback();

    const pronunciation = getPronunciationProfile(word);
    const syllables = pronunciation.slow;
    const stressIndex = getPrimaryStressIndex(word, syllables, pronunciation.stressIndex);
    const profile = getSpeechPlaybackProfile();
    const utterances = [
      createUtterance(createWordPlaybackText(pronunciation.speech), {
        rate: profile.slowWordRate,
        pitch: 1.02
      })
    ];

    if (syllables.length > 1) {
      syllables.forEach((syllable, index) => {
        utterances.push(createUtterance(syllable, {
          rate: profile.syllableRate,
          pitch: index === stressIndex ? 1.12 : 0.98,
          volume: index === stressIndex ? 1 : 0.82
        }));
      });
      utterances.push(createUtterance(pronunciation.speech, {
        rate: profile.repeatRate,
        pitch: 1.04
      }));
    }

    speakUtteranceSequence(utterances, profile.syllableGapMs);
  }

  function speakWord(word, options = {}) {
    cancelSpeechPlayback();
    const audioEntry = getSpellingAudioEntry(word);
    if (audioEntry && (audioEntry.normalSrc || audioEntry.src)) {
      playWordAudioSequence(audioEntry, getSpeechPlaybackProfile().repeatGapMs, () => speakWordWithSpeech(word, options));
      return;
    }
    speakWordWithSpeech(word, options);
  }

  function speakWordWithSpeech(word, options = {}) {
    if (!('speechSynthesis' in window)) return;
    const pronunciation = getPronunciationProfile(word);
    const playback = createWordPlaybackPlan(pronunciation.speech, options);
    if (!playback.texts.length) return;
    speakUtteranceSequence(playback.texts.map(text => createUtterance(text, playback.options)), playback.gapMs);
  }

  function getSpellingAudioEntry(word) {
    const key = normalize(word && word.word || '');
    return audioManifest && audioManifest[key] || null;
  }

  function getAudioSources(entry) {
    if (!entry) return [];
    if (typeof entry === 'string') return [entry, entry];
    const normalSrc = entry.normalSrc || entry.src;
    const slowSrc = entry.slowSrc || entry.src || entry.normalSrc;
    return [normalSrc, slowSrc].filter(Boolean);
  }

  function playWordAudioSequence(entry, gapMs, onFallback) {
    if (typeof Audio !== 'function') {
      if (typeof onFallback === 'function') onFallback();
      return;
    }
    const sources = getAudioSources(entry);
    if (!sources.length) {
      if (typeof onFallback === 'function') onFallback();
      return;
    }
    const sequenceId = ++audioSequenceId;
    let sourceIndex = 0;
    const playNext = () => {
      if (sequenceId !== audioSequenceId || sourceIndex >= sources.length) return;
      const src = sources[sourceIndex];
      sourceIndex += 1;
      const audio = new Audio(src);
      activeWordAudio = audio;
      audio.preload = 'auto';
      audio.onended = () => {
        if (sequenceId !== audioSequenceId || sourceIndex >= sources.length) return;
        speechSequenceTimer = window.setTimeout(playNext, gapMs);
      };
      audio.onerror = () => {
        if (sequenceId === audioSequenceId && sourceIndex === 1 && typeof onFallback === 'function') onFallback();
      };
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          if (sequenceId === audioSequenceId && sourceIndex === 1 && typeof onFallback === 'function') onFallback();
        });
      }
    };
    playNext();
  }

  function getPronunciationProfile(word) {
    const key = normalize(word && word.word || '');
    const override = pronunciationOverrides[key] || {};
    const dataSlow = Array.isArray(word && word.pronunciationSyllables)
      ? word.pronunciationSyllables
      : null;
    const slow = (dataSlow || override.slow || getPronunciationSyllables(word))
      .map(part => String(part || '').trim())
      .filter(Boolean);
    return {
      speech: String((word && word.pronunciation) || override.speech || (word && word.word) || ''),
      slow: slow.length ? slow : [String(word && word.word || '')],
      stressIndex: Number.isFinite(override.stressIndex) ? override.stressIndex : null
    };
  }

  function getPronunciationSyllables(word) {
    return String(word.syllables || word.word)
      .split("-")
      .map(part => part.trim())
      .filter(Boolean);
  }

  function getPrimaryStressIndex(word, syllables, overrideIndex) {
    if (Number.isFinite(overrideIndex)) {
      return Math.min(Math.max(0, overrideIndex), Math.max(0, syllables.length - 1));
    }
    if (syllables.length <= 1) return 0;
    const lowerWord = word.word.toLowerCase();
    const unstressedOpeners = new Set(["a", "be", "de", "e", "in", "re"]);
    if (unstressedOpeners.has(syllables[0].toLowerCase())) return 1;
    if (word.patterns && word.patterns.includes("schwa") && syllables.length > 2) return 0;
    if (/^(tion|sion|cian|tial|cial)$/i.test(syllables[syllables.length - 1])) return Math.max(0, syllables.length - 2);
    if (/(ity|ic|ical|tion|sion|cious|tious)$/.test(lowerWord)) return Math.max(0, syllables.length - 2);
    return 0;
  }

  function speakText(text, options = {}) {
    if (!('speechSynthesis' in window)) return;
    cancelSpeechPlayback();
    const utterance = createUtterance(text, options);
    window.speechSynthesis.speak(utterance);
  }

  function createUtterance(text, options = {}) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    const voice = getPreferredSpeechVoice();
    const profile = getSpeechPlaybackProfile();
    if (voice) utterance.voice = voice;
    utterance.rate = options.rate ?? profile.wordRate;
    utterance.pitch = options.pitch ?? profile.pitch;
    utterance.volume = options.volume ?? 1;
    return utterance;
  }

  function createWordPlaybackText(text) {
    const word = String(text || '').trim();
    return word;
  }

  function createWordPlaybackPlan(text, options = {}) {
    const word = createWordPlaybackText(text);
    const profile = getSpeechPlaybackProfile();
    return {
      texts: word ? [word, word] : [],
      gapMs: profile.repeatGapMs,
      options
    };
  }

  function cancelSpeechPlayback() {
    if (speechSequenceTimer) {
      window.clearTimeout(speechSequenceTimer);
      speechSequenceTimer = null;
    }
    audioSequenceId += 1;
    if (activeWordAudio) {
      activeWordAudio.pause();
      activeWordAudio.currentTime = 0;
      activeWordAudio = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function speakUtteranceSequence(utterances, gapMs) {
    let index = 0;
    const playNext = () => {
      if (index >= utterances.length) return;
      const utterance = utterances[index];
      index += 1;
      let settled = false;
      const queueNext = () => {
        if (settled) return;
        settled = true;
        speechSequenceTimer = window.setTimeout(playNext, gapMs);
      };
      utterance.onend = queueNext;
      utterance.onerror = queueNext;
      window.speechSynthesis.speak(utterance);
      const fallbackMs = Math.max(900, Math.min(2400, String(utterance.text || '').length * 95));
      speechSequenceTimer = window.setTimeout(queueNext, fallbackMs);
    };
    playNext();
  }

  function getSpeechPlaybackProfile() {
    const safari = isSafariBrowser();
    const mobileSafari = safari && isMobileSafari();
    if (safari) {
      return {
        wordRate: 1,
        slowWordRate: mobileSafari ? 0.94 : 0.92,
        syllableRate: mobileSafari ? 0.9 : 0.88,
        repeatRate: 1,
        repeatGapMs: mobileSafari ? 680 : 620,
        syllableGapMs: mobileSafari ? 420 : 340,
        pitch: 1
      };
    }
    return {
      wordRate: 0.78,
      slowWordRate: 0.62,
      syllableRate: 0.58,
      repeatRate: 0.68,
      repeatGapMs: 520,
      syllableGapMs: 240,
      pitch: 1.04
    };
  }

  function isMobileSafari() {
    const userAgent = navigator.userAgent || '';
    const isiOS = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isiOS && isSafariBrowser();
  }

  function isSafariBrowser() {
    const userAgent = navigator.userAgent || '';
    const vendor = navigator.vendor || '';
    const isAppleWebKit = /Apple/i.test(vendor) && /Safari/i.test(userAgent);
    const isOtherBrowser = /CriOS|FxiOS|Edg|EdgiOS|OPR|OPiOS|Chrome|Chromium|Firefox/i.test(userAgent);
    return isAppleWebKit && !isOtherBrowser;
  }

  function prepareSpeechVoices() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.getVoices();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', () => {
        preferredSpeechVoice = null;
      });
    } else if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        preferredSpeechVoice = null;
      };
    }
  }

  function getPreferredSpeechVoice() {
    if (preferredSpeechVoice) return preferredSpeechVoice;
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const rankedVoices = voices
      .filter(voice => /^en(-|_)?/i.test(voice.lang || ''))
      .sort((a, b) => scoreSpeechVoice(b) - scoreSpeechVoice(a));
    preferredSpeechVoice = isSafariBrowser()
      ? getPreferredSafariSpeechVoice(rankedVoices)
      : rankedVoices[0] || null;
    return preferredSpeechVoice;
  }

  function getPreferredSafariSpeechVoice(voices) {
    const safariVoicePreference = [
      /sandy.*english.*us|sandy.*en[-_]?us/i,
      /flo.*english.*us|flo.*en[-_]?us/i,
      /reed.*english.*us|reed.*en[-_]?us/i,
      /shelley.*english.*us|shelley.*en[-_]?us/i,
      /eddy.*english.*us|eddy.*en[-_]?us/i,
      /ava|allison|zoe|samantha|alex|enhanced|premium|natural/i
    ];
    const usableVoices = voices.filter(voice => !isNoveltySpeechVoice(getSpeechVoiceName(voice)));
    const exactUsVoices = usableVoices.filter(voice => /^en[-_]?us$/i.test(voice.lang || ''));
    const preferredPool = exactUsVoices.length ? exactUsVoices : usableVoices;
    for (const pattern of safariVoicePreference) {
      const match = preferredPool.find(voice => pattern.test(getSpeechVoiceName(voice)));
      if (match) return match;
    }
    const clearVoice = voices.find(voice => {
      const name = getSpeechVoiceName(voice);
      return !isCompressedSpeechVoice(name) && /alex|enhanced|premium|natural|ava|samantha|allison|zoe/.test(name);
    });
    return clearVoice || preferredPool.find(voice => voice.default) || preferredPool[0] || null;
  }

  function scoreSpeechVoice(voice) {
    const name = getSpeechVoiceName(voice);
    const lang = String(voice.lang || '').toLowerCase();
    let score = 0;
    if (lang === 'en-us') score += 80;
    else if (lang.startsWith('en-us')) score += 70;
    else if (lang.startsWith('en')) score += 35;
    if (voice.localService) score += 8;
    if (voice.default) score += 5;
    if (/samantha|alex|ava|allison|zoe|karen|moira|tessa|victoria|nicky|eddy|reed|shelley|siri|google us english|microsoft (aria|jenny|guy)|natural|premium|enhanced/.test(name)) score += 20;
    if (isCompressedSpeechVoice(name)) score -= 80;
    return score;
  }

  function getSpeechVoiceName(voice) {
    return `${voice && voice.name || ''} ${voice && voice.voiceURI || ''}`.toLowerCase();
  }

  function isCompressedSpeechVoice(name) {
    return /compact|novelty/.test(name) || isNoveltySpeechVoice(name);
  }

  function isNoveltySpeechVoice(name) {
    return /whisper|zarvox|bells|boing|bubbles|cellos|deranged|hysterical|trinoids|albert|bad news|bahh|fred|good news|jester|junior|kathy|organ|ralph|superstar|wobble/.test(name);
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
      badges: [],
      reports: { sessions: [], questionReports: [] },
      activeQuiz: null,
      mastery: {}
    };
    try {
      return Object.assign(fallback, JSON.parse(localStorage.getItem('grammarQuestProgress')) || {});
    } catch (error) {
      return fallback;
    }
  }

  function saveProgress(progress, options) {
    if (isParentMode()) return;
    if (progressStore) {
      progressStore.saveLocalProgress(progress, options);
    } else {
      localStorage.setItem('grammarQuestProgress', JSON.stringify(progress));
    }
  }

  function getResumableSpellingLab() {
    const progress = loadProgress();
    const activeQuiz = progressStore && typeof progressStore.normalizeActiveQuiz === 'function'
      ? progressStore.normalizeActiveQuiz(progress.activeQuiz)
      : progress.activeQuiz;
    if (!activeQuiz || activeQuiz.type !== 'spelling-lab') return null;
    return activeQuiz.setId === 'sound-symbols-spelling-lab' ? activeQuiz : null;
  }

  function resumeSpellingLab(savedLab) {
    if (!savedLab || !Array.isArray(savedLab.questions) || !savedLab.questions.length) return;
    state.words = savedLab.questions;
    state.index = Math.min(Math.max(0, Number(savedLab.currentIndex) || 0), state.words.length - 1);
    state.score = Number(savedLab.score) || 0;
    state.combo = Number(savedLab.combo) || 0;
    state.results = Array.isArray(savedLab.attempts) ? savedLab.attempts : [];
    state.selectedGrade = Number(savedLab.grade) || state.selectedGrade;
    state.selectedDifficulty = savedLab.difficulty || state.selectedDifficulty;
    state.selectedCount = savedLab.selectedCount || state.words.length;
    state.sessionStartedAt = savedLab.startedAt ? Date.parse(savedLab.startedAt) || Date.now() : Date.now();
    state.questionStartedAt = savedLab.questionStartedAt ? Date.parse(savedLab.questionStartedAt) || Date.now() : Date.now();
    startAssessmentGuard();
    if (state.results.length >= state.words.length && state.results.every(result => result.correct || result.repaired)) {
      renderResults();
      return;
    }
    renderQuestion();
  }

  function saveActiveSpellingLab(options) {
    if (isParentMode() || !state.words.length) return;
    const progress = loadProgress();
    const currentIndex = options && Number.isFinite(options.currentIndex) ? options.currentIndex : state.index;
    progress.activeQuiz = {
      type: 'spelling-lab',
      setId: 'sound-symbols-spelling-lab',
      title: bank && bank.title || 'Spelling Lab',
      topic: bank && bank.topic || 'Sound/Symbol Correspondences',
      grade: String(state.selectedGrade),
      difficulty: state.selectedDifficulty,
      selectedCount: state.selectedCount,
      questions: state.words,
      currentIndex: Math.min(Math.max(0, currentIndex), state.words.length),
      score: state.score,
      combo: state.combo,
      hintsUsed: state.results.reduce((sum, result) => sum + (Number(result.hintsUsed) || 0), 0),
      attempts: state.results,
      startedAt: state.sessionStartedAt ? new Date(state.sessionStartedAt).toISOString() : new Date().toISOString(),
      questionStartedAt: state.questionStartedAt ? new Date(state.questionStartedAt).toISOString() : '',
      lastSavedAt: new Date().toISOString()
    };
    saveProgress(progress, { sync: true });
  }

  function clearActiveSpellingLab() {
    if (isParentMode()) return;
    const progress = loadProgress();
    progress.activeQuiz = null;
    saveProgress(progress, { sync: true });
  }

  function getResumePositionLabel(activeQuiz) {
    const index = Number(activeQuiz.currentIndex) || 0;
    const total = Array.isArray(activeQuiz.questions) ? activeQuiz.questions.length : 0;
    if (index >= total) return 'ready for results';
    return `Word ${index + 1} of ${total}`;
  }

  function getCompletedResultForIndex(index) {
    if (index < 0 || index >= state.results.length) return null;
    return state.results[index] || null;
  }

  function getAnalysisFromResult(result) {
    return {
      correct: !!(result && result.correct),
      detected: Array.isArray(result && result.detected) ? result.detected : [],
      patterns: Array.isArray(result && result.patterns) ? result.patterns : []
    };
  }

  function saveQuestResult(percentage, correct, total) {
    const progress = loadProgress();
    if (isParentMode()) {
      return {
        gemsEarned: 0,
        message: 'Preview complete. Student progress was not changed.',
        progress
      };
    }
    const completedAt = new Date().toISOString();
    const streakProjection = progressStore && typeof progressStore.projectPracticeCompletion === 'function'
      ? progressStore.projectPracticeCompletion(progress, completedAt)
      : null;
    const today = streakProjection ? streakProjection.lastPracticeDate || getDateKey(0) : getDateKey(0);
    let streakBonus = 0;

    if (streakProjection) {
      progress.streakDays = streakProjection.streakDays;
      progress.lastPracticeDate = today;
    } else if (progress.lastPracticeDate !== today) {
      progress.streakDays = progress.lastPracticeDate === getDateKey(-1) ? progress.streakDays + 1 : 1;
      progress.lastPracticeDate = today;
    }

    const baseGems = correct * 2;
    const masteryBonus = percentage >= 90 ? 12 : percentage >= 75 ? 6 : 0;
    if (progress.streakDays > 0 && progress.streakDays % 3 === 0) streakBonus = 8;
    const gemsEarned = baseGems + masteryBonus + streakBonus;

    progress.totalGems += gemsEarned;
    progress.quizzesCompleted += 1;
    progress.bestScore = Math.max(progress.bestScore || 0, percentage);
    progress.mastery = updateSpellingMastery(progress.mastery, state.results, today);
    progress.reports = updateSpellingReports(progress.reports, state.results, {
      percentage,
      correct,
      total,
      completedAt,
      startedAt: state.sessionStartedAt ? new Date(state.sessionStartedAt).toISOString() : '',
      durationSeconds: state.sessionStartedAt ? Math.max(1, Math.round((Date.now() - state.sessionStartedAt) / 1000)) : 0
    });
    progress.activeQuiz = null;
    progress.badges = updateBadges(progress, percentage);

    saveProgress(progress);

    let message = "Every spelled word strengthens your reading and writing speed.";
    if (streakBonus) message = "Three-day streak bonus unlocked.";
    else if (masteryBonus) message = "Accuracy bonus unlocked for sharp spelling.";

    return { gemsEarned, message, progress };
  }

  function updateSpellingReports(existingReports, results, summary) {
    const reports = progressStore && typeof progressStore.normalizeReports === 'function'
      ? progressStore.normalizeReports(existingReports)
      : {
          sessions: Array.isArray(existingReports && existingReports.sessions) ? existingReports.sessions : [],
          questionReports: Array.isArray(existingReports && existingReports.questionReports) ? existingReports.questionReports : []
        };
    const completedAt = summary.completedAt || new Date().toISOString();
    const session = {
      id: `spelling-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      studentId: getActiveStudentId(),
      studentName: getActiveStudentName(),
      title: bank && bank.title || 'Spelling Lab',
      topic: bank && bank.topic || 'Sound/Symbol Correspondences',
      topicId: 'sound-symbols',
      grade: String(state.selectedGrade),
      difficulty: state.selectedDifficulty,
      score: summary.correct,
      total: summary.total,
      percentage: summary.percentage,
      startedAt: summary.startedAt,
      completedAt,
      durationSeconds: summary.durationSeconds,
      patternSummary: getPatternSummary().map(([key, count]) => ({
        key,
        label: getPatternLabel(key),
        count
      })),
      attempts: (results || []).map((result, index) => serializeSpellingAttempt(result, index + 1, completedAt))
    };

    return Object.assign({}, reports, {
      sessions: [session].concat(reports.sessions || []).slice(0, 250)
    });
  }

  function serializeSpellingAttempt(result, position, completedAt) {
    const patterns = Array.isArray(result.patterns) ? result.patterns : [];
    const patternLabels = patterns.map(getPatternLabel);
    return {
      id: result.id || `spelling-${slugify(result.word)}-${position}`,
      position,
      question: `Spell "${result.word}" from the clue: ${result.clue || ''}`,
      choices: [],
      selectedIndex: -1,
      selectedChoice: result.attempt || '',
      correctIndex: -1,
      correctChoice: result.word || '',
      correct: !!result.correct,
      firstAttemptCorrect: !!result.correct,
      confidence: result.hintsUsed ? 'exploring' : 'thinking',
      hintUsed: Number(result.hintsUsed) > 0,
      hintsUsed: Number(result.hintsUsed) || 0,
      durationSeconds: Number(result.durationSeconds) || 0,
      trapTypes: Array.isArray(result.detected) ? result.detected : [],
      grade: String(result.grade || state.selectedGrade),
      difficulty: result.difficulty || getQuestionLevel(result),
      subtopicId: 'sound-symbols-spelling-lab',
      subtopicTitle: 'Sound/Symbol Spelling Lab',
      skills: ['sound-symbol encoding', 'spelling'].concat(patternLabels),
      standards: [{ id: 'CCSS.L.3-6.2', label: 'Language: Spelling and Conventions' }],
      metadata: result.metadata || getSpellingAttemptMetadata(result, position, { patterns, detected: result.detected || [] }),
      spelling: {
        word: result.word || '',
        attempt: result.attempt || '',
        patterns,
        patternLabels,
        detected: Array.isArray(result.detected) ? result.detected : [],
        syllables: result.syllables || '',
        clue: result.clue || '',
        sentence: result.sentence || '',
        pronunciation: result.pronunciation || '',
        pronunciationSyllables: Array.isArray(result.pronunciationSyllables) ? result.pronunciationSyllables : [],
        memory: result.memory || '',
        repaired: !!result.repaired,
        repairedAt: result.repairedAt || ''
      },
      completedAt
    };
  }

  function updateSpellingMastery(existingMastery, results, today) {
    const mastery = normalizeMastery(existingMastery);
    (results || []).forEach(result => {
      const isCorrect = !!result.correct;
      recordMastery(mastery, 'domains', 'sound-symbol-correspondences', 'Sound/Symbol Correspondences', isCorrect, today);
      recordMastery(mastery, 'subtopics', 'sound-symbols-spelling-lab', 'Sound/Symbol Spelling Lab', isCorrect, today);
      recordMastery(mastery, 'difficulty', result.difficulty || 'medium', titleCase(result.difficulty || 'Medium'), isCorrect, today);
      recordMastery(mastery, 'cognitiveDemand', 'sound-symbol-encoding', 'Sound Symbol Encoding', isCorrect, today);
      recordMastery(mastery, 'standards', 'CCSS.L.3-6.2', 'Language: Spelling and Conventions', isCorrect, today);
      (result.patterns || []).forEach(pattern => {
        recordMastery(mastery, 'skills', slugify(getPatternLabel(pattern)), getPatternLabel(pattern), isCorrect, today);
      });
    });
    return mastery;
  }

  function normalizeMastery(mastery) {
    if (progressStore && typeof progressStore.normalizeMastery === 'function') {
      return progressStore.normalizeMastery(mastery);
    }
    return {
      domains: Object.assign({}, mastery && mastery.domains || {}),
      skills: Object.assign({}, mastery && mastery.skills || {}),
      cognitiveDemand: Object.assign({}, mastery && mastery.cognitiveDemand || {}),
      difficulty: Object.assign({}, mastery && mastery.difficulty || {}),
      subtopics: Object.assign({}, mastery && mastery.subtopics || {}),
      standards: Object.assign({}, mastery && mastery.standards || {})
    };
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

  function getMasteryLevel(correct, total) {
    if (total < 5) return 'Collecting evidence';
    const accuracy = correct / total;
    if (accuracy >= 0.92 && total >= 12) return 'Elite';
    if (accuracy >= 0.85) return 'Secure';
    if (accuracy >= 0.7) return 'Developing';
    return 'Needs focus';
  }

  function getWordAttemptId(word) {
    return `spelling-${slugify(word && word.word || 'word')}`;
  }

  function getSpellingAttemptMetadata(word, sequence, analysis) {
    const patterns = Array.isArray(analysis && analysis.patterns)
      ? analysis.patterns
      : Array.isArray(word && word.patterns)
        ? word.patterns
        : [];
    const difficulty = word && word.difficulty
      ? word.difficulty
      : getQuestionLevel(word || {});
    return {
      sourceSet: 'sound-symbols-spelling-lab',
      sequence,
      skills: ['sound-symbol encoding', 'spelling'].concat(patterns.map(getPatternLabel)),
      spellingPatterns: patterns,
      cognitiveDemand: 'sound-symbol-encoding',
      primaryDifficulty: difficulty,
      gradeLevels: [String(state.selectedGrade)]
    };
  }

  function getPatternLabel(pattern) {
    const info = patternInfo[pattern] || { label: pattern };
    return info.label || pattern;
  }

  function getActiveStudentId() {
    return loadSetting('grammarQuestActiveStudentId', 'current-learner');
  }

  function getActiveStudentName() {
    return loadSetting('grammarQuestActiveStudentName', 'Current Learner');
  }

  function getInitialGrade() {
    const savedGrade = loadSetting('grammarQuestSpellingGrade', '');
    if (savedGrade) return normalizeGradeOption(savedGrade);
    const auth = window.GrammarQuestAuth;
    const authState = auth && typeof auth.getState === 'function' ? auth.getState() : {};
    const defaultGrade = authState.studentMode && authState.activeStudent
      ? authState.activeStudent.defaultGrade
      : loadSetting('grammarQuestActiveStudentDefaultGrade', '');
    return normalizeGradeOption(defaultGrade || 4);
  }

  function normalizeGradeOption(value) {
    const grade = Number(value);
    return [3, 4, 5, 6].includes(grade) ? grade : 4;
  }

  function normalizeCountOption(value) {
    if (value === "all") return "all";
    const count = Number(value);
    return [15, 25, 50, 100].includes(count) ? count : 25;
  }

  function normalizeDifficultyOption(value) {
    return ["all", "easy", "medium", "hard"].includes(value) ? value : "all";
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
      // Storage can be unavailable in private browsing; the lab can still run.
    }
  }

  function isParentMode() {
    const auth = window.GrammarQuestAuth;
    const authState = auth && typeof auth.getState === 'function' ? auth.getState() : {};
    return !!authState.parentMode;
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

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  window.GrammarQuestSpellingLabTestApi = {
    createWordPlaybackPlanForTest: createWordPlaybackPlan,
    getPronunciationProfileForTest: getPronunciationProfile,
    getSpellingAudioEntryForTest: getSpellingAudioEntry,
    getPreferredSafariSpeechVoiceForTest: getPreferredSafariSpeechVoice,
    getRetryWordsFromResultsForTest: getRetryWordsFromResults,
    isNoveltySpeechVoiceForTest: isNoveltySpeechVoice
  };
})();
