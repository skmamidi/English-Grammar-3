const selectionCore = require('../assets/quiz-selection-core');
const selectionIntegrity = require('../assets/question-selection-integrity');

const DEFAULT_SELECTION_POLICY_VERSION = 1;
const DEFAULT_MAX_SELECTED_QUESTIONS = 60;
const DEFAULT_EXPIRES_MS = 5 * 60 * 1000;

function validateSelectionRequest(input, manifest, options = {}) {
  const normalized = selectionCore.normalizeSelectionRequest(input || {}, {
    maxCount: options.maxCount || DEFAULT_MAX_SELECTED_QUESTIONS,
    defaultQuestionsPerSubtopic: options.defaultQuestionsPerSubtopic || 4
  });
  const policyVersion = Number(options.selectionPolicyVersion) || DEFAULT_SELECTION_POLICY_VERSION;
  normalized.selectionPolicyVersion = policyVersion;

  if (normalized.mode !== 'mixed' && normalized.mode !== 'subtopic') {
    throw new Error('selection request mode must be mixed or subtopic');
  }
  if (!normalized.domain) throw new Error('selection request domain is required');
  if (!domainExists(normalized.domain, manifest)) {
    throw new Error(`unsupported selection domain "${normalized.domain}"`);
  }
  if (!normalized.setIds.length) throw new Error('selection request setIds are required');
  if (normalized.mode === 'subtopic' && normalized.setIds.length !== 1) {
    throw new Error('subtopic selection requires exactly one setId');
  }

  normalized.setIds.forEach(setId => {
    const entry = getManifestSet(manifest, setId);
    if (!entry) throw new Error(`unknown selection setId "${setId}"`);
    if (entry.domain !== normalized.domain) {
      throw new Error(`selection setId "${setId}" does not belong to domain "${normalized.domain}"`);
    }
    if (!entry.chunkFile) throw new Error(`selection setId "${setId}" is not chunk-backed`);
  });

  return normalized;
}

async function selectQuestionRefs(request, context) {
  const ctx = normalizeContext(context);
  const normalized = validateSelectionRequest(request, ctx.manifest, {
    selectionPolicyVersion: ctx.selectionPolicyVersion
  });
  const sets = await Promise.all(normalized.setIds.map(async setId => {
    const loaded = await ctx.loadSetById(setId);
    return Object.assign({}, loaded, { id: setId });
  }));
  const selectedQuestions = normalized.mode === 'subtopic'
    ? selectionCore.selectQuestionsForLevel(sets[0] && sets[0].questions || [], normalized.grade, normalized.difficulty, {
      targetQuestionCount: normalized.count,
      shuffle: ctx.shuffle
    })
    : selectionCore.selectMixedQuestions({
      mixedQuizConfig: {
        questionsPerSubtopic: normalized.questionsPerSubtopic,
        subtopics: sets.map(set => ({
          id: set.id,
          questions: Array.isArray(set.questions) ? set.questions : []
        }))
      },
      selectedMixedSubtopicIds: normalized.setIds,
      selectedMixedQuestionLimit: normalized.countMode === 'max' ? 'max' : String(normalized.questionsPerSubtopic),
      selectedGrade: normalized.grade,
      selectedDifficulty: normalized.difficulty
    }, {
      shuffle: ctx.shuffle
    }).slice(0, normalized.count);

  return {
    request: normalized,
    questionRefs: selectedQuestions.map((question, index) => selectionCore.getQuestionRef(question, index + 1))
  };
}

