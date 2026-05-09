const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createAssignmentRepository,
  createFakeAssignmentServerAdapter
} = require('../assets/assignment-repository');

test('server assignment repository creates and lists assignments by class and learner', async () => {
  const repository = createAssignmentRepository(createFakeAssignmentServerAdapter(), {
    now: () => '2030-04-29T12:00:00.000Z'
  });
  await repository.createClassroom({
    classId: 'class-a',
    teacherIds: ['teacher-1'],
    learnerIds: ['learner-1']
  });
  const assignment = await repository.createAssignment({
    id: 'assignment-1',
    title: 'Verb Tune-Up',
    assignedBy: { actorId: 'teacher-1', role: 'teacher' },
    assignedTo: { classIds: ['class-a'] },
    scope: { skillIds: ['grammar.subject-verb'] },
    quizOptions: { count: 2 }
  });

  assert.equal(assignment.serverRecord, true);
  assert.equal((await repository.listAssignmentsForClass('class-a')).length, 1);
  assert.equal((await repository.listAssignmentsForLearner('learner-1'))[0].id, 'assignment-1');
  assert.equal(JSON.stringify(assignment).includes('"question"'), false);
});

test('server assignment repository records learner progress and completion', async () => {
  const repository = createAssignmentRepository(createFakeAssignmentServerAdapter(), {
    now: () => '2030-04-29T12:00:00.000Z'
  });
  await repository.createAssignment({
    id: 'assignment-1',
    assignedTo: { learnerIds: ['learner-1'] },
    scope: { setIds: ['grammar-sentence-types'] }
  });

  const started = await repository.updateAssignmentStatus('learner-1', 'assignment-1', 'in_progress');
  const completed = await repository.recordAssignmentCompletion('learner-1', 'assignment-1', {
    sessionId: 'session-1',
    completedAt: '2030-04-29T12:05:00.000Z'
  });

  assert.equal(started.status, 'in_progress');
  assert.equal(completed.status, 'completed');
  assert.equal(completed.completedSessionId, 'session-1');
});

test('server assignment repository enforces teacher class ownership', async () => {
  const repository = createAssignmentRepository(createFakeAssignmentServerAdapter());
  await repository.createClassroom({ classId: 'class-a', teacherIds: ['teacher-1'], learnerIds: ['learner-1'] });

  await assert.rejects(() => repository.createAssignment({
    id: 'assignment-1',
    assignedBy: { actorId: 'teacher-2', role: 'teacher' },
    assignedTo: { classIds: ['class-a'] },
    scope: { skillIds: ['grammar.subject-verb'] }
  }), /assignment_class_access_denied/);
});

test('server assignment repository creates scoped guardian mission assignments', async () => {
  const repository = createAssignmentRepository(createFakeAssignmentServerAdapter(), {
    now: () => '2030-04-29T12:00:00.000Z'
  });

  const created = await repository.createAssignment({
    id: 'mission-assignment-1',
    title: 'Sentence Detectives Mission',
    assignmentType: 'guided_mission',
    assignedBy: {
      actorId: 'guardian-1',
      role: 'parent_guardian',
      linkedLearnerIds: ['learner-1'],
      missionAssignmentManagementEnabled: true
    },
    assignedTo: { learnerIds: ['learner-1'] },
    scope: {
      missionRefs: [{
        missionId: 'mission-sentence-detectives',
        route: 'mission.html?missionId=mission-sentence-detectives',
        expectedStepIds: ['lesson-sentence-types', 'practice-sentence-types', 'review-sentence-types']
      }]
    },
    dueAt: '2030-05-01T00:00:00.000Z',
    questions: [{ question: 'Raw prompt', answer: 'Raw answer' }]
  });

  assert.equal(created.assignmentType, 'guided_mission');
  assert.equal(created.serverRecord, true);
  assert.equal((await repository.listAssignmentsForLearner('learner-1'))[0].id, 'mission-assignment-1');
  assert.equal(JSON.stringify(created).includes('Raw prompt'), false);
});

test('server assignment repository rejects unauthorized and cross-class mission assignments', async () => {
  const repository = createAssignmentRepository(createFakeAssignmentServerAdapter(), {
    now: () => '2030-04-29T12:00:00.000Z'
  });
  await repository.createClassroom({ classId: 'class-a', teacherIds: ['teacher-1'], learnerIds: ['learner-1'] });

  await assert.rejects(() => repository.createAssignment({
    id: 'mission-assignment-2',
    assignmentType: 'guided_mission',
    assignedBy: { actorId: 'guardian-1', role: 'parent_guardian', linkedLearnerIds: ['learner-2'], missionAssignmentManagementEnabled: true },
    assignedTo: { learnerIds: ['learner-1'] },
    scope: { missionRefs: [{ missionId: 'mission-sentence-detectives' }] },
    dueAt: '2030-05-01T00:00:00.000Z'
  }), /assignment_mission_access_denied/);

  await assert.rejects(() => repository.createAssignment({
    id: 'mission-assignment-3',
    assignmentType: 'guided_mission',
    assignedBy: { actorId: 'teacher-1', role: 'teacher', assignedClassIds: ['class-a'] },
    assignedTo: { classIds: ['class-a'], learnerIds: ['learner-2'] },
    scope: { missionRefs: [{ missionId: 'mission-sentence-detectives' }] },
    dueAt: '2030-05-01T00:00:00.000Z'
  }), /assignment_class_learner_scope_denied/);
});
