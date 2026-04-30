(function (root, factory) {
  'use strict';

  const assignmentDomain = root.GrammarQuestAssignmentDomain ||
    (typeof require === 'function' ? require('./assignment-domain') : null);
  const classroomDomain = root.GrammarQuestClassroomDomain ||
    (typeof require === 'function' ? require('./classroom-domain') : null);
  const api = factory(assignmentDomain, classroomDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAssignmentRepository = api;
})(typeof window !== 'undefined' ? window : globalThis, function (assignmentDomain, classroomDomain) {
  'use strict';

  function createAssignmentRepository(adapter, options = {}) {
    if (!adapter) throw new Error('assignment_repository_requires_adapter');
    const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();

    async function createClassroom(classroom) {
      const normalized = classroomDomain.normalizeClassroom(Object.assign({}, classroom, {
        createdAt: classroom.createdAt || now(),
        updatedAt: classroom.updatedAt || now()
      }));
      const errors = classroomDomain.validateClassroom(normalized);
      if (errors.length) throw new Error(`classroom_invalid:${errors.join(',')}`);
      await adapter.writeClassroom(normalized);
      return normalized;
    }

    async function createAssignment(input) {
      const assignment = normalizeServerAssignment(input, now());
      await assertTeacherOwnsAssignedClasses(assignment);
      const errors = assignmentDomain.validateAssignment(assignment);
      if (errors.length) throw new Error(`assignment_invalid:${errors.join(',')}`);
      await adapter.writeAssignment(assignment);
      return assignment;
    }

    async function listAssignmentsForLearner(learnerId) {
      const direct = await adapter.listAssignmentsForLearner(learnerId);
      const classrooms = await adapter.listClassroomsForLearner(learnerId);
      const classAssignments = (await Promise.all(classrooms.map(room => adapter.listAssignmentsForClass(room.classId)))).flat();
      return uniqueAssignments(direct.concat(classAssignments));
    }

    async function listAssignmentsForClass(classId) {
      return adapter.listAssignmentsForClass(classId);
    }

    async function updateAssignmentStatus(learnerId, assignmentId, status) {
      return adapter.writeLearnerAssignmentProgress(learnerId, assignmentId, {
        learnerId,
        assignmentId,
        status,
        updatedAt: now()
      });
    }

    async function recordAssignmentCompletion(learnerId, assignmentId, sessionRef) {
      return adapter.writeLearnerAssignmentProgress(learnerId, assignmentId, {
        learnerId,
        assignmentId,
        status: 'completed',
        completedAt: sessionRef && sessionRef.completedAt || now(),
        completedSessionId: sessionRef && (sessionRef.sessionId || sessionRef.id) || '',
        updatedAt: sessionRef && sessionRef.completedAt || now()
      });
    }

    async function archiveAssignment(assignmentId) {
      const assignment = await adapter.getAssignment(assignmentId);
      if (!assignment) throw new Error(`assignment_not_found:${assignmentId}`);
      const archived = assignmentDomain.archiveAssignment(assignment, now());
      await adapter.writeAssignment(Object.assign({}, archived, { serverRecord: true }));
      return archived;
    }

    async function assertTeacherOwnsAssignedClasses(assignment) {
      const actorId = assignment.assignedBy.actorId;
      for (const classId of assignment.assignedTo.classIds) {
        const classroom = await adapter.getClassroom(classId);
        if (!classroom || !classroomDomain.canTeacherManageClass({ id: actorId }, classroom)) {
          throw new Error('assignment_class_access_denied');
        }
      }
    }

    return {
      archiveAssignment,
      createAssignment,
      createClassroom,
      listAssignmentsForClass,
      listAssignmentsForLearner,
      recordAssignmentCompletion,
      updateAssignmentStatus
    };
  }

  function createFakeAssignmentServerAdapter() {
    const classrooms = new Map();
    const assignments = new Map();
    const progress = new Map();
    return {
      async writeClassroom(classroom) {
        classrooms.set(classroom.classId, clone(classroom));
      },
      async getClassroom(classId) {
        return clone(classrooms.get(classId));
      },
      async listClassroomsForLearner(learnerId) {
        return Array.from(classrooms.values()).filter(room => room.learnerIds.includes(learnerId)).map(clone);
      },
      async writeAssignment(assignment) {
        assignments.set(assignment.id, clone(assignment));
      },
      async getAssignment(assignmentId) {
        return clone(assignments.get(assignmentId));
      },
      async listAssignmentsForClass(classId) {
        return Array.from(assignments.values()).filter(assignment => assignment.assignedTo.classIds.includes(classId)).map(clone);
      },
      async listAssignmentsForLearner(learnerId) {
        return Array.from(assignments.values()).filter(assignment => assignment.assignedTo.learnerIds.includes(learnerId)).map(clone);
      },
      async writeLearnerAssignmentProgress(learnerId, assignmentId, state) {
        const key = `${learnerId}:${assignmentId}`;
        progress.set(key, Object.assign({}, progress.get(key) || {}, state));
        return clone(progress.get(key));
      }
    };
  }

  function normalizeServerAssignment(input, timestamp) {
    return Object.assign({}, assignmentDomain.normalizeAssignment(input), {
      serverRecord: true,
      createdAt: input.createdAt || timestamp,
      updatedAt: input.updatedAt || timestamp
    });
  }

  function uniqueAssignments(assignments) {
    return Array.from(new Map(assignments.map(assignment => [assignment.id, assignment])).values());
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  return {
    createAssignmentRepository,
    createFakeAssignmentServerAdapter
  };
});
