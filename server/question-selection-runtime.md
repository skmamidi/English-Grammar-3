# Question Selection Runtime Contract

The first production target should be a small Node-compatible serverless function, with Firebase Cloud Functions as the preferred deployment target for this app. It keeps static artifact access close to the existing Firebase-oriented project setup, supports secret references, has predictable logs, and can run the same `server/question-selection-service.js` contract covered by unit tests.

## Runtime Dependencies

`server/question-selection-runtime.js` expects explicit dependencies:

- `manifestProvider`: loads `assets/question-manifest.json` or an equivalent deployed artifact.
- `chunkSetProvider`: loads a generated chunk-backed set by id.
- `signer`: signs canonical response payloads in production.
- `clock`: supplies deterministic time for tests and response expiry.
- `logger`: receives operational events without prompts, choices, explanations, learner answers, or guardian data.
- `config`: validated runtime settings from environment.

The runtime returns refs only. It delegates request validation, selection, response digest creation, and signing to the existing selection service and integrity modules.

## Environment Contract

Required production settings:

- `SELECTION_RUNTIME_MODE=production`
- `SELECTION_POLICY_VERSION=1`
- `SELECTION_SIGNING_KEY_ID=<active-key-id>`
- `SELECTION_PRIVATE_KEY_REF=<secret-manager-reference>`
- `SELECTION_RESPONSE_TTL_SECONDS=300`
- `SELECTION_ALLOWED_DOMAINS=grammar,capitalization`
- `SELECTION_MAX_QUESTIONS=60`

`SELECTION_PRIVATE_KEY_REF` names a secret location. The private key value must never be committed, bundled into browser assets, or logged.

`SELECTION_RESPONSE_TTL_SECONDS` is optional in local runtime config and defaults to `300`. When supplied, it must be a positive integer. The runtime threads this value into `expiresAt`; the response digest and production signature then bind that exact expiry. Shorter TTLs reduce replay exposure, while longer TTLs require longer public-key rotation overlap.

## Deployment Target Notes

Firebase Cloud Functions:

- Cold start: acceptable for a controlled pilot; keep the handler small.
- Static artifact access: can load bundled JSON/chunk artifacts or read from deployed storage.
- Key management: use Secret Manager references, not environment values containing key material.
- Response TTL: keep `SELECTION_RESPONSE_TTL_SECONDS` aligned with key-rotation overlap and client latency expectations.
- Logging: use structured logs with request metadata only.
- Local testability: unit tests can inject manifest and chunk providers directly.
- Cost and operations: moderate, aligned with the current Firebase setup.

Cloudflare Workers are attractive for low cold starts, but key-management and artifact-loading ergonomics are less aligned with the current repo. Vercel/Netlify functions are viable if the site hosting moves there. A long-running Node service is unnecessary until traffic or operational needs justify it.

## Feature Flags

Rollout remains client-controlled by existing flags:

- `enableServerQuestionSelection`
- `serverQuestionSelectionPilotDomains`
- `serverQuestionSelectionPilotSubtopics`
- `selectionIntegrity.requireSignature`
- `selectionIntegrity.publicKeys`

Production rollout should begin with one domain or route, monitor fallback telemetry, then expand by explicit flag changes.
