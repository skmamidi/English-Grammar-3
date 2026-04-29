# Selection API Key Rotation

Selection API signatures use public verification keys in browser config and private signing keys in server-managed secret storage. Public keys may be exposed; private key material must not be committed, logged, or bundled.

## Rotation Playbook

1. Generate a new ECDSA P-256 signing key outside the repo.
2. Store the private key in the production secret manager and record only its secret reference.
3. Add the new public key to `selectionIntegrity.publicKeys` with a new `kid`.
4. Deploy clients that trust both the old and new public keys.
5. Deploy the server with `SELECTION_SIGNING_KEY_ID` set to the new `kid` and `SELECTION_PRIVATE_KEY_REF` pointing at the new secret reference.
6. Monitor selection fallback telemetry, verification failures, unknown-key failures, and response-expiry failures.
7. Keep both public keys configured for at least the configured response TTL plus the rollout and cache-propagation window.
8. Remove the old public key after no active signed responses can still reference it.

## Response TTL

`SELECTION_RESPONSE_TTL_SECONDS` controls the `expiresAt` value on signed selection responses. The default is `300` seconds. Shorter TTLs reduce replay exposure and key-overlap duration, but they can increase failures for slow clients or clients paused during quiz hydration.

Every TTL change must pass the runtime contract tests because the response digest and signature payload bind the exact `expiresAt` value. Key rotation overlap should be at least `SELECTION_RESPONSE_TTL_SECONDS` plus deployment and browser-cache propagation time.

## Public Key Metadata

During rotation, browser config may contain multiple public keys:

```js
selectionIntegrity: {
  requireSignature: true,
  publicKeys: {
    "selection-key-2026-04": {
      algorithm: "ECDSA-P256-SHA256",
      publicKey: { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." },
      notAfter: "2026-05-15T00:00:00.000Z"
    },
    "selection-key-2026-05": {
      algorithm: "ECDSA-P256-SHA256",
      publicKey: { "kty": "EC", "crv": "P-256", "x": "...", "y": "..." }
    }
  }
}
```

`notBefore` and `notAfter` are optional guardrails. Expired verification keys are rejected by the browser integrity check.

## Rollback

If verification failures rise, switch `SELECTION_SIGNING_KEY_ID` back to the old key while both public keys are still trusted, then investigate server signing and client config drift. If API availability degrades, disable `enableServerQuestionSelection` or narrow the pilot domain/route flags; the browser falls back to generated chunks.
