const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeLearnerState } = require('../assets/learner-state-repository');
const assignment = require('../assets/assignment-domain');
const telemetry = require('../assets/app-telemetry-domain');
const selectionTelemetry = require('../assets/question-selection-telemetry');
const contracts = require('../assets/domain-type-contracts');

test('typed domain contracts document learner state and question ref shapes', () => {
  const state = normalizeLearnerState({
    reviewQueue: {
      queueId: 'queue-1',
      items: [{
        questionRef: {
          id: 'grammar-sentence-types-q0001',
          sourceSet: 'grammar-sentence-types',
          version: 1,
          contentHash: 'sha256:abc',
          sequence: 1
        }
      }]
    }
  });

  assert.deepEqual(contracts.validateLearnerStateContract(state), []);
  assert.deepEqual(contracts.validateQuestionRefContract(state.reviewQueue.items[0].questionRef), []);
});

test('typed domain contracts document assignments and telemetry events', () => {
  const normalizedAssignment = assignment.normalizeAssignment({
    id: 'assignment-1',
    title: 'Sentence tune-up',
    assignedTo: { learnerIds: ['learner-1'] },
    scope: { setIds: ['grammar-sentence-types'] },
    quizOptions: { count: 1 }
  });
  const appEvent = telemetry.normalizeAppTelemetryEvent({
    type: 'page_performance_summary',
    route: '/settings.html',
    category: 'load',
    timing: { loadMs: 42 }
  }, { now: () => new Date('2030-04-29T12:00:00.000Z') });
  const selectionEvent = selectionTelemetry.normalizeSelectionTelemetry('grammarquest:question-selection-completed', {
    domain: 'grammar',
    source: 'api'
  }, { now: () => new Date('2030-04-29T12:00:00.000Z') });

  assert.deepEqual(contracts.validateAssignmentContract(normalizedAssignment), []);
  assert.deepEqual(contracts.validateAppTelemetryEventContract(appEvent), []);
  assert.deepEqual(contracts.validateSelectionTelemetryEventContract(selectionEvent), []);
});
