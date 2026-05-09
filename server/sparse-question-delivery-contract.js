const IDENTITY_FIELDS = Object.freeze(['questionId', 'sourceSet', 'version', 'contentHash', 'sequence']);
const PUBLIC_FIELDS = new Set(IDENTITY_FIELDS.concat([
  'question',
  'choices',
  'skillIds',
  'standardIds',
  'gradeLevels',
  'difficulty'
]));
const ANSWER_FIELDS = new Set(['correct', 'answerKey']);
const PRIVATE_FIELDS = new Set(['correct', 'answerKey', 'explanation']);
const MAX_SPARSE_QUESTIONS = 60;

function normalizeSparseQuestionDeliveryRequest(input = {}) {
  return {
    schemaVersion: 1,
    mode: input.mode === 'offline_practice' ? 'offline_practice' : 'server_adjudicated',
    questionRefs: (Array.isArray(input.questionRefs) ? input.questionRefs : []).slice(0, MAX_SPARSE_QUESTIONS).map(normalizeQuestionRef),
    requestedFields: normalizeFieldList(input.requestedFields || IDENTITY_FIELDS),
    offlinePolicy: normalizeOfflinePolicy(input.offlinePolicy)
  };
}

async function buildSparseQuestionDeliveryResponse(repository, requestInput) {
  const request = normalizeSparseQuestionDeliveryRequest(requestInput);
  if (!repository || typeof repository.getQuestionByRef !== 'function') {
    throw new Error('sparse delivery requires a content repository');
  }
  assertAnswerPolicy(request);

  const questions = [];
  for (const ref of request.questionRefs) {
    const record = await repository.getQuestionByRef(ref);
    questions.push(projectQuestion(record, request));
  }

  const response = {
    schemaVersion: 1,
    mode: request.mode,
    questionCount: questions.length,
    requestedFields: request.requestedFields,
    questions,
    requiresScriptExecution: false,
    hydrationGlobal: null,
    policy: {
      answerFieldsIncluded: request.requestedFields.some(field => ANSWER_FIELDS.has(field)),
      offlinePackageId: request.offlinePolicy.packageId || ''
    }
  };
  validateSparseQuestionDeliveryResponse(response, request);
  return response;
}

function validateSparseQuestionDeliveryResponse(response, requestInput) {
  const request = normalizeSparseQuestionDeliveryRequest(requestInput);
  if (response.requiresScriptExecution !== false) throw new Error('sparse response must not require script execution');
  if (response.hydrationGlobal !== null) throw new Error('sparse response must not use window.QUESTION_BANK');
  assertAnswerPolicy(request);
  const allowed = new Set(request.requestedFields);
  (Array.isArray(response.questions) ? response.questions : []).forEach(question => {
    Object.keys(question).forEach(key => {
      if (!allowed.has(key)) throw new Error(`sparse response included unrequested field: ${key}`);
      if (PRIVATE_FIELDS.has(key) && !isOfflineAnswerAllowed(request)) {
        throw new Error('sparse response leaked private answer fields');
      }
    });
  });
  return true;
}

function projectQuestion(record, request) {
  return request.requestedFields.reduce((result, field) => {
    if (IDENTITY_FIELDS.includes(field)) {
      result[field] = record[field];
    } else if (field === 'question') {
      result.question = record.content.question;
    } else if (field === 'choices') {
      result.choices = record.content.choices.slice();
    } else if (field === 'correct') {
      result.correct = record.content.correct;
    } else if (field === 'answerKey') {
      result.answerKey = record.content.correct;
    } else if (field === 'skillIds' || field === 'standardIds' || field === 'gradeLevels') {
      result[field] = record[field].slice();
    } else if (field === 'difficulty') {
      result.difficulty = record.difficulty;
    }
    return result;
  }, {});
}

function assertAnswerPolicy(request) {
  const requestedAnswerField = request.requestedFields.some(field => ANSWER_FIELDS.has(field));
  if (requestedAnswerField && !isOfflineAnswerAllowed(request)) {
    throw new Error('answer fields require offline content package policy');
  }
}

function isOfflineAnswerAllowed(request) {
  return request.mode === 'offline_practice' &&
    request.offlinePolicy.allowAnswerKeys === true &&
    Boolean(request.offlinePolicy.packageId);
}

function normalizeQuestionRef(ref = {}) {
  return {
    id: safeString(ref.id || ref.questionId),
    sourceSet: safeString(ref.sourceSet),
    version: Number(ref.version) || 1,
    contentHash: safeString(ref.contentHash),
    sequence: Number(ref.sequence) || 0
  };
}

function normalizeFieldList(values) {
  return Array.from(new Set((Array.isArray(values) ? values : [])
    .map(safeString)
    .filter(field => PUBLIC_FIELDS.has(field) || ANSWER_FIELDS.has(field))));
}

function normalizeOfflinePolicy(policy = {}) {
  return {
    allowAnswerKeys: policy.allowAnswerKeys === true,
    packageId: safeString(policy.packageId)
  };
}

function safeString(value) {
  return String(value || '').trim();
}

module.exports = {
  buildSparseQuestionDeliveryResponse,
  normalizeSparseQuestionDeliveryRequest,
  validateSparseQuestionDeliveryResponse
};
