const {
  createProviderAdapterConfig
} = require('../provider-adapter-contract');

function createFirestoreHealthMetadataAdapter(options = {}) {
  const config = options.config || createProviderAdapterConfig(options.env || {});
  const client = options.client || null;

  return {
    id: 'firestore-health-metadata',
    provider: 'firestore',
    kind: 'health_metadata',
    async readHealthMetadata() {
      if (!config.enabled) {
        return {
          provider: 'firestore',
          status: 'disabled',
          reason: 'provider_pilot_disabled',
          schemaVersion: 0,
          capabilities: [],
          diagnostics: { source: 'provider_adapter_pilot' }
        };
      }

      if (!client || typeof client.doc !== 'function') {
        const error = new Error('provider client unavailable');
        error.code = 'unavailable';
        throw error;
      }

      const snapshot = await client.doc(config.healthDocumentPath || 'health/metadata').get();
      if (!snapshot || snapshot.exists === false || typeof snapshot.data !== 'function') {
        const error = new Error('provider metadata missing');
        error.code = 'unavailable';
        throw error;
      }

      const record = snapshot.data();
      return Object.assign({ provider: 'firestore' }, record);
    }
  };
}

module.exports = {
  createFirestoreHealthMetadataAdapter
};
