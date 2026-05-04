#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT_DIR = path.join(repoRoot, 'content-review', 'story-lesson-drafts');
const DEFAULT_RECORDS_PATH = path.join(repoRoot, 'content-review', 'story-lesson-authoring-records.json');
const REQUIRED_TAG_FIELDS = [
  'conceptIds',
  'skillIds',
  'standardIds',
  'pedagogyMoves',
  'commonMistakeIds',
  'exampleTypes',
  'characterRoleIds',
  'relatedSubtopicIds'
];
const STRICT_DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['gradeBand', 'reviewStatus', 'characterRoles', 'storyBeats', 'examples', 'guidedChecks', 'tags'],
  properties: {
    gradeBand: { type: 'string' },
    reviewStatus: { type: 'string', enum: ['draft'] },
    characterRoles: { type: 'array' },
    storyBeats: { type: 'array' },
    examples: { type: 'array' },
    guidedChecks: { type: 'array' },
    tags: { type: 'object' }
  }
};

function buildApprovedLessonContext(options = {}) {
  const root = options.root || repoRoot;
  const setId = safeString(options.setId);
  const targetGrade = Number(options.grade || options.targetGrade) || 4;
  if (!setId) throw new Error('story_lesson_context_requires_set_id');

  const questionManifest = readJson(path.join(root, 'assets', 'question-manifest.json'));
  const lessonSourcePath = path.join(root, 'assets', 'story-lesson-source', `${setId}.json`);
  if (!fs.existsSync(lessonSourcePath)) throw new Error(`story_lesson_source_missing:${setId}`);
  const lesson = readJson(lessonSourcePath);
  const manifestSet = (questionManifest.sets || []).find(set => set.id === setId) || {};
  const tags = lesson.tags || {};
  const relatedSubtopicIds = (Array.isArray(lesson.relatedSubtopics) ? lesson.relatedSubtopics : [])
    .map(item => safeString(item && item.setId))
    .filter(Boolean);
  return {
    setId,
    domain: safeString(lesson.domain || manifestSet.domain),
    title: safeString(lesson.title || manifestSet.title),
    targetGrade,
    gradeBand: String(targetGrade),
    skillIds: stringArray(tags.skillIds),
    standardIds: stringArray(tags.standardIds),
    conceptIds: stringArray(tags.conceptIds),
    requiredPedagogyMoves: stringArray(tags.pedagogyMoves),
    commonMistakeIds: stringArray(tags.commonMistakeIds),
    exampleTypes: Array.from(new Set(stringArray(tags.exampleTypes).concat(['direct', 'near_miss', 'transfer']))).sort(),
    characterRoleHints: (Array.isArray(lesson.characterRoles) ? lesson.characterRoles : []).map(role => ({
      roleId: safeString(role.roleId),
      characterId: safeString(role.characterId),
      purpose: safeString(role.purpose)
    })).filter(role => role.roleId && role.characterId),
    relatedSubtopicIds,
    schema: STRICT_DRAFT_SCHEMA
  };
}

function buildStoryLessonDraftPrompt(context = {}) {
  const payload = sanitizeForPrompt(context);
  return [
    'You are drafting a kid-friendly, grade-specific story lesson for Grammar Quest.',
    'Use only the approved curriculum context below. Do not include learner data, secrets, raw answer keys, private source text, or unsupported standards claims.',
    'Respond only with strict JSON matching the provided schema. Do not include Markdown fences.',
    'Every story beat must be concrete, character-driven, and useful for instruction.',
    'Required tags must be stable and complete: conceptIds, skillIds, standardIds, gradeBand, pedagogyMoves, commonMistakeIds, exampleTypes, characterRoleIds, relatedSubtopicIds, reviewStatus.',
    `Approved context JSON: ${JSON.stringify(payload)}`
  ].join('\n\n');
}

function buildProviderRequest(options = {}) {
  const provider = normalizeProvider(options.provider);
  const model = safeString(options.model || options.modelFamily || defaultModel(provider));
  const context = options.context || {};
  const prompt = buildStoryLessonDraftPrompt(context);
  if (provider === 'gemini') {
    return {
      provider,
      model,
      body: {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      }
    };
  }
  return {
    provider,
    model,
    body: {
      model,
      messages: [
        { role: 'system', content: 'Draft structured story lesson JSON. Do not include raw prompts, learner data, private source text, or secrets.' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'story_lesson_draft',
          strict: true,
          schema: STRICT_DRAFT_SCHEMA
        }
      }
    }
  };
}

