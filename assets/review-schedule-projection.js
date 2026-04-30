(function (root, factory) {
  'use strict';

  const scheduler = root.GrammarQuestSpacedRepetitionDomain ||
    (typeof require === 'function' ? require('./spaced-repetition-domain') : null);
  const api = factory(scheduler);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestReviewScheduleProjection = api;
})(typeof window !== 'undefined' ? window : globalThis, function (scheduler) {
  'use strict';

  function projectDueReview(options = {}) {
    const now = safeIso(options.now) || new Date().toISOString();
    const schedules = scheduler && typeof scheduler.normalizeSchedules === 'function'
      ? scheduler.normalizeSchedules(options.schedules)
      : [];
    const dueSchedules = schedules
      .filter(schedule => schedule.dueAt && schedule.dueAt <= now)
      .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));
    const futureSchedules = schedules
      .filter(schedule => schedule.dueAt && schedule.dueAt > now)
      .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));
    return {
      dueQuestionRefs: dueSchedules.map(schedule => schedule.ref),
      dueSkillIds: getDueSkillIds(options.mastery),
      overdueCount: dueSchedules.length,
      nextDueAt: futureSchedules[0] && futureSchedules[0].dueAt || ''
    };
  }

  function getDueSkillIds(mastery) {
    const skills = mastery && mastery.skills || {};
    return Object.keys(skills)
      .filter(skillId => {
        const skill = skills[skillId] || {};
        const total = Number(skill.total) || 0;
        const correct = Number(skill.correct) || 0;
        return total >= 3 && correct / total < 0.7;
      })
      .sort();
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  return {
    projectDueReview
  };
});
