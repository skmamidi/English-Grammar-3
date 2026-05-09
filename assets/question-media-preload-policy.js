(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestQuestionMediaPreloadPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const DISABLED_EFFECTIVE_TYPES = Object.freeze(['slow-2g', '2g']);
  const ALLOWED_MEDIA_TYPES = Object.freeze(['audio', 'image']);

  function buildQuestionMediaPrefetchPlan(input = {}) {
    const currentIndex = nonNegativeInteger(input.currentIndex);
    const maxAhead = Math.min(2, nonNegativeInteger(input.maxAhead, 2));
    const maxBytes = Math.max(0, Number(input.maxBytes) || 128 * 1024);
    const questions = Array.isArray(input.questions) ? input.questions : [];
    const networkRestricted = isNetworkRestricted(input.networkInfo);
    const start = Math.min(currentIndex, Math.max(0, questions.length - 1));
    const end = Math.min(questions.length - 1, start + maxAhead);
    const candidates = [];

    for (let index = start; index <= end; index += 1) {
      const question = questions[index] || {};
      normalizeQuestionMediaRefs(question.mediaRefs, question.questionId).forEach(ref => {
        if (networkRestricted && index !== start && ref.required !== true) return;
        candidates.push(Object.assign({}, ref, { questionIndex: index }));
      });
    }

    const mediaRefs = [];
    let totalBytes = 0;
    candidates.forEach(ref => {
      if (totalBytes + ref.bytes > maxBytes && ref.required !== true) return;
      mediaRefs.push(ref);
      totalBytes += ref.bytes;
    });

    return {
      schemaVersion: 1,
      strategy: 'current_plus_next_two',
      window: {
        currentIndex: start,
        endIndex: end
      },
      mediaRefs,
      totalBytes,
      policy: {
        maxAhead,
        maxBytes,
        saveDataRestricted: networkRestricted
      }
    };
  }

  function validateQuestionMediaPrefetchPlan(plan = {}) {
    const input = plan && typeof plan === 'object' ? plan : {};
    const errors = [];
    if (input.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    if (safeString(input.strategy) !== 'current_plus_next_two') errors.push('strategy must be current_plus_next_two');
    if (!input.window || !Number.isInteger(input.window.currentIndex) || !Number.isInteger(input.window.endIndex)) errors.push('prefetch window is required');
    if (input.window && input.window.endIndex - input.window.currentIndex > 2) errors.push('prefetch window must not exceed next two questions');
    if (!Array.isArray(input.mediaRefs)) errors.push('mediaRefs are required');
    (Array.isArray(input.mediaRefs) ? input.mediaRefs : []).forEach(ref => {
      if (!safeString(ref.questionId)) errors.push('media ref questionId is required');
      if (!ALLOWED_MEDIA_TYPES.includes(safeString(ref.type))) errors.push('media ref type is invalid');
      if (!/^\/assets\/(?:audio|images)\//.test(safeString(ref.url))) errors.push('media ref url must be an app media asset');
      if (safeString(ref.cacheTarget) !== 'cacheAPI') errors.push('media ref cacheTarget must be cacheAPI');
    });
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function normalizeQuestionMediaRef(ref = {}) {
    const input = ref && typeof ref === 'object' ? ref : {};
    return {
      questionId: safeString(input.questionId),
      type: ALLOWED_MEDIA_TYPES.includes(safeString(input.type)) ? safeString(input.type) : 'image',
      url: safeString(input.url).split(/[?#]/)[0],
      bytes: Math.max(0, Math.round(Number(input.bytes) || 0)),
      contentHash: safeHash(input.contentHash),
      required: input.required === true,
      cacheTarget: 'cacheAPI'
    };
  }

  function normalizeQuestionMediaRefs(refs, questionId) {
    return (Array.isArray(refs) ? refs : [])
      .map(ref => normalizeQuestionMediaRef(Object.assign({}, ref, { questionId: ref && ref.questionId || questionId })))
      .filter(ref => ref.url);
  }

  function isNetworkRestricted(networkInfo = {}) {
    const input = networkInfo && typeof networkInfo === 'object' ? networkInfo : {};
    const effectiveType = safeString(input.effectiveType).toLowerCase();
    return input.saveData === true || DISABLED_EFFECTIVE_TYPES.includes(effectiveType);
  }

  function safeHash(value) {
    const text = safeString(value);
    return /^sha256:[a-f0-9]{12,}$/i.test(text) ? text : '';
  }

  function nonNegativeInteger(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? Math.floor(number) : fallback;
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildQuestionMediaPrefetchPlan,
    normalizeQuestionMediaRef,
    validateQuestionMediaPrefetchPlan
  };
});