function createProviderAdapter(options = {}) {
  const provider = normalizeProvider(options.provider);
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const keyName = provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY';
  const apiKey = safeString(env[keyName]);
  if (!apiKey) {
    return {
      provider,
      configured: false,
      missingEnv: keyName
    };
  }
  return {
    provider,
    configured: true,
    async generateDraft(request) {
      if (typeof fetchImpl !== 'function') throw new Error('story_lesson_provider_fetch_unavailable');
      const endpoint = provider === 'gemini'
        ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(request.model)}:generateContent?key=${encodeURIComponent(apiKey)}`
        : 'https://api.openai.com/v1/responses';
      const headers = provider === 'gemini'
        ? { 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` };
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(request.body)
      });
      if (!response || response.ok === false) throw new Error(`story_lesson_provider_failed:${provider}`);
      const text = typeof response.text === 'function' ? await response.text() : JSON.stringify(await response.json());
      return parseStrictDraftJson(extractProviderText(provider, text));
    }
  };
}

function parseStrictDraftJson(text) {
  const parsed = JSON.parse(String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim());
  validateDraft(parsed);
  return parsed;
}

function validateDraft(draft) {
  if (!draft || typeof draft !== 'object') throw new Error('story_lesson_draft_invalid_json');
  if (safeString(draft.reviewStatus) !== 'draft') throw new Error('story_lesson_draft_review_status_required');
  if (!safeString(draft.gradeBand)) throw new Error('story_lesson_draft_grade_band_required');
  ['characterRoles', 'storyBeats', 'examples', 'guidedChecks'].forEach(field => {
    if (!Array.isArray(draft[field]) || draft[field].length === 0) throw new Error(`story_lesson_draft_missing_${field}`);
  });
  const tags = draft.tags && typeof draft.tags === 'object' ? draft.tags : {};
  const missing = REQUIRED_TAG_FIELDS.filter(field => !Array.isArray(tags[field]) || tags[field].map(safeString).filter(Boolean).length === 0);
  if (missing.length) throw new Error(`story_lesson_draft_missing_tags:${missing.join(',')}`);
  const exampleTypes = new Set(tags.exampleTypes.map(safeString));
  ['direct', 'near_miss', 'transfer'].forEach(type => {
    if (!exampleTypes.has(type)) throw new Error(`story_lesson_draft_missing_example_type:${type}`);
  });
}

function buildAuthoringRecord(options = {}) {
  const context = options.context || {};
  const draft = parseStrictDraftJson(JSON.stringify(options.draft || {}));
  const provider = normalizeProvider(options.provider);
  const modelFamily = safeString(options.modelFamily || options.model);
  const promptRecordId = safeString(options.promptRecordId);
  const draftRecordId = safeString(options.draftRecordId);
  if (!modelFamily || !promptRecordId || !draftRecordId) throw new Error('story_lesson_authoring_record_missing_evidence');
  return {
    id: draftRecordId,
    lessonSetId: safeString(context.setId),
    gradeBand: safeString(draft.gradeBand),
    provider,
    modelFamily,
    promptRecordId,
    draftRecordId,
    sourceContextHash: hashJson(sanitizeForPrompt(context)),
    generatedDraftHash: hashJson(draft),
    qaStatus: safeString(options.qaStatus || 'pending_review'),
    reviewerId: safeString(options.reviewerId),
    reviewedAt: safeString(options.reviewedAt),
    reviewStatus: safeString(draft.reviewStatus),
    tags: sanitizeTags(draft.tags)
  };
}

function runDryRun(options = {}) {
  const outputDir = options.outputDir || DEFAULT_OUTPUT_DIR;
  const recordsPath = options.recordsPath || DEFAULT_RECORDS_PATH;
  const context = options.context || buildApprovedLessonContext(options);
  const draft = parseStrictDraftJson(JSON.stringify(options.draft || {}));
  const record = buildAuthoringRecord({
    context,
    draft,
    provider: options.provider,
    modelFamily: options.modelFamily || options.model,
    promptRecordId: options.promptRecordId,
    draftRecordId: options.draftRecordId,
    qaStatus: options.qaStatus,
    reviewerId: options.reviewerId,
    reviewedAt: options.reviewedAt
  });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.dirname(recordsPath), { recursive: true });
  const draftPath = path.join(outputDir, `${context.setId}-grade-${draft.gradeBand}.draft.json`);
  fs.writeFileSync(draftPath, `${JSON.stringify({
    setId: context.setId,
    domain: context.domain,
    title: context.title,
    draft
  }, null, 2)}\n`);
  const existing = fs.existsSync(recordsPath) ? readRecords(recordsPath) : [];
  const records = [record].concat(existing.filter(item => item && item.id !== record.id));
  fs.writeFileSync(recordsPath, `${JSON.stringify({ schemaVersion: 1, records }, null, 2)}\n`);
  return { draftPath, recordsPath, record };
}

function readRecords(recordsPath) {
  const parsed = readJson(recordsPath);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.records)) return parsed.records;
  return [];
}

