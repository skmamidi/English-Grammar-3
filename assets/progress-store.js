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
    badges: []
  };

  function getDefaultProgress() {
    return Object.assign({}, defaults, { badges: [] });
  }

  function normalizeProgress(progress) {
    const normalized = Object.assign(getDefaultProgress(), progress || {});
    normalized.streakDays = Number(normalized.streakDays) || 0;
    normalized.totalGems = Number(normalized.totalGems) || 0;
    normalized.quizzesCompleted = Number(normalized.quizzesCompleted) || 0;
    normalized.bestScore = Number(normalized.bestScore) || 0;
    normalized.lastPracticeDate = normalized.lastPracticeDate || "";
    normalized.badges = Array.isArray(normalized.badges) ? normalized.badges : [];
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
      badges: Array.from(badges)
    });
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
    setCloudAdapter,
    syncFromCloud,
    syncToCloud
  };
})();
