const assert = require('node:assert/strict');
const test = require('node:test');

const {
  runContentPublicationCommand
} = require('../scripts/content-publication');

test('content publication CLI plans, approves, and blocks publish without QA approval', async () => {
  const plan = await runContentPublicationCommand('plan', {
    changedFiles: ['assets/question-bank-source/grammar.json'],
    now: () => '2030-04-29T12:00:00.000Z'
  });
  assert.equal(plan.status, 'draft');
  assert.equal(plan.changedFiles.length, 1);

  const approved = await runContentPublicationCommand('approve', {
    publication: plan,
    actor: { id: 'reviewer-1', role: 'content_reviewer' },
    now: () => '2030-04-29T12:05:00.000Z'
  });
  assert.equal(approved.status, 'approved');

  await assert.rejects(() => runContentPublicationCommand('publish', {
    publication: plan,
    now: () => '2030-04-29T12:10:00.000Z'
  }), /publication_requires_approval/);
});
