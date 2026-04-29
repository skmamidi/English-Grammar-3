const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const vm = require('vm');

const { buildIndexManifest, getSourceSet, loadManifest } = require('../scripts/generate-question-manifest');
const { loadChunkBank } = require('../scripts/qa/chunk-qa');
const { loadQuestionBanks } = require('../scripts/qa/bank-loader');
const selectionIntegrity = require('../assets/question-selection-integrity');
const testKeys = require('./fixtures/selection-test-keys.json');

const repoRoot = path.resolve(__dirname, '..');
const loaderScript = fs.readFileSync(path.join(repoRoot, 'assets', 'question-loader.js'), 'utf8');

test('loader resolves a set by id from an already loaded generated chunk', async () => {
  const bank = loadChunkBank('assets/question-chunks/grammar/grammar-sentence-types.js');
  const context = createLoaderContext({ bank });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const set = await context.window.GrammarQuestQuestionLoader.loadSet('grammar-sentence-types');
  assert.equal(set.id, 'grammar-sentence-types');
  assert.equal(set.title, 'Sentence Types');
  assert.ok(set.questions.length > 0);
});

test('loader requires manifest entries to provide chunkFile', async () => {
  const context = createLoaderContext({
    manifest: {
      sets: [{
        id: 'grammar-sentence-types',
        bankFile: 'assets/question-banks/grammar.js'
      }]
    }
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  await assert.rejects(
    () => context.window.GrammarQuestQuestionLoader.loadSet('grammar-sentence-types'),
    /manifest entry for "grammar-sentence-types" is missing chunkFile/
  );
  assert.deepEqual(context.loadedScriptPaths, []);
});

test('loader resolves a set by id from chunk manifest', async () => {
  const context = createLoaderContext({
    manifest: buildIndexManifest(loadManifest())
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const set = await context.window.GrammarQuestQuestionLoader.loadSet('capitalization-proper-names-titles');
  assert.equal(set.id, 'capitalization-proper-names-titles');
  assert.equal(set.topic, 'Capitalization');
  assert.ok(set.questions.length > 0);
  assert.ok(set.questions.every(question => question.id.startsWith('capitalization-proper-names-titles-q')));
});

test('loader returns canonical source-bank content for chunk-loaded sets', async () => {
  const context = createLoaderContext({
    manifest: buildIndexManifest(loadManifest())
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const set = await context.window.GrammarQuestQuestionLoader.loadSet('capitalization-proper-names-titles');
  const sourceSet = getSourceSet(loadQuestionBanks(), 'capitalization-proper-names-titles');
  const canonicalContent = Object.assign({}, set);
  delete canonicalContent.id;

  assert.deepEqual(toJsonValue(canonicalContent), toJsonValue(sourceSet));
});

test('loader hydrates question refs from chunk-backed source sets', async () => {
  const context = createLoaderContext({
    manifest: buildIndexManifest(loadManifest())
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const questions = await context.window.GrammarQuestQuestionLoader.hydrateQuestionRefs([{
    id: 'capitalization-proper-names-titles-q0001',
    sourceSet: 'capitalization-proper-names-titles'
  }]);

  assert.equal(questions.length, 1);
  assert.equal(questions[0].id, 'capitalization-proper-names-titles-q0001');
  assert.match(questions[0].question, /capitalized|Capitalized|edited|version/);
});

test('loader hydrates refs from only the needed oversized subchunk', async () => {
  const manifest = loadManifest();
  const oversized = manifest.sets.find(set => Array.isArray(set.chunks) && set.chunks.length > 1);
  assert.ok(oversized, 'expected at least one subchunked set');
  const targetChunk = oversized.chunks[1];
  const questionId = targetChunk.ids[0];
  const context = createLoaderContext({ manifest: buildIndexManifest(manifest) });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const questions = await context.window.GrammarQuestQuestionLoader.hydrateQuestionRefs([{
    id: questionId,
    sourceSet: oversized.id,
    sequence: targetChunk.firstSequence
  }]);

  assert.equal(questions.length, 1);
  assert.equal(questions[0].id, questionId);
  assert.deepEqual(context.loadedScriptPaths, [targetChunk.chunkFile]);
});

test('loader can assemble a full oversized set from all generated subchunks', async () => {
  const manifest = loadManifest();
  const oversized = manifest.sets.find(set => Array.isArray(set.chunks) && set.chunks.length > 1);
  const context = createLoaderContext({ manifest: buildIndexManifest(manifest) });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const set = await context.window.GrammarQuestQuestionLoader.loadSet(oversized.id);
  assert.equal(set.id, oversized.id);
  assert.equal(set.questions.length, oversized.questionCount);
  assert.deepEqual(context.loadedScriptPaths, oversized.chunks.map(chunk => chunk.chunkFile));
});

test('loader sends server selection request and hydrates returned refs when enabled', async () => {
  const requests = [];
  const context = createLoaderContext({
    manifest: loadManifest(),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection'
    },
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      const body = JSON.parse(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => withIntegrity({
          selectionId: 'sel_unit',
          selectionPolicyVersion: 1,
          questionRefs: [{
            id: 'capitalization-proper-names-titles-q0001',
            sourceSet: 'capitalization-proper-names-titles',
            version: 1,
            contentHash: getManifestQuestion('capitalization-proper-names-titles', 'capitalization-proper-names-titles-q0001').contentHash,
            sequence: 1
          }]
        }, body)
      };
    }
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    selectionPolicyVersion: 1
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/question-selection');
  assert.deepEqual(requests[0].body.setIds, ['capitalization-proper-names-titles']);
  assert.equal(requests[0].body.countMode, 'per-subtopic');
  assert.equal(requests[0].body.questionsPerSubtopic, 4);
  assert.equal(result.source, 'api');
  assert.equal(result.selectionId, 'sel_unit');
  assert.equal(result.sets.length, 1);
  assert.equal(result.sets[0].questions[0].id, 'capitalization-proper-names-titles-q0001');
  const started = context.events.find(event => event.name === 'grammarquest:question-selection-started');
  const apiUsed = context.events.find(event => event.name === 'grammarquest:question-selection-api-used');
  const completed = context.events.find(event => event.name === 'grammarquest:question-selection-completed');
  assert.ok(started, 'selection should emit started telemetry');
  assert.ok(apiUsed, 'selection should emit API-used telemetry');
  assert.ok(completed, 'selection should emit completed telemetry');
  assert.equal(apiUsed.detail.source, 'api');
  assert.equal(completed.detail.source, 'api');
  assert.equal(apiUsed.detail.setCount, 1);
  assert.equal(apiUsed.detail.requestedQuestionCount, 4);
  assert.equal(apiUsed.detail.selectedQuestionCount, 1);
  assert.ok(Number.isInteger(apiUsed.detail.requestBytes) && apiUsed.detail.requestBytes > 0);
  assert.ok(Number.isInteger(apiUsed.detail.responseBytes) && apiUsed.detail.responseBytes > 0);
  assert.ok(Number.isFinite(apiUsed.detail.selectionMs) && apiUsed.detail.selectionMs >= 0);
  assert.ok(Number.isFinite(apiUsed.detail.hydrateMs) && apiUsed.detail.hydrateMs >= 0);
  assert.equal(JSON.stringify(apiUsed.detail).includes('capitalized'), false);
});

test('loader sends subtopic server selection request and returns a set-compatible result', async () => {
  const requests = [];
  const manifestQuestion = getManifestQuestion('capitalization-proper-names-titles', 'capitalization-proper-names-titles-q0001');
  const context = createLoaderContext({
    manifest: loadManifest(),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection'
    },
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      return {
        ok: true,
        status: 200,
        json: async () => withIntegrity({
          selectionId: 'sel_subtopic_unit',
          selectionPolicyVersion: 1,
          questionRefs: [{
            id: 'capitalization-proper-names-titles-q0001',
            sourceSet: 'capitalization-proper-names-titles',
            version: manifestQuestion.version,
            contentHash: manifestQuestion.contentHash,
            sequence: manifestQuestion.sequence
          }]
        }, JSON.parse(options.body))
      };
    }
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'subtopic',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 10,
    countMode: 'max',
    questionsPerSubtopic: 0,
    selectionPolicyVersion: 1
  });

  assert.equal(requests.length, 1);
  assert.equal(requests[0].body.mode, 'subtopic');
  assert.equal(requests[0].body.count, 10);
  assert.equal(requests[0].body.countMode, 'max');
  assert.equal(requests[0].body.questionsPerSubtopic, 0);
  assert.equal(result.source, 'api');
  assert.equal(result.selectionId, 'sel_subtopic_unit');
  assert.equal(result.sets.length, 1);
  assert.equal(result.sets[0].id, 'capitalization-proper-names-titles');
  assert.equal(result.sets[0].questions[0].id, 'capitalization-proper-names-titles-q0001');
});

test('loader falls back to chunk set when subtopic server selection fails', async () => {
  const context = createLoaderContext({
    manifest: loadManifest(),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection'
    },
    fetch: async () => ({
      ok: false,
      status: 503,
      json: async () => ({})
    })
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'subtopic',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 10,
    countMode: 'max',
    questionsPerSubtopic: 0,
    selectionPolicyVersion: 1
  });

  assert.equal(result.source, 'fallback');
  assert.equal(result.sets.length, 1);
  assert.equal(result.sets[0].id, 'capitalization-proper-names-titles');
  assert.ok(result.sets[0].questions.length > 10);
  assert.ok(context.events.some(event => event.name === 'grammarquest:question-selection-fallback' && /503/.test(event.detail.reason)));
});

test('loader falls back to chunks when server selection fails', async () => {
  const context = createLoaderContext({
    manifest: loadManifest(),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection'
    },
    fetch: async () => ({
      ok: false,
      status: 503,
      json: async () => ({})
    })
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    selectionPolicyVersion: 1
  });

  assert.equal(result.source, 'fallback');
  assert.equal(result.sets.length, 1);
  assert.equal(result.sets[0].id, 'capitalization-proper-names-titles');
  const fallback = context.events.find(event => event.name === 'grammarquest:question-selection-fallback');
  const completed = context.events.find(event => event.name === 'grammarquest:question-selection-completed');
  assert.ok(fallback);
  assert.ok(completed);
  assert.equal(fallback.detail.source, 'fallback');
  assert.equal(completed.detail.source, 'fallback');
  assert.match(fallback.detail.fallbackReason, /selection API returned 503/);
  assert.ok(Number.isFinite(fallback.detail.selectionMs) && fallback.detail.selectionMs >= 0);
  assert.ok(Number.isFinite(fallback.detail.hydrateMs) && fallback.detail.hydrateMs >= 0);
});

test('loader emits chunk telemetry when server selection is disabled', async () => {
  const context = createLoaderContext({
    manifest: buildIndexManifest(loadManifest())
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    countMode: 'per-subtopic',
    questionsPerSubtopic: 4,
    selectionPolicyVersion: 1
  });

  const started = context.events.find(event => event.name === 'grammarquest:question-selection-started');
  const completed = context.events.find(event => event.name === 'grammarquest:question-selection-completed');
  assert.equal(result.source, 'disabled');
  assert.ok(started);
  assert.ok(completed);
  assert.equal(completed.detail.source, 'chunks');
  assert.equal(completed.detail.setCount, 1);
  assert.equal(completed.detail.requestedQuestionCount, 4);
  assert.ok(completed.detail.selectedQuestionCount > 0);
  assert.ok(Number.isFinite(completed.detail.hydrateMs) && completed.detail.hydrateMs >= 0);
  assert.equal(JSON.stringify(completed.detail).includes('choices'), false);
});

test('loader rejects invalid server selection refs and falls back', async () => {
  const context = createLoaderContext({
    manifest: loadManifest(),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection'
    },
    fetch: async (url, options) => ({
      ok: true,
      status: 200,
      json: async () => withIntegrity({
        selectionId: 'sel_bad',
        selectionPolicyVersion: 1,
        questionRefs: [{
          id: 'grammar-sentence-types-q0001',
          sourceSet: 'grammar-sentence-types',
          version: 1,
          contentHash: `sha256:${'0'.repeat(64)}`,
          sequence: 1
        }]
      }, JSON.parse(options.body))
    })
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    selectionPolicyVersion: 1
  });

  assert.equal(result.source, 'fallback');
  assert.ok(context.events.some(event => /unauthorized sourceSet/.test(event.detail.reason)));
});

test('loader rejects refs whose manifest identity does not match API identity', async () => {
  const cases = [
    {
      name: 'wrong hash',
      patch: ref => Object.assign({}, ref, { contentHash: `sha256:${'0'.repeat(64)}` }),
      reason: /contentHash/
    },
    {
      name: 'wrong version',
      patch: ref => Object.assign({}, ref, { version: ref.version + 1 }),
      reason: /version/
    },
    {
      name: 'wrong sequence',
      patch: ref => Object.assign({}, ref, { sequence: ref.sequence + 1 }),
      reason: /sequence/
    },
    {
      name: 'missing manifest question',
      patch: ref => Object.assign({}, ref, { id: 'capitalization-proper-names-titles-q9999' }),
      reason: /manifest question/
    }
  ];

  for (const scenario of cases) {
    const manifestQuestion = getManifestQuestion('capitalization-proper-names-titles', 'capitalization-proper-names-titles-q0001');
    const context = createLoaderContext({
      manifest: loadManifest(),
      config: {
        enableServerQuestionSelection: true,
        questionSelectionApiUrl: '/api/question-selection'
      },
      fetch: async (url, options) => ({
        ok: true,
        status: 200,
        json: async () => withIntegrity({
          selectionId: `sel_${scenario.name.replace(/\W+/g, '_')}`,
          selectionPolicyVersion: 1,
          questionRefs: [scenario.patch({
            id: 'capitalization-proper-names-titles-q0001',
            sourceSet: 'capitalization-proper-names-titles',
            version: manifestQuestion.version,
            contentHash: manifestQuestion.contentHash,
            sequence: manifestQuestion.sequence
          })]
        }, JSON.parse(options.body))
      })
    });

    vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

    const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
      mode: 'mixed',
      domain: 'capitalization',
      setIds: ['capitalization-proper-names-titles'],
      grade: '4',
      difficulty: 'medium',
      count: 4,
      selectionPolicyVersion: 1
    });

    assert.equal(result.source, 'fallback', scenario.name);
    assert.ok(
      context.events.some(event => event.name === 'grammarquest:question-selection-fallback' && scenario.reason.test(event.detail.reason)),
      scenario.name
    );
  }
});

test('loader rejects unmatched snapshots unless snapshots are explicitly allowed and validated', async () => {
  const manifestQuestion = getManifestQuestion('capitalization-proper-names-titles', 'capitalization-proper-names-titles-q0001');
  const context = createLoaderContext({
    manifest: loadManifest(),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection'
    },
    fetch: async (url, options) => ({
      ok: true,
      status: 200,
      json: async () => withIntegrity({
        selectionId: 'sel_snapshot_mismatch',
        selectionPolicyVersion: 1,
        questionRefs: [{
          id: 'capitalization-proper-names-titles-q9999',
          sourceSet: 'capitalization-proper-names-titles',
          version: manifestQuestion.version,
          contentHash: manifestQuestion.contentHash,
          sequence: manifestQuestion.sequence
        }],
        questionSnapshots: [{
          id: 'capitalization-proper-names-titles-q0001',
          version: manifestQuestion.version,
          contentHash: manifestQuestion.contentHash,
          question: 'Snapshot content should not be trusted for a different ref.',
          choices: ['A', 'B'],
          correct: 0,
          metadata: {
            sourceSet: 'capitalization-proper-names-titles',
            sequence: manifestQuestion.sequence
          }
        }]
      }, JSON.parse(options.body))
    })
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    selectionPolicyVersion: 1
  });

  assert.equal(result.source, 'fallback');
  assert.ok(context.events.some(event => /manifest question/.test(event.detail.reason)));
});

