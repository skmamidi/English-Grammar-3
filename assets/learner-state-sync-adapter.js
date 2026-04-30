(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestLearnerStateSyncAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const REQUIRED_METHODS = [
    'readLearnerState',
    'writeLearnerState',
    'deleteLearnerState',
    'listLearnerStateMetadata',
    'getRevision'
  ];

  function createLearnerStateSyncAdapterContract(adapter) {
    REQUIRED_METHODS.forEach(method => {
      if (!adapter || typeof adapter[method] !== 'function') {
        throw new Error(`learner_state_sync_adapter_requires_${method}`);
      }
    });
    return REQUIRED_METHODS.reduce((contract, method) => {
      contract[method] = (...args) => adapter[method](...args);
      return contract;
    }, {});
  }

  function createSyncUnavailableError(message) {
    const error = new Error(message || 'learner_state_sync_unavailable');
    error.code = 'sync_unavailable';
    error.retryable = true;
    return error;
  }

  function createSyncConflictError(message, currentRevision) {
    const error = new Error(message || 'learner_state_sync_conflict');
    error.code = 'conflict';
    error.retryable = false;
    error.currentRevision = currentRevision;
    return error;
  }

  return {
    createLearnerStateSyncAdapterContract,
    createSyncConflictError,
    createSyncUnavailableError
  };
});
