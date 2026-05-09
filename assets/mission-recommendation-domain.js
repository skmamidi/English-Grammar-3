(function (root, factory) {
  'use strict';

  const weakSkillApi = root.GrammarQuestWeakSkillRecommendationDomain ||
    (typeof require === 'function' ? require('./weak-skill-recommendation-domain') : null);
  const masteryApi = root.GrammarQuestMasteryProjectionDomain ||
    (typeof require === 'function' ? require('./mastery-projection-domain') : null);
  const lessonProgressApi = root.GrammarQuestLessonProgressDomain ||
    (typeof require === 'function' ? require('./lesson-progress-domain') : null);
  const api = factory(weakSkillApi, masteryApi, lessonProgressApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestMissionRecommendationDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function (weakSkillApi, masteryApi, lessonProgressApi) {
  'use strict';

  const DEFAULT_POLICY = Object.freeze({
    maxRecommendations: 3,
    maxRecentSetAttemptsWithoutSignal: 3,
    reasonWeights: Object.freeze({
      overdue_review: 500,
      assignment_urgent: 400,
      weak_skill: 300,
      mastery_gap: 220,
      goal_match: 80,
      prerequisite_ready: 45,
      lesson_ready: 40
    })
  });
  const REASON_LABELS = Object.freeze({
    overdue_review: 'A review checkpoint is due for this mission.',
    assignment_urgent: 'An active assignment makes this mission timely.',
    weak_skill: 'Recent practice points to a skill this mission can repair.',
    mastery_gap: 'Mastery evidence shows this skill needs more practice.',
    goal_match: 'This mission matches a current learner goal.',
    prerequisite_ready: 'Prerequisite evidence is ready for the next mission step.',
    lesson_ready: 'A lesson step is ready before practice.'
  });

  function generateMissionRecommendations(input = {}) {
    const policy = normalizePolicy(input.policy);
    const generatedAt = safeIso(input.now) || new Date().toISOString();
    const missions = normalizeMissions(input.catalog);
    const weakSignals = collectWeakSkillSignals(input, generatedAt);
    const masterySignals = collectMasterySignals(input, generatedAt);
    const lessonIndex = buildLessonProgressIndex(input.lessonProgress || input.lessonProgressRecords);
    const assignmentSignals = collectAssignmentSignals(input.assignments || input.assignmentSummaries, generatedAt);
    const reviewSignals = collectReviewSignals(input.reviewSchedule || input.reviewSchedules, generatedAt);
    const goalSignals = collectGoalSignals(input.goals || input.learnerGoals);
    const missionProgress = normalizeMissionProgress(input.missionProgress || input.progress);
    const recentSetAttempts = collectRecentSetAttempts(input.recentSessions || input.sessions);

    const evaluated = missions.map(mission => evaluateMission(mission, {
      policy,
      generatedAt,
      weakSignals,
      masterySignals,
      lessonIndex,
      assignmentSignals,
      reviewSignals,
      goalSignals,
      missionProgress,
      recentSetAttempts,
      learnerGrade: positiveInt(input.learnerGrade || input.grade, 0)
    }));

    const recommendations = evaluated
      .filter(item => !item.suppressed && item.recommendation.score > 0)
      .map(item => item.recommendation)
      .sort((left, right) => right.score - left.score || left.missionId.localeCompare(right.missionId))
      .slice(0, policy.maxRecommendations);

    return {
      schemaVersion: 1,
      generatedAt,
      recommendations,
      suppressed: evaluated
        .filter(item => item.suppressed)
        .map(item => item.suppressed)
        .sort((left, right) => left.missionId.localeCompare(right.missionId))
    };
  }

  function evaluateMission(mission, context) {
    const missionSkillIds = normalizeRefs(mission.skillRefs, 'skillId');
    const missionSetIds = normalizeRefs(mission.subtopicRefs, 'setId');
    const completedStepIds = new Set(normalizeMissionCompletedSteps(context.missionProgress[mission.missionId]));
    const repairSequence = buildRepairSequence(mission, completedStepIds, context.lessonIndex);
    const requiredStepIds = normalizeStringArray(mission.completionPolicy && mission.completionPolicy.requiredStepIds);
    const allRequiredComplete = requiredStepIds.length > 0 && requiredStepIds.every(stepId =>
      repairSequence.some(step => step.stepId === stepId && step.status === 'completed')
    );
    const reasonSet = new Set();
    const reasonDetails = [];

    if (hasReviewSignal(missionSkillIds, missionSetIds, context.reviewSignals)) addReason('overdue_review', reasonSet, reasonDetails, missionSkillIds, missionSetIds);
    if (hasAssignmentSignal(missionSkillIds, missionSetIds, context.assignmentSignals)) addReason('assignment_urgent', reasonSet, reasonDetails, missionSkillIds, missionSetIds);
    if (hasWeakSignal(missionSkillIds, context.weakSignals)) addReason('weak_skill', reasonSet, reasonDetails, missionSkillIds, missionSetIds);
    if (hasMasteryGap(missionSkillIds, context.masterySignals)) addReason('mastery_gap', reasonSet, reasonDetails, missionSkillIds, missionSetIds);
    if (hasGoalSignal(mission, missionSkillIds, missionSetIds, context.goalSignals)) addReason('goal_match', reasonSet, reasonDetails, missionSkillIds, missionSetIds);
    if (hasReadyPrerequisite(mission, context.lessonIndex)) addReason('prerequisite_ready', reasonSet, reasonDetails, missionSkillIds, missionSetIds);
    if (hasReadyLessonStep(repairSequence)) addReason('lesson_ready', reasonSet, reasonDetails, missionSkillIds, missionSetIds);

    const hasFreshSignal = ['overdue_review', 'assignment_urgent', 'weak_skill', 'mastery_gap'].some(code => reasonSet.has(code));
    if (allRequiredComplete && !hasFreshSignal) {
      return suppressedMission(mission, 'repeated_practice_guard');
    }
    if (!hasFreshSignal && exceedsRecentPractice(missionSetIds, context.recentSetAttempts, context.policy)) {
      return suppressedMission(mission, 'repeated_practice_guard');
    }

    const reasonCodes = orderReasonCodes(reasonSet);
    const score = reasonCodes.reduce((sum, code) => sum + (context.policy.reasonWeights[code] || 0), 0);
    const nextAction = chooseNextAction(repairSequence);
    return {
      recommendation: {
        id: `mission-rec-${mission.missionId}`,
        missionId: mission.missionId,
        title: mission.title,
        domain: mission.domain,
        gradeBand: normalizeGradeBand(mission.gradeBand),
        target: {
          type: 'guided_mission',
          missionId: mission.missionId,
          route: mission.route && mission.route.webPath || `mission.html?missionId=${encodeURIComponent(mission.missionId)}`
        },
        score,
        reasonCodes,
        explanation: buildExplanation(mission, reasonCodes, reasonDetails),
        nextAction,
        repairSequence,
        guardrails: {
          gradeEligible: isGradeEligible(mission.gradeBand, context.learnerGrade),
          repeatedPracticeSuppressed: false,
          refOnly: true
        }
      },
      suppressed: null
    };
  }

  function collectWeakSkillSignals(input, generatedAt) {
    const result = Array.isArray(input.weakSkillRecommendations)
      ? { recommendations: input.weakSkillRecommendations }
      : weakSkillApi && typeof weakSkillApi.generateWeakSkillRecommendations === 'function'
        ? weakSkillApi.generateWeakSkillRecommendations(Object.assign({}, input, { now: generatedAt }))
        : { recommendations: [] };
    const bySkill = {};
    (Array.isArray(result.recommendations) ? result.recommendations : []).forEach(item => {
      const skillId = safeString(item && item.skillId);
      if (!skillId) return;
      bySkill[skillId] = {
        skillId,
        reasonCode: safeString(item.reasonCode),
        priority: Number(item.priority) || 0
      };
    });
    return bySkill;
  }

  function collectMasterySignals(input, generatedAt) {
    const projections = Array.isArray(input.masteryProjections)
      ? input.masteryProjections
      : masteryApi && typeof masteryApi.projectMasteryBySkill === 'function'
        ? masteryApi.projectMasteryBySkill(Object.assign({}, input, { now: generatedAt }))
        : [];
    const bySkill = {};
    projections.forEach(item => {
      const skillId = safeString(item && item.skillId);
      if (!skillId) return;
      bySkill[skillId] = {
        skillId,
        masteryBand: safeString(item.masteryBand),
        attempts: Number(item.attempts) || 0,
        overdueReviewCount: Number(item.overdueReviewCount) || 0,
        assignmentStruggleCount: Number(item.assignmentStruggleCount) || 0
      };
    });
    return bySkill;
  }

  function buildLessonProgressIndex(records) {
    const merged = lessonProgressApi && typeof lessonProgressApi.mergeLessonProgressRecords === 'function'
      ? lessonProgressApi.mergeLessonProgressRecords(records)
      : [];
    return merged.reduce((index, item) => {
      const setId = safeString(item && item.lessonRef && item.lessonRef.setId || item && item.setId);
      if (setId) index[setId] = { status: safeString(item.status), completedAt: safeString(item.completedAt) };
      return index;
    }, {});
  }

  function collectAssignmentSignals(assignments, generatedAt) {
    return normalizeAssignments(assignments).filter(assignment =>
      ['active', 'in_progress'].includes(assignment.status) &&
      (assignment.struggling || assignment.accuracy > 0 && assignment.accuracy < 0.7 || isPastOrNow(assignment.dueAt, generatedAt))
    );
  }

  function collectReviewSignals(schedules, generatedAt) {
    return (Array.isArray(schedules) ? schedules : []).map(schedule => ({
      skillIds: normalizeStringArray(schedule && schedule.skillIds),
      setId: safeString(schedule && schedule.setId || schedule && schedule.ref && schedule.ref.setId),
      dueAt: safeString(schedule && schedule.dueAt)
    })).filter(schedule => isPastOrNow(schedule.dueAt, generatedAt));
  }

  function collectGoalSignals(goals) {
    const input = goals && typeof goals === 'object' ? goals : {};
    return {
      domains: new Set(normalizeStringArray(input.focusDomains || input.domainIds || input.domains)),
      skillIds: new Set(normalizeStringArray(input.focusSkillIds || input.skillIds)),
      setIds: new Set(normalizeStringArray(input.focusSetIds || input.setIds))
    };
  }

  function collectRecentSetAttempts(sessions) {
    const counts = {};
    normalizeSessions(sessions).forEach(session => {
      session.attempts.forEach(attempt => {
        attempt.setIds.forEach(setId => {
          counts[setId] = (counts[setId] || 0) + 1;
        });
      });
    });
    return counts;
  }

  function buildRepairSequence(mission, completedStepIds, lessonIndex) {
    const steps = Array.isArray(mission.stepSummaries) ? mission.stepSummaries : [];
    const sequence = steps.map(step => {
      const setId = stepSetId(step);
      const lessonComplete = step.type === 'lesson' && setId && lessonIndex[setId] && lessonIndex[setId].status === 'completed';
      const completed = completedStepIds.has(step.stepId) || lessonComplete;
      return {
        stepId: safeString(step.stepId),
        type: safeString(step.type),
        title: safeString(step.title),
        required: step.required !== false,
        status: completed ? 'completed' : step.required === false ? 'optional' : 'upcoming',
        route: step.route && {
          type: safeString(step.route.type),
          webPath: safeString(step.route.webPath),
          params: sanitizeParams(step.route.params)
        } || { type: '', webPath: '', params: {} }
      };
    });
    const current = sequence.find(step => step.required && step.status !== 'completed');
    if (current) current.status = 'current';
    return sequence;
  }

  function chooseNextAction(sequence) {
    const step = sequence.find(item => item.status === 'current') ||
      sequence.find(item => item.status === 'optional') ||
      null;
    if (!step) {
      return { type: 'completed', stepId: '', label: 'Mission complete', route: { type: '', webPath: '', params: {} } };
    }
    return {
      type: step.type,
      stepId: step.stepId,
      label: actionLabel(step.type),
      route: step.route
    };
  }

  function addReason(code, reasonSet, reasonDetails, skillIds, setIds) {
    if (reasonSet.has(code)) return;
    reasonSet.add(code);
    reasonDetails.push({
      code,
      label: REASON_LABELS[code] || code,
      skillIds: skillIds.slice(0, 3),
      setIds: setIds.slice(0, 3)
    });
  }

  function buildExplanation(mission, reasonCodes, reasonDetails) {
    const skillText = normalizeRefs(mission.skillRefs, 'skillId').map(formatSkill).join(', ') || 'mission skills';
    const reasonText = reasonCodes.map(code => REASON_LABELS[code] || code).join(' ');
    return {
      summary: `${titleCase(mission.domain)} mission for ${skillText}: ${reasonText}`,
      reasons: reasonDetails
    };
  }

  function suppressedMission(mission, reasonCode) {
    return {
      recommendation: null,
      suppressed: {
        missionId: mission.missionId,
        reasonCode,
        refOnly: true
      }
    };
  }

  function hasReviewSignal(skillIds, setIds, signals) {
    return signals.some(signal =>
      intersects(skillIds, signal.skillIds) || signal.setId && setIds.includes(signal.setId)
    );
  }

  function hasAssignmentSignal(skillIds, setIds, signals) {
    return signals.some(signal =>
      intersects(skillIds, signal.skillIds) || intersects(setIds, signal.setIds)
    );
  }

  function hasWeakSignal(skillIds, signals) {
    return skillIds.some(skillId => Boolean(signals[skillId]));
  }

  function hasMasteryGap(skillIds, signals) {
    return skillIds.some(skillId => {
      const signal = signals[skillId];
      return signal && ['needs_practice', 'developing'].includes(signal.masteryBand);
    });
  }

  function hasGoalSignal(mission, skillIds, setIds, goals) {
    return goals.domains.has(safeString(mission.domain)) ||
      skillIds.some(skillId => goals.skillIds.has(skillId)) ||
      setIds.some(setId => goals.setIds.has(setId));
  }

  function hasReadyPrerequisite(mission, lessonIndex) {
    return (Array.isArray(mission.prerequisites) ? mission.prerequisites : []).some(prereq => {
      const setId = safeString(prereq && prereq.setId);
      return setId && lessonIndex[setId] && lessonIndex[setId].status === 'completed';
    });
  }

  function hasReadyLessonStep(sequence) {
    return sequence.some(step => step.type === 'lesson' && step.status === 'current');
  }

  function exceedsRecentPractice(setIds, counts, policy) {
    return setIds.some(setId => (counts[setId] || 0) > policy.maxRecentSetAttemptsWithoutSignal);
  }

  function normalizePolicy(policy) {
    const input = policy && typeof policy === 'object' ? policy : {};
    return {
      maxRecommendations: positiveInt(input.maxRecommendations, DEFAULT_POLICY.maxRecommendations),
      maxRecentSetAttemptsWithoutSignal: positiveInt(input.maxRecentSetAttemptsWithoutSignal, DEFAULT_POLICY.maxRecentSetAttemptsWithoutSignal),
      reasonWeights: Object.assign({}, DEFAULT_POLICY.reasonWeights, input.reasonWeights || {})
    };
  }

  function normalizeMissions(catalog) {
    return (Array.isArray(catalog && catalog.missions) ? catalog.missions : []).map(mission => ({
      missionId: safeString(mission && mission.missionId),
      title: safeString(mission && mission.title),
      description: safeString(mission && mission.description),
      domain: safeString(mission && mission.domain),
      gradeBand: normalizeGradeBand(mission && mission.gradeBand),
      route: mission && mission.route || null,
      subtopicRefs: Array.isArray(mission && mission.subtopicRefs) ? mission.subtopicRefs : [],
      skillRefs: Array.isArray(mission && mission.skillRefs) ? mission.skillRefs : [],
      prerequisites: Array.isArray(mission && mission.prerequisites) ? mission.prerequisites : [],
      completionPolicy: mission && mission.completionPolicy || {},
      stepSummaries: Array.isArray(mission && mission.stepSummaries) ? mission.stepSummaries : []
    })).filter(mission => mission.missionId);
  }

  function normalizeMissionProgress(progress) {
    return progress && typeof progress === 'object' ? progress : {};
  }

  function normalizeMissionCompletedSteps(progress) {
    if (!progress || typeof progress !== 'object') return [];
    return normalizeStringArray(progress.completedStepIds);
  }

  function normalizeAssignments(assignments) {
    return (Array.isArray(assignments) ? assignments : []).map(assignment => {
      const scope = assignment && assignment.scope || {};
      return {
        id: safeString(assignment && assignment.id),
        status: safeString(assignment && assignment.status || 'active'),
        dueAt: safeString(assignment && assignment.dueAt),
        accuracy: Number(assignment && assignment.accuracy) || 0,
        struggling: assignment && assignment.struggling === true,
        skillIds: normalizeStringArray(scope.skillIds || assignment && assignment.skillIds),
        setIds: normalizeStringArray(scope.setIds || assignment && assignment.setIds)
      };
    });
  }

  function normalizeSessions(sessions) {
    return (Array.isArray(sessions) ? sessions : []).map(session => ({
      attempts: (Array.isArray(session && session.attempts) ? session.attempts : []).map(attempt => ({
        questionId: safeString(attempt && (attempt.questionId || attempt.id)),
        setIds: normalizeStringArray(attempt && attempt.setIds).concat(inferSetIdsFromQuestionId(attempt && (attempt.questionId || attempt.id)))
      }))
    }));
  }

  function inferSetIdsFromQuestionId(questionId) {
    const value = safeString(questionId);
    const index = value.lastIndexOf('-q');
    return index > 0 ? [value.slice(0, index)] : [];
  }

  function stepSetId(step) {
    const params = step && step.route && step.route.params || {};
    return safeString(params.setId);
  }

  function orderReasonCodes(reasonSet) {
    const order = ['overdue_review', 'assignment_urgent', 'weak_skill', 'mastery_gap', 'goal_match', 'prerequisite_ready', 'lesson_ready'];
    return order.filter(code => reasonSet.has(code));
  }

  function actionLabel(type) {
    if (type === 'lesson') return 'Open lesson';
    if (type === 'practice') return 'Start practice';
    if (type === 'review') return 'Open review';
    if (type === 'reflection') return 'Reflect';
    return 'Open mission';
  }

  function isGradeEligible(gradeBand, learnerGrade) {
    const grade = positiveInt(learnerGrade, 0);
    if (!grade) return true;
    const band = normalizeGradeBand(gradeBand);
    return (!band.min || grade >= band.min) && (!band.max || grade <= band.max);
  }

  function normalizeGradeBand(gradeBand) {
    return {
      min: positiveInt(gradeBand && gradeBand.min, 0),
      max: positiveInt(gradeBand && gradeBand.max, 0)
    };
  }

  function normalizeRefs(refs, key) {
    return (Array.isArray(refs) ? refs : []).map(ref => safeString(ref && ref[key])).filter(Boolean);
  }

  function intersects(left, right) {
    const lookup = new Set(right || []);
    return (left || []).some(value => lookup.has(value));
  }

  function sanitizeParams(params) {
    return Object.keys(params && typeof params === 'object' ? params : {}).sort().reduce((safe, key) => {
      safe[key] = safeString(params[key]);
      return safe;
    }, {});
  }

  function isPastOrNow(value, nowIso) {
    const time = Date.parse(value || '');
    const now = Date.parse(nowIso || '');
    return Number.isFinite(time) && Number.isFinite(now) && time <= now;
  }

  function safeIso(value) {
    const date = new Date(value || '');
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function positiveInt(value, fallback) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function normalizeStringArray(values) {
    return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean)));
  }

  function formatSkill(skillId) {
    return safeString(skillId).split('.').join(' ');
  }

  function titleCase(value) {
    return safeString(value).split('-').filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    DEFAULT_POLICY,
    generateMissionRecommendations
  };
});