test('loader can use explicitly allowed snapshots only when they match their refs', async () => {
  const manifestQuestion = getManifestQuestion('capitalization-proper-names-titles', 'capitalization-proper-names-titles-q0001');
  const context = createLoaderContext({
    manifest: loadManifest(),
    config: {
      enableServerQuestionSelection: true,
      allowServerSelectionSnapshots: true,
      questionSelectionApiUrl: '/api/question-selection'
    },
    fetch: async (url, options) => ({
      ok: true,
      status: 200,
      json: async () => withIntegrity({
        selectionId: 'sel_snapshot_match',
        selectionPolicyVersion: 1,
        questionRefs: [{
          id: 'capitalization-proper-names-titles-q0001',
          sourceSet: 'capitalization-proper-names-titles',
          version: manifestQuestion.version,
          contentHash: manifestQuestion.contentHash,
          sequence: manifestQuestion.sequence
        }],
        questionSnapshots: [{
          id: 'capitalization-proper-names-titles-q0001',
          version: manifestQuestion.version,
          contentHash: manifestQuestion.contentHash,
          question: 'A validated snapshot may be used when chunk hydration is unavailable.',
          choices: ['A', 'B'],
          correct: 0,
          metadata: {
            sourceSet: 'capitalization-proper-names-titles',
            sequence: manifestQuestion.sequence
          }
        }]
      }, JSON.parse(options.body))
    })
  });

  context.window.QUESTION_MANIFEST.sets.find(set => set.id === 'capitalization-proper-names-titles').chunkFile = 'assets/question-chunks/missing.js';
  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    selectionPolicyVersion: 1
  });

  assert.equal(result.source, 'api');
  assert.equal(result.sets[0].questions[0].id, 'capitalization-proper-names-titles-q0001');
});

