(function () {
  "use strict";

  const STORAGE_KEY = "grammarQuestProgress";
  const SYNC_STATUS_EVENT = "grammarquest:sync-status";
  const PROGRESS_UPDATED_EVENT = "grammarquest:progress-updated";
  let cloudAdapter = null;
  let syncTimer = null;

  const defaults = {
    streakDays: 0,
    totalGems: 0,
    quizzesCompleted: 0,
    bestScore: 0,
    lastPracticeDate: "",
    badges: [],
    mastery: {
      domains: {},
      skills: {},
      cognitiveDemand: {},
      difficulty: {},
      standards: {}
    }
  };

  function getDefaultProgress() {
    return Object.assign({}, defaults, {
      badges: [],
      mastery: getDefaultMastery()
    });
  }

  function getDefaultMastery() {
    return {
      domains: {},
      skills: {},
      cognitiveDemand: {},
      difficulty: {},
      standards: {}
    };
  }

  function normalizeProgress(progress) {
    const normalized = Object.assign(getDefaultProgress(), progress || {});
    normalized.streakDays = Number(normalized.streakDays) || 0;
    normalized.totalGems = Number(normalized.totalGems) || 0;
    normalized.quizzesCompleted = Number(normalized.quizzesCompleted) || 0;
    normalized.bestScore = Number(normalized.bestScore) || 0;
    normalized.lastPracticeDate = normalized.lastPracticeDate || "";
    normalized.badges = Array.isArray(normalized.badges) ? normalized.badges : [];
    normalized.mastery = normalizeMastery(normalized.mastery);
    return normalized;
  }

  function normalizeMastery(mastery) {
    const normalized = Object.assign(getDefaultMastery(), mastery || {});
    Object.keys(normalized).forEach(group => {
      normalized[group] = normalizeMasteryGroup(normalized[group]);
    });
    return normalized;
  }

  function normalizeMasteryGroup(group) {
    const normalized = {};
    Object.keys(group || {}).forEach(key => {
      const item = group[key] || {};
      normalized[key] = {
        label: item.label || key,
        correct: Number(item.correct) || 0,
        total: Number(item.total) || 0,
        lastPracticed: item.lastPracticed || "",
        level: item.level || ""
      };
    });
    return normalized;
  }

  function loadLocalProgress() {
    try {
      return normalizeProgress(JSON.parse(localStorage.getItem(STORAGE_KEY)));
    } catch (error) {
      return getDefaultProgress();
    }
  }

  function saveLocalProgress(progress, options) {
    const shouldSync = !options || options.sync !== false;
    const normalized = normalizeProgress(progress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT, { detail: normalized }));

    if (shouldSync) scheduleCloudSave(normalized);
    return normalized;
  }

  function mergeProgress(localProgress, cloudProgress) {
    const local = normalizeProgress(localProgress);
    const cloud = normalizeProgress(cloudProgress);
    const badges = new Set([...(cloud.badges || []), ...(local.badges || [])]);

    return normalizeProgress({
      streakDays: Math.max(local.streakDays, cloud.streakDays),
      totalGems: Math.max(local.totalGems, cloud.totalGems),
      quizzesCompleted: Math.max(local.quizzesCompleted, cloud.quizzesCompleted),
      bestScore: Math.max(local.bestScore, cloud.bestScore),
      lastPracticeDate: maxDateKey(local.lastPracticeDate, cloud.lastPracticeDate),
      badges: Array.from(badges),
      mastery: mergeMastery(local.mastery, cloud.mastery)
    });
  }

  function mergeMastery(localMastery, cloudMastery) {
    const local = normalizeMastery(localMastery);
    const cloud = normalizeMastery(cloudMastery);
    const merged = getDefaultMastery();

    Object.keys(merged).forEach(group => {
      const keys = new Set([
        ...Object.keys(local[group] || {}),
        ...Object.keys(cloud[group] || {})
      ]);
      keys.forEach(key => {
        const localItem = local[group][key] || {};
        const cloudItem = cloud[group][key] || {};
        merged[group][key] = {
          label: localItem.label || cloudItem.label || key,
          correct: Math.max(Number(localItem.correct) || 0, Number(cloudItem.correct) || 0),
          total: Math.max(Number(localItem.total) || 0, Number(cloudItem.total) || 0),
          lastPracticed: maxDateKey(localItem.lastPracticed, cloudItem.lastPracticed),
          level: localItem.level || cloudItem.level || ""
        };
      });
    });

    return merged;
  }

  function maxDateKey(a, b) {
    if (!a) return b || "";
    if (!b) return a || "";
    return a > b ? a : b;
  }

  function setCloudAdapter(adapter) {
    cloudAdapter = adapter;
  }

  async function syncFromCloud() {
    if (!cloudAdapter || !cloudAdapter.load) return loadLocalProgress();

    setSyncStatus("syncing");
    try {
      const cloudProgress = await cloudAdapter.load();
      const merged = mergeProgress(loadLocalProgress(), cloudProgress);
      saveLocalProgress(merged, { sync: false });
      if (cloudAdapter.save) await cloudAdapter.save(merged);
      setSyncStatus("synced");
      return merged;
    } catch (error) {
      console.warn("Progress cloud sync failed:", error);
      setSyncStatus("error");
      return loadLocalProgress();
    }
  }

  function scheduleCloudSave(progress) {
    if (!cloudAdapter || !cloudAdapter.save) return;
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => syncToCloud(progress), 350);
  }

  async function syncToCloud(progress) {
    if (!cloudAdapter || !cloudAdapter.save) return;

    setSyncStatus("syncing");
    try {
      await cloudAdapter.save(normalizeProgress(progress || loadLocalProgress()));
      setSyncStatus("synced");
    } catch (error) {
      console.warn("Progress cloud save failed:", error);
      setSyncStatus("error");
    }
  }

  function setSyncStatus(status) {
    window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: { status } }));
  }

  window.GrammarQuestProgress = {
    STORAGE_KEY,
    PROGRESS_UPDATED_EVENT,
    SYNC_STATUS_EVENT,
    getDefaultProgress,
    loadLocalProgress,
    saveLocalProgress,
    mergeProgress,
    normalizeMastery,
    setCloudAdapter,
    syncFromCloud,
    syncToCloud
  };
})();
