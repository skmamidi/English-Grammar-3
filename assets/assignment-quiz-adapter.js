(function (root, factory) {
  'use strict';

  const assignmentDomain = root.GrammarQuestAssignmentDomain || (typeof require === 'function' ? require('./assignment-domain') : null);
  const api = factory(assignmentDomain);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestAssignmentQuizAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis, function (assignmentDomain) {
  'use strict';

  function assignmentToQuizRequest(rawAssignment, options = {}) {
    const assignment = assignmentDomain.normalizeAssignment(rawAssignment);
    const manifest = options.manifest || {};
    const setIds = resolveSetIds(assignment.scope, manifest);
    if (!setIds.length) throw new Error('assignment_scope_unresolvable');
    return {
      assignmentId: assignment.id,
      setIds,
      count: assignment.quizOptions.count,
      grade: assignment.quizOptions.grade,
      difficulty: assignment.quizOptions.difficulty,
      mode: assignment.quizOptions.mode || 'assignment',
      questionRefs: assignment.scope.questionRefs.map(assignmentDomain.normalizeQuestionRef)
    };
  }

  function resolveSetIds(scope, manifest) {
    const explicit = new Set(scope.setIds || []);
    const domainIds = new Set(scope.domainIds || []);
    const skillIds = new Set(scope.skillIds || []);
    const standardIds = new Set(scope.standardIds || []);
    const sets = Array.isArray(manifest.sets) ? manifest.sets : [];
    sets.forEach(set => {
      if (domainIds.has(set.domain)) explicit.add(set.id);
      if ((set.skillCoverage || []).some(item => skillIds.has(item.skillId))) explicit.add(set.id);
      if ((set.standardCoverage || []).some(item => standardIds.has(item.standardId))) explicit.add(set.id);
    });
    (scope.questionRefs || []).forEach(ref => {
      if (ref.sourceSet) explicit.add(ref.sourceSet);
    });
    return Array.from(explicit).sort();
  }

  return {
    assignmentToQuizRequest,
    resolveSetIds
  };
});