test('loader rejects server selection responses with invalid integrity fields', async () => {
  const manifestQuestion = getManifestQuestion('capitalization-proper-names-titles', 'capitalization-proper-names-titles-q0001');
  const context = createLoaderContext({
    manifest: loadManifest(),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection'
    },
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        selectionId: 'sel_bad_integrity',
        selectionPolicyVersion: 1,
        requestHash: `sha256:${'0'.repeat(64)}`,
        responseDigest: `sha256:${'1'.repeat(64)}`,
        signature: null,
        signatureVersion: 'none',
        questionRefs: [{
          id: 'capitalization-proper-names-titles-q0001',
          sourceSet: 'capitalization-proper-names-titles',
          version: manifestQuestion.version,
          contentHash: manifestQuestion.contentHash,
          sequence: manifestQuestion.sequence
        }]
      })
    })
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    countMode: 'per-subtopic',
    questionsPerSubtopic: 4,
    selectionPolicyVersion: 1
  });

  assert.equal(result.source, 'fallback');
  assert.ok(context.events.some(event => /integrity_failed/.test(event.detail.reason)));
});

test('loader falls back when production signed mode receives an unsigned response', async () => {
  const manifestQuestion = getManifestQuestion('capitalization-proper-names-titles', 'capitalization-proper-names-titles-q0001');
  const context = createLoaderContext({
    manifest: loadManifest(),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection',
      selectionIntegrity: {
        requireSignature: true,
        publicKeys: publicKeyConfig()
      }
    },
    fetch: async (url, options) => ({
      ok: true,
      status: 200,
      json: async () => withIntegrity({
        selectionId: 'sel_unsigned_production',
        selectionPolicyVersion: 1,
        expiresAt: '2030-04-29T12:05:00.000Z',
        questionRefs: [{
          id: 'capitalization-proper-names-titles-q0001',
          sourceSet: 'capitalization-proper-names-titles',
          version: manifestQuestion.version,
          contentHash: manifestQuestion.contentHash,
          sequence: manifestQuestion.sequence
        }]
      }, JSON.parse(options.body))
    })
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    selectionPolicyVersion: 1
  });

  assert.equal(result.source, 'fallback');
  assert.ok(context.events.some(event => /signature is required/.test(event.detail.reason)));
});

