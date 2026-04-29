function createFakeIndexedDB(options = {}) {
  const databases = new Map();
  const failOpen = options.failOpen || false;
  const failWrite = options.failWrite || false;

  return {
    open(name, version) {
      const request = createRequest();
      queueMicrotask(() => {
        if (failOpen) {
          request.error = new Error('indexeddb open failed');
          if (typeof request.onerror === 'function') request.onerror({ target: request });
          return;
        }

        let record = databases.get(name);
        const needsUpgrade = !record || (version && version > record.version);
        if (!record) {
          record = { version: version || 1, stores: new Map() };
          databases.set(name, record);
        } else if (version && version > record.version) {
          record.version = version;
        }

        const db = createDatabase(record, failWrite);
        request.result = db;
        if (needsUpgrade && typeof request.onupgradeneeded === 'function') {
          request.onupgradeneeded({ target: request });
        }
        if (typeof request.onsuccess === 'function') request.onsuccess({ target: request });
      });
      return request;
    },
    _databases: databases
  };
}

function createDatabase(record, failWrite) {
  return {
    objectStoreNames: {
      contains(name) {
        return record.stores.has(name);
      }
    },
    createObjectStore(name) {
      if (!record.stores.has(name)) record.stores.set(name, new Map());
      return createObjectStore(record.stores.get(name), failWrite);
    },
    transaction(storeName) {
      if (!record.stores.has(storeName)) record.stores.set(storeName, new Map());
      return {
        objectStore() {
          return createObjectStore(record.stores.get(storeName), failWrite);
        }
      };
    },
    close() {}
  };
}

function createObjectStore(store, failWrite) {
  return {
    get(key) {
      const request = createRequest();
      queueMicrotask(() => {
        request.result = store.has(key) ? store.get(key) : undefined;
        if (typeof request.onsuccess === 'function') request.onsuccess({ target: request });
      });
      return request;
    },
    put(value, key) {
      const request = createRequest();
      queueMicrotask(() => {
        if (failWrite) {
          request.error = new Error('indexeddb write failed');
          if (typeof request.onerror === 'function') request.onerror({ target: request });
          return;
        }
        store.set(key, value);
        request.result = key;
        if (typeof request.onsuccess === 'function') request.onsuccess({ target: request });
      });
      return request;
    },
    delete(key) {
      const request = createRequest();
      queueMicrotask(() => {
        store.delete(key);
        request.result = undefined;
        if (typeof request.onsuccess === 'function') request.onsuccess({ target: request });
      });
      return request;
    }
  };
}

function createRequest() {
  return {
    error: null,
    result: undefined,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null
  };
}

module.exports = { createFakeIndexedDB };
