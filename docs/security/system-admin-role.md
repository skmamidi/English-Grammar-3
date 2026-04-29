# System Admin Role

System admin capabilities are operational controls for the quiz platform. They are separate from parent, guardian, teacher, or learner access.

System admins may:

- Manage server-selection feature flags by domain and route.
- Manage rollout allowlists and emergency rollback switches.
- View selection API health, fallback rates, latency, and request/response budget metrics.
- View audit logs for operational changes.
- Trigger question artifact regeneration only through approved CI or release automation.
- Manage signing key metadata, key ids, public verification keys, and secret references.
- Manage user-role settings for operational authorization.

System admins must not:

- Access learner answers or parent notes through selection telemetry.
- Place private signing key material in browser config, docs, fixtures, or generated assets.
- Use guardian-facing UI permissions as a substitute for operational authorization.
- Use support access or impersonation silently. Support access is denied by default until a separate explicit, audited, time-bound policy exists.

Admin changes should be auditable, reversible, and scoped to the minimum domain or route needed for the rollout.

## Audit Event Contract

System admin actions should create append-only audit events with `id`, `actorId`, `actorRole`, `action`, `resourceType`, `resourceId`, `createdAt`, and sanitized `metadata`.

Audit metadata must redact private keys, secrets, tokens, credentials, learner answers, selected choices, full question bodies, choices, explanations, and snapshots. Audit logs should describe operational changes without exposing learner content or private signing material.
