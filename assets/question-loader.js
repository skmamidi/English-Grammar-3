(function () {
  'use strict';

  const loadedPaths = {};
  const setCache = {};

  window.GrammarQuestQuestionLoader = {
    loadSet,
    loadSets,
    loadSelectedQuiz,
    getManifestEntry,
    hydrateQuestionRefs
  };

  const SELECTION_POLICY_VERSION = 1;
  const MAX_SELECTED_QUESTIONS = 60;

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

    const sourcePath = entry.chunkFile;
    if (!sourcePath) throw new Error(`Question loader: manifest entry for "${setId}" is missing chunkFile.`);

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

  async function loadSelectedQuiz(request) {
    const normalized = normalizeSelectionRequest(request);
    if (!isServerSelectionEnabled()) {
      return buildFallbackSelection(normalized, 'disabled');
    }

    try {
      const response = await requestServerSelection(normalized);
      const questions = await hydrateSelectionResponse(response, normalized);
      notifySelectionEvent('grammarquest:question-selection-api-used', {
        selectionId: response.selectionId,
        domain: normalized.domain,
        setIds: normalized.setIds,
        questionCount: questions.length
      });
      return buildSelectedSetResult(normalized, questions, {
        source: 'api',
        selectionId: response.selectionId,
        selectionPolicyVersion: response.selectionPolicyVersion
      });
    } catch (error) {
      console.warn('Question loader: server question selection failed; falling back to chunks.', error);
      notifySelectionEvent('grammarquest:question-selection-fallback', {
        domain: normalized.domain,
        setIds: normalized.setIds,
        reason: error && error.message || 'unknown'
      });
      return buildFallbackSelection(normalized, 'fallback');
    }
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

  function normalizeSelectionRequest(request) {
    const input = request && typeof request === 'object' ? request : {};
    const mode = input.mode === 'mixed' ? 'mixed' : '';
    const domain = String(input.domain || '').trim();
    const setIds = Array.from(new Set((Array.isArray(input.setIds) ? input.setIds : [])
      .map(value => String(value || '').trim())
      .filter(Boolean)));
    const count = Math.min(
      MAX_SELECTED_QUESTIONS,
      Math.max(1, Number(input.count) || setIds.length * 4 || 4)
    );
    const normalized = {
      mode,
      domain,
      setIds,
      grade: String(input.grade || '4'),
      difficulty: String(input.difficulty || 'medium'),
      count,
      selectionPolicyVersion: SELECTION_POLICY_VERSION
    };
    validateSelectionRequest(normalized);
    return normalized;
  }

  function validateSelectionRequest(request) {
    if (request.mode !== 'mixed') throw new Error('Question loader: selection mode must be "mixed".');
    if (!request.domain) throw new Error('Question loader: selection domain is required.');
    if (!request.setIds.length) throw new Error('Question loader: selection setIds are required.');
    request.setIds.forEach(setId => {
      const entry = getManifestEntry(setId);
      if (!entry) throw new Error(`Question loader: no manifest entry for "${setId}".`);
      if (entry.domain !== request.domain) {
        throw new Error(`Question loader: "${setId}" belongs to "${entry.domain}", not "${request.domain}".`);
      }
      if (!entry.chunkFile) throw new Error(`Question loader: manifest entry for "${setId}" is missing chunkFile.`);
    });
  }

  function isServerSelectionEnabled() {
    const config = getConfig();
    return !!(config.enableServerQuestionSelection && config.questionSelectionApiUrl && typeof fetch === 'function');
  }

  function getConfig() {
    return window.GRAMMAR_QUEST_CONFIG && typeof window.GRAMMAR_QUEST_CONFIG === 'object'
      ? window.GRAMMAR_QUEST_CONFIG
      : {};
  }

  async function requestServerSelection(request) {
    const response = await fetch(getConfig().questionSelectionApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    if (!response || !response.ok) {
      throw new Error(`selection API returned ${response && response.status || 'no response'}`);
    }
    return validateSelectionResponse(await response.json(), request);
  }

  function validateSelectionResponse(response, request) {
    if (!response || typeof response !== 'object') throw new Error('selection API response must be an object');
    if (response.selectionPolicyVersion !== SELECTION_POLICY_VERSION) {
      throw new Error(`selection API policy version is ${response.selectionPolicyVersion}; expected ${SELECTION_POLICY_VERSION}`);
    }
    const refs = Array.isArray(response.questionRefs) ? response.questionRefs : [];
    if (!refs.length) throw new Error('selection API returned no question refs');
    if (refs.length > request.count) throw new Error(`selection API returned ${refs.length} refs; requested at most ${request.count}`);
    refs.forEach(ref => validateSelectionRef(ref, request));
    return {
      selectionId: String(response.selectionId || ''),
      selectionPolicyVersion: response.selectionPolicyVersion,
      questionRefs: refs,
      questionSnapshots: Array.isArray(response.questionSnapshots) ? response.questionSnapshots : []
    };
  }

  function validateSelectionRef(ref, request) {
    if (!ref || typeof ref !== 'object') throw new Error('selection API returned an invalid question ref');
    if (!ref.id) throw new Error('selection API returned a question ref without id');
    if (!request.setIds.includes(ref.sourceSet)) {
      throw new Error(`selection API returned ref for unauthorized sourceSet "${ref.sourceSet}"`);
    }
    if (!Number.isFinite(Number(ref.version)) || Number(ref.version) < 1) {
      throw new Error(`selection API returned invalid version for "${ref.id}"`);
    }
    if (!/^sha256:[a-f0-9]{64}$/.test(String(ref.contentHash || ''))) {
      throw new Error(`selection API returned invalid contentHash for "${ref.id}"`);
    }
  }

  async function hydrateSelectionResponse(response, request) {
    const hydrated = await hydrateQuestionRefs(response.questionRefs);
    const snapshots = Array.isArray(response.questionSnapshots) ? response.questionSnapshots : [];
    const questions = response.questionRefs.map((ref, index) => {
      const loaded = hydrated[index];
      if (loaded) return loaded;
      return snapshots[index] || null;
    }).filter(Boolean);
    if (!questions.length) throw new Error('selection API refs could not be hydrated');
    if (questions.length !== response.questionRefs.length) throw new Error('selection API refs were only partially hydrated');
    questions.forEach(question => {
      const metadata = question && question.metadata || {};
      if (!request.setIds.includes(metadata.sourceSet)) {
        throw new Error(`hydrated selection included unauthorized sourceSet "${metadata.sourceSet}"`);
      }
    });
    return questions;
  }

  async function buildFallbackSelection(request, source) {
    const sets = await loadSets(request.setIds);
    return {
      source,
      selectionId: '',
      selectionPolicyVersion: SELECTION_POLICY_VERSION,
      sets
    };
  }

  function buildSelectedSetResult(request, questions, metadata) {
    const bySet = questions.reduce((index, question) => {
      const sourceSet = question && question.metadata && question.metadata.sourceSet || '';
      if (!index[sourceSet]) index[sourceSet] = [];
      index[sourceSet].push(question);
      return index;
    }, {});
    const sets = request.setIds.map(setId => {
      const entry = getManifestEntry(setId) || {};
      return {
        id: setId,
        title: entry.title || setId,
        topic: entry.topic || request.domain,
        questions: bySet[setId] || [],
        metadata: {
          gradesSupported: entry.gradesSupported || [],
          difficultiesSupported: entry.difficultiesSupported || []
        }
      };
    }).filter(set => set.questions.length);
    return Object.assign({
      sets
    }, metadata || {});
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

  function notifySelectionEvent(name, detail) {
    if (!window.dispatchEvent || typeof CustomEvent !== 'function') return;
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
})();
