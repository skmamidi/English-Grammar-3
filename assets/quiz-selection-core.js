(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSelectionCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const gradeOptions = ['3', '4', '5', '6'];
  const difficultyOptions = ['easy', 'medium', 'hard'];

  function selectQuestionsForLevel(questions, grade, difficulty, options = {}) {
    const source = Array.isArray(questions) ? questions : [];
    const targetQuestionCount = Number.isFinite(options.targetQuestionCount) ? options.targetQuestionCount : 15;
    const shuffle = typeof options.shuffle === 'function' ? options.shuffle : shuffleArray;
    if (!source.length) return [];
    if (!source.some(question => question.metadata && question.metadata.difficultyByGrade)) {
      return selectUniqueQuestions(shuffle([...source]), Math.min(targetQuestionCount, source.length));
    }

    const levelQuestions = source.filter(question => questionSupportsGrade(question, grade));
    if (!levelQuestions.length) return source.slice(0, Math.min(targetQuestionCount, source.length));

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

    return selectUniqueQuestions(
      shuffle(exact).concat(shuffle(adjacent), shuffle(fallback)).map(entry => entry.question),
      Math.min(targetQuestionCount, levelQuestions.length)
    );
  }

  function selectCurrentQuestions(state, options = {}) {
    const parentMode = !!(state && state.parentMode);
    const mixedQuizConfig = state && state.mixedQuizConfig;
    const baseQuestions = Array.isArray(state && state.baseQuestions) ? state.baseQuestions : [];
    const shuffle = typeof options.shuffle === 'function' ? options.shuffle : shuffleArray;
    if (parentMode) {
      if (!mixedQuizConfig) return shuffle([...baseQuestions]);
      return shuffle(getActiveMixedSubtopics(state).flatMap(subtopic => [...subtopic.questions]));
    }
    return mixedQuizConfig
      ? selectMixedQuestions(state, options)
      : selectQuestionsForLevel(baseQuestions, state && state.selectedGrade, state && state.selectedDifficulty, options);
  }

  function selectMixedQuestions(state, options = {}) {
    const mixedQuizConfig = state && state.mixedQuizConfig;
    const baseQuestions = Array.isArray(state && state.baseQuestions) ? state.baseQuestions : [];
    const shuffle = typeof options.shuffle === 'function' ? options.shuffle : shuffleArray;
    if (!mixedQuizConfig || !Array.isArray(mixedQuizConfig.subtopics)) {
      return selectQuestionsForLevel(baseQuestions, state && state.selectedGrade, state && state.selectedDifficulty, options);
    }

    const limit = state && state.selectedMixedQuestionLimit === 'max'
      ? 'max'
      : Math.max(1, Number(state && state.selectedMixedQuestionLimit) || Number(mixedQuizConfig.questionsPerSubtopic) || 4);
    const selected = [];
    const activeSubtopics = getActiveMixedSubtopics(state);
    activeSubtopics.forEach(subtopic => {
      if (limit === 'max') {
        selected.push(...shuffle([...subtopic.questions]));
        return;
      }
      selected.push(...fillQuestionGroup(
        selectQuestionsForLevel(subtopic.questions, state.selectedGrade, state.selectedDifficulty, options),
        subtopic.questions,
        limit,
        shuffle
      ));
    });
    return fillUniqueQuestionSelection(selectUniqueQuestions(shuffle(selected), selected.length), activeSubtopics, selected.length, shuffle);
  }

  function fillQuestionGroup(preferred, allQuestions, count, shuffle = shuffleArray) {
    const source = Array.isArray(allQuestions) ? allQuestions : [];
    const limit = Math.min(count, source.length);
    const picked = selectUniqueQuestions(Array.isArray(preferred) ? preferred : [], limit);
    if (picked.length >= limit) return picked;

    const pickedSet = new Set(picked);
    const pickedFingerprints = new Set(picked.map(getQuestionFingerprint));
    const fallback = shuffle([...source]).filter(question => {
      const fingerprint = getQuestionFingerprint(question);
      return !pickedSet.has(question) && !pickedFingerprints.has(fingerprint);
    });
    return picked.concat(fallback.slice(0, limit - picked.length));
  }

  function fillUniqueQuestionSelection(preferred, subtopics, count, shuffle = shuffleArray) {
    const picked = selectUniqueQuestions(preferred, count);
    if (picked.length >= count) return picked;

    const pickedSet = new Set(picked);
    const pickedFingerprints = new Set(picked.map(getQuestionFingerprint));
    const fallback = shuffle((Array.isArray(subtopics) ? subtopics : [])
      .flatMap(subtopic => Array.isArray(subtopic && subtopic.questions) ? subtopic.questions : []))
      .filter(question => {
        const fingerprint = getQuestionFingerprint(question);
        return !pickedSet.has(question) && !pickedFingerprints.has(fingerprint);
      });
    return picked.concat(fallback.slice(0, count - picked.length));
  }

  function selectUniqueQuestions(questions, limit) {
    const selected = [];
    const fingerprints = new Set();
    (Array.isArray(questions) ? questions : []).some(question => {
      const fingerprint = getQuestionFingerprint(question);
      if (!fingerprints.has(fingerprint)) {
        fingerprints.add(fingerprint);
        selected.push(question);
      }
      return selected.length >= limit;
    });
    return selected;
  }

  function getQuestionFingerprint(question) {
    const prompt = normalizeQuestionText(question && question.question)
      .replace(/^grade\s+\d+\s+(easy|medium|hard)\s*:\s*/i, '')
      .replace(/^(choose the best answer|use the context to choose the best answer|analyze the details and choose the strongest answer)\.?\s*/i, '');
    const choices = Array.isArray(question && question.choices)
      ? question.choices.map(normalizeQuestionText).sort().join('|')
      : '';
    return `${prompt}::${choices}`;
  }

  function normalizeQuestionText(value) {
    return String(value || '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function getActiveMixedSubtopics(state) {
    const subtopics = state && state.mixedQuizConfig && Array.isArray(state.mixedQuizConfig.subtopics)
      ? state.mixedQuizConfig.subtopics
      : [];
    const selectedIds = Array.isArray(state && state.selectedMixedSubtopicIds) ? state.selectedMixedSubtopicIds : [];
    const active = selectedIds.length
      ? subtopics.filter(subtopic => selectedIds.includes(subtopic.id))
      : subtopics;
    return active.filter(subtopic => Array.isArray(subtopic.questions) && subtopic.questions.length);
  }

  function questionSupportsGrade(question, grade) {
    const levels = question && question.metadata && question.metadata.gradeLevels;
    return !levels || levels.map(String).includes(String(grade));
  }

  function getDifficultyDistance(question, grade, difficulty) {
    const actual = question && question.metadata && question.metadata.difficultyByGrade
      ? question.metadata.difficultyByGrade[String(grade)] || question.metadata.difficultyByGrade[grade]
      : difficulty;
    return Math.abs(difficultyRank(actual) - difficultyRank(difficulty));
  }

  function difficultyRank(value) {
    const index = difficultyOptions.indexOf(String(value || '').toLowerCase());
    return index >= 0 ? index : 1;
  }

  function shuffleArray(items) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function getQuestionId(question, fallbackPosition, subtopic) {
    if (question && question.id) return question.id;
    const metadata = question && question.metadata || {};
    const sourceSet = metadata.sourceSet || (subtopic && subtopic.id) || 'question';
    const sequence = metadata.sequence || fallbackPosition || 0;
    return sequence ? `${sourceSet}-q${String(sequence).padStart(4, '0')}` : '';
  }

  function getAttemptQuestionId(attempt) {
    if (!attempt) return '';
    return attempt.questionId || attempt.id || attempt.question || '';
  }

  function getQuestionRef(question, fallbackPosition, subtopic) {
    const metadata = question && question.metadata || {};
    const sourceSet = metadata.sourceSet || (subtopic && subtopic.id) || '';
    const sequence = metadata.sequence || fallbackPosition || 0;
    return {
      id: getQuestionId(question, fallbackPosition, subtopic),
      version: Number(question && question.version) || 0,
      contentHash: question && question.contentHash || '',
      sourceSet,
      sequence
    };
  }

  function buildQuestionRefs(questions, subtopic) {
    return (Array.isArray(questions) ? questions : []).map((question, index) => getQuestionRef(question, index + 1, subtopic));
  }

  function findNextUnansweredQuestionIndex(questions, attempts, savedIndex) {
    const source = Array.isArray(questions) ? questions : [];
    const total = source.length;
    if (!total) return 0;
    const normalizedSavedIndex = Math.min(Math.max(0, Number(savedIndex) || 0), total);
    const answered = getAnsweredQuestionIndexes(source, attempts);
    if (!answered.size) return normalizedSavedIndex;
    for (let index = 0; index < total; index += 1) {
      if (!answered.has(index)) return index;
    }
    return total;
  }

  function getAnsweredQuestionIndexes(questions, attempts) {
    const source = Array.isArray(questions) ? questions : [];
    const byId = {};
    source.forEach((question, index) => {
      const ref = getQuestionRef(question, index + 1);
      if (ref.id) byId[ref.id] = index;
    });
    const answered = new Set();
    (Array.isArray(attempts) ? attempts : []).forEach(attempt => {
      if (!attempt || typeof attempt !== 'object') return;
      const position = Number(attempt.position);
      if (Number.isInteger(position) && position >= 1 && position <= source.length) {
        answered.add(position - 1);
        return;
      }
      const id = getAttemptQuestionId(attempt);
      if (id && Object.prototype.hasOwnProperty.call(byId, id)) {
        answered.add(byId[id]);
      }
    });
    return answered;
  }

  function normalizeSelectionRequest(input = {}, options = {}) {
    const setIds = Array.from(new Set((Array.isArray(input.setIds) ? input.setIds : [])
      .map(value => String(value || '').trim())
      .filter(Boolean)));
    const defaultQuestionsPerSubtopic = Number(options.defaultQuestionsPerSubtopic) || 4;
    const mode = input.mode === 'mixed' || input.mode === 'subtopic' ? input.mode : '';
    const questionsPerSubtopic = mode === 'subtopic'
      ? Math.max(0, Number(input.questionsPerSubtopic) || 0)
      : Math.max(1, Number(input.questionsPerSubtopic) || defaultQuestionsPerSubtopic);
    const maxCount = Math.max(1, Number(options.maxCount || input.maxCount) || 60);
    const countMode = input.countMode === 'max' || input.selectedLimit === 'max' ? 'max' : 'per-subtopic';
    const requestedCount = mode === 'subtopic'
      ? Number(input.count) || maxCount
      : countMode === 'max'
        ? maxCount
        : Number(input.count) || setIds.length * questionsPerSubtopic || questionsPerSubtopic;
    return {
      mode,
      domain: String(input.domain || '').trim(),
      setIds,
      grade: String(input.grade || '4'),
      difficulty: String(input.difficulty || 'medium'),
      count: Math.min(maxCount, Math.max(1, requestedCount)),
      countMode,
      questionsPerSubtopic,
      selectionPolicyVersion: Number(input.selectionPolicyVersion) || 1
    };
  }

  return {
    gradeOptions,
    difficultyOptions,
    selectQuestionsForLevel,
    selectCurrentQuestions,
    selectMixedQuestions,
    fillQuestionGroup,
    fillUniqueQuestionSelection,
    selectUniqueQuestions,
    getQuestionFingerprint,
    getActiveMixedSubtopics,
    questionSupportsGrade,
    getDifficultyDistance,
    difficultyRank,
    buildQuestionRefs,
    findNextUnansweredQuestionIndex,
    normalizeSelectionRequest,
    getQuestionId,
    getQuestionRef,
    getAttemptQuestionId
  };
});
