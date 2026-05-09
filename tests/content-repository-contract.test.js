const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { loadQuestionBanks } = require('../scripts/qa/bank-loader');
const { loadManifest } = require('../scripts/generate-question-manifest');
const {
  buildContentRepositoryRecordsFromBankLoad,
  createContentRepository,
  createFakeContentRepositoryAdapter,
  evaluateContentRepositoryMigrationPolicy
} = require('../server/content-repository-contract');

const repoRoot = path.resolve(__dirname, '..');
const manifest = loadManifest();
const bankLoad = loadQuestionBanks({ sourceType: 'json' });
const records = buildContentRepositoryRecordsFromBankLoad(bankLoad, { manifest });

function repository() {
  return createContentRepository(createFakeContentRepositoryAdapter(records));
}

test('content repository reads provider-neutral question sets and immutable question records', async () => {
  const repo = repository();
  const set = await repo.getQuestionSet('grammar-correct-article');
  const question = await repo.getQuestionByRef({
    id: 'grammar-correct-article-q0001',
    sourceSet: 'grammar-correct-article',
    version: 2,
    contentHash: 'sha256:4db6f58fc836d2ff67b080e13fc72dc8dbfc5db42ede5739f0da6a8261631425',
    sequence: 1
  });

  assert.equal(set.id, 'grammar-correct-article');
  assert.equal(set.domain, 'grammar');
  assert.equal(set.publicationState, 'published');
  assert.ok(set.questionCount > 30);
  assert.equal(question.questionId, 'grammar-correct-article-q0001');
  assert.equal(question.sourceSet, 'grammar-correct-article');
  assert.equal(question.version, 2);
  assert.equal(question.sequence, 1);
  assert.equal(question.contentHash, 'sha256:4db6f58fc836d2ff67b080e13fc72dc8dbfc5db42ede5739f0da6a8261631425');
  assert.equal(question.publicationState, 'published');
  assert.equal(question.provenance.sourceFile, 'assets/question-bank-source/grammar.json');
  assert.deepEqual(findProviderSpecificKeys(question), []);
});

test('content repository answers set, ref, skill, standard, grade, difficulty, and mastery queries', async () => {
  const repo = repository();
  const fixture = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tests/fixtures/content-repository/query-fixtures.json'), 'utf8'));

  for (const entry of fixture.queries) {
    const result = await repo.queryQuestions(entry.query);
    assert.ok(result.questions.length > 0, `${entry.name} should return questions`);
    assert.ok(result.questions.every(question => question.domain === entry.query.domain));
    assert.deepEqual(findProviderSpecificKeys(result), []);
  }

  const bySet = await repo.queryQuestions({ sourceSet: 'grammar-correct-article', limit: 3 });
  assert.deepEqual(bySet.questions.map(question => question.sourceSet), [
    'grammar-correct-article',
    'grammar-correct-article',
    'grammar-correct-article'
  ]);
  assert.deepEqual(bySet.questions.map(question => question.sequence), [1, 2, 3]);

  const mastery = await repo.queryQuestions({
    domain: 'grammar',
    mastery: {
      weakSkillIds: ['grammar.usage'],
      avoidQuestionIds: ['grammar-correct-article-q0001']
    },
    limit: 5
  });
  assert.equal(mastery.questions.some(question => question.questionId === 'grammar-correct-article-q0001'), false);
  assert.ok(mastery.diagnostics.appliedFilters.includes('mastery.weakSkillIds'));
});

test('canonical JSON publication maps deterministically to repository records', () => {
  const source = bankLoad.files.find(file => file.domain === 'grammar').bank['grammar-correct-article'].questions[0];
  const record = records.find(item => item.questionId === source.id);
  const manifestSet = manifest.sets.find(set => set.id === 'grammar-correct-article');
  const manifestQuestion = manifestSet.questions.find(question => question.id === source.id);

  assert.equal(record.questionId, source.id);
  assert.equal(record.sourceSet, source.metadata.sourceSet);
  assert.equal(record.version, source.version);
  assert.equal(record.contentHash, source.contentHash);
  assert.equal(record.sequence, source.metadata.sequence);
  assert.deepEqual(record.gradeLevels, source.metadata.gradeLevels);
  assert.deepEqual(record.skillIds, manifestQuestion.skillIds);
  assert.deepEqual(record.standardIds, manifestQuestion.standardIds);
  assert.equal(record.provenance.sourceFile, 'assets/question-bank-source/grammar.json');
  assert.equal(record.provenance.sourceType, 'json');
});

