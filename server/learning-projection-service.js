'use strict';

function buildLearningProjection(input = {}) {
  const learnerId = safeString(input.learnerId);
  const events = verifiedEvents(input.events).filter(event => !learnerId || event.learnerId === learnerId);
  const totals = summarizeEvents(events);
  return {
    schemaVersion: 1,
    source: 'verified_attempt_ledger',
    learnerId,
    summary: totals,
    mastery: buildMastery(events),
    assignments: buildAssignmentSummaries(events)
  };
}

function buildParentTeacherInstitutionalReports(input = {}) {
  const events = verifiedEvents(input.events);
  const linkedLearnerIds = new Set(normalizeStringArray(input.linkedLearnerIds));
  const classIds = new Set(normalizeStringArray(input.classIds));
  const parentLearnerIds = Array.from(linkedLearnerIds).sort();
  const classSummaries = Array.from(classIds).sort().map(classId => {
    const classEvents = events.filter(event => event.classId === classId);
    return Object.assign({ classId, learnerCount: new Set(classEvents.map(event => event.learnerId)).size }, summarizeEvents(classEvents));
  });

  return {
    schemaVersion: 1,
    source: 'verified_attempt_ledger',
    parent: {
      learners: parentLearnerIds.map(id => Object.assign({ learnerId: id }, summarizeEvents(events.filter(event => event.learnerId === id))))
    },
    teacher: {
      classes: classSummaries
    },
    institution: {
      totalVerifiedAttempts: events.length,
      learnerCount: new Set(events.map(event => event.learnerId)).size,
      classCount: new Set(events.map(event => event.classId).filter(Boolean)).size,
      averageAccuracy: average(events.map(event => score(event).accuracy))
    }
  };
}

function buildMastery(events) {
  const bySkill = new Map();
  events.forEach(event => {
    questionResults(event).forEach(result => {
      normalizeStringArray(result.skillIds).forEach(skillId => {
        const current = bySkill.get(skillId) || { skillId, attempts: 0, correct: 0, gradeLevels: new Set(), difficultyExposure: { easy: 0, medium: 0, hard: 0 } };
        current.attempts += 1;
        if (result.correct === true) current.correct += 1;
        if (result.gradeLevel) current.gradeLevels.add(result.gradeLevel);
        if (current.difficultyExposure[result.difficulty] !== undefined) current.difficultyExposure[result.difficulty] += 1;
        bySkill.set(skillId, current);
      });
    });
  });
  return Array.from(bySkill.values()).sort((a, b) => a.skillId.localeCompare(b.skillId)).map(item => {
    const accuracy = round(item.correct / Math.max(1, item.attempts));
    return {
      skillId: item.skillId,
      attempts: item.attempts,
      accuracy,
      masteryBand: accuracy >= 0.8 ? 'secure' : accuracy >= 0.5 ? 'developing' : 'needs_review',
      gradeLevels: Array.from(item.gradeLevels).sort((a, b) => a - b),
      difficultyExposure: item.difficultyExposure
    };
  });
}

function buildAssignmentSummaries(events) {
  const byAssignment = new Map();
  events.filter(event => event.assignmentId).forEach(event => {
    const key = `${event.classId || ''}:${event.assignmentId}`;
    const current = byAssignment.get(key) || {
      assignmentId: event.assignmentId,
      classId: event.classId || '',
      verifiedAttempts: 0,
      totalQuestions: 0,
      correctCount: 0
    };
    const currentScore = score(event);
    current.verifiedAttempts += 1;
    current.totalQuestions += currentScore.totalQuestions;
    current.correctCount += currentScore.correctCount;
    byAssignment.set(key, current);
  });
  return Array.from(byAssignment.values()).sort((a, b) => a.assignmentId.localeCompare(b.assignmentId)).map(item => ({
    assignmentId: item.assignmentId,
    classId: item.classId,
    verifiedAttempts: item.verifiedAttempts,
    totalQuestions: item.totalQuestions,
    accuracy: round(item.correctCount / Math.max(1, item.totalQuestions)),
    status: 'verified_complete'
  }));
}

function summarizeEvents(events) {
  const totalQuestions = events.reduce((sum, event) => sum + score(event).totalQuestions, 0);
  const correctCount = events.reduce((sum, event) => sum + score(event).correctCount, 0);
  return {
    totalAttempts: events.length,
    totalQuestions,
    accuracy: round(correctCount / Math.max(1, totalQuestions))
  };
}

function verifiedEvents(events) {
  return (Array.isArray(events) ? events : []).filter(event => event && event.status === 'verified');
}

function questionResults(event) {
  return Array.isArray(event && event.questionResults) ? event.questionResults : [];
}

function score(event) {
  const value = event && event.score || {};
  return {
    correctCount: normalizeCount(value.correctCount),
    totalQuestions: normalizeCount(value.totalQuestions),
    accuracy: Number(value.accuracy) || 0
  };
}

function average(values) {
  const numbers = values.map(Number).filter(Number.isFinite);
  if (!numbers.length) return 0;
  return round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
}

function normalizeStringArray(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
}

function normalizeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.floor(number);
}

function safeString(value) {
  return String(value || '').trim();
}

function round(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  buildLearningProjection,
  buildParentTeacherInstitutionalReports
};