test('loader verifies signed production selection responses with configured public keys', async () => {
  const manifestQuestion = getManifestQuestion('capitalization-proper-names-titles', 'capitalization-proper-names-titles-q0001');
  const context = createLoaderContext({
    manifest: loadManifest(),
    config: {
      enableServerQuestionSelection: true,
      questionSelectionApiUrl: '/api/question-selection',
      selectionIntegrity: {
        requireSignature: true,
        publicKeys: publicKeyConfig()
      }
    },
    fetch: async (url, options) => ({
      ok: true,
      status: 200,
      json: async () => withSignedIntegrity({
        selectionId: 'sel_signed_production',
        selectionPolicyVersion: 1,
        expiresAt: '2030-04-29T12:05:00.000Z',
        questionRefs: [{
          id: 'capitalization-proper-names-titles-q0001',
          sourceSet: 'capitalization-proper-names-titles',
          version: manifestQuestion.version,
          contentHash: manifestQuestion.contentHash,
          sequence: manifestQuestion.sequence
        }]
      }, JSON.parse(options.body))
    })
  });

  vm.runInContext(loaderScript, context, { filename: 'assets/question-loader.js' });

  const result = await context.window.GrammarQuestQuestionLoader.loadSelectedQuiz({
    mode: 'mixed',
    domain: 'capitalization',
    setIds: ['capitalization-proper-names-titles'],
    grade: '4',
    difficulty: 'medium',
    count: 4,
    selectionPolicyVersion: 1
  });

  assert.equal(result.source, 'api');
  assert.equal(result.selectionId, 'sel_signed_production');
  assert.equal(result.sets[0].questions[0].id, 'capitalization-proper-names-titles-q0001');
});

