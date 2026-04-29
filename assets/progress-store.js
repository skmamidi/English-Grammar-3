(function () {
  "use strict";

  const STORAGE_KEY = "grammarQuestProgress";
  const SYNC_STATUS_EVENT = "grammarquest:sync-status";
  const PROGRESS_UPDATED_EVENT = "grammarquest:progress-updated";
  const SESSION_SIGNED_OUT_EVENT = "grammarquest:session-signed-out";
  let cloudAdapter = null;
  let learnerStateRepository = null;
  let learnerStateRepositoryKey = "";
  let syncTimer = null;
  const ACTIVE_ASSESSMENT_EVENT = "grammarquest:active-assessment";
  const EXIT_CONFIRMATION_MESSAGE = "A test is still in progress. Leave this page and lose your current test answers?";
  let activeAssessment = null;
  let historyGuardArmed = false;
  let allowingConfirmedNavigation = false;
  let exitDialog = null;
  let exitDialogResolver = null;
  let exitDialogPromise = null;
  let exitDialogLastFocus = null;

  window.addEventListener(SESSION_SIGNED_OUT_EVENT, handleSessionSignedOut);

  const defaults = {
    streakDays: 0,
    totalGems: 0,
    quizzesCompleted: 0,
    bestScore: 0,
    lastPracticeDate: "",
    badges: [],
    reports: {
      sessions: []
    },
    activeQuiz: null,
    mastery: {
      domains: {},
      skills: {},
      cognitiveDemand: {},
      difficulty: {},
      subtopics: {},
      standards: {}
    }
  };

  function getDefaultProgress() {
    return Object.assign({}, defaults, {
      badges: [],
      reports: getDefaultReports(),
      mastery: getDefaultMastery()
    });
  }

  function getDefaultReports() {
    return {
      sessions: [],
      questionReports: []
    };
  }

  function getDefaultMastery() {
    return {
      domains: {},
      skills: {},
      cognitiveDemand: {},
      difficulty: {},
      subtopics: {},
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
    normalized.reports = normalizeReports(normalized.reports);
    normalized.activeQuiz = normalizeActiveQuiz(normalized.activeQuiz);
    normalized.mastery = normalizeMastery(normalized.mastery);
    return normalized;
  }

  function normalizeReports(reports) {
    const normalized = Object.assign(getDefaultReports(), reports || {});
    normalized.sessions = (Array.isArray(normalized.sessions) ? normalized.sessions : []).map(normalizeReportSession);
    normalized.questionReports = (Array.isArray(normalized.questionReports) ? normalized.questionReports : []).map(normalizeQuestionReport);
    return normalized;
  }

  function normalizeReportSession(session) {
    if (!session || typeof session !== "object") return session;
    return Object.assign({}, session, {
      attempts: (Array.isArray(session.attempts) ? session.attempts : []).map(normalizeAttemptRecord)
    });
  }

  function normalizeAttemptRecord(attempt) {
    if (!attempt || typeof attempt !== "object") return attempt;
    const questionId = getAttemptQuestionId(attempt);
    return Object.assign({}, attempt, {
      questionId,
      questionVersion: Number(attempt.questionVersion) || 0,
      questionHash: attempt.questionHash || attempt.contentHash || ""
    });
  }

  function normalizeQuestionReport(report) {
    if (!report || typeof report !== "object") return report;
    return Object.assign({}, report, {
      questionId: getReportQuestionId(report),
      questionVersion: Number(report.questionVersion) || 0,
      questionHash: report.questionHash || report.contentHash || ""
    });
  }

  function getReportQuestionId(report) {
    if (!report) return "";
    if (report.questionId) return String(report.questionId);
    if (looksLikeStableQuestionId(report.id)) return String(report.id);
    if (report.sourceSet && report.sequence) {
      return `${report.sourceSet}-q${String(report.sequence).padStart(4, "0")}`;
    }
    if (report.setId && report.sequence) {
      return `${report.setId}-q${String(report.sequence).padStart(4, "0")}`;
    }
    return "";
  }

  function looksLikeStableQuestionId(id) {
    const value = String(id || "");
    return !value.startsWith("question-report-") && /^[a-z0-9]+(?:-[a-z0-9]+)*-q\d{4}$/i.test(value);
  }

  function getAttemptQuestionId(attempt) {
    if (!attempt) return "";
    if (attempt.questionId) return attempt.questionId;
    if (attempt.id) return attempt.id;
    const parts = [
      attempt.subtopicId || attempt.sourceSet || "",
      attempt.sequence || attempt.position || "",
      attempt.question || ""
    ].filter(Boolean);
    return parts.join("::");
  }

  function normalizeActiveQuiz(activeQuiz) {
    if (!activeQuiz || activeQuiz.completed) return null;
    const questions = Array.isArray(activeQuiz.questions) ? activeQuiz.questions : [];
    const questionSnapshots = Array.isArray(activeQuiz.questionSnapshots) ? activeQuiz.questionSnapshots : questions;
    const questionRefs = Array.isArray(activeQuiz.questionRefs) ? activeQuiz.questionRefs : questionSnapshots.map(question => ({
      id: question && question.id || "",
      version: Number(question && question.version) || 0,
      contentHash: question && question.contentHash || "",
      sourceSet: question && question.metadata && question.metadata.sourceSet || "",
      sequence: question && question.metadata && question.metadata.sequence || 0
    }));
    if (!questionRefs.length && !questionSnapshots.length) return null;
    const normalized = Object.assign({}, activeQuiz, {
      schemaVersion: Number(activeQuiz.schemaVersion) || (questions.length ? 1 : 2),
      questionRefs,
      questionSnapshots,
      attempts: (Array.isArray(activeQuiz.attempts) ? activeQuiz.attempts : []).map(normalizeAttemptRecord),
      currentIndex: Math.max(0, Number(activeQuiz.currentIndex) || 0),
      score: Math.max(0, Number(activeQuiz.score) || 0),
      hintsUsed: Math.max(0, Number(activeQuiz.hintsUsed) || 0),
      lastSavedAt: activeQuiz.lastSavedAt || activeQuiz.startedAt || ""
    });
    if (questions.length) normalized.questions = questions;
    else delete normalized.questions;
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
    const repository = getLearnerStateRepository();
    if (repository) return normalizeProgress(repository.getProgress());
    try {
      return normalizeProgress(JSON.parse(localStorage.getItem(getStorageKey())));
    } catch (error) {
      return getDefaultProgress();
    }
  }

  function saveLocalProgress(progress, options) {
    const shouldSync = !options || options.sync !== false;
    const repository = getLearnerStateRepository();
    const normalized = repository
      ? normalizeProgress(repository.saveProgress(normalizeProgress(progress)))
      : saveLocalProgressDirect(progress);
    afterProgressWrite(normalized, shouldSync);
    return normalized;
  }

  function getProgress() {
    return loadLocalProgress();
  }

  function saveProgress(progress, options) {
    return saveLocalProgress(progress, options);
  }

  function updateProgress(mutator, options) {
    const repository = getLearnerStateRepository();
    if (repository) {
      const normalized = normalizeProgress(repository.updateProgress(progress => {
        const current = normalizeProgress(progress);
        return typeof mutator === "function" ? mutator(current) || current : current;
      }));
      afterProgressWrite(normalized, !options || options.sync !== false);
      return normalized;
    }
    const current = loadLocalProgress();
    const next = typeof mutator === "function" ? mutator(current) || current : current;
    return saveLocalProgress(next, options);
  }

  function getActiveQuiz() {
    const repository = getLearnerStateRepository();
    return repository ? normalizeActiveQuiz(repository.getActiveQuiz()) : loadLocalProgress().activeQuiz;
  }

  function saveActiveQuiz(activeQuiz, options) {
    const repository = getLearnerStateRepository();
    if (repository) {
      const normalizedActiveQuiz = normalizeActiveQuiz(repository.saveActiveQuiz(activeQuiz));
      afterProgressWrite(normalizeProgress(repository.getProgress()), !options || options.sync !== false);
      return normalizedActiveQuiz;
    }
    return updateProgress(progress => {
      progress.activeQuiz = normalizeActiveQuiz(activeQuiz);
      return progress;
    }, options).activeQuiz;
  }

  function clearActiveQuiz(options) {
    const repository = getLearnerStateRepository();
    if (repository) {
      repository.clearActiveQuiz();
      afterProgressWrite(normalizeProgress(repository.getProgress()), !options || options.sync !== false);
      return;
    }
    updateProgress(progress => {
      progress.activeQuiz = null;
      return progress;
    }, options);
  }

  function appendSavedSession(session, options) {
    const repository = getLearnerStateRepository();
    if (repository) {
      const normalized = normalizeProgress(repository.appendSavedSession(session));
      afterProgressWrite(normalized, !options || options.sync !== false);
      return normalized;
    }
    return updateProgress(progress => {
      const reports = normalizeReports(progress.reports);
      reports.sessions = [normalizeReportSession(session)].concat(reports.sessions || []).filter(Boolean).slice(0, 250);
      progress.reports = normalizeReports(reports);
      return progress;
    }, options);
  }

  function upsertQuestionReport(report, options) {
    const repository = getLearnerStateRepository();
    if (repository) {
      const normalized = normalizeProgress(repository.upsertQuestionReport(report));
      afterProgressWrite(normalized, !options || options.sync !== false);
      return normalized;
    }
    return updateProgress(progress => {
      const reports = normalizeReports(progress.reports);
      const normalized = normalizeQuestionReport(report);
      reports.questionReports = [normalized]
        .concat((reports.questionReports || []).filter(item => item && item.id !== normalized.id))
        .slice(0, 500);
      progress.reports = normalizeReports(reports);
      return progress;
    }, options);
  }

  function saveLocalProgressDirect(progress) {
    const normalized = normalizeProgress(progress);
    localStorage.setItem(getStorageKey(), JSON.stringify(normalized));
    return normalized;
  }

  function afterProgressWrite(progress, shouldSync) {
    const normalized = normalizeProgress(progress);
    window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT, { detail: normalized }));
    if (shouldSync) scheduleCloudSave(normalized);
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
      reports: mergeReports(local.reports, cloud.reports),
      activeQuiz: chooseActiveQuiz(local.activeQuiz, cloud.activeQuiz),
      mastery: mergeMastery(local.mastery, cloud.mastery)
    });
  }

  function chooseActiveQuiz(localActive, cloudActive) {
    const local = normalizeActiveQuiz(localActive);
    const cloud = normalizeActiveQuiz(cloudActive);
    if (!local) return cloud;
    if (!cloud) return local;
    return String(local.lastSavedAt || local.startedAt || "") > String(cloud.lastSavedAt || cloud.startedAt || "") ? local : cloud;
  }

  function mergeReports(localReports, cloudReports) {
    const sessionsById = {};
    const questionReportsById = {};
    normalizeReports(cloudReports).sessions
      .concat(normalizeReports(localReports).sessions)
      .forEach(session => {
        if (!session || !session.id) return;
        sessionsById[session.id] = session;
      });
    normalizeReports(cloudReports).questionReports
      .concat(normalizeReports(localReports).questionReports)
      .forEach(report => {
        if (!report || !report.id) return;
        const existing = questionReportsById[report.id];
        questionReportsById[report.id] = !existing || String(report.updatedAt || report.createdAt || "") >= String(existing.updatedAt || existing.createdAt || "")
          ? report
          : existing;
      });

    return {
      sessions: Object.keys(sessionsById)
        .map(id => sessionsById[id])
        .sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")))
        .slice(0, 100),
      questionReports: Object.keys(questionReportsById)
        .map(id => questionReportsById[id])
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
        .slice(0, 500)
    };
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

  function handleSessionSignedOut(event) {
    cloudAdapter = null;
    if (syncTimer) {
      window.clearTimeout(syncTimer);
      syncTimer = null;
    }
    learnerStateRepository = null;
    learnerStateRepositoryKey = "";
    if (event && event.detail && event.detail.clearActiveStudent) {
      clearActiveStudentSelectionStorage();
    }
    setSyncStatus("local");
    window.dispatchEvent(new CustomEvent(PROGRESS_UPDATED_EVENT, { detail: loadLocalProgress() }));
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

  function getActiveStudentId() {
    try {
      return localStorage.getItem("grammarQuestActiveStudentId") || "";
    } catch (error) {
      return "";
    }
  }

  function getStorageKey() {
    const activeStudentId = getActiveStudentId();
    return activeStudentId ? `${STORAGE_KEY}:${activeStudentId}` : STORAGE_KEY;
  }

  function clearActiveStudentSelectionStorage() {
    try {
      localStorage.removeItem("grammarQuestActiveStudentId");
      localStorage.removeItem("grammarQuestActiveStudentName");
      localStorage.removeItem("grammarQuestActiveStudentLogin");
      localStorage.removeItem("grammarQuestActiveStudentOwner");
      localStorage.removeItem("grammarQuestActiveStudentDefaultGrade");
      localStorage.removeItem("grammarQuestActiveStudentAvatarParts");
    } catch (error) {
      // Optional local state.
    }
  }

  function getLearnerStateRepository() {
    const boundary = window.GrammarQuestLearnerStateRepository;
    if (!boundary
      || typeof boundary.createLocalStorageLearnerStateAdapter !== "function"
      || typeof boundary.createLearnerStateRepository !== "function") {
      return null;
    }
    const storageKey = getStorageKey();
    if (learnerStateRepository && learnerStateRepositoryKey === storageKey) {
      return learnerStateRepository;
    }
    try {
      learnerStateRepositoryKey = storageKey;
      learnerStateRepository = boundary.createLearnerStateRepository(
        boundary.createLocalStorageLearnerStateAdapter(localStorage, {
          storageKey,
          corruptBackupKey: `${storageKey}.corrupt`
        })
      );
      return learnerStateRepository;
    } catch (error) {
      console.warn("Progress learner state repository unavailable:", error);
      learnerStateRepository = null;
      learnerStateRepositoryKey = "";
      return null;
    }
  }

  function startActiveAssessment(details) {
    activeAssessment = Object.assign({
      label: "test",
      startedAt: Date.now()
    }, details || {});
    armHistoryGuard();
    notifyActiveAssessment();
  }

  function endActiveAssessment() {
    if (!activeAssessment) return;
    activeAssessment = null;
    notifyActiveAssessment();
  }

  function isAssessmentActive() {
    return !!activeAssessment;
  }

  function confirmAssessmentExit(message) {
    if (!activeAssessment) return true;
    return showAssessmentExitDialog(message || activeAssessment.message || EXIT_CONFIRMATION_MESSAGE);
  }

  function showAssessmentExitDialog(message) {
    ensureExitDialog();
    if (exitDialogPromise) return exitDialogPromise;

    const title = exitDialog.querySelector("[data-assessment-exit-title]");
    const body = exitDialog.querySelector("[data-assessment-exit-message]");
    const stayButton = exitDialog.querySelector("[data-assessment-stay]");
    const label = activeAssessment && activeAssessment.label ? activeAssessment.label : "quiz";
    exitDialogLastFocus = document.activeElement;

    if (title) title.textContent = `Leave this ${label}?`;
    if (body) body.textContent = message;
    exitDialog.classList.remove("hidden");
    document.body.classList.add("assessment-exit-open");
    if (stayButton) stayButton.focus();

    exitDialogPromise = new Promise(resolve => {
      exitDialogResolver = resolve;
    });
    return exitDialogPromise;
  }

  function resolveAssessmentExitDialog(shouldExit) {
    if (!exitDialogResolver) return;
    const resolver = exitDialogResolver;
    exitDialogResolver = null;
    exitDialogPromise = null;
    if (exitDialog) exitDialog.classList.add("hidden");
    document.body.classList.remove("assessment-exit-open");

    if (!shouldExit && exitDialogLastFocus && typeof exitDialogLastFocus.focus === "function") {
      exitDialogLastFocus.focus();
    }
    exitDialogLastFocus = null;
    resolver(shouldExit);
  }

  function ensureExitDialog() {
    if (exitDialog) return;
    exitDialog = document.createElement("div");
    exitDialog.className = "assessment-exit-modal hidden";
    exitDialog.setAttribute("role", "dialog");
    exitDialog.setAttribute("aria-modal", "true");
    exitDialog.setAttribute("aria-labelledby", "assessment-exit-title");
    exitDialog.setAttribute("aria-describedby", "assessment-exit-message");
    exitDialog.innerHTML = `
      <div class="assessment-exit-dialog">
        <div class="quest-kicker">Quiz in progress</div>
        <h2 id="assessment-exit-title" data-assessment-exit-title>Leave this quiz?</h2>
        <p id="assessment-exit-message" data-assessment-exit-message>${escapeHtml(EXIT_CONFIRMATION_MESSAGE)}</p>
        <div class="assessment-exit-actions">
          <button class="btn btn-secondary" type="button" data-assessment-stay>No, stay and finish quiz</button>
          <button class="btn btn-primary" type="button" data-assessment-exit>Yes, I want to exit</button>
        </div>
      </div>
    `;
    document.body.appendChild(exitDialog);

    exitDialog.querySelector("[data-assessment-stay]").addEventListener("click", () => resolveAssessmentExitDialog(false));
    exitDialog.querySelector("[data-assessment-exit]").addEventListener("click", () => resolveAssessmentExitDialog(true));
    exitDialog.addEventListener("click", event => {
      if (event.target === exitDialog) resolveAssessmentExitDialog(false);
    });
    exitDialog.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        resolveAssessmentExitDialog(false);
      }
    });
  }

  function notifyActiveAssessment() {
    window.dispatchEvent(new CustomEvent(ACTIVE_ASSESSMENT_EVENT, {
      detail: { active: !!activeAssessment, assessment: activeAssessment }
    }));
  }

  function armHistoryGuard() {
    if (historyGuardArmed || !window.history || !window.history.pushState) return;
    try {
      window.history.pushState({ grammarQuestAssessmentGuard: true }, "", window.location.href);
      historyGuardArmed = true;
    } catch (error) {
      // Some embedded browsers restrict history calls; other guards still apply.
    }
  }

  function shouldGuardLink(link) {
    if (!link || !link.href || link.hasAttribute("download")) return false;
    const target = (link.getAttribute("target") || "").toLowerCase();
    if (target && target !== "_self") return false;

    try {
      const nextUrl = new URL(link.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      nextUrl.hash = "";
      currentUrl.hash = "";
      return nextUrl.href !== currentUrl.href;
    } catch (error) {
      return true;
    }
  }

  function continueConfirmedNavigation(callback) {
    allowingConfirmedNavigation = true;
    endActiveAssessment();
    callback();
  }

  window.addEventListener("beforeunload", event => {
    if (!activeAssessment || allowingConfirmedNavigation) return;
    event.preventDefault();
    event.returnValue = "";
  });

  window.addEventListener("popstate", async () => {
    if (!activeAssessment || allowingConfirmedNavigation) return;
    if (await confirmAssessmentExit()) {
      continueConfirmedNavigation(() => window.history.back());
      return;
    }
    historyGuardArmed = false;
    armHistoryGuard();
  });

  document.addEventListener("click", async event => {
    if (!activeAssessment || allowingConfirmedNavigation || event.defaultPrevented) return;
    const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!shouldGuardLink(link)) return;

    event.preventDefault();
    if (await confirmAssessmentExit()) {
      continueConfirmedNavigation(() => {
        window.location.href = link.href;
      });
    }
  }, true);

  document.addEventListener("submit", async event => {
    if (!activeAssessment || allowingConfirmedNavigation || event.defaultPrevented) return;

    event.preventDefault();
    if (await confirmAssessmentExit()) {
      continueConfirmedNavigation(() => {
        if (event.target && typeof event.target.submit === "function") {
          event.target.submit();
        }
      });
    }
  });

  document.addEventListener("keydown", async event => {
    if (!activeAssessment || allowingConfirmedNavigation || event.defaultPrevented) return;
    const key = event.key || "";
    const isRefresh = key === "F5" || ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "r");
    const isHistoryBack = event.altKey && key === "ArrowLeft";
    if (!isRefresh && !isHistoryBack) return;

    event.preventDefault();
    if (await confirmAssessmentExit()) {
      continueConfirmedNavigation(() => {
        if (isRefresh) window.location.reload();
        else window.history.back();
      });
    }
  }, true);

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = String(text || "");
    return div.innerHTML;
  }

  window.GrammarQuestProgress = {
    STORAGE_KEY,
    getStorageKey,
    PROGRESS_UPDATED_EVENT,
    SYNC_STATUS_EVENT,
    SESSION_SIGNED_OUT_EVENT,
    ACTIVE_ASSESSMENT_EVENT,
    getDefaultProgress,
    getProgress,
    saveProgress,
    updateProgress,
    getActiveQuiz,
    saveActiveQuiz,
    clearActiveQuiz,
    appendSavedSession,
    upsertQuestionReport,
    loadLocalProgress,
    saveLocalProgress,
    mergeProgress,
    normalizeMastery,
    normalizeReports,
    normalizeQuestionReport,
    getReportQuestionId,
    looksLikeStableQuestionId,
    normalizeActiveQuiz,
    setCloudAdapter,
    syncFromCloud,
    syncToCloud,
    activeAssessment: {
      start: startActiveAssessment,
      end: endActiveAssessment,
      isActive: isAssessmentActive,
      confirmExit: confirmAssessmentExit
    }
  };
})();
