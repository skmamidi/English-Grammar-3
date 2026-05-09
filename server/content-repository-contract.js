const { flattenQuestionBanks } = require('../scripts/qa/bank-loader');

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 60;

function buildContentRepositoryRecordsFromBankLoad(bankLoad, options = {}) {
  const manifest = options.manifest || {};
  const manifestSets = new Map((Array.isArray(manifest.sets) ? manifest.sets : []).map(set => [set.id, set]));

  return flattenQuestionBanks(bankLoad).flatMap(record => {
    const set = record.set || {};
    const questions = Array.isArray(set.questions) ? set.questions : [];
    const manifestSet = manifestSets.get(record.setId) || {};
    const manifestQuestions = new Map((Array.isArray(manifestSet.questions) ? manifestSet.questions : []).map(question => [question.id, question]));

    return questions.map((question, index) => normalizeQuestionRecord({
      domain: record.domain,
      sourceFile: record.relativeFile,
      sourceType: record.sourceType,
      setId: record.setId,
      set,
      question,
      manifestQuestion: manifestQuestions.get(question && question.id),
      fallbackSequence: index + 1
    }));
  });
}

function normalizeQuestionRecord(input) {
  const question = input.question || {};
  const metadata = question.metadata || {};
  const manifestQuestion = input.manifestQuestion || {};
  const sequence = Number(metadata.sequence || manifestQuestion.sequence || input.fallbackSequence || 0);
  const gradeLevels = normalizeNumberArray(manifestQuestion.gradeLevels || metadata.gradeLevels);
  const difficultyByGrade = Object.assign({}, metadata.difficultyByGrade || {}, manifestQuestion.difficultyByGrade || {});

  return {
    schemaVersion: 1,
    questionId: String(question.id || ''),
    sourceSet: String(metadata.sourceSet || input.setId || ''),
    domain: String(input.domain || ''),
    version: Number(question.version || manifestQuestion.version || 1),
    contentHash: String(question.contentHash || manifestQuestion.contentHash || ''),
    sequence,
    skillIds: normalizeStringArray(manifestQuestion.skillIds),
    standardIds: normalizeStringArray(manifestQuestion.standardIds || metadata.standardIds),
    skills: normalizeStringArray(metadata.skills || manifestQuestion.skills),
    gradeLevels,
    difficultyByGrade,
    difficulty: String(metadata.primaryDifficulty || difficultyByGrade[String(gradeLevels[0] || '')] || ''),
    publicationState: 'published',
    set: {
      id: String(input.setId || ''),
      title: String(input.set && input.set.title || ''),
      topic: String(input.set && input.set.topic || '')
    },
    content: {
      question: String(question.question || ''),
      choices: Array.isArray(question.choices) ? question.choices.slice() : [],
      correct: Number.isInteger(Number(question.correct)) ? Number(question.correct) : null,
      explanation: question.explanation || null,
      studyAid: question.studyAid || null
    },
    provenance: {
      sourceFile: String(input.sourceFile || ''),
      sourceType: String(input.sourceType || ''),
      publication: 'canonical_json'
    }
  };
}

function createFakeContentRepositoryAdapter(records = []) {
  const normalized = (Array.isArray(records) ? records : []).map(record => Object.assign({}, record));
  return {
    async getQuestionSet(setId) {
      const setRecords = normalized.filter(record => record.sourceSet === setId);
      if (!setRecords.length) return null;
      const first = setRecords[0];
      return {
        schemaVersion: 1,
        id: first.sourceSet,
        title: first.set.title,
        topic: first.set.topic,
        domain: first.domain,
        publicationState: 'published',
        questionCount: setRecords.length,
        provenance: first.provenance
      };
    },
    async getQuestionById(questionId) {
      return normalized.find(record => record.questionId === questionId) || null;
    },
    async queryQuestions(query = {}) {
      return applyQuery(normalized, query);
    }
  };
}

