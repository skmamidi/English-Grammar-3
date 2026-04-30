const assert = require('node:assert/strict');
const test = require('node:test');

const {
  approvePublication,
  createPublication,
  publishPublication,
  validatePublication
} = require('../assets/content-publication-domain');

test('content publication domain normalizes statuses, hashes, QA, and approvals', () => {
  const publication = createPublication({
    id: 'pub-1',
    sourceHash: 'sha256:source',
    artifactHash: 'sha256:artifact',
    changedFiles: ['assets/question-bank-source/grammar.json'],
    qaResults: [{ id: 'schema', status: 'passed' }],
    createdAt: '2030-04-29T12:00:00.000Z'
  });

  assert.equal(publication.status, 'draft');
  assert.equal(publication.reviewItems.length, 0);
  assert.deepEqual(validatePublication(publication), []);
});

test('content publication blocks publish until QA passes and reviewer approval exists', () => {
  const failed = createPublication({
    id: 'pub-2',
    sourceHash: 'sha256:source',
    artifactHash: 'sha256:artifact',
    qaResults: [{ id: 'content', status: 'failed', blocking: true }]
  });

  assert.throws(() => publishPublication(failed, { actorId: 'reviewer-1' }), /publication_qa_blocking/);

  const approved = approvePublication(createPublication({
    id: 'pub-3',
    sourceHash: 'sha256:source',
    artifactHash: 'sha256:artifact',
    qaResults: [{ id: 'content', status: 'passed' }]
  }), {
    actorId: 'reviewer-1',
    role: 'content_reviewer',
    approvedAt: '2030-04-29T12:00:00.000Z'
  });
  const published = publishPublication(approved, {
    actorId: 'reviewer-1',
    publishedAt: '2030-04-29T12:05:00.000Z'
  });

  assert.equal(published.status, 'published');
  assert.equal(published.approvals[0].actorId, 'reviewer-1');
});