test('fake repository supports scale-oriented personalization query fixtures', async () => {
  const fixture = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tests/fixtures/content-repository/query-fixtures.json'), 'utf8'));
  const synthetic = buildSyntheticRecords(fixture.scaleFixture.recordCount);
  const repo = createContentRepository(createFakeContentRepositoryAdapter(synthetic));
  const result = await repo.queryQuestions({
    domain: 'grammar',
    grade: 3,
    difficulty: 'medium',
    skillIds: ['grammar.usage'],
    mastery: { weakSkillIds: ['grammar.usage'] },
    limit: 60
  });

  assert.equal(synthetic.length, 100000);
  assert.equal(result.questions.length, 60);
  assert.ok(result.questions.every(question => question.domain === 'grammar'));
  assert.ok(result.questions.every(question => question.gradeLevels.includes(3)));
  assert.ok(result.questions.every(question => question.skillIds.includes('grammar.usage')));
  assert.deepEqual(findProviderSpecificKeys(result), []);
});

function buildSyntheticRecords(count) {
  return Array.from({ length: count }, (_, index) => {
    const domain = index % 2 === 0 ? 'grammar' : 'capitalization';
    const grade = 3 + (index % 4);
    const difficulty = ['easy', 'medium', 'hard'][index % 3];
    return {
      schemaVersion: 1,
      questionId: `${domain}-synthetic-q${String(index + 1).padStart(6, '0')}`,
      sourceSet: `${domain}-synthetic-${index % 20}`,
      domain,
      version: 1,
      contentHash: `sha256:${String(index).padStart(64, '0').slice(-64)}`,
      sequence: index + 1,
      skillIds: [domain === 'grammar' ? 'grammar.usage' : 'capitalization.names'],
      standardIds: [domain === 'grammar' ? 'L.3-6.1' : 'L.3-6.2'],
      skills: [domain],
      gradeLevels: [grade],
      difficultyByGrade: { [String(grade)]: difficulty },
      difficulty,
      publicationState: 'published',
      set: { id: `${domain}-synthetic`, title: 'Synthetic', topic: domain },
      content: { question: 'Synthetic public prompt', choices: ['A', 'B'], correct: 0, explanation: null, studyAid: null },
      provenance: { sourceFile: 'tests/fixtures/content-repository/query-fixtures.json', sourceType: 'fixture', publication: 'synthetic_scale_fixture' }
    };
  });
}

test('content repository migration policy keeps canonical JSON and chunks as source of truth', () => {
  const blocked = evaluateContentRepositoryMigrationPolicy({
    canonicalJsonFresh: true,
    generatedChunksFresh: true,
    repositoryParityVerified: false,
    providerAdapterSelected: 'firestore'
  });
  const ready = evaluateContentRepositoryMigrationPolicy({
    canonicalJsonFresh: true,
    generatedChunksFresh: true,
    repositoryParityVerified: true
  });

  assert.equal(blocked.readyForPilot, false);
  assert.equal(blocked.sourceOfTruth, 'canonical_json');
  assert.ok(blocked.blockers.includes('repository_parity_missing'));
  assert.ok(blocked.blockers.includes('provider_specific_shortcut'));
  assert.equal(ready.readyForPilot, true);
  assert.deepEqual(ready.blockers, []);
});

function findProviderSpecificKeys(value, pathParts = []) {
  if (!value || typeof value !== 'object') return [];
  return Object.keys(value).flatMap(key => {
    const nextPath = pathParts.concat(key);
    const hit = /firestore|cms|collection|docPath|documentPath|cursor|provider/i.test(key)
      ? [nextPath.join('.')]
      : [];
    return hit.concat(findProviderSpecificKeys(value[key], nextPath));
  });
}
