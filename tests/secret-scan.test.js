const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  DEFAULT_SCAN_TARGETS,
  scanFilesForSecrets,
  scanRepositoryForSecrets
} = require('../scripts/security/scan-secrets');

test('secret scanner detects private keys service accounts env files and strong tokens', () => {
  const findings = scanFilesForSecrets({
    files: [
      {
        path: 'assets/runtime.js',
        content: 'const key = "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----";'
      },
      {
        path: 'tests/service-account.json',
        content: JSON.stringify({ type: 'service_account', private_key: '-----BEGIN PRIVATE KEY-----\\nabc' })
      },
      {
        path: '.env',
        content: 'SELECTION_PRIVATE_KEY=abc'
      },
      {
        path: 'docs/runbook.md',
        content: 'Authorization: Bearer ghp_1234567890abcdefghijklmnopqrstuvwxyz'
      }
    ],
    allowlist: []
  });

  assert.deepEqual(findings.map(finding => finding.ruleId).sort(), [
    'bearer-token',
    'env-file',
    'firebase-private-key',
    'pem-private-key',
    'service-account-json'
  ]);
});

test('secret scanner allows public keys and documented placeholders', () => {
  const findings = scanFilesForSecrets({
    files: [{
      path: 'docs/security/example.md',
      content: [
        '-----BEGIN PUBLIC KEY-----',
        'abc',
        '-----END PUBLIC KEY-----',
        'SELECTION_PRIVATE_KEY_REF=projects/app/secrets/selection-key-prod-2026-04',
        'authToken: token-123',
        'privateKeyRef: secret-ref'
      ].join('\n')
    }]
  });

  assert.deepEqual(findings, []);
});

test('repository secret scan covers security-sensitive project areas', () => {
  assert.ok(DEFAULT_SCAN_TARGETS.includes('assets'));
  assert.ok(DEFAULT_SCAN_TARGETS.includes('docs'));
  assert.ok(DEFAULT_SCAN_TARGETS.includes('content-review'));
  assert.ok(DEFAULT_SCAN_TARGETS.includes('.github/workflows'));
  assert.doesNotThrow(() => scanRepositoryForSecrets({ rootDir: path.resolve(__dirname, '..') }));
});

test('story lesson AI draft records stay sanitized for repository scans', () => {
  const recordPath = path.join(__dirname, '..', 'content-review', 'story-lesson-authoring-records.json');
  const source = fs.readFileSync(recordPath, 'utf8');
  const findings = scanFilesForSecrets({
    files: [{ path: 'content-review/story-lesson-authoring-records.json', content: source }],
    allowlist: []
  });

  assert.deepEqual(findings, []);
  assert.doesNotMatch(source, /rawPrompt|providerResponse|reviewerNotes|OPENAI_API_KEY|GEMINI_API_KEY|sk-/i);
});