async function buildSelectionResponse(selection, request, context) {
  const ctx = normalizeContext(context);
  const normalized = validateSelectionRequest(request, ctx.manifest, {
    selectionPolicyVersion: ctx.selectionPolicyVersion
  });
  const refs = Array.isArray(selection && selection.questionRefs) ? selection.questionRefs : [];
  refs.forEach(ref => validateRef(ref, normalized, ctx.manifest));

  const response = {
    selectionId: buildSelectionId(refs, normalized, ctx),
    selectionPolicyVersion: normalized.selectionPolicyVersion,
    questionRefs: refs,
    questionSnapshots: [],
    requestHash: '',
    responseDigest: '',
    signature: null,
    signatureVersion: ctx.signing ? ctx.signing.signatureVersion : 'none',
    expiresAt: new Date(ctx.now().getTime() + DEFAULT_EXPIRES_MS).toISOString()
  };
  if (ctx.signing) response.kid = ctx.signing.kid;
  response.requestHash = await selectionIntegrity.buildSelectionRequestHash(normalized, ctx.manifest.artifact || {});
  response.responseDigest = await selectionIntegrity.buildSelectionResponseDigest(response, ctx.manifest.artifact || {});
  if (ctx.signing) {
    const payload = selectionIntegrity.buildSelectionSignaturePayload(response, ctx.manifest.artifact || {});
    response.signature = await ctx.signing.sign(payload, {
      request: normalized,
      response,
      manifestArtifact: ctx.manifest.artifact || {}
    });
    if (!response.signature || typeof response.signature !== 'string') {
      throw new Error('selection signer returned an invalid signature');
    }
  }
  return response;
}

function validateRef(ref, request, manifest) {
  if (!ref || typeof ref !== 'object') throw new Error('selection response included invalid question ref');
  if (!request.setIds.includes(ref.sourceSet)) {
    throw new Error(`selection response included unauthorized sourceSet "${ref.sourceSet}"`);
  }
  const set = getManifestSet(manifest, ref.sourceSet);
  const question = set && Array.isArray(set.questions)
    ? set.questions.find(item => item.id === ref.id)
    : null;
  if (!question) throw new Error(`selection response included unknown question "${ref.id}"`);
  if (Number(ref.version) !== Number(question.version)) {
    throw new Error(`selection response included stale version for "${ref.id}"`);
  }
  if (String(ref.contentHash) !== String(question.contentHash)) {
    throw new Error(`selection response included stale contentHash for "${ref.id}"`);
  }
  if (Number(ref.sequence) !== Number(question.sequence)) {
    throw new Error(`selection response included stale sequence for "${ref.id}"`);
  }
}

function normalizeContext(context) {
  const ctx = context || {};
  if (!ctx.manifest || !Array.isArray(ctx.manifest.sets)) {
    throw new Error('selection service requires a manifest');
  }
  if (typeof ctx.loadSetById !== 'function') {
    throw new Error('selection service requires loadSetById');
  }
  return {
    manifest: ctx.manifest,
    loadSetById: ctx.loadSetById,
    now: typeof ctx.now === 'function' ? ctx.now : () => new Date(),
    selectionPolicyVersion: Number(ctx.selectionPolicyVersion) || DEFAULT_SELECTION_POLICY_VERSION,
    shuffle: typeof ctx.shuffle === 'function' ? ctx.shuffle : undefined,
    signing: normalizeSigning(ctx.signing)
  };
}

function normalizeSigning(signing) {
  if (!signing) return null;
  if (typeof signing.sign !== 'function') throw new Error('selection signing requires a sign function');
  if (!signing.kid) throw new Error('selection signing requires a key id');
  return {
    kid: String(signing.kid),
    signatureVersion: signing.signatureVersion || 'selection-signature-v1',
    sign: signing.sign
  };
}

function domainExists(domain, manifest) {
  return !!(manifest && Array.isArray(manifest.sets) && manifest.sets.some(set => set.domain === domain));
}

function getManifestSet(manifest, setId) {
  const sets = manifest && Array.isArray(manifest.sets) ? manifest.sets : [];
  return sets.find(set => set && set.id === setId) || null;
}

function buildSelectionId(refs, request, context) {
  const source = selectionIntegrity.stableStringify({
    domain: request.domain,
    setIds: request.setIds,
    refs: refs.map(ref => ref.id),
    sourceHash: context.manifest.artifact && context.manifest.artifact.sourceHash || '',
    now: context.now().toISOString()
  });
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  return `sel_${Math.abs(hash).toString(36)}`;
}

module.exports = {
  buildSelectionResponse,
  selectQuestionRefs,
  validateSelectionRequest
};
