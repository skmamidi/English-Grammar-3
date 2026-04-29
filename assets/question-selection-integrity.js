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

  function buildSelectionSignaturePayload(response, manifestArtifact) {
    return stableStringify({
      expiresAt: response && response.expiresAt || null,
      kid: response && response.kid || '',
      manifestSourceHash: getManifestSourceHash(manifestArtifact),
      questionRefs: normalizeRefs(response && response.questionRefs),
      requestHash: response && response.requestHash || '',
      responseDigest: response && response.responseDigest || '',
      selectionId: response && response.selectionId || '',
      selectionPolicyVersion: response && response.selectionPolicyVersion,
      signatureVersion: response && response.signatureVersion || 'none'
    });
  }

  async function validateSelectionResponseIntegrity(response, request, manifestArtifact, options = {}) {
    const signatureVersion = response && response.signatureVersion || 'none';
    const requireSignature = !!options.requireSignature;
    if (requireSignature && signatureVersion === 'none') {
      throw new Error('integrity_failed: signature is required');
    }
    if (signatureVersion !== 'none' && signatureVersion !== 'selection-signature-v1') {
      throw new Error(`integrity_failed: unsupported signature version "${signatureVersion}"`);
    }
    if (requireSignature && !(response && response.signature)) {
      throw new Error('integrity_failed: signature is required');
    }
    if (requireSignature && !(response && response.expiresAt)) {
      throw new Error('integrity_failed: signed response expiry is required');
    }
    const now = typeof options.now === 'function' ? options.now() : new Date();
    if (response && response.expiresAt && Date.parse(response.expiresAt) <= now.getTime()) {
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
    if (signatureVersion !== 'none') {
      await validateSignature(response, manifestArtifact, options);
    }
    return true;
  }

  async function validateSignature(response, manifestArtifact, options) {
    const publicKeys = options && options.publicKeys || {};
    const kid = response && response.kid || '';
    const keyConfig = publicKeys[kid];
    if (!keyConfig) throw new Error(`integrity_failed: unknown signature key "${kid}"`);
    const now = typeof options.now === 'function' ? options.now() : new Date();
    if (keyConfig.notBefore && Date.parse(keyConfig.notBefore) > now.getTime()) {
      throw new Error(`integrity_failed: signature key not active "${kid}"`);
    }
    if (keyConfig.notAfter && Date.parse(keyConfig.notAfter) <= now.getTime()) {
      throw new Error(`integrity_failed: signature key expired "${kid}"`);
    }
    if (keyConfig.algorithm !== 'ECDSA-P256-SHA256') {
      throw new Error(`integrity_failed: unsupported signature algorithm "${keyConfig.algorithm}"`);
    }
    if (!response.signature) throw new Error('integrity_failed: signature is required');
    const payload = buildSelectionSignaturePayload(response, manifestArtifact);
    const verified = await verifyEcdsaP256Sha256(payload, response.signature, keyConfig.publicKey);
    if (!verified) throw new Error('integrity_failed: signature verification failed');
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

  async function verifyEcdsaP256Sha256(payload, signature, publicKey) {
    if (typeof require === 'function') {
      try {
        const crypto = require('node:crypto');
        return crypto.verify('sha256', Buffer.from(payload), {
          key: crypto.createPublicKey({ key: publicKey, format: 'jwk' }),
          dsaEncoding: 'ieee-p1363'
        }, Buffer.from(signature, 'base64'));
      } catch (error) {
        // Browser path below.
      }
    }
    if (!root.crypto || !root.crypto.subtle || typeof TextEncoder !== 'function') {
      throw new Error('integrity_failed: signature verifier is unavailable');
    }
    const key = await root.crypto.subtle.importKey(
      'jwk',
      publicKey,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    return root.crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      base64ToBytes(signature),
      new TextEncoder().encode(payload)
    );
  }

  function base64ToBytes(value) {
    if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64');
    const binary = root.atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  return {
    buildSelectionRequestHash,
    buildSelectionResponseDigest,
    buildSelectionSignaturePayload,
    validateSelectionResponseIntegrity,
    stableStringify
  };
});