function createContentRepository(adapter) {
  if (!adapter || typeof adapter.getQuestionSet !== 'function' || typeof adapter.getQuestionById !== 'function' || typeof adapter.queryQuestions !== 'function') {
    throw new Error('content repository adapter must implement getQuestionSet, getQuestionById, and queryQuestions');
  }
  return {
    async getQuestionSet(setId) {
      return adapter.getQuestionSet(String(setId || ''));
    },
    async getQuestionByRef(ref) {
      const input = ref || {};
      const record = await adapter.getQuestionById(String(input.id || input.questionId || ''));
      if (!record) throw new Error(`question ref not found: ${input.id || input.questionId}`);
      if (input.sourceSet && record.sourceSet !== input.sourceSet) throw new Error('question ref sourceSet mismatch');
      if (input.version && Number(record.version) !== Number(input.version)) throw new Error('question ref version mismatch');
      if (input.contentHash && String(record.contentHash) !== String(input.contentHash)) throw new Error('question ref contentHash mismatch');
      if (input.sequence && Number(record.sequence) !== Number(input.sequence)) throw new Error('question ref sequence mismatch');
      return record;
    },
    async queryQuestions(query = {}) {
      const normalized = normalizeSelectionQuery(query);
      const questions = await adapter.queryQuestions(normalized);
      return {
        schemaVersion: 1,
        questions,
        diagnostics: {
          appliedFilters: appliedFilters(normalized),
          sourceOfTruth: 'canonical_json',
          storageNeutral: true
        }
      };
    }
  };
}

function normalizeSelectionQuery(query = {}) {
  return {
    sourceSet: safeString(query.sourceSet),
    domain: safeString(query.domain),
    grade: normalizeCount(query.grade),
    difficulty: safeString(query.difficulty),
    skillIds: normalizeStringArray(query.skillIds),
    standardIds: normalizeStringArray(query.standardIds),
    mastery: {
      weakSkillIds: normalizeStringArray(query.mastery && query.mastery.weakSkillIds),
      avoidQuestionIds: normalizeStringArray(query.mastery && query.mastery.avoidQuestionIds)
    },
    limit: Math.min(MAX_LIMIT, Math.max(1, normalizeCount(query.limit) || DEFAULT_LIMIT))
  };
}

function applyQuery(records, query = {}) {
  return records
    .filter(record => !query.sourceSet || record.sourceSet === query.sourceSet)
    .filter(record => !query.domain || record.domain === query.domain)
    .filter(record => !query.grade || record.gradeLevels.includes(query.grade))
    .filter(record => !query.difficulty || difficultyForGrade(record, query.grade) === query.difficulty || record.difficulty === query.difficulty)
    .filter(record => !query.skillIds.length || intersects(record.skillIds, query.skillIds))
    .filter(record => !query.standardIds.length || intersects(record.standardIds, query.standardIds))
    .filter(record => !query.mastery.weakSkillIds.length || intersects(record.skillIds, query.mastery.weakSkillIds))
    .filter(record => !query.mastery.avoidQuestionIds.includes(record.questionId))
    .sort((a, b) => a.sourceSet.localeCompare(b.sourceSet) || a.sequence - b.sequence || a.questionId.localeCompare(b.questionId))
    .slice(0, query.limit);
}

function evaluateContentRepositoryMigrationPolicy(input = {}) {
  const blockers = [];
  if (input.canonicalJsonFresh !== true) blockers.push('canonical_json_not_fresh');
  if (input.generatedChunksFresh !== true) blockers.push('generated_chunks_not_fresh');
  if (input.repositoryParityVerified !== true) blockers.push('repository_parity_missing');
  if (safeString(input.providerAdapterSelected)) blockers.push('provider_specific_shortcut');
  return {
    readyForPilot: blockers.length === 0,
    sourceOfTruth: 'canonical_json',
    generatedChunksRemainDefault: true,
    blockers
  };
}

function appliedFilters(query) {
  const filters = [];
  if (query.sourceSet) filters.push('sourceSet');
  if (query.domain) filters.push('domain');
  if (query.grade) filters.push('grade');
  if (query.difficulty) filters.push('difficulty');
  if (query.skillIds.length) filters.push('skillIds');
  if (query.standardIds.length) filters.push('standardIds');
  if (query.mastery.weakSkillIds.length) filters.push('mastery.weakSkillIds');
  if (query.mastery.avoidQuestionIds.length) filters.push('mastery.avoidQuestionIds');
  return filters;
}

function difficultyForGrade(record, grade) {
  return grade ? String(record.difficultyByGrade[String(grade)] || '') : '';
}

function intersects(left, right) {
  const rightSet = new Set(right);
  return left.some(value => rightSet.has(value));
}

function normalizeNumberArray(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite))).sort((a, b) => a - b);
}

function normalizeStringArray(values) {
  return Array.from(new Set((Array.isArray(values) ? values : []).map(safeString).filter(Boolean))).sort();
}

function normalizeCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.floor(number);
}

function safeString(value) {
  return String(value || '').trim();
}

module.exports = {
  buildContentRepositoryRecordsFromBankLoad,
  createContentRepository,
  createFakeContentRepositoryAdapter,
  evaluateContentRepositoryMigrationPolicy,
  normalizeQuestionRecord,
  normalizeSelectionQuery
};