function createLoaderContext(options = {}) {
  const events = [];
  const window = {
    QUESTION_BANK: options.bank || {},
    QUESTION_MANIFEST: options.manifest,
    GrammarQuestSelectionCore: require('../assets/quiz-selection-core'),
    GrammarQuestSelectionIntegrity: selectionIntegrity,
    GRAMMAR_QUEST_CONFIG: options.config || {},
    dispatchEvent(event) {
      events.push({ name: event.type, detail: event.detail });
    }
  };
  const context = {
    window,
    console: Object.assign({}, console, { warn() {} }),
    document: null,
    loadedScriptPaths: [],
    events,
    CustomEvent: function CustomEvent(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    },
    fetch: options.fetch
  };
  context.document = createScriptLoadingDocument(context);
  vm.createContext(context);
  return context;
}

function getManifestQuestion(setId, questionId) {
  const set = loadManifest().sets.find(item => item.id === setId);
  return set.questions.find(question => question.id === questionId);
}

async function withIntegrity(response, request) {
  const signed = Object.assign({
    signature: null,
    signatureVersion: 'none'
  }, response);
  signed.requestHash = await selectionIntegrity.buildSelectionRequestHash(request, loadManifest().artifact);
  signed.responseDigest = await selectionIntegrity.buildSelectionResponseDigest(signed, loadManifest().artifact);
  return signed;
}

