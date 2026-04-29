(function () {
  'use strict';

  const loadedPaths = {};
  const setCache = {};

  window.GrammarQuestQuestionLoader = {
    loadSet,
    loadSets,
    getManifestEntry,
    hydrateQuestionRefs
  };

  async function loadSet(setId) {
    if (!setId) throw new Error('Question loader: set id is required.');
    const existing = getGlobalSet(setId);
    if (existing) {
      setCache[setId] = normalizeQuestionSet(setId, existing);
      return setCache[setId];
    }
    if (setCache[setId]) return setCache[setId];

    const entry = getManifestEntry(setId);
    if (!entry) throw new Error(`Question loader: no manifest entry for "${setId}".`);

    const sourcePath = entry.chunkFile || entry.bankFile;
    if (!sourcePath) throw new Error(`Question loader: no source path for "${setId}".`);

    await loadQuestionScript(sourcePath);
    const loaded = getGlobalSet(setId);
    if (!loaded || !Array.isArray(loaded.questions) || loaded.questions.length === 0) {
      throw new Error(`Question loader: "${setId}" did not load a usable question set.`);
    }

    setCache[setId] = normalizeQuestionSet(setId, loaded);
    notifyQuestionSetLoaded(setId, loaded);
    return setCache[setId];
  }

  async function loadSets(setIds) {
    const ids = Array.isArray(setIds) ? setIds : [];
    return Promise.all(ids.map(loadSet));
  }

  function getManifestEntry(setId) {
    const manifest = window.QUESTION_MANIFEST;
    const sets = manifest && Array.isArray(manifest.sets) ? manifest.sets : [];
    return sets.find(set => set && set.id === setId) || null;
  }

  async function hydrateQuestionRefs(questionRefs) {
    const refs = Array.isArray(questionRefs) ? questionRefs : [];
    const sourceSets = Array.from(new Set(refs
      .map(ref => ref && ref.sourceSet)
      .filter(Boolean)));
    const sets = await loadSets(sourceSets);
    const questionsById = {};

    sets.forEach(set => {
      (set.questions || []).forEach(question => {
        if (question && question.id) questionsById[question.id] = question;
      });
    });

    return refs.map(ref => {
      if (!ref || !ref.id) return null;
      return questionsById[ref.id] || null;
    });
  }

  function getGlobalSet(setId) {
    return window.QUESTION_BANK && window.QUESTION_BANK[setId];
  }

  function normalizeQuestionSet(setId, set) {
    if (set && !set.id) set.id = setId;
    return set;
  }

  function loadQuestionScript(sourcePath) {
    const resolvedPath = resolveAssetPath(sourcePath);
    if (loadedPaths[resolvedPath]) return loadedPaths[resolvedPath];

    loadedPaths[resolvedPath] = new Promise((resolve, reject) => {
      if (!document || !document.createElement) {
        reject(new Error(`Question loader: cannot load "${sourcePath}" without a document.`));
        return;
      }

      const script = document.createElement('script');
      script.src = resolvedPath;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        delete loadedPaths[resolvedPath];
        reject(new Error(`Question loader: failed to load "${sourcePath}".`));
      };
      const target = document.head || document.documentElement || document.body;
      target.appendChild(script);
    });

    return loadedPaths[resolvedPath];
  }

  function resolveAssetPath(sourcePath) {
    if (/^(https?:)?\/\//.test(sourcePath) || sourcePath.startsWith('/')) return sourcePath;
    const root = getAppRoot();
    return `${root}${sourcePath}`;
  }

  function getAppRoot() {
    const script = document && (document.currentScript || findLoaderScript());
    const src = script && script.src || '';
    const marker = '/assets/question-loader.js';
    const markerIndex = src.indexOf(marker);
    if (markerIndex >= 0) return `${src.slice(0, markerIndex + 1)}`;
    return '';
  }

  function findLoaderScript() {
    const scripts = document && document.getElementsByTagName
      ? document.getElementsByTagName('script')
      : [];
    for (let index = scripts.length - 1; index >= 0; index -= 1) {
      if (scripts[index].src && scripts[index].src.indexOf('/assets/question-loader.js') >= 0) {
        return scripts[index];
      }
    }
    return null;
  }

  function notifyQuestionSetLoaded(setId, set) {
    if (!window.dispatchEvent || typeof CustomEvent !== 'function') return;
    window.dispatchEvent(new CustomEvent('grammarquest:questions-loaded', {
      detail: { setId, set }
    }));
  }
})();
