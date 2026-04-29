# Roles and Permissions

Grammar Quest authorization is capability-based and deny by default. UI and future API code should call `GrammarQuestAccessControl.canAccess()` or `requireCapability()` instead of hard-coding role string checks.

## Roles

- `student`: can take quizzes, resume their own active quiz, and view their own learner progress.
- `parent_guardian`: can view linked learner progress, saved sessions, and question reports.
- `teacher`: can view assigned learner reports and manage assignments for assigned classes.
- `system_admin`: can manage operational controls such as content artifacts, feature flags, user-role settings, audit logs, and system settings.

## Required Separation

Parent/guardian is not a system admin. Teacher is not a system admin. System admin operational capabilities do not grant silent learner-data access.

Parent/guardian cannot manage content, users, feature flags, audit logs, or system settings. Teacher access is scoped to assigned learners/classes only. Unknown roles and unknown actions deny by default.

## Relationship Scopes

- Student access uses `actor.learnerId` against `resource.learnerId` or `resource.ownerLearnerId`.
- Parent/guardian access uses `actor.linkedLearnerIds`.
- Teacher access uses `actor.assignedLearnerIds` and `actor.assignedClassIds`.
- System admin access is resource-type limited to operational resources, not learner progress.

## Parent Preview vs Authenticated Guardian

Parent preview is a local, unauthenticated, read-only browsing mode. It can open quiz questions for inspection and must not read saved learner reports or write learner progress.

Authenticated guardian access is different: authenticated guardian mode requires a `parent_guardian` actor and an active learner link. Guardian helpers such as `canViewLearnerProgress()`, `canViewLearnerReports()`, and `filterGuardianVisibleReports()` must allow linked learners only and deny unrelated learners.

## Non-Goals

This model does not add admin UI, backend security rules, or support impersonation. Those workflows must build on the same capability checks and add audit logging before rollout.
