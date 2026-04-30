#!/usr/bin/env node

const fs = require('fs');
const analytics = require('../../assets/aggregate-learning-analytics-domain');

function summarizeLearningEvents(options = {}) {
  const events = Array.isArray(options.events) ? options.events : [];
  const cohorts = new Map();
  events.forEach(event => {
    const cohortId = safeString(event.cohortId || 'default');
    if (!cohorts.has(cohortId)) {
      cohorts.set(cohortId, {
        cohort: { learnerCount: 0 },
        assignments: [],
        reviewSchedules: [],
        recommendations: [],
        quizSessions: [],
        featureFlagEvents: []
      });
    }
    const bucket = cohorts.get(cohortId);
    bucket.cohort.learnerCount += event.type === 'assignment_completed' || event.type === 'assignment_started' ? 1 : 0;
    if (event.type === 'assignment_completed') bucket.assignments.push({ status: 'completed' });
    if (event.type === 'assignment_started') bucket.assignments.push({ status: 'active' });
    if (event.type === 'review_due') bucket.reviewSchedules.push({ dueAt: new Date(0).toISOString() });
    if (event.type === 'review_completed') bucket.reviewSchedules.push({ dueAt: new Date(0).toISOString(), lastReviewedAt: new Date(0).toISOString() });
    if (event.type === 'recommendation_shown') bucket.recommendations.push({ reasonCode: event.reasonCode });
    if (event.type === 'quiz_completed') bucket.quizSessions.push({ domain: event.domain, completed: true });
    if (event.type === 'feature_flag_fallback') bucket.featureFlagEvents.push({ featureFlag: event.featureFlag, status: 'fallback' });
    if (event.type === 'feature_flag_error') bucket.featureFlagEvents.push({ featureFlag: event.featureFlag, status: 'error' });
  });

  const reports = Array.from(cohorts.values()).map(cohort => analytics.buildAggregateLearningAnalyticsReport({
    minCohortSize: options.minCohortSize,
    cohort: cohort.cohort,
    assignments: cohort.assignments,
    reviewSchedules: cohort.reviewSchedules,
    recommendations: cohort.recommendations,
    quizSessions: cohort.quizSessions,
    featureFlagEvents: cohort.featureFlagEvents,
    now: new Date().toISOString()
  }));

  return { status: 'ok', reports };
}

function readEvents(file) {
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) return [];
  if (text.startsWith('[')) return JSON.parse(text);
  return text.split(/\n+/).map(line => JSON.parse(line));
}

function safeString(value) {
  return String(value || '').trim();
}

if (require.main === module) {
  const file = process.argv[2];
  const result = summarizeLearningEvents({ events: file ? readEvents(file) : [] });
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  summarizeLearningEvents
};
