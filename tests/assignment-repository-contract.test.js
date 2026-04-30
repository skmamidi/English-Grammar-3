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
