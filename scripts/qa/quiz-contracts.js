#!/usr/bin/env node

const quizDomain = require('../../assets/quiz-domain');

function validateSerializedAttempt(attempt) {
  const required = ['id', 'questionId', 'questionVersion', 'questionHash', 'question', 'selectedChoice', 'correctChoice', 'correct', 'firstAttemptCorrect', 'skills', 'subtopicId', 'subtopicTitle'];
  return required.filter(key => {
    if (!(key in (attempt || {}))) return true;
    if (key === 'skills') return !Array.isArray(attempt.skills);
    if (key === 'correct' || key === 'firstAttemptCorrect') return typeof attempt[key] !== 'boolean';
    if (key === 'questionVersion') return !Number.isFinite(Number(attempt[key]));
    return attempt[key] === undefined || attempt[key] === null;
  });
}

function validateActiveQuiz(activeQuiz) {
  const required = ['setId', 'title', 'topic', 'grade', 'difficulty', 'questions', 'questionRefs', 'currentIndex', 'score', 'attempts'];
  return required.filter(key => {
    if (!(key in (activeQuiz || {}))) return true;
    if (key === 'questions' || key === 'questionRefs' || key === 'attempts') return !Array.isArray(activeQuiz[key]);
    if (key === 'currentIndex' || key === 'score') return !Number.isFinite(Number(activeQuiz[key]));
    return activeQuiz[key] === undefined || activeQuiz[key] === null;
  });
}

function validateQuestionReport(report) {
  const required = ['id', 'status', 'questionId', 'questionVersion', 'questionHash'];
  return required.filter(key => {
    if (!(key in (report || {}))) return true;
    if (key === 'questionVersion') return !Number.isFinite(Number(report[key]));
    return report[key] === undefined || report[key] === null || report[key] === '';
  });
}

function validateQuestionReportWarnings(report) {
  const warnings = [];
  if (String(report && report.questionId || '').startsWith('question-report-')) {
    warnings.push('questionId');
  }
  return warnings;
}

module.exports = {
  gradeOptions: quizDomain.gradeOptions,
  difficultyOptions: quizDomain.difficultyOptions,
  selectQuestionsForLevel: quizDomain.selectQuestionsForLevel,
  selectCurrentQuestions: quizDomain.selectCurrentQuestions,
  selectMixedQuestions: quizDomain.selectMixedQuestions,
  fillQuestionGroup: quizDomain.fillQuestionGroup,
  getActiveMixedSubtopics: quizDomain.getActiveMixedSubtopics,
  questionSupportsGrade: quizDomain.questionSupportsGrade,
  getDifficultyDistance: quizDomain.getDifficultyDistance,
  getQuestionId: quizDomain.getQuestionId,
  getQuestionRef: quizDomain.getQuestionRef,
  getAttemptQuestionId: quizDomain.getAttemptQuestionId,
  validateSerializedAttempt,
  validateActiveQuiz,
  validateQuestionReport,
  validateQuestionReportWarnings
};
