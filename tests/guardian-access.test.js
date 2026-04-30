const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const access = require('../assets/access-control');

const links = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'fixtures', 'access-control', 'guardian-links.json'),
  'utf8'
));

test('guardian actor is built from active learner links only', () => {
  const actor = access.createGuardianActor('guardian-1', links);

  assert.equal(actor.role, access.Roles.PARENT_GUARDIAN);
  assert.deepEqual(actor.linkedLearnerIds, ['learner-1']);
});

test('guardian can read linked learner progress and reports only', () => {
  const guardian = access.createGuardianActor('guardian-1', links);

  assert.equal(access.canViewLearnerProgress(guardian, 'learner-1'), true);
  assert.equal(access.canViewLearnerReports(guardian, 'learner-1'), true);
  assert.equal(access.canViewQuestionReports(guardian, 'learner-1'), true);
  assert.equal(access.canViewAssignments(guardian, 'learner-1'), true);
  assert.equal(access.canViewLearnerProgress(guardian, 'learner-2'), false);
  assert.equal(access.canViewLearnerReports(guardian, 'learner-archived'), false);
  assert.equal(access.canViewAssignments(guardian, 'learner-2'), false);
});

test('parent preview remains unauthenticated local read-only browsing', () => {
  assert.equal(access.canOpenParentPreview({ parentBrowse: true }), true);
  assert.equal(access.canOpenParentPreview('parentBrowse'), true);

  const previewActor = access.normalizeActor({ role: 'parent_preview' });
  assert.equal(access.canViewLearnerProgress(previewActor, 'learner-1'), false);
  assert.equal(access.canViewLearnerReports(previewActor, 'learner-1'), false);
  assert.equal(
    access.canAccess(previewActor, access.Capabilities.viewLinkedLearnerReports, {
      type: access.ResourceTypes.SAVED_SESSION,
      learnerId: 'learner-1'
    }),
    false
  );
});

test('guardian cannot mutate progress or use admin capabilities', () => {
  const guardian = access.createGuardianActor('guardian-1', links);

  assert.equal(
    access.canAccess(guardian, access.Capabilities.updateLearnerProgress, {
      type: access.ResourceTypes.LEARNER_PROGRESS,
      learnerId: 'learner-1'
    }),
    false
  );
  assert.equal(
    access.canAccess(guardian, access.Capabilities.manageUsers, {
      type: access.ResourceTypes.SYSTEM_SETTING
    }),
    false
  );
  assert.equal(
    access.canAccess(guardian, access.Capabilities.manageContent, {
      type: access.ResourceTypes.CONTENT_ARTIFACT
    }),
    false
  );
  assert.equal(
    access.canAccess(guardian, access.Capabilities.viewAuditLogs, {
      type: access.ResourceTypes.AUDIT_LOG
    }),
    false
  );
});

test('report dashboard helper returns linked learner data and hides unrelated data', () => {
  const guardian = access.createGuardianActor('guardian-1', links);
  const records = [
    { id: 'session-1', learnerId: 'learner-1' },
    { id: 'session-2', learnerId: 'learner-2' },
    { id: 'question-report-1', learnerId: 'learner-1' }
  ];

  assert.deepEqual(
    access.filterGuardianVisibleReports(guardian, records).map(record => record.id),
    ['session-1', 'question-report-1']
  );
});
