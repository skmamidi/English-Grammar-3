(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAdaptiveReviewDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const STATUSES = new Set(['queued', 'seen', 'mastered', 'dismissed']);

  function buildReviewQueue(options = {}) {
    const now = safeIso(options.now) || new Date().toISOString();
    const maxItems = Math.max(1, Number(options.maxItems) || 8);
    const items = [];
    collectMissedItems(items, options.sessions, now);
    collectWeakSkillItems(items, options.mastery, options.manifest, now);
    return normalizeReviewQueue({
      queueId: options.queueId || `adaptive-review-${now.slice(0, 10)}`,
      generatedAt: now,
      items: dedupeItems(items).sort((a, b) => b.priority - a.priority).slice(0, maxItems)
    });
  }

  function normalizeReviewQueue(queue) {
    const input = queue && typeof queue === 'object' ? queue : {};
    return {
      queueId: safeString(input.queueId),
      generatedAt: safeIso(input.generatedAt) || '',
      updatedAt: safeIso(input.updatedAt) || safeIso(input.generatedAt) || '',
      items: (Array.isArray(input.items) ? input.items : []).map(normalizeReviewItem).filter(item => item.questionRef.id)
    };
  }

  function normalizeReviewItem(item) {
    const input = item && typeof item === 'object' ? item : {};
    const questionRef = normalizeQuestionRef(input.questionRef || input);
    return {
      id: safeString(input.id) || `review-${questionRef.id}`,
      questionRef,
      setId: safeString(input.setId || questionRef.sourceSet),
      skillIds: normalizeStringArray(input.skillIds),
      reason: normalizeReason(input.reason),
      priority: Math.max(0, Number(input.priority) || 0),
      dueAt: safeIso(input.dueAt) || '',
      status: STATUSES.has(input.status) ? input.status : 'queued',
      seenAt: safeIso(input.seenAt) || '',
      masteredAt: safeIso(input.masteredAt) || ''
    };
  }

  function markReviewItemSeen(queue, questionId, seenAt) {
    return updateReviewItem(queue, questionId, item => Object.assign({}, item, {
      status: item.status === 'mastered' ? 'mastered' : 'seen',
      seenAt: safeIso(seenAt) || new Date().toISOString()
    }));
  }

  function markReviewItemMastered(queue, questionId, masteredAt) {
    return updateReviewItem(queue, questionId, item => Object.assign({}, item, {
      status: 'mastered',
      masteredAt: safeIso(masteredAt) || new Date().toISOString()
    }));
  }

  function updateReviewItem(queue, questionId, updater) {
    const normalized = normalizeReviewQueue(queue);
    normalized.items = normalized.items.map(item => item.questionRef.id === questionId ? updater(item) : item);
    normalized.updatedAt = new Date().toISOString();
    return normalizeReviewQueue(normalized);
  }

  function collectMissedItems(items, sessions, now) {
    (Array.isArray(sessions) ? sessions : []).forEach(session => {
      const completedAt = safeIso(session && session.completedAt) || now;
      (Array.isArray(session && session.attempts) ? session.attempts : []).forEach(attempt => {
        if (!attempt || attempt.correct) return;
        const questionRef = normalizeQuestionRef({
          id: attempt.questionId || attempt.id,
          sourceSet: attempt.sourceSet || attempt.subtopicId,
          version: attempt.questionVersion || attempt.version,
          contentHash: attempt.questionHash || attempt.contentHash,
          sequence: attempt.sequence
        });
        if (!questionRef.id || !questionRef.sourceSet) return;
        items.push({
          id: `review-${questionRef.id}`,
          questionRef,
          setId: questionRef.sourceSet,
          skillIds: normalizeStringArray(attempt.skillIds),
          reason: 'missed_recently',
          priority: 100,
          dueAt: now,
          status: 'queued',
          completedAt
        });
      });
    });
  }

  function collectWeakSkillItems(items, mastery, manifest, now) {
    const skills = mastery && mastery.skills || {};
    Object.keys(skills).forEach(skillId => {
      const skill = skills[skillId] || {};
      const total = Number(skill.total) || 0;
      const correct = Number(skill.correct) || 0;
      if (total < 3 || correct / total >= 0.7) return;
      const ref = findManifestQuestionForSkill(manifest, skillId);
      if (!ref.id) return;
      items.push({
        id: `review-${ref.id}`,
        questionRef: ref,
        setId: ref.sourceSet,
        skillIds: [skillId],
        reason: 'weak_skill',
        priority: 80,
        dueAt: now,
        status: 'queued'
      });
    });
  }

  function findManifestQuestionForSkill(manifest, skillId) {
    const sets = Array.isArray(manifest && manifest.sets) ? manifest.sets : [];
    for (const set of sets) {
      const questions = Array.isArray(set.questions) ? set.questions : [];
      const match = questions.find(question => {
        const metadata = question && question.metadata || {};
        return normalizeStringArray(metadata.skillIds).includes(skillId);
      });
      if (match) return normalizeQuestionRef({
        id: match.id,
        sourceSet: match.metadata && match.metadata.sourceSet || set.id,
        version: match.version,
        contentHash: match.contentHash,
        sequence: match.metadata && match.metadata.sequence
      });
    }
    return normalizeQuestionRef(null);
  }

  function dedupeItems(items) {
    const byId = {};
    items.forEach(item => {
      const normalized = normalizeReviewItem(item);
      const id = normalized.questionRef.id;
      if (!id) return;
      if (!byId[id] || normalized.priority > byId[id].priority) byId[id] = normalized;
    });
    return Object.keys(byId).map(id => byId[id]);
  }

  function normalizeQuestionRef(ref) {
    const input = ref && typeof ref === 'object' ? ref : {};
    return {
      id: safeString(input.id || input.questionId),
      sourceSet: safeString(input.sourceSet || input.setId),
      version: Number(input.version || input.questionVersion) || 0,
      contentHash: safeString(input.contentHash || input.questionHash),
      sequence: Number(input.sequence) || 0
    };
  }

  function normalizeReason(reason) {
    const value = safeString(reason);
    return ['missed_recently', 'weak_skill', 'due_for_review'].includes(value) ? value : 'missed_recently';
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    buildReviewQueue,
    markReviewItemMastered,
    markReviewItemSeen,
    normalizeQuestionRef,
    normalizeReviewItem,
    normalizeReviewQueue
  };
});
