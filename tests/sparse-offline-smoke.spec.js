#!/usr/bin/env node

const assert = require('node:assert/strict');

const {
  createIndexedDbOfflineQuestionStore
} = require('../assets/offline-question-store');

async function main() {
  const store = createIndexedDbOfflineQuestionStore({ databaseName: 'sparse-offline-smoke' });
  await store.putQuestionRecords([
    {
      questionId: 'grammar-sparse-q1',
      sourceSet: 'grammar-sentence-types',
      version: 'published-2030-05',
      contentHash: 'sha256:aaaaaaaaaaaa',
      prompt: 'Choose the complete sentence.',
      choices: ['A complete sentence.', 'Because it rained.'],
      mediaRefs: []
    }
  ]);
  const records = await store.getQuestionRecordsByRefs([
    {
      questionId: 'grammar-sparse-q1',
      sourceSet: 'grammar-sentence-types',
      version: 'published-2030-05',
      contentHash: 'sha256:aaaaaaaaaaaa'
    }
  ]);

  assert.equal(records.length, 1);
  assert.equal(records[0].loadedFromChunkScript, false);
  assert.equal(records[0].storageTarget, 'indexedDB');
  console.log('Sparse offline smoke passed.');
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
