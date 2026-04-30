const assert = require('node:assert/strict');
const test = require('node:test');

const transfer = require('../assets/learner-progress-transfer-domain');

test('learner progress transfer domain builds stable envelopes and strips labels by default', () => {
  const envelope = transfer.createProgressExportEnvelope({
    learner: { id: 'learner-1', displayLabel: 'Maya' },
    data: { sessions: [{ id: 'session-1' }] },
    app: { name: 'Grammar Quest', version: '1.0.0', exportedAt: '2030-04-29T12:00:00.000Z' },
    artifactProvenance: { manifestVersion: 1, sourceHash: 'sha256:abc' }
  });

  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.learner.id, 'learner-1');
  assert.equal(envelope.learner.displayLabel, '');
  assert.ok(envelope.integrity.digest.startsWith('sha256:'));
});

test('learner progress transfer domain validates digest and forbidden fields', () => {
  const envelope = transfer.createProgressExportEnvelope({
    learner: { id: 'learner-1' },
    data: { sessions: [{ id: 'session-1', question: 'raw prompt' }] },
    app: { exportedAt: '2030-04-29T12:00:00.000Z' }
  });

  const validation = transfer.validateProgressExport(envelope);
  assert.equal(validation.valid, true);
  assert.equal(JSON.stringify(envelope).includes('raw prompt'), false);

  const corrupt = JSON.parse(JSON.stringify(envelope));
  corrupt.data.sessions.push({ id: 'session-2' });
  assert.equal(transfer.validateProgressExport(corrupt).valid, false);
});