async function runCli(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const context = buildApprovedLessonContext({ setId: args.setId, grade: args.grade, root: repoRoot });
  const provider = args.provider || 'gemini';
  const model = args.model || defaultModel(provider);
  const adapter = createProviderAdapter({ provider });
  if (!adapter.configured && !args.mockDraft) throw new Error(`missing_${adapter.missingEnv}`);
  const draft = args.mockDraft ? readJson(args.mockDraft) : await adapter.generateDraft(buildProviderRequest({ provider, model, context }));
  const result = runDryRun({
    context,
    draft,
    provider,
    modelFamily: model,
    promptRecordId: args.promptRecordId || `story-prompt-${context.setId}-g${context.targetGrade}`,
    draftRecordId: args.draftRecordId || `story-draft-${context.setId}-g${context.targetGrade}`,
    outputDir: args.outputDir || DEFAULT_OUTPUT_DIR,
    recordsPath: args.recordsPath || DEFAULT_RECORDS_PATH
  });
  console.log(`Story lesson draft dry run wrote ${path.relative(repoRoot, result.draftPath)}`);
}

function parseArgs(argv) {
  const args = {};
  argv.forEach(arg => {
    if (arg.startsWith('--set=')) args.setId = arg.split('=')[1];
    else if (arg.startsWith('--grade=')) args.grade = Number(arg.split('=')[1]);
    else if (arg.startsWith('--provider=')) args.provider = arg.split('=')[1];
    else if (arg.startsWith('--model=')) args.model = arg.split('=')[1];
    else if (arg.startsWith('--mock-draft=')) args.mockDraft = arg.split('=')[1];
    else if (arg.startsWith('--output-dir=')) args.outputDir = arg.split('=')[1];
    else if (arg.startsWith('--records-path=')) args.recordsPath = arg.split('=')[1];
    else if (arg.startsWith('--prompt-record-id=')) args.promptRecordId = arg.split('=')[1];
    else if (arg.startsWith('--draft-record-id=')) args.draftRecordId = arg.split('=')[1];
  });
  if (!args.setId) throw new Error('Usage: node scripts/ai-generate-story-lessons.js --set=<setId> --grade=<2-6> [--provider=gemini|openai] [--mock-draft=file]');
  return args;
}

function extractProviderText(provider, text) {
  const value = String(text || '');
  try {
    const parsed = JSON.parse(value);
    if (provider === 'gemini') return parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts && parsed.candidates[0].content.parts[0].text || value;
    return parsed.output_text || parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content || value;
  } catch (error) {
    return value;
  }
}

function sanitizeForPrompt(context) {
  return {
    setId: safeString(context.setId),
    domain: safeString(context.domain),
    title: safeString(context.title),
    targetGrade: Number(context.targetGrade) || 4,
    gradeBand: safeString(context.gradeBand),
    skillIds: stringArray(context.skillIds),
    standardIds: stringArray(context.standardIds),
    conceptIds: stringArray(context.conceptIds),
    requiredPedagogyMoves: stringArray(context.requiredPedagogyMoves),
    commonMistakeIds: stringArray(context.commonMistakeIds),
    exampleTypes: stringArray(context.exampleTypes),
    characterRoleHints: Array.isArray(context.characterRoleHints) ? context.characterRoleHints : [],
    relatedSubtopicIds: stringArray(context.relatedSubtopicIds),
    schema: context.schema || STRICT_DRAFT_SCHEMA
  };
}

function sanitizeTags(tags = {}) {
  return REQUIRED_TAG_FIELDS.reduce((result, field) => {
    result[field] = stringArray(tags[field]);
    return result;
  }, {});
}

function normalizeProvider(value) {
  const provider = safeString(value || 'gemini').toLowerCase();
  if (provider === 'gemini' || provider === 'openai') return provider;
  throw new Error(`story_lesson_provider_unsupported:${provider}`);
}

function defaultModel(provider) {
  return normalizeProvider(provider) === 'openai' ? 'gpt-5.2' : 'gemini-3.1-flash-lite-preview';
}

function hashJson(value) {
  return `sha256:${crypto.createHash('sha256').update(stableStringify(value)).digest('hex')}`;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stringArray(values) {
  return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
}

function safeString(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

if (require.main === module) {
  runCli().catch(error => {
    console.error(error.message || String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_OUTPUT_DIR,
  DEFAULT_RECORDS_PATH,
  REQUIRED_TAG_FIELDS,
  STRICT_DRAFT_SCHEMA,
  buildApprovedLessonContext,
  buildAuthoringRecord,
  buildProviderRequest,
  buildStoryLessonDraftPrompt,
  createProviderAdapter,
  parseStrictDraftJson,
  runDryRun
};
