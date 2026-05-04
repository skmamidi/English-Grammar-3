const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildApprovedLessonContext,
  buildAuthoringRecord,
  buildProviderRequest,
  createProviderAdapter,
  parseStrictDraftJson,
  runDryRun
} = require('../scripts/ai-generate-story-lessons');

const repoRoot = path.resolve(__dirname, '..');

test('story lesson draft tooling builds approved context without learner data or answer keys', () => {
  const context = buildApprovedLessonContext({
    root: repoRoot,
    setId: 'grammar-sentence-types',
    grade: 4
  });

  assert.equal(context.setId, 'grammar-sentence-types');
  assert.equal(context.domain, 'grammar');
  assert.equal(context.targetGrade, 4);
  assert.ok(context.skillIds.includes('grammar.foundations'));
  assert.ok(context.standardIds.length >= 1);
  assert.ok(context.requiredPedagogyMoves.includes('guided_check'));
  assert.ok(context.relatedSubtopicIds.length >= 1);
  assert.deepEqual(Object.keys(context.schema.properties).sort(), [
    'characterRoles',
    'examples',
    'gradeBand',
    'guidedChecks',
    'reviewStatus',
    'storyBeats',
    'tags'
  ]);
  assert.equal(JSON.stringify(context).includes('answerKey'), false);
  assert.equal(JSON.stringify(context).includes('learner'), false);
});

test('story lesson draft tooling creates provider-neutral Gemini and OpenAI JSON requests', () => {
  const context = buildApprovedLessonContext({ root: repoRoot, setId: 'grammar-sentence-types', grade: 4 });
  const gemini = buildProviderRequest({ provider: 'gemini', model: 'gemini-test', context });
  const openai = buildProviderRequest({ provider: 'openai', model: 'gpt-test', context });

  assert.equal(gemini.provider, 'gemini');
  assert.equal(gemini.body.generationConfig.responseMimeType, 'application/json');
  assert.match(gemini.body.contents[0].parts[0].text, /Respond only with strict JSON/);
  assert.equal(openai.provider, 'openai');
  assert.equal(openai.body.response_format.type, 'json_schema');
  assert.match(openai.body.messages[0].content, /Do not include raw prompts/);
});

test('story lesson draft tooling parses strict tagged draft JSON', () => {
  const draft = parseStrictDraftJson(JSON.stringify(validDraft()));

  assert.equal(draft.gradeBand, '4');
  assert.equal(draft.reviewStatus, 'draft');
  assert.deepEqual(draft.tags.exampleTypes, ['direct', 'near_miss', 'transfer']);
  assert.throws(() => parseStrictDraftJson(JSON.stringify(Object.assign(validDraft(), {
    tags: Object.assign({}, validDraft().tags, { standardIds: [] })
  }))), /story_lesson_draft_missing_tags/);
});

test('story lesson draft tooling reports provider configuration without live network calls', () => {
  const geminiMissing = createProviderAdapter({ provider: 'gemini', env: {} });
  const openAiReady = createProviderAdapter({ provider: 'openai', env: { OPENAI_API_KEY: 'test-key' }, fetchImpl: async () => ({ ok: true }) });

  assert.equal(geminiMissing.configured, false);
  assert.equal(geminiMissing.missingEnv, 'GEMINI_API_KEY');
  assert.equal(openAiReady.configured, true);
  assert.equal(openAiReady.provider, 'openai');
});

test('story lesson draft dry run writes sanitized draft and sidecar authoring record only', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'story-draft-'));
  const context = buildApprovedLessonContext({ root: repoRoot, setId: 'grammar-sentence-types', grade: 4 });
  const result = runDryRun({
    root: repoRoot,
    outputDir: path.join(tmpRoot, 'drafts'),
    recordsPath: path.join(tmpRoot, 'records.json'),
    context,
    draft: validDraft(),
    provider: 'openai',
    modelFamily: 'gpt-test',
    promptRecordId: 'story-prompt-test',
    draftRecordId: 'story-draft-test'
  });

  const draftFile = JSON.parse(fs.readFileSync(result.draftPath, 'utf8'));
  const records = JSON.parse(fs.readFileSync(result.recordsPath, 'utf8')).records;

  assert.equal(draftFile.setId, 'grammar-sentence-types');
  assert.equal(draftFile.rawPrompt, undefined);
  assert.equal(records.length, 1);
  assert.equal(records[0].provider, 'openai');
  assert.equal(records[0].promptRecordId, 'story-prompt-test');
  assert.equal(records[0].rawPrompt, undefined);
  assert.equal(records[0].generatedDraftHash.startsWith('sha256:'), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'assets', 'story-lesson-source', 'grammar-sentence-types.json')), true);
});

test('story lesson authoring record builder rejects unsafe provider metadata', () => {
  const context = buildApprovedLessonContext({ root: repoRoot, setId: 'grammar-sentence-types', grade: 4 });

  assert.throws(() => buildAuthoringRecord({
    context,
    draft: validDraft(),
    provider: 'openai',
    modelFamily: '',
    promptRecordId: '',
    draftRecordId: 'draft-1'
  }), /story_lesson_authoring_record_missing_evidence/);
});

function validDraft() {
  return {
    gradeBand: '4',
    reviewStatus: 'draft',
    characterRoles: [{ roleId: 'guide', characterId: 'mina-mapwise', purpose: 'models the concept' }],
    storyBeats: [{ id: 'beat-1', characterRoleId: 'guide', narrative: 'Mina compares four sentence cards and sorts each one by its job.' }],
    examples: [
      { type: 'direct', text: 'The clue is on the table.', explanation: 'This states something.' },
      { type: 'near_miss', text: 'Where is the clue?', explanation: 'This asks something.' },
      { type: 'transfer', text: 'Please open the case file.', explanation: 'This gives a command.' }
    ],
    guidedChecks: [{ prompt: 'Which sentence asks something?', answer: 'Where is the clue?' }],
    tags: {
      conceptIds: ['sentence-types'],
      skillIds: ['grammar.foundations'],
      standardIds: ['L.2-6.1'],
      pedagogyMoves: ['model', 'guided_check', 'editing_transfer'],
      commonMistakeIds: ['grammar-sentence-types-common-mistake'],
      exampleTypes: ['direct', 'near_miss', 'transfer'],
      characterRoleIds: ['guide'],
      relatedSubtopicIds: ['grammar-subject-predicate']
    }
  };
}
