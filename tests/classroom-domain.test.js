const assert = require('node:assert/strict');
const test = require('node:test');

const classroom = require('../assets/classroom-domain');

test('classroom domain normalizes membership without duplicates', () => {
  const record = classroom.normalizeClassroom({
    classId: 'class-a',
    teacherIds: ['teacher-1', 'teacher-1'],
    learnerIds: ['learner-1', 'learner-2'],
    title: 'Period 1',
    status: 'active'
  });

  assert.deepEqual(record.teacherIds, ['teacher-1']);
  assert.deepEqual(record.learnerIds, ['learner-1', 'learner-2']);
  assert.deepEqual(classroom.validateClassroom(record), []);
});

test('classroom domain validates teacher ownership and archived classes', () => {
  const record = classroom.normalizeClassroom({
    classId: 'class-a',
    teacherIds: ['teacher-1'],
    learnerIds: ['learner-1'],
    status: 'archived'
  });

  assert.equal(classroom.canTeacherManageClass({ id: 'teacher-1' }, record), false);
  assert.equal(classroom.canTeacherManageClass({ id: 'teacher-2' }, record), false);
  assert.ok(classroom.validateClassroom({ classId: '', teacherIds: [], learnerIds: [] }).length > 0);
});

test('classroom membership changes are timestamped and ref-only', () => {
  const updated = classroom.updateClassroomMembership({
    classId: 'class-a',
    teacherIds: ['teacher-1'],
    learnerIds: ['learner-1'],
    status: 'active'
  }, {
    addLearnerIds: ['learner-2'],
    removeLearnerIds: ['learner-1'],
    question: 'raw prompt'
  }, { now: () => '2030-04-29T12:00:00.000Z' });

  assert.deepEqual(updated.learnerIds, ['learner-2']);
  assert.equal(updated.updatedAt, '2030-04-29T12:00:00.000Z');
  assert.equal(JSON.stringify(updated).includes('raw prompt'), false);
});

test('classroom mission assignment scope rejects cross-class learner refs', () => {
  const record = classroom.normalizeClassroom({
    classId: 'class-a',
    teacherIds: ['teacher-1'],
    learnerIds: ['learner-1', 'learner-2'],
    status: 'active'
  });

  assert.deepEqual(classroom.validateClassroomLearnerScope(record, ['learner-1', 'learner-2']), []);
  assert.ok(classroom.validateClassroomLearnerScope(record, ['learner-1', 'learner-3'])
    .some(error => /cross-class learner/.test(error)));
});
