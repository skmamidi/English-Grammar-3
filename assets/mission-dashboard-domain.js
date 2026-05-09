(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestMissionDashboardDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const PAYLOAD_KEYS = new Set([
    'answer',
    'answerKey',
    'answers',
    'choices',
    'correct',
    'correctAnswer',
    'email',
    'explanation',
    'learnerDisplayName',
    'learnerName',
    'prompt',
    'providerPayload',
    'question',
    'questionSnapshots',
    'studentName'
  ]);
  const DUE_SOON_MS = 48 * 60 * 60 * 1000;

  function buildMissionDashboardProjection(input = {}) {
    const now = toTime(input.now) || Date.now();
    const missions = normalizeMissions(input.missions || input.catalog);
    const progressByMission = indexByMission(normalizeProgress(input.missionProgress || input.progress));
    const assignmentsByMission = indexAssignments(input.assignments);
    const recommendationsByMission = indexRecommendations(input.recommendations);
    const cards = missions.map(mission => buildMissionCard(mission, {
      now,
      progress: progressByMission[mission.missionId] || null,
      assignment: assignmentsByMission[mission.missionId] || null,
      recommendation: recommendationsByMission[mission.missionId] || null
    })).sort(compareCards);
    const summary = {
      totalMissionCount: cards.length,
      activeMissionCount: cards.filter(card => !['completed', 'blocked'].includes(card.state)).length,
      overdueCount: cards.filter(card => card.state === 'overdue').length,
      dueSoonCount: cards.filter(card => card.state === 'due_soon').length,
      blockedCount: cards.filter(card => card.state === 'blocked').length,
      completedCount: cards.filter(card => card.state === 'completed').length,
      recommendedCount: cards.filter(card => card.state === 'recommended').length
    };
    return {
      schemaVersion: 1,
      generatedAt: new Date(now).toISOString(),
      summary,
      guardianSummary: buildGuardianSummary(summary),
      cards,
      calendarStates: cards
        .filter(card => card.dueAt || ['overdue', 'due_soon', 'blocked'].includes(card.state))
        .map(card => ({
          missionId: card.missionId,
          title: card.title,
          state: card.state,
          dueAt: card.dueAt,
          nextAction: card.nextAction
        })),
      reminderCandidates: cards
        .filter(card => ['overdue', 'due_soon'].includes(card.state))
        .map(card => ({
          missionId: card.missionId,
          state: card.state,
          dueAt: card.dueAt,
          channel: 'in_app'
        }))
    };
  }

  function buildMissionCard(mission, context) {
    const progress = context.progress;
    const assignment = context.assignment;
    const recommendation = context.recommendation;
    const completedStepIds = progress ? progress.completedStepIds : [];
    const requiredStepIds = mission.requiredStepIds;
    const progressPercent = requiredStepIds.length
      ? Math.round((requiredStepIds.filter(stepId => completedStepIds.includes(stepId)).length / requiredStepIds.length) * 100)
      : 0;
    const dueAt = assignment && assignment.dueAt || '';
    const state = chooseState(mission, {
      now: context.now,
      progress,
      assignment,
      recommendation,
      progressPercent,
      dueAt
    });
    return {
      missionId: mission.missionId,
      title: mission.title,
      state,
      progressPercent,
      completedStepCount: requiredStepIds.filter(stepId => completedStepIds.includes(stepId)).length,
      requiredStepCount: requiredStepIds.length,
      dueAt,
      assignmentRef: assignment ? { assignmentId: assignment.id } : null,
      reasonCodes: recommendation ? recommendation.reasonCodes : [],
      nextAction: buildNextAction(mission, progress, recommendation),
      copy: copyForState(state)
    };
  }

  function chooseState(mission, context) {
    if (context.progressPercent >= 100 || context.progress && context.progress.completedAt) return 'completed';
    if (mission.prerequisites.length && !hasPrerequisiteEvidence(mission.prerequisites, context.progress)) return 'blocked';
    if (context.dueAt && toTime(context.dueAt) < context.now) return 'overdue';
    if (context.dueAt && toTime(context.dueAt) - context.now <= DUE_SOON_MS) return 'due_soon';
    if (context.progress && context.progress.completedStepIds.length) return 'in_progress';
    if (context.recommendation) return 'recommended';
    return 'ready';
  }

  function buildNextAction(mission, progress, recommendation) {
    if (recommendation && recommendation.nextAction) return sanitizeNextAction(recommendation.nextAction);
    const completed = new Set(progress ? progress.completedStepIds : []);
    const step = mission.stepSummaries.find(item => item.required !== false && !completed.has(item.stepId)) || mission.stepSummaries[0] || {};
    return sanitizeNextAction({ type: step.type, stepId: step.stepId, route: step.route });
  }

  function sanitizeNextAction(action) {
    const input = stripPayload(action && typeof action === 'object' ? action : {});
    const route = input.route && typeof input.route === 'object' ? input.route : {};
    return {
      type: safeString(input.type),
      stepId: safeString(input.stepId),
      route: {
        type: safeString(route.type),
        webPath: safeInternalRoute(route.webPath)
      }
    };
  }

  function buildGuardianSummary(summary) {
    const parts = [];
    if (summary.overdueCount) parts.push(`${summary.overdueCount} mission ${summary.overdueCount === 1 ? 'needs' : 'need'} attention`);
    if (summary.dueSoonCount) parts.push(`${summary.dueSoonCount} ${summary.dueSoonCount === 1 ? 'is' : 'are'} coming due soon`);
    if (!parts.length && summary.completedCount) parts.push(`${summary.completedCount} ${summary.completedCount === 1 ? 'mission is' : 'missions are'} complete`);
    return {
      copy: parts.length ? `${parts.join(', and ')}.` : 'No mission schedule needs attention right now.'
    };
  }

  function normalizeMissions(values) {
    return (Array.isArray(values) ? values : []).map(value => {
      const input = stripPayload(value && typeof value === 'object' ? value : {});
      const completionPolicy = input.completionPolicy && typeof input.completionPolicy === 'object' ? input.completionPolicy : {};
      return {
        missionId: safeString(input.missionId || input.id),
        title: safeString(input.title || input.missionId || input.id),
        requiredStepIds: normalizeStringArray(completionPolicy.requiredStepIds || input.requiredStepIds),
        prerequisites: normalizePrerequisites(input.prerequisites),
        stepSummaries: normalizeSteps(input.stepSummaries || input.steps)
      };
    }).filter(mission => mission.missionId);
  }

  function normalizeProgress(values) {
    return (Array.isArray(values) ? values : []).map(value => {
      const input = stripPayload(value && typeof value === 'object' ? value : {});
      return {
        missionId: safeString(input.missionId || input.id),
        completedStepIds: normalizeStringArray(input.completedStepIds),
        prerequisiteEvidence: normalizePrerequisites(input.prerequisiteEvidence || input.prerequisites),
        completedAt: safeIso(input.completedAt)
      };
    }).filter(record => record.missionId);
  }

  function normalizeSteps(values) {
    return (Array.isArray(values) ? values : []).map(value => {
      const input = stripPayload(value && typeof value === 'object' ? value : {});
      return {
        stepId: safeString(input.stepId || input.id),
        type: safeString(input.type),
        title: safeString(input.title),
        required: input.required !== false,
        route: input.route || null
      };
    }).filter(step => step.stepId);
  }

  function normalizePrerequisites(values) {
    return (Array.isArray(values) ? values : []).map(value => {
      const input = stripPayload(value && typeof value === 'object' ? value : {});
      return {
        type: safeString(input.type),
        setId: safeString(input.setId),
        lessonId: safeString(input.lessonId),
        skillId: safeString(input.skillId)
      };
    }).filter(item => item.type);
  }

  function indexByMission(records) {
    return records.reduce((index, record) => {
      index[record.missionId] = record;
      return index;
    }, {});
  }

  function indexAssignments(assignments) {
    return (Array.isArray(assignments) ? assignments : []).reduce((index, item) => {
      const input = stripPayload(item && typeof item === 'object' ? item : {});
      if (!['active', 'in_progress'].includes(safeString(input.status || 'active'))) return index;
      const scope = input.scope && typeof input.scope === 'object' ? input.scope : {};
      (Array.isArray(scope.missionRefs) ? scope.missionRefs : []).forEach(ref => {
        const missionId = safeString(ref && ref.missionId);
        if (!missionId) return;
        const assignment = {
          id: safeString(input.id || input.assignmentId),
          dueAt: safeIso(input.dueAt)
        };
        if (!index[missionId] || compareDueAt(assignment.dueAt, index[missionId].dueAt) < 0) index[missionId] = assignment;
      });
      return index;
    }, {});
  }

  function indexRecommendations(recommendations) {
    return (Array.isArray(recommendations) ? recommendations : []).reduce((index, item) => {
      const input = stripPayload(item && typeof item === 'object' ? item : {});
      const missionId = safeString(input.missionId);
      if (!missionId) return index;
      index[missionId] = {
        missionId,
        reasonCodes: normalizeStringArray(input.reasonCodes),
        nextAction: input.nextAction || null
      };
      return index;
    }, {});
  }

  function hasPrerequisiteEvidence(prerequisites, progress) {
    const evidence = progress ? progress.prerequisiteEvidence : [];
    return prerequisites.every(prerequisite => evidence.some(item => {
      if (item.type !== prerequisite.type) return false;
      if (prerequisite.setId && item.setId !== prerequisite.setId) return false;
      if (prerequisite.lessonId && item.lessonId !== prerequisite.lessonId) return false;
      if (prerequisite.skillId && item.skillId !== prerequisite.skillId) return false;
      return true;
    }));
  }

  function copyForState(state) {
    return {
      overdue: 'Mission is overdue.',
      due_soon: 'Mission is due soon.',
      blocked: 'Mission is waiting on a prerequisite.',
      completed: 'Mission complete.',
      in_progress: 'Mission in progress.',
      recommended: 'Mission recommended.',
      ready: 'Mission ready.'
    }[state] || 'Mission ready.';
  }

  function compareCards(left, right) {
    const weights = { overdue: 0, due_soon: 1, blocked: 2, in_progress: 3, recommended: 4, ready: 5, completed: 6 };
    return (Object.prototype.hasOwnProperty.call(weights, left.state) ? weights[left.state] : 9) -
      (Object.prototype.hasOwnProperty.call(weights, right.state) ? weights[right.state] : 9) ||
      compareDueAt(left.dueAt, right.dueAt) ||
      left.missionId.localeCompare(right.missionId);
  }

  function compareDueAt(left, right) {
    return (toTime(left) || Number.MAX_SAFE_INTEGER) - (toTime(right) || Number.MAX_SAFE_INTEGER);
  }

  function stripPayload(value) {
    if (Array.isArray(value)) return value.map(stripPayload);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((result, key) => {
      if (PAYLOAD_KEYS.has(key)) return result;
      result[key] = stripPayload(value[key]);
      return result;
    }, {});
  }

  function safeInternalRoute(value) {
    const route = safeString(value);
    if (!route || /^[a-z]+:/i.test(route) || route.includes('..')) return '';
    return route.replace(/^\/+/, '');
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function toTime(value) {
    const time = Date.parse(value || '');
    return Number.isFinite(time) ? time : 0;
  }

  return {
    buildMissionDashboardProjection,
    normalizeMissions,
    normalizeProgress
  };
});