async function withSignedIntegrity(response, request) {
  const signed = Object.assign({
    kid: testKeys.kid,
    signature: null,
    signatureVersion: 'selection-signature-v1'
  }, response);
  signed.requestHash = await selectionIntegrity.buildSelectionRequestHash(request, loadManifest().artifact);
  signed.responseDigest = await selectionIntegrity.buildSelectionResponseDigest(signed, loadManifest().artifact);
  signed.signature = crypto.sign('sha256', Buffer.from(selectionIntegrity.buildSelectionSignaturePayload(signed, loadManifest().artifact)), {
    key: crypto.createPrivateKey({ key: testKeys.privateKey, format: 'jwk' }),
    dsaEncoding: 'ieee-p1363'
  }).toString('base64');
  return signed;
}

function publicKeyConfig() {
  return {
    [testKeys.kid]: {
      algorithm: testKeys.algorithm,
      publicKey: testKeys.publicKey
    }
  };
}

function createScriptLoadingDocument(context) {
  const scripts = [{ src: 'http://grammar-quest.test/assets/question-loader.js' }];
  const document = {
    currentScript: scripts[0],
    createElement(tagName) {
      assert.equal(tagName, 'script');
      return {
        async: false,
        src: '',
        onload: null,
        onerror: null
      };
    },
    getElementsByTagName(tagName) {
      return tagName === 'script' ? scripts : [];
    },
    head: {
      appendChild(script) {
        try {
          const url = new URL(script.src);
          const file = path.join(repoRoot, url.pathname.replace(/^\//, ''));
          context.loadedScriptPaths.push(url.pathname.replace(/^\//, ''));
          vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
          scripts.push(script);
          if (script.onload) script.onload();
        } catch (error) {
          if (script.onerror) script.onerror(error);
          else throw error;
        }
      }
    }
  };
  document.documentElement = document.head;
  document.body = document.head;
  return document;
}

function toJsonValue(value) {
  return JSON.parse(JSON.stringify(value));
}
