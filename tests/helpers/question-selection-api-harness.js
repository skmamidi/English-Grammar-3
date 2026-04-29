const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const vm = require('node:vm');

const { loadManifest } = require('../../scripts/generate-question-manifest');
const {
  buildSelectionResponse,
  selectQuestionRefs,
  validateSelectionRequest
} = require('../../server/question-selection-service');
const testKeys = require('../fixtures/selection-test-keys.json');

const sharedChunkCache = new Map();

function createQuestionSelectionApiHarness(options = {}) {
  const repoRoot = options.repoRoot || path.resolve(__dirname, '..', '..');
  const manifest = options.manifest || loadManifest();
  const chunkCache = options.chunkCache || sharedChunkCache;
  const context = {
    manifest,
    selectionPolicyVersion: 1,
    shuffle: typeof options.shuffle === 'function' ? options.shuffle : undefined,
    now: typeof options.now === 'function' ? options.now : () => new Date(),
    loadSetById(setId) {
      const entry = manifest.sets.find(set => set.id === setId);
      if (!entry) throw new Error(`missing set ${setId}`);
      const chunkPath = path.join(repoRoot, entry.chunkFile);
      if (!chunkCache.has(chunkPath)) chunkCache.set(chunkPath, loadChunkBank(chunkPath));
      const bank = chunkCache.get(chunkPath);
      return Object.assign({}, bank[setId], { id: setId });
    }
  };

  return {
    async buildResponse(input, responseOptions = {}) {
      const request = validateSelectionRequest(input, manifest, {
        selectionPolicyVersion: context.selectionPolicyVersion
      });
      const selection = await selectQuestionRefs(request, context);
      const response = await buildSelectionResponse(selection, request, Object.assign({}, context, {
        signing: responseOptions.signed ? {
          kid: testKeys.kid,
          signatureVersion: 'selection-signature-v1',
          sign(payload) {
            return crypto.sign('sha256', Buffer.from(payload), {
              key: crypto.createPrivateKey({ key: testKeys.privateKey, format: 'jwk' }),
              dsaEncoding: 'ieee-p1363'
            }).toString('base64');
          }
        } : null
      }));
      if (responseOptions.tamper) response.responseDigest = `sha256:${'0'.repeat(64)}`;
      if (responseOptions.tamperSignature) response.signature = Buffer.from('invalid signature').toString('base64');
      return response;
    }
  };
}

function loadChunkBank(filePath) {
  const sandbox = { window: { QUESTION_BANK: {} } };
  sandbox.globalThis = sandbox.window;
  vm.runInNewContext(fs.readFileSync(filePath, 'utf8'), sandbox, { filename: filePath });
  return sandbox.window.QUESTION_BANK;
}

module.exports = {
  createQuestionSelectionApiHarness
};
