(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestOfflineQuestionStore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const PROTECTED_RECORD_TYPES = Object.freeze([
    'learnerProgress',
    'learnerReport',
    'activeQuizState',
    'xpOfflineQueue',
    'learnerState',
    'missionProgress'
  ]);
  const EVICTABLE_RECORD_TYPES = Object.freeze([
    'offlineQuestion',
    'questionMedia',
    'offlineContentPackage',
    'questionCacheIndex'
  ]);
  const UNSAFE_KEY_PATTERN = /learnerId|studentId|studentName|learnerEmail|rawProviderPayload|providerPayload|questionDiagnostics|verifiedReport|serverScore/i;

  function buildOfflineQuestionRecordKey(record = {}) {
    const input = record && typeof record === 'object' ? record : {};
    return [
      safeString(input.questionId),
      safeString(input.sourceSet),
      safeString(input.version),
      safeString(input.contentHash)
    ].join('::');
  }

  function normalizeOfflineQuestionRecord(record = {}) {
    const input = record && typeof record === 'object' ? record : {};
    const offlinePackage = input.offlinePackage && typeof input.offlinePackage === 'object' ? input.offlinePackage : {};
    const answerPolicyAllowed = offlinePackage.allowAnswerKeys === true && Boolean(safeString(offlinePackage.packageId));
    const normalized = {
      schemaVersion: 1,
      questionId: safeString(input.questionId),
      sourceSet: safeString(input.sourceSet),
      version: safeString(input.version),
      contentHash: safeHash(input.contentHash),
      domain: safeString(input.domain),
      skill: safeString(input.skill),
      prompt: safeString(input.prompt),
      choices: normalizeStringArray(input.choices),
      mediaRefs: normalizeMediaRefs(input.mediaRefs, input.questionId),
      offlinePackage: {
        packageId: safeString(offlinePackage.packageId),
        allowAnswerKeys: offlinePackage.allowAnswerKeys === true,
        mode: safeString(offlinePackage.mode || 'local_practice')
      },
      storageTarget: 'indexedDB',
      loadedFromChunkScript: false,
      lastUsedAt: safeIso(input.lastUsedAt)
    };
    normalized.key = buildOfflineQuestionRecordKey(normalized);
    if (answerPolicyAllowed) {
      normalized.answerKey = safeString(input.answerKey);
      normalized.explanation = safeString(input.explanation);
    } else if ((safeString(input.answerKey) || safeString(input.explanation)) && input.offlinePackage && typeof input.offlinePackage === 'object') {
      normalized.answerPolicyViolation = true;
    }
    return stripUnsafeKeys(normalized);
  }

  function validateOfflineQuestionRecord(record = {}) {
    const input = record && typeof record === 'object' ? record : {};
    const errors = [];
    if (input.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    if (!safeString(input.questionId)) errors.push('questionId is required');
    if (!safeString(input.sourceSet)) errors.push('sourceSet is required');
    if (!safeString(input.version)) errors.push('version is required');
    if (!/^sha256:[a-f0-9]{12,}$/i.test(safeString(input.contentHash))) errors.push('contentHash must be a sha256 digest reference');
    if (safeString(input.key) !== buildOfflineQuestionRecordKey(input)) errors.push('offline question key must match immutable identity');
    if (safeString(input.storageTarget) !== 'indexedDB') errors.push('offline question storageTarget must be indexedDB');
    if (input.loadedFromChunkScript !== false) errors.push('offline question must not hydrate from chunk script');
    if (!Array.isArray(input.choices)) errors.push('choices are required');
    if (!Array.isArray(input.mediaRefs)) errors.push('mediaRefs are required');
    if (((safeString(input.answerKey) || safeString(input.explanation)) && !hasAnswerPackagePolicy(input.offlinePackage)) || input.answerPolicyViolation === true) {
      errors.push('answer fields require explicit offline practice package policy');
    }
    if (containsUnsafeKey(input)) errors.push('offline question record contains unsafe learner provider or diagnostics data');
    return { valid: errors.length === 0, errors: Array.from(new Set(errors)) };
  }

  function createIndexedDbOfflineQuestionStore(options = {}) {
    const records = new Map();
    return Object.freeze({
      databaseName: safeString(options.databaseName || 'grammarquest-offline-question-store'),
      async putQuestionRecords(questionRecords = []) {
        const accepted = [];
        for (const item of Array.isArray(questionRecords) ? questionRecords : []) {
          const normalized = normalizeOfflineQuestionRecord(item);
          const validation = validateOfflineQuestionRecord(normalized);
          if (validation.errors.length) {
            const error = new Error(`invalid_offline_question_record:${validation.errors.join(',')}`);
            error.errors = validation.errors;
            throw error;
          }
          records.set(normalized.key, Object.freeze(normalized));
          accepted.push(normalized);
        }
        return accepted;
      },
      async getQuestionRecord(ref = {}) {
        const key = buildOfflineQuestionRecordKey(ref);
        const record = records.get(key);
        return record ? Object.assign({}, record, { lastUsedAt: new Date().toISOString() }) : null;
      },
      async getQuestionRecordsByRefs(refs = []) {
        const found = [];
        for (const ref of Array.isArray(refs) ? refs : []) {
          const record = await this.getQuestionRecord(ref);
          if (record) found.push(record);
        }
        return found;
      },
      async buildQuestionCacheIndex() {
        return {
          schemaVersion: 1,
          storageTarget: 'indexedDB',
          recordCount: records.size,
          keys: Array.from(records.keys()).sort()
        };
      },
      async clear() {
        records.clear();
      }
    });
  }

  function evaluateOfflineQuestionStoreEviction(input = {}) {
    const quotaBytes = Math.max(0, Number(input.quotaBytes) || 0);
    const normalized = (Array.isArray(input.records) ? input.records : []).map(normalizeStorageRecord).filter(Boolean);
    const protectedRecords = normalized.filter(record => PROTECTED_RECORD_TYPES.includes(record.recordType));
    const evictableRecords = normalized
      .filter(record => EVICTABLE_RECORD_TYPES.includes(record.recordType))
      .sort((left, right) => left.lastUsedAt - right.lastUsedAt || left.key.localeCompare(right.key));
    const evictions = [];
    let retained = normalized.slice();
    while (sumBytes(retained) > quotaBytes && evictableRecords.length) {
      const next = evictableRecords.shift();
      evictions.push(next);
      retained = retained.filter(record => record.key !== next.key);
    }
    return {
      retained,
      evictions,
      protectedRecordCount: protectedRecords.length,
      deletedLearnerState: evictions.some(record => PROTECTED_RECORD_TYPES.includes(record.recordType)),
      metrics: {
        evictedQuestionBytes: sumBytes(evictions.filter(record => record.recordType === 'offlineQuestion')),
        evictedMediaBytes: sumBytes(evictions.filter(record => record.recordType === 'questionMedia')),
        retainedLearnerStateBytes: sumBytes(protectedRecords)
      }
    };
  }

  function normalizeStorageRecord(record) {
    if (!record || typeof record !== 'object') return null;
    return {
      key: safeString(record.key),
      recordType: safeString(record.recordType),
      bytes: Math.max(0, Math.round(Number(record.bytes) || 0)),
      lastUsedAt: Number(record.lastUsedAt) || 0
    };
  }

  function normalizeMediaRefs(mediaRefs, questionId) {
    return (Array.isArray(mediaRefs) ? mediaRefs : []).map(ref => ({
      questionId: safeString(ref && ref.questionId || questionId),
      type: safeString(ref && ref.type),
      url: safeString(ref && ref.url),
      bytes: Math.max(0, Math.round(Number(ref && ref.bytes) || 0)),
      contentHash: safeHash(ref && ref.contentHash),
      required: ref && ref.required === true,
      cacheTarget: 'cacheAPI'
    })).filter(ref => ref.url);
  }

  function stripUnsafeKeys(value) {
    if (Array.isArray(value)) return value.map(stripUnsafeKeys);
    if (!value || typeof value !== 'object') return value;
    return Object.keys(value).reduce((safe, key) => {
      if (UNSAFE_KEY_PATTERN.test(key)) return safe;
      safe[key] = stripUnsafeKeys(value[key]);
      return safe;
    }, {});
  }

  function containsUnsafeKey(value) {
    if (!value || typeof value !== 'object') return false;
    return Object.keys(value).some(key => UNSAFE_KEY_PATTERN.test(key) || containsUnsafeKey(value[key]));
  }

  function hasAnswerPackagePolicy(offlinePackage) {
    const input = offlinePackage && typeof offlinePackage === 'object' ? offlinePackage : {};
    return input.allowAnswerKeys === true && Boolean(safeString(input.packageId));
  }

  function normalizeStringArray(values) {
    return (Array.isArray(values) ? values : []).map(safeString).filter(Boolean);
  }

  function safeHash(value) {
    const text = safeString(value);
    return /^sha256:[a-f0-9]{12,}$/i.test(text) ? text : '';
  }

  function safeIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }

  function sumBytes(records) {
    return records.reduce((sum, record) => sum + (Number(record.bytes) || 0), 0);
  }

  function safeString(value) {
    return String(value || '').trim();
  }

  return {
    EVICTABLE_RECORD_TYPES,
    PROTECTED_RECORD_TYPES,
    buildOfflineQuestionRecordKey,
    createIndexedDbOfflineQuestionStore,
    evaluateOfflineQuestionStoreEviction,
    normalizeOfflineQuestionRecord,
    validateOfflineQuestionRecord
  };
});
