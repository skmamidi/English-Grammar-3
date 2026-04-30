(function (root, factory) {
  'use strict';

  const reviewDomain = root.GrammarQuestAdaptiveReviewDomain ||
    (typeof require === 'function' ? require('./adaptive-review-domain') : null);
  const api = factory(reviewDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAdaptiveReviewSelection = api;
})(typeof window !== 'undefined' ? window : globalThis, function (reviewDomain) {
  'use strict';

  async function selectReviewQuestions(options = {}) {
    const queue = reviewDomain.normalizeReviewQueue(options.queue);
    const loader = options.loader || {};
    const count = Math.max(1, Number(options.count) || queue.items.length || 5);
    const telemetry = typeof options.telemetry === 'function' ? options.telemetry : () => {};
    const selected = [];
    const selectedRefs = [];
    const refs = queue.items.map(item => item.questionRef);
    const hydrated = loader && typeof loader.hydrateQuestionRefs === 'function'
      ? await loader.hydrateQuestionRefs(refs)
      : [];

    for (let index = 0; index < queue.items.length && selected.length < count; index += 1) {
      const item = queue.items[index];
      const question = hydrated[index];
      if (isQuestionRefMatch(question, item.questionRef)) {
        selected.push(question);
        selectedRefs.push(toQuestionRef(question));
        continue;
      }
      telemetry({
        event: 'review_item_stale_ref',
        questionId: item.questionRef.id,
        sourceSet: item.questionRef.sourceSet,
        reason: question ? 'identity_mismatch' : 'missing_ref'
      });
      const backfill = await findBackfill(item, selectedRefs, loader);
      if (backfill && selected.length < count) {
        selected.push(backfill);
        selectedRefs.push(toQuestionRef(backfill));
      }
    }

    return { questions: selected, questionRefs: selectedRefs };
  }

  async function findBackfill(item, selectedRefs, loader) {
    if (!loader || typeof loader.loadSet !== 'function' || !item.setId) return null;
    const set = await loader.loadSet(item.setId);
    const questions = Array.isArray(set && set.questions) ? set.questions : [];
    const used = new Set(selectedRefs.map(ref => ref.id).concat(item.questionRef.id));
    return questions.find(question => {
      if (!question || used.has(question.id)) return false;
      const metadata = question.metadata || {};
      const skillIds = Array.isArray(metadata.skillIds) ? metadata.skillIds : [];
      return item.skillIds.some(skillId => skillIds.includes(skillId));
    }) || null;
  }

  function isQuestionRefMatch(question, ref) {
    if (!question || !ref) return false;
    const actual = toQuestionRef(question);
    return actual.id === ref.id
      && actual.sourceSet === ref.sourceSet
      && Number(actual.version) === Number(ref.version)
      && actual.contentHash === ref.contentHash
      && Number(actual.sequence) === Number(ref.sequence);
  }

  function toQuestionRef(question) {
    const metadata = question && question.metadata || {};
    return {
      id: String(question && question.id || ''),
      sourceSet: String(metadata.sourceSet || ''),
      version: Number(question && question.version) || 0,
      contentHash: String(question && question.contentHash || ''),
      sequence: Number(metadata.sequence) || 0
    };
  }

  return {
    isQuestionRefMatch,
    selectReviewQuestions,
    toQuestionRef
  };
});
