const assert = require('node:assert/strict');
const test = require('node:test');

const assignment = require('../assets/assignment-domain');

test('assignment domain normalizes refs without question payloads', () => {
  const normalized = assignment.normalizeAssignment({
    id: 'assignment-1',
    title: 'Sentence tune-up',
    assignedBy: { actorId: 'teacher-1', role: 'teacher' },
    assignedTo: { learnerIds: ['learner-1'], classIds: ['class-a'] },
    scope: {
      domainIds: ['grammar'],
      setIds: ['grammar-sentence-types'],
      skillIds: ['grammar.sentence-analysis'],
      standardIds: ['L.3-6.1'],
      questionRefs: [{
        id: 'grammar-sentence-types-q0001',
        sourceSet: 'grammar-sentence-types',
        contentHash: 'sha256:abc',
        question: 'payload should not survive'
      }]
    },
    quizOptions: { count: 1, grade: '4', difficulty: 'medium', mode: 'subtopic' },
    dueAt: '2030-05-01T00:00:00.000Z',
    status: 'active'
  });

  assert.deepEqual(normalized.scope.questionRefs, [{
    id: 'grammar-sentence-types-q0001',
    sourceSet: 'grammar-sentence-types',
    version: 0,
    contentHash: 'sha256:abc',
    sequence: 0
  }]);
  assert.equal(JSON.stringify(normalized).includes('payload should not survive'), false);
  assert.deepEqual(assignment.validateAssignment(normalized), []);
});

test('assignment validation rejects empty scope and copied question content', () => {
  assert.ok(assignment.validateAssignment({
    id: 'assignment-2',
    title: 'Invalid',
    assignedTo: { learnerIds: ['learner-1'] },
    scope: { questionRefs: [{ id: 'q1', question: 'No copied prompts' }] },
    quizOptions: { count: 1 },
    status: 'active'
  }).some(error => /question payload/.test(error)));

  assert.ok(assignment.validateAssignment({
    id: 'assignment-3',
    title: 'No Scope',
    assignedTo: { learnerIds: ['learner-1'] },
    scope: {},
    quizOptions: { count: 1 },
    status: 'active'
  }).some(error => /scope/.test(error)));
});

test('assignment status transitions are stable and timestamped', () => {
  const started = assignment.markAssignmentStarted(
    assignment.normalizeAssignment({ id: 'a1', title: 'A', assignedTo: { learnerIds: ['l1'] }, scope: { setIds: ['grammar-sentence-types'] } }),
    '2030-04-29T12:00:00.000Z'
  );
  const completed = assignment.markAssignmentCompleted(started, {
    sessionId: 'session-1',
    completedAt: '2030-04-29T12:05:00.000Z'
  });

  assert.equal(started.status, 'in_progress');
  assert.equal(started.startedAt, '2030-04-29T12:00:00.000Z');
  assert.equal(completed.status, 'completed');
  assert.equal(completed.completedSessionId, 'session-1');
});

test('assignment domain normalizes guided mission refs and expected steps without lesson or question payloads', () => {
  const normalized = assignment.normalizeAssignment({
    id: 'mission-assignment-1',
    title: 'Sentence Detectives Mission',
    assignmentType: 'guided_mission',
    assignedBy: { actorId: 'guardian-1', role: 'parent_guardian' },
    assignedTo: { learnerIds: ['learner-1'] },
    scope: {
      missionRefs: [{
        missionId: 'mission-sentence-detectives',
        route: 'mission.html?missionId=mission-sentence-detectives',
        expectedStepIds: ['lesson-sentence-types', 'practice-sentence-types', 'review-sentence-types'],
        storyBeats: [{ text: 'Raw lesson body' }],
        questions: [{ question: 'Raw prompt', answer: 'Raw answer' }]
      }]
    },
    dueAt: '2030-05-01T00:00:00.000Z',
    status: 'active'
  });

  assert.equal(normalized.assignmentType, 'guided_mission');
  assert.deepEqual(normalized.scope.missionRefs, [{
    missionId: 'mission-sentence-detectives',
    route: 'mission.html?missionId=mission-sentence-detectives',
    expectedStepIds: ['lesson-sentence-types', 'practice-sentence-types', 'review-sentence-types']
  }]);
  assert.deepEqual(assignment.validateAssignment(normalized, { now: '2030-04-29T12:00:00.000Z' }), []);
  assert.equal(JSON.stringify(normalized).includes('Raw'), false);
});

test('assignment validation rejects unsafe mission assignments', () => {
  assert.ok(assignment.validateAssignment({
    id: 'mission-assignment-2',
    title: 'Invalid Mission',
    assignmentType: 'guided_mission',
    assignedBy: { actorId: 'teacher-1', role: 'teacher' },
    assignedTo: { learnerIds: ['learner-1'] },
    scope: { missionRefs: [{ missionId: 'mission-sentence-detectives' }] },
    dueAt: 'not-a-date',
    storyBeats: [{ text: 'No lesson bodies' }]
  }, { now: '2030-04-29T12:00:00.000Z' }).some(error => /dueAt|lesson payload/.test(error)));

  assert.ok(assignment.validateAssignment({
    id: 'mission-assignment-3',
    title: 'Past Mission',
    assignmentType: 'guided_mission',
    assignedBy: { actorId: 'teacher-1', role: 'teacher' },
    assignedTo: { learnerIds: ['learner-1'] },
    scope: { missionRefs: [{ missionId: 'mission-sentence-detectives' }] },
    dueAt: '2030-04-28T00:00:00.000Z'
  }, { now: '2030-04-29T12:00:00.000Z' }).some(error => /dueAt must be in the future/.test(error)));
});
