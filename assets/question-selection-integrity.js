(function (root, factory) {
  'use strict';

  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GrammarQuestSelectionIntegrity = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  function buildSelectionRequestHash(request, manifestArtifact) {
    return sha256Hex(stableStringify({
      request: normalizeRequestForHash(request),
      manifestSourceHash: getManifestSourceHash(manifestArtifact)
    }));
  }

  function buildSelectionResponseDigest(response, manifestArtifact) {
    return sha256Hex(stableStringify({
      requestHash: response && response.requestHash || '',
      selectionId: response && response.selectionId || '',
      selectionPolicyVersion: response && response.selectionPolicyVersion,
      questionRefs: normalizeRefs(response && response.questionRefs),
      manifestSourceHash: getManifestSourceHash(manifestArtifact),
      expiresAt: response && response.expiresAt || null,
      signatureVersion: response && response.signatureVersion || 'none'
    }));
  }

  async function validateSelectionResponseIntegrity(response, request, manifestArtifact, options = {}) {
    const signatureVersion = response && response.signatureVersion || 'none';
    if (signatureVersion !== 'none') {
      if (!options.allowSignedResponses) {
        throw new Error(`integrity_failed: unsupported signature version "${signatureVersion}"`);
      }
      throw new Error(`integrity_failed: signature verifier is not configured for "${signatureVersion}"`);
    }
    if (response && response.expiresAt && Date.parse(response.expiresAt) <= Date.now()) {
      throw new Error('integrity_failed: response expired');
    }
    const expectedRequestHash = await buildSelectionRequestHash(request, manifestArtifact);
    if (!response || response.requestHash !== expectedRequestHash) {
      throw new Error('integrity_failed: request hash mismatch');
    }
    const expectedDigest = await buildSelectionResponseDigest(response, manifestArtifact);
    if (response.responseDigest !== expectedDigest) {
      throw new Error('integrity_failed: response digest mismatch');
    }
    return true;
  }

  function normalizeRequestForHash(request) {
    return {
      mode: request && request.mode || '',
      domain: request && request.domain || '',
      setIds: Array.isArray(request && request.setIds) ? request.setIds : [],
      grade: request && request.grade || '',
      difficulty: request && request.difficulty || '',
      count: Number(request && request.count) || 0,
      countMode: request && request.countMode || 'per-subtopic',
      questionsPerSubtopic: Number(request && request.questionsPerSubtopic) || 0,
      selectionPolicyVersion: Number(request && request.selectionPolicyVersion) || 0
    };
  }

  function normalizeRefs(refs) {
    return (Array.isArray(refs) ? refs : []).map(ref => ({
      id: ref && ref.id || '',
      sourceSet: ref && ref.sourceSet || '',
      version: Number(ref && ref.version) || 0,
      contentHash: ref && ref.contentHash || '',
      sequence: Number(ref && ref.sequence) || 0
    }));
  }

  function getManifestSourceHash(manifestArtifact) {
    return manifestArtifact && manifestArtifact.sourceHash || '';
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
  }

  async function sha256Hex(text) {
    if (typeof require === 'function') {
      try {
        const crypto = require('node:crypto');
        return `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`;
      } catch (error) {
        // Browser path below.
      }
    }
    if (!root.crypto || !root.crypto.subtle || typeof TextEncoder !== 'function') {
      throw new Error('integrity_failed: sha256 is unavailable');
    }
    const digest = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    const bytes = Array.from(new Uint8Array(digest));
    return `sha256:${bytes.map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
  }

  return {
    buildSelectionRequestHash,
    buildSelectionResponseDigest,
    validateSelectionResponseIntegrity,
    stableStringify
  };
});
