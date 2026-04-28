const firebaseSettings = window.GQ_FIREBASE_CONFIG || {};
const progressStore = window.GrammarQuestProgress;
const AUTH_STATE_EVENT = "grammarquest:auth-state";
const ACTIVE_STUDENT_EVENT = "grammarquest:active-student";
const PARENT_BROWSE_EVENT = "grammarquest:parent-browse";

const state = {
  enabled: Boolean(firebaseSettings.enabled),
  user: null,
  profile: null,
  activeStudent: loadActiveStudent(),
  sessionMode: loadSessionMode(),
  syncStatus: firebaseSettings.enabled ? "idle" : "local",
  firebase: null,
  modal: null
};

const readyPromise = initAuthService();

document.addEventListener("DOMContentLoaded", initAuthUi);

window.GrammarQuestAuth = {
  ready: () => readyPromise,
  getState: () => getPublicState(),
  open: () => openModal(),
  createManagedStudent,
  selectManagedStudent,
  loginStudentByName,
  clearActiveStudent,
  loadManagedStudents,
  loadStudentProgress
};

async function initAuthService() {
  if (!state.enabled) return getPublicState();

  try {
    const [
      appModule,
      authModule,
      firestoreModule
    ] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
    ]);

    const app = appModule.initializeApp(firebaseSettings.firebaseConfig);
    const auth = authModule.getAuth(app);
    const db = firestoreModule.getFirestore(app);
    state.firebase = { auth, db, authModule, firestoreModule };

    await new Promise(resolve => {
      authModule.onAuthStateChanged(auth, async user => {
        await handleAuthState(user);
        resolve();
      });
    });
  } catch (error) {
    console.error("Firebase failed to initialize:", error);
    state.syncStatus = "error";
    renderAuthUi("Firebase could not start. Check your config and network.");
  }

  return getPublicState();
}

async function initAuthUi() {
  injectAuthShell();
  wireModalEvents();
  renderAuthUi();
  await readyPromise;
  renderAuthUi();
}

function injectAuthShell() {
  document.body.classList.add("auth-pending");
  tagReportLinks();
  document.querySelectorAll(".app-header .container").forEach(header => {
    if (header.querySelector("[data-auth-root]")) return;
    const root = document.createElement("div");
    root.className = "auth-widget";
    root.setAttribute("data-auth-root", "");
    header.appendChild(root);
  });

  if (document.getElementById("auth-modal")) return;

  const gate = document.createElement("section");
  gate.className = "auth-gate hidden";
  gate.setAttribute("data-auth-gate", "");
  gate.setAttribute("aria-live", "polite");
  gate.innerHTML = `
    <div class="auth-gate-card">
      <div class="quest-kicker">English Language Mastery</div>
      <h1 data-auth-gate-title>Sign in</h1>
      <p data-auth-gate-copy></p>
      <div class="auth-tabs" role="tablist" aria-label="Sign in type">
        <button class="auth-tab active" type="button" role="tab" aria-selected="true" data-auth-tab="student">Student</button>
        <button class="auth-tab" type="button" role="tab" aria-selected="false" data-auth-tab="parent">Parent</button>
      </div>
      <div class="auth-entry-grid" data-auth-entry-grid>
        <section class="auth-entry-panel active" data-auth-panel="student">
          ${renderStudentLoginPanel()}
        </section>
        <section class="auth-entry-panel" data-auth-panel="parent">
          ${renderSignInPanel()}
        </section>
      </div>
      <div class="auth-gate-tools hidden" data-auth-gate-tools>
        <div class="auth-tools" data-auth-gate-grownup-tools></div>
      </div>
      <p class="auth-message" data-auth-gate-message></p>
    </div>
  `;
  document.body.prepend(gate);

  const modal = document.createElement("div");
  modal.id = "auth-modal";
  modal.className = "auth-modal hidden";
  modal.innerHTML = `
    <div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button class="auth-close" type="button" data-auth-close aria-label="Close sign in">x</button>
      <div class="quest-kicker">Managed Student Progress</div>
      <h2 id="auth-title" data-auth-title>Grownup sign in</h2>
      <p class="auth-copy" data-auth-copy>Parents and teachers create student screen names. Students use those names inside the app without registering for Firebase.</p>
      <div data-auth-signin-panel>
        ${renderSignInPanel()}
      </div>
      <div class="auth-tools hidden" data-grownup-tools>
        <h3>Student Profiles</h3>
        ${renderStudentTools(true)}
        <div class="student-profile-list" data-student-profile-list></div>
      </div>
      <p class="auth-message" data-auth-message></p>
    </div>
  `;
  document.body.appendChild(modal);
  state.modal = modal;
}

function renderSignInPanel() {
  const providers = firebaseSettings.authProviders || {};
  const googleButton = providers.google === false ? "" : '<button class="btn btn-primary" type="button" data-auth-provider="google">Continue with Google</button>';
  const appleButton = providers.apple === false ? "" : '<button class="btn btn-secondary" type="button" data-auth-provider="apple">Continue with Apple</button>';
  const emailForm = providers.email === false ? "" : `
    <form class="auth-form" data-auth-email-form>
      <label>
        <span>Grownup Email</span>
        <input type="email" name="email" autocomplete="email" required>
      </label>
      <label>
        <span>Password</span>
        <input type="password" name="password" autocomplete="current-password" minlength="6" required>
      </label>
      <div class="auth-form-actions">
        <button class="btn btn-primary" type="submit" data-auth-email-action="signin">Sign In</button>
        <button class="btn btn-secondary" type="button" data-auth-email-action="signup">Create Grownup Account</button>
      </div>
    </form>`;

  return `
    <div class="auth-actions">
      ${googleButton}
      ${appleButton}
    </div>
    ${emailForm}
  `;
}

function renderStudentLoginPanel() {
  return `
    <form class="auth-form" data-student-public-form>
      <label>
        <span>Student Login Name</span>
        <input type="text" name="loginName" autocomplete="username" placeholder="spark-reader-27" required>
      </label>
      <button class="btn btn-primary" type="submit">Start Student Practice</button>
    </form>
  `;
}

function activateAuthTab(tabName) {
  const activeName = tabName === "parent" ? "parent" : "student";
  document.querySelectorAll("[data-auth-tab]").forEach(tab => {
    const selected = tab.dataset.authTab === activeName;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", selected ? "true" : "false");
  });
  document.querySelectorAll("[data-auth-panel]").forEach(panel => {
    panel.classList.toggle("active", panel.dataset.authPanel === activeName);
  });
  showMessage("");
}

function renderStudentTools(includeParentModeButton) {
  return `
    <form class="create-student-form" data-create-student-form>
      <label class="student-field student-field-name">
        <span>Student Name</span>
        <input type="text" name="studentName" autocomplete="off" placeholder="Raaga" required>
      </label>
      <label class="student-field student-field-login">
        <span>Fun Login Name</span>
        <input type="text" name="loginName" autocomplete="off" placeholder="sunny-reader-42" data-student-login-name required>
      </label>
      <button class="btn btn-secondary suggest-name-btn" type="button" data-suggest-login-name>Suggest Name</button>
      <button class="btn btn-primary create-student-btn" type="submit">Create Student</button>
    </form>
    ${includeParentModeButton ? '<button class="btn btn-secondary" type="button" data-clear-student-session>Return to parent mode</button>' : ''}
  `;
}

function wireModalEvents() {
  document.addEventListener("click", async event => {
    const openButton = event.target.closest("[data-auth-open]");
    const closeButton = event.target.closest("[data-auth-close]");
    const signOutButton = event.target.closest("[data-auth-signout]");
    const providerButton = event.target.closest("[data-auth-provider]");
    const authTab = event.target.closest("[data-auth-tab]");
    const signupButton = event.target.closest("[data-auth-email-action='signup']");
    const suggestButton = event.target.closest("[data-suggest-login-name]");
    const launchStudentButton = event.target.closest("[data-launch-student-id]");
    const clearStudentButton = event.target.closest("[data-clear-student-session]");
    const deleteStudentButton = event.target.closest("[data-delete-student-id]");
    const resetStudentButton = event.target.closest("[data-reset-student-id]");
    const dialogCancel = event.target.closest("[data-parent-dialog-cancel]");
    const dialogDelete = event.target.closest("[data-confirm-delete-student-id]");
    const resetAllToggle = event.target.closest("[data-reset-all-progress]");

    if (openButton) openModal();
    if (closeButton || event.target.id === "auth-modal") closeModal();
    if (signOutButton) await signOut();
    if (providerButton) await signInWithProvider(providerButton.dataset.authProvider);
    if (authTab) activateAuthTab(authTab.dataset.authTab);
    if (signupButton) await signInWithEmail(event, "signup");
    if (suggestButton) suggestLoginName(suggestButton);
    if (launchStudentButton) await handleSelectStudentById(launchStudentButton.dataset.launchStudentId);
    if (clearStudentButton) await clearActiveStudent();
    if (deleteStudentButton) await openDeleteStudentDialog(deleteStudentButton.dataset.deleteStudentId);
    if (resetStudentButton) await openResetStudentDialog(resetStudentButton.dataset.resetStudentId);
    if (dialogCancel) closeParentDialog(dialogCancel.dataset.parentDialogCancel || "Action cancelled.");
    if (dialogDelete) await handleDeleteStudent(dialogDelete.dataset.confirmDeleteStudentId);
    if (resetAllToggle) toggleResetScopeInputs(resetAllToggle);
  });

  document.addEventListener("submit", async event => {
    if (event.target.matches("[data-auth-email-form]")) {
      await signInWithEmail(event, "signin");
      return;
    }
    if (event.target.matches("[data-create-student-form]")) {
      event.preventDefault();
      const formData = new FormData(event.target);
      await handleCreateStudent(formData, event.target);
      return;
    }
    if (event.target.matches("[data-select-student-form]")) {
      event.preventDefault();
      const loginName = String(new FormData(event.target).get("loginName") || "");
      await handleSelectStudentByLogin(loginName);
    }
    if (event.target.matches("[data-student-public-form]")) {
      event.preventDefault();
      const loginName = String(new FormData(event.target).get("loginName") || "");
      await handleStudentPublicLogin(loginName);
    }
    if (event.target.matches("[data-reset-progress-form]")) {
      event.preventDefault();
      await handleResetStudent(event.target.dataset.resetProgressStudentId, new FormData(event.target));
    }
  });

  if (progressStore) {
    window.addEventListener(progressStore.SYNC_STATUS_EVENT, event => {
      state.syncStatus = event.detail.status;
      renderAuthUi();
    });
  }
}

async function handleAuthState(user) {
  state.user = user;

  if (!user) {
    state.profile = null;
    if (state.sessionMode !== "student") {
      state.sessionMode = "";
      if (progressStore) progressStore.setCloudAdapter(null);
    } else {
      await refreshActiveStudentAdapter();
    }
    state.syncStatus = "local";
    notifyAuthState();
    renderAuthUi();
    return;
  }

  state.profile = await ensureGrownupProfile(user);
  state.sessionMode = "parent";
  saveSessionMode("parent");
  clearActiveStudentStorage();
  state.activeStudent = null;
  await refreshActiveStudentAdapter();
  closeModal();
  notifyAuthState();
  renderAuthUi();
}

async function ensureGrownupProfile(user) {
  const { db, firestoreModule } = state.firebase;
  const ref = userDocRef(db, firestoreModule, user.uid);
  const snapshot = await firestoreModule.getDoc(ref);
  const existing = snapshot.exists() ? snapshot.data() : {};
  const profile = {
    uid: user.uid,
    role: "guardian",
    displayName: existing.displayName || user.displayName || user.email || "Grownup",
    email: user.email || "",
    updatedAt: firestoreModule.serverTimestamp()
  };

  await firestoreModule.setDoc(ref, Object.assign({
    createdAt: firestoreModule.serverTimestamp()
  }, profile), { merge: true });

  return Object.assign({}, existing, profile, { updatedAt: existing.updatedAt || "" });
}

async function signInWithProvider(providerName) {
  if (!state.enabled || !state.firebase) return showMessage("Add Firebase config first, then set enabled to true.");

  const { auth, authModule } = state.firebase;
  let provider;
  if (providerName === "google") {
    provider = new authModule.GoogleAuthProvider();
  } else if (providerName === "apple") {
    provider = new authModule.OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
  } else {
    return;
  }

  try {
    showMessage("Opening grownup sign-in...");
    await authModule.signInWithPopup(auth, provider);
  } catch (error) {
    showMessage(authErrorMessage(error));
  }
}

async function signInWithEmail(event, mode) {
  event.preventDefault();
  if (!state.enabled || !state.firebase) return showMessage("Add Firebase config first, then set enabled to true.");

  const form = event.target.closest("[data-auth-email-form]");
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const { auth, authModule } = state.firebase;

  try {
    showMessage(mode === "signup" ? "Creating grownup account..." : "Signing in...");
    if (mode === "signup") {
      await authModule.createUserWithEmailAndPassword(auth, email, password);
    } else {
      await authModule.signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    showMessage(authErrorMessage(error));
  }
}

async function signOut() {
  state.activeStudent = null;
  state.sessionMode = "";
  saveSessionMode("");
  clearActiveStudentStorage();
  if (progressStore) progressStore.setCloudAdapter(null);
  if (state.firebase) await state.firebase.authModule.signOut(state.firebase.auth);
  notifyAuthState();
  renderAuthUi();
}

async function createManagedStudent({ studentName, loginName }) {
  await readyPromise;
  requireGrownup();

  const cleanName = String(studentName || "").trim();
  const normalizedLogin = normalizeLoginName(loginName);
  if (!cleanName) throw new Error("Enter a student name.");
  if (!normalizedLogin) throw new Error("Enter a login name.");

  const { db, firestoreModule } = state.firebase;
  const studentId = `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const indexRef = firestoreModule.doc(db, loginCollection(), normalizedLogin);
  const studentRef = managedStudentRef(db, firestoreModule, studentId);

  await firestoreModule.runTransaction(db, async transaction => {
    const existingLogin = await transaction.get(indexRef);
    if (existingLogin.exists()) {
      throw new Error("That login name is already taken. Try the suggested name button.");
    }

    transaction.set(indexRef, {
      ownerUid: state.user.uid,
      studentId,
      loginName: normalizedLogin,
      studentName: cleanName,
      createdAt: firestoreModule.serverTimestamp()
    });
    transaction.set(studentRef, {
      ownerUid: state.user.uid,
      studentId,
      studentName: cleanName,
      loginName: normalizedLogin,
      progress: progressStore?.getDefaultProgress?.() || {},
      createdAt: firestoreModule.serverTimestamp(),
      updatedAt: firestoreModule.serverTimestamp()
    });
  });
  return {
    id: studentId,
    name: cleanName,
    loginName: normalizedLogin,
    ownerUid: state.user.uid
  };
}

async function selectManagedStudent(identifier) {
  await readyPromise;
  requireGrownup();

  const students = await loadManagedStudents();
  const normalized = normalizeLoginName(identifier);
  const student = students.find(item => item.id === identifier || item.loginName === normalized);
  if (!student) throw new Error("That student login name was not found for this grownup account.");

  state.activeStudent = {
    id: student.id,
    name: student.name,
    loginName: student.loginName,
    ownerUid: student.ownerUid || state.user?.uid || ""
  };
  state.sessionMode = "student";
  saveSessionMode("student");
  saveActiveStudent(state.activeStudent);
  await refreshActiveStudentAdapter();
  notifyAuthState();
  window.dispatchEvent(new CustomEvent(ACTIVE_STUDENT_EVENT, { detail: state.activeStudent }));
  renderAuthUi();
  return state.activeStudent;
}

async function loginStudentByName(loginName) {
  await readyPromise;
  if (!state.enabled || !state.firebase) throw new Error("Firebase is not ready yet.");
  const normalized = normalizeLoginName(loginName);
  if (!normalized) throw new Error("Enter a student login name.");

  const { db, firestoreModule } = state.firebase;
  const loginSnapshot = await firestoreModule.getDoc(firestoreModule.doc(db, loginCollection(), normalized));
  if (!loginSnapshot.exists()) throw new Error("That student login name was not found.");

  const loginData = loginSnapshot.data();
  const studentId = loginData.studentId || "";
  if (!studentId) throw new Error("That student login is missing a profile.");

  const studentSnapshot = await firestoreModule.getDoc(managedStudentRef(db, firestoreModule, studentId));
  if (!studentSnapshot.exists()) throw new Error("That student profile was not found.");
  const studentData = studentSnapshot.data();

  state.activeStudent = {
    id: studentId,
    name: studentData.studentName || loginData.studentName || "Student",
    loginName: normalized,
    ownerUid: studentData.ownerUid || loginData.ownerUid || ""
  };
  state.sessionMode = "student";
  saveSessionMode("student");
  saveActiveStudent(state.activeStudent);
  await refreshActiveStudentAdapter();
  notifyAuthState();
  window.dispatchEvent(new CustomEvent(ACTIVE_STUDENT_EVENT, { detail: state.activeStudent }));
  renderAuthUi();
  return state.activeStudent;
}

async function loadManagedStudents() {
  await readyPromise;
  if (!state.enabled || !state.firebase || !state.user) return [];

  const { db, firestoreModule } = state.firebase;
  const studentsRef = firestoreModule.collection(db, managedStudentCollection());
  const query = firestoreModule.query(studentsRef, firestoreModule.where("ownerUid", "==", state.user.uid));
  const snapshot = await firestoreModule.getDocs(query);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    const progress = data.progress || progressStore?.getDefaultProgress?.() || {};
    return {
      id: data.studentId || docSnapshot.id,
      name: data.studentName || "Student",
      loginName: data.loginName || "",
      ownerUid: data.ownerUid || "",
      source: "Managed",
      progress,
      sessions: progress?.reports?.sessions || []
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

async function deleteManagedStudent(studentId) {
  await readyPromise;
  requireGrownup();
  const students = await loadManagedStudents();
  const student = students.find(item => item.id === studentId);
  if (!student) throw new Error("Student profile was not found.");

  const { db, firestoreModule } = state.firebase;
  const batch = firestoreModule.writeBatch(db);
  batch.delete(managedStudentRef(db, firestoreModule, studentId));
  if (student.loginName) {
    batch.delete(firestoreModule.doc(db, loginCollection(), student.loginName));
  }
  await batch.commit();
}

async function resetStudentProgress(studentId, scopes) {
  await readyPromise;
  requireGrownup();
  const normalizedScopes = Array.isArray(scopes) ? scopes : [{ type: "all", value: scopes }];
  const { db, firestoreModule } = state.firebase;
  const ref = managedStudentRef(db, firestoreModule, studentId);
  const snapshot = await firestoreModule.getDoc(ref);
  if (!snapshot.exists()) throw new Error("Student profile was not found.");
  const data = snapshot.data();
  if (data.ownerUid !== state.user.uid) throw new Error("This student is not connected to the signed-in grownup.");

  const current = progressStore?.normalizeReports ? data.progress || {} : data.progress || {};
  const next = normalizedScopes.some(scope => scope.type === "all" || String(scope.value || "").toLowerCase() === "all")
    ? progressStore?.getDefaultProgress?.() || {}
    : resetProgressScope(current, normalizedScopes);

  await firestoreModule.updateDoc(ref, {
    progress: next,
    updatedAt: firestoreModule.serverTimestamp()
  });
}

function resetProgressScope(progress, scopes) {
  const base = progressStore?.normalizeReports
    ? progressStore.mergeProgress(progressStore.getDefaultProgress(), progress)
    : Object.assign({}, progress);
  const normalizedScopes = (Array.isArray(scopes) ? scopes : [{ type: "any", value: scopes }])
    .map(scope => ({
      type: scope.type || "any",
      value: String(scope.value || "").trim().toLowerCase()
    }))
    .filter(scope => scope.value);
  const matchesAny = (type, values) => normalizedScopes.some(scope => {
    if (scope.type !== "any" && scope.type !== type) return false;
    return values.some(value => String(value || "").trim().toLowerCase() === scope.value);
  });
  const sessions = Array.isArray(base.reports?.sessions) ? base.reports.sessions : [];
  const removedSessionIds = new Set();

  base.reports = Object.assign({}, base.reports, {
    sessions: sessions.map(session => {
      const topicValues = [session.topic, session.topicTitle, session.topicId];
      if (matchesAny("topic", topicValues)) {
        if (session.id) removedSessionIds.add(session.id);
        return null;
      }

      const attempts = Array.isArray(session.attempts) ? session.attempts : [];
      const nextAttempts = attempts.filter(attempt => !matchesAny("subtopic", [attempt.subtopicId, attempt.subtopicTitle]));
      if (attempts.length && !nextAttempts.length) {
        if (session.id) removedSessionIds.add(session.id);
        return null;
      }
      if (nextAttempts.length !== attempts.length) {
        const correct = nextAttempts.filter(attempt => attempt.correct).length;
        return Object.assign({}, session, {
          attempts: nextAttempts,
          score: correct,
          total: nextAttempts.length,
          percentage: nextAttempts.length ? Math.round((correct / nextAttempts.length) * 100) : 0
        });
      }
      return session;
    }).filter(Boolean)
  });

  if (base.mastery) {
    ["domains"].forEach(groupKey => {
      const group = base.mastery[groupKey] || {};
      Object.keys(group).forEach(itemKey => {
        const item = group[itemKey] || {};
        if (matchesAny("topic", [item.label, itemKey])) delete group[itemKey];
      });
    });
    ["subtopics"].forEach(groupKey => {
      const group = base.mastery[groupKey] || {};
      Object.keys(group).forEach(itemKey => {
        const item = group[itemKey] || {};
        if (matchesAny("subtopic", [item.label, itemKey])) delete group[itemKey];
      });
    });
  }

  base.quizzesCompleted = Math.max(0, Number(base.quizzesCompleted || 0) - removedSessionIds.size);
  return base;
}

async function loadStudentProgress(studentId) {
  await readyPromise;
  if (!state.enabled || !state.firebase || !studentId) return null;
  const { db, firestoreModule } = state.firebase;
  const snapshot = await firestoreModule.getDoc(managedStudentRef(db, firestoreModule, studentId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (state.user && state.sessionMode === "parent" && data.ownerUid !== state.user.uid) {
    throw new Error("This student is not connected to the signed-in grownup.");
  }
  if (state.sessionMode === "student" && data.loginName !== state.activeStudent?.loginName) {
    throw new Error("This student login does not match the active student.");
  }
  return data.progress || null;
}

async function saveStudentProgress(studentId, progress) {
  if (!state.firebase || !studentId) return;
  const { db, firestoreModule } = state.firebase;
  const ref = managedStudentRef(db, firestoreModule, studentId);
  await firestoreModule.updateDoc(ref, {
    progress,
    updatedAt: firestoreModule.serverTimestamp()
  });
}

async function refreshActiveStudentAdapter() {
  if (!progressStore) return;
  if (state.sessionMode !== "student" || !state.activeStudent?.id) {
    progressStore.setCloudAdapter(null);
    return;
  }

  progressStore.setCloudAdapter({
    load: () => loadStudentProgress(state.activeStudent.id),
    save: progress => saveStudentProgress(state.activeStudent.id, progress)
  });
  await progressStore.syncFromCloud();
}

async function handleCreateStudent(formData, form) {
  try {
    showMessage("Creating student profile...");
    const student = await createManagedStudent({
      studentName: formData.get("studentName"),
      loginName: formData.get("loginName")
    });
    showMessage(`${student.name} is ready. Student login name: ${student.loginName}`);
    const createForm = form || document.querySelector("[data-create-student-form]");
    if (createForm) createForm.reset();
    await renderStudentProfiles();
  } catch (error) {
    showMessage(error.message);
  }
}

async function clearActiveStudent() {
  state.activeStudent = null;
  state.sessionMode = state.user ? "parent" : "";
  saveSessionMode(state.sessionMode);
  clearActiveStudentStorage();
  await refreshActiveStudentAdapter();
  notifyAuthState();
  renderAuthUi("Parent mode is active. Reports are available.");
}

async function handleStudentPublicLogin(loginName) {
  try {
    showMessage("Starting student practice...");
    const student = await loginStudentByName(loginName);
    showMessage(`${student.name} is ready. Progress will save to this profile.`);
    if (isReportsPage()) {
      window.location.href = appHomeHref();
    }
  } catch (error) {
    showMessage(authErrorMessage(error));
  }
}

async function handleSelectStudentByLogin(loginName) {
  try {
    showMessage("Starting student session...");
    const student = await selectManagedStudent(loginName);
    showMessage(`${student.name} is active. Progress will save to this profile.`);
  } catch (error) {
    showMessage(error.message);
  }
}

async function handleDeleteStudent(studentId) {
  try {
    const studentName = getStudentNameFromDialog() || "Student";
    await deleteManagedStudent(studentId);
    closeParentDialog(`${studentName} was deleted.`);
    showParentNotice(`${studentName} was deleted.`, "success");
    await renderStudentProfiles();
  } catch (error) {
    showParentNotice(authErrorMessage(error), "error");
  }
}

async function handleResetStudent(studentId, formData) {
  const scopes = getSelectedResetScopes(formData);
  if (!scopes.length) {
    showParentNotice("Choose at least one topic, subtopic, or all progress to reset.", "error");
    return;
  }
  try {
    const studentName = getStudentNameFromDialog() || "Student";
    await resetStudentProgress(studentId, scopes);
    const label = scopes.some(scope => scope.type === "all")
      ? "all progress"
      : `${scopes.length} selected ${scopes.length === 1 ? "area" : "areas"}`;
    closeParentDialog(`${studentName}: reset ${label}.`);
    showParentNotice(`${studentName}: reset ${label}.`, "success");
    await renderStudentProfiles();
  } catch (error) {
    showParentNotice(authErrorMessage(error), "error");
  }
}

async function handleSelectStudentById(studentId) {
  try {
    const student = await selectManagedStudent(studentId);
    showMessage(`${student.name} is active. Progress will save to this profile.`);
  } catch (error) {
    showMessage(error.message);
  }
}

function requireGrownup() {
  if (!state.enabled || !state.firebase || !state.user) {
    throw new Error("Sign in with a grownup account first.");
  }
}

function userDocRef(db, firestoreModule, uid) {
  return firestoreModule.doc(db, userCollection(), uid);
}

function managedStudentRef(db, firestoreModule, studentId) {
  return firestoreModule.doc(db, managedStudentCollection(), studentId);
}

function userCollection() {
  return firebaseSettings.firestore?.userCollection || "users";
}

function managedStudentCollection() {
  return firebaseSettings.firestore?.managedStudentCollection || "managedStudents";
}

function loginCollection() {
  return firebaseSettings.firestore?.loginCollection || "studentLoginNames";
}

function renderAuthUi(message) {
  const signedIn = state.enabled && state.user && state.sessionMode !== "student";
  const studentMode = state.sessionMode === "student" && !!state.activeStudent?.id;
  const parentMode = signedIn && state.sessionMode !== "student";

  document.body.classList.toggle("parent-mode", parentMode);
  document.body.classList.toggle("student-mode", studentMode);
  document.body.classList.toggle("parent-browse-open", parentMode && isParentBrowseOpen());
  renderAuthGate({ signedIn, studentMode, parentMode });
  renderReportAccess({ parentMode, studentMode });
  renderParentReportsShell(parentMode);
  preserveParentBrowseLinks(parentMode && isParentBrowseOpen());
  if (!parentMode) removeParentDashboard();
  if (!parentMode) removeParentTabs();

  document.querySelectorAll("[data-auth-root]").forEach(root => {
    if (!state.enabled) {
      root.innerHTML = `
        <button class="auth-pill auth-pill-muted" type="button" data-auth-open>
          <span class="auth-dot"></span>
          Local progress
        </button>
      `;
      return;
    }

    if (state.user || studentMode) {
      const studentLabel = studentMode ? `Student: ${state.activeStudent.name}` : "Parent mode";
      root.innerHTML = `
        <div class="auth-signed-in">
          <button class="auth-pill" type="button" data-auth-open>
            <span class="auth-dot auth-dot-online"></span>
            ${escapeHtml(studentLabel)}
            <span class="auth-role-label">${studentMode ? "Student" : "Grownup"}</span>
          </button>
          <button class="auth-link-button" type="button" data-auth-signout>Sign out</button>
        </div>
      `;
      return;
    }

    root.innerHTML = `
      <button class="auth-pill" type="button" data-auth-open>
        <span class="auth-dot"></span>
        Sign in
      </button>
    `;
  });

  renderGrownupTools();
  window.dispatchEvent(new CustomEvent(PARENT_BROWSE_EVENT, { detail: getPublicState() }));
  if (message) showMessage(message);
}

function renderAuthGate({ signedIn, studentMode, parentMode }) {
  const gate = document.querySelector("[data-auth-gate]");
  const title = document.querySelector("[data-auth-gate-title]");
  const copy = document.querySelector("[data-auth-gate-copy]");
  const signInPanel = document.querySelector("[data-auth-gate-signin]");
  const entryGrid = document.querySelector("[data-auth-entry-grid]");
  const toolsWrap = document.querySelector("[data-auth-gate-tools]");
  const tools = document.querySelector("[data-auth-gate-grownup-tools]");
  const reportsPage = isReportsPage();
  const shouldLock = state.enabled && ((!signedIn && !studentMode) || (reportsPage && studentMode));

  document.body.classList.toggle("auth-pending", false);
  document.body.classList.toggle("auth-locked", shouldLock);
  if (gate) gate.classList.toggle("hidden", !shouldLock);
  if (!gate) return;

  if (!signedIn && !studentMode) {
    if (title) title.textContent = "Sign in";
    if (copy) copy.textContent = "";
    if (entryGrid) entryGrid.classList.remove("hidden");
    if (signInPanel) signInPanel.classList.add("hidden");
    if (toolsWrap) toolsWrap.classList.add("hidden");
    return;
  }

  if (studentMode && reportsPage) {
    if (title) title.textContent = "Reports are protected";
    if (copy) copy.textContent = "Reports are only available in parent mode.";
    if (entryGrid) entryGrid.classList.add("hidden");
    if (signInPanel) signInPanel.classList.add("hidden");
    if (toolsWrap) toolsWrap.classList.remove("hidden");
    if (tools) {
      tools.innerHTML = '<button class="btn btn-primary" type="button" data-clear-student-session>Return to parent mode</button>';
    }
    return;
  }

  if (parentMode) renderParentDashboard();
}

function renderReportAccess({ parentMode, studentMode }) {
  tagReportLinks();
  document.querySelectorAll("[data-parent-report-link]").forEach(link => {
    link.classList.toggle("hidden", state.enabled && !parentMode);
    link.setAttribute("aria-hidden", state.enabled && !parentMode ? "true" : "false");
  });

  if (!isReportsPage() || !state.enabled) return;
}

async function renderParentDashboard() {
  const main = document.querySelector("main");
  if (!main || isReportsPage()) return;

  let dashboard = document.querySelector("[data-parent-dashboard]");
  if (!dashboard) {
    dashboard = document.createElement("section");
    dashboard.className = "parent-dashboard";
    dashboard.setAttribute("data-parent-dashboard", "");
    main.prepend(dashboard);
  }

  dashboard.innerHTML = `
    ${renderParentTabs("students")}
    <div class="parent-dashboard-header">
      <div>
        <div class="quest-kicker">Parent / Teacher</div>
        <h2>Student Management</h2>
        <p>Manage student profiles, review reports, reset progress, and browse questions without tracking grownup activity.</p>
      </div>
      <div class="parent-dashboard-actions">
        <a class="btn btn-secondary" href="${questionBankHref()}">Browse Question Bank</a>
        <a class="btn btn-primary" href="${reportsHref()}">View Reports</a>
      </div>
    </div>
    <div class="parent-dashboard-notice" data-parent-dashboard-notice aria-live="polite"></div>
    <div class="parent-dashboard-grid">
      <div class="parent-dashboard-panel">
        <h3>Add Student</h3>
        ${renderStudentTools(false)}
      </div>
      <div class="parent-dashboard-panel">
        <h3>Your Students</h3>
        <div class="student-profile-list" data-student-profile-list></div>
      </div>
    </div>
  `;

  await renderStudentProfiles();
}

function renderParentTabs(activeTab) {
  return `
    <nav class="parent-mode-tabs" aria-label="Parent workspace">
      <a class="${activeTab === "students" ? "active" : ""}" href="${appHomeHref()}">Student Management</a>
      <a class="${activeTab === "reports" ? "active" : ""}" href="${reportsHref()}">Reports</a>
    </nav>
  `;
}

function renderParentReportsShell(parentMode) {
  if (!isReportsPage()) return;
  const main = document.querySelector("main.reports-shell");
  if (!main) return;
  let tabs = main.querySelector("[data-parent-tabs]");
  if (!parentMode) {
    if (tabs) tabs.remove();
    return;
  }
  if (!tabs) {
    tabs = document.createElement("div");
    tabs.setAttribute("data-parent-tabs", "");
    main.prepend(tabs);
  }
  tabs.innerHTML = renderParentTabs("reports");
}

function removeParentDashboard() {
  document.querySelectorAll("[data-parent-dashboard]").forEach(item => item.remove());
}

function removeParentTabs() {
  document.querySelectorAll("[data-parent-tabs]").forEach(item => item.remove());
}

function tagReportLinks() {
  document.querySelectorAll('a[href$="reports.html"]').forEach(link => {
    link.setAttribute("data-parent-report-link", "");
  });
}

function isReportsPage() {
  return /(^|\/)reports\.html$/.test(window.location.pathname);
}

function reportsHref() {
  return window.location.pathname.includes("/topics/") ? "../../reports.html" : "reports.html";
}

function appHomeHref() {
  return window.location.pathname.includes("/topics/") ? "../../index.html" : "index.html";
}

function questionBankHref() {
  return `${appHomeHref()}?parentBrowse=1`;
}

function isParentBrowseOpen() {
  try {
    return new URLSearchParams(window.location.search).get("parentBrowse") === "1";
  } catch (error) {
    return false;
  }
}

function preserveParentBrowseLinks(shouldPreserve) {
  document.querySelectorAll('a.topic-card[href], a[href*="topics/"][href$="index.html"]').forEach(link => {
    const original = link.dataset.originalHref || link.getAttribute("href") || "";
    if (!link.dataset.originalHref) link.dataset.originalHref = original;
    if (!shouldPreserve) {
      link.setAttribute("href", original);
      return;
    }
    try {
      const url = new URL(original, window.location.href);
      url.searchParams.set("parentBrowse", "1");
      link.setAttribute("href", url.pathname.replace(window.location.origin, "") + url.search + url.hash);
    } catch (error) {
      const separator = original.includes("?") ? "&" : "?";
      link.setAttribute("href", `${original}${separator}parentBrowse=1`);
    }
  });
}

async function renderGrownupTools() {
  const signInPanel = document.querySelector("[data-auth-signin-panel]");
  const title = document.querySelector("[data-auth-title]");
  const copy = document.querySelector("[data-auth-copy]");
  const signedIn = state.enabled && state.user;

  if (signInPanel) signInPanel.classList.toggle("hidden", signedIn);
  if (title) title.textContent = signedIn ? "Student profiles" : "Grownup sign in";
  if (copy) {
    copy.textContent = signedIn
      ? "Add another student profile or choose an existing one for this grownup account."
      : "Parents and teachers create student screen names. Students use those names inside the app without registering for Firebase.";
  }

  const tools = document.querySelector("[data-grownup-tools]");
  if (!tools) return;
  tools.classList.toggle("hidden", !signedIn);
  if (signedIn) await renderStudentProfiles();
}

async function renderStudentProfiles() {
  const targets = document.querySelectorAll("[data-student-profile-list]");
  if (!targets.length || !state.user) return;

  try {
    const students = await loadManagedStudents();
    const html = students.map(student => `
      <article class="student-profile-card ${state.activeStudent?.id === student.id ? "active" : ""}">
        <div>
          <strong>${escapeHtml(student.name)}</strong>
          <span>${escapeHtml(student.loginName)}</span>
        </div>
        <div class="student-profile-actions">
          <button class="btn btn-secondary" type="button" data-reset-student-id="${escapeHtml(student.id)}">Reset Progress</button>
          <button class="btn btn-danger" type="button" data-delete-student-id="${escapeHtml(student.id)}">Delete Student</button>
        </div>
      </article>
    `).join("") || '<p class="auth-copy">No student profiles yet.</p>';
    targets.forEach(target => {
      target.innerHTML = html;
    });
  } catch (error) {
    targets.forEach(target => {
      target.innerHTML = `<p class="auth-copy">${escapeHtml(error.message)}</p>`;
    });
  }
}

async function openDeleteStudentDialog(studentId) {
  try {
    const student = await findManagedStudent(studentId);
    openParentDialog(`
      <div class="quest-kicker">Delete Student</div>
      <h2>Delete ${escapeHtml(student.name)}?</h2>
      <p>This removes the student profile, login name, saved reports, and progress. This cannot be undone.</p>
      <input type="hidden" data-dialog-student-name value="${escapeHtml(student.name)}">
      <div class="parent-dialog-actions">
        <button class="btn btn-secondary" type="button" data-parent-dialog-cancel="Delete cancelled.">Cancel</button>
        <button class="btn btn-danger" type="button" data-confirm-delete-student-id="${escapeHtml(student.id)}">Delete Student</button>
      </div>
    `);
  } catch (error) {
    showParentNotice(authErrorMessage(error), "error");
  }
}

async function openResetStudentDialog(studentId) {
  try {
    const student = await findManagedStudent(studentId);
    const progress = await loadStudentProgress(student.id) || {};
    const options = getResetOptions(progress);
    openParentDialog(`
      <div class="quest-kicker">Reset Progress</div>
      <h2>Reset ${escapeHtml(student.name)}'s progress</h2>
      <p>Choose exactly what to clear. The student profile and login name stay in place.</p>
      <input type="hidden" data-dialog-student-name value="${escapeHtml(student.name)}">
      <form class="reset-progress-form" data-reset-progress-form data-reset-progress-student-id="${escapeHtml(student.id)}">
        <label class="reset-option reset-option-all">
          <input type="checkbox" name="all" value="all" data-reset-all-progress>
          <span>
            <strong>All progress</strong>
            <small>Clear reports, streaks, gems, active quiz, and every mastery signal.</small>
          </span>
        </label>
        ${renderResetOptionGroup("Topics", "topic", options.topics)}
        ${renderResetOptionGroup("Subtopics", "subtopic", options.subtopics)}
        <div class="parent-dialog-actions">
          <button class="btn btn-secondary" type="button" data-parent-dialog-cancel="Reset cancelled.">Cancel</button>
          <button class="btn btn-primary" type="submit">Reset Selected</button>
        </div>
      </form>
    `);
  } catch (error) {
    showParentNotice(authErrorMessage(error), "error");
  }
}

function renderResetOptionGroup(title, type, options) {
  const rows = options.map(option => `
    <label class="reset-option">
      <input type="checkbox" name="${type}" value="${escapeHtml(option.value)}">
      <span>
        <strong>${escapeHtml(option.label)}</strong>
        <small>${escapeHtml(option.detail)}</small>
      </span>
    </label>
  `).join("");
  return `
    <section class="reset-option-group">
      <h3>${escapeHtml(title)}</h3>
      ${rows || '<p class="auth-copy">No saved progress in this area yet.</p>'}
    </section>
  `;
}

function openParentDialog(html) {
  let dialog = document.querySelector("[data-parent-dialog]");
  if (!dialog) {
    dialog = document.createElement("div");
    dialog.className = "parent-dialog-backdrop hidden";
    dialog.setAttribute("data-parent-dialog", "");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.innerHTML = '<div class="parent-dialog-card" data-parent-dialog-card></div>';
    document.body.appendChild(dialog);
  }
  const card = dialog.querySelector("[data-parent-dialog-card]");
  if (card) card.innerHTML = html;
  dialog.classList.remove("hidden");
  const firstButton = dialog.querySelector("button");
  window.setTimeout(() => firstButton && firstButton.focus(), 0);
}

function closeParentDialog(message) {
  const dialog = document.querySelector("[data-parent-dialog]");
  if (dialog) dialog.classList.add("hidden");
  if (message) showParentNotice(message, "info");
}

function showParentNotice(message, tone) {
  showMessage(message);
  document.querySelectorAll("[data-parent-dashboard-notice]").forEach(notice => {
    notice.textContent = message || "";
    notice.dataset.tone = tone || "info";
    notice.classList.toggle("active", !!message);
  });
}

function getStudentNameFromDialog() {
  return document.querySelector("[data-dialog-student-name]")?.value || "";
}

function toggleResetScopeInputs(toggle) {
  const form = toggle.closest("[data-reset-progress-form]");
  if (!form) return;
  form.querySelectorAll('input[name="topic"], input[name="subtopic"]').forEach(input => {
    input.disabled = toggle.checked;
    if (toggle.checked) input.checked = false;
  });
}

function getSelectedResetScopes(formData) {
  if (!formData) return [];
  if (formData.get("all")) return [{ type: "all", value: "all" }];
  return []
    .concat(formData.getAll("topic").map(value => ({ type: "topic", value })))
    .concat(formData.getAll("subtopic").map(value => ({ type: "subtopic", value })))
    .filter(scope => scope.value);
}

function getResetOptions(progress) {
  const topics = new Map();
  const subtopics = new Map();
  const sessions = Array.isArray(progress?.reports?.sessions) ? progress.reports.sessions : [];

  sessions.forEach(session => {
    addResetOption(topics, session.topic || session.topicTitle || session.topicId, session.topic || session.topicTitle || session.topicId, `${Number(session.total) || 0} report questions`);
    (session.attempts || []).forEach(attempt => {
      addResetOption(subtopics, attempt.subtopicId || attempt.subtopicTitle, attempt.subtopicTitle || attempt.subtopicId, `${attempt.correct ? "Correct" : "Missed"} attempt saved`);
    });
  });

  Object.keys(progress?.mastery?.domains || {}).forEach(key => {
    const item = progress.mastery.domains[key];
    addResetOption(topics, key, item.label || key, `${Number(item.total) || 0} mastery signals`);
  });
  Object.keys(progress?.mastery?.subtopics || {}).forEach(key => {
    const item = progress.mastery.subtopics[key];
    addResetOption(subtopics, key, item.label || key, `${Number(item.total) || 0} mastery signals`);
  });

  return {
    topics: Array.from(topics.values()).sort((a, b) => a.label.localeCompare(b.label)),
    subtopics: Array.from(subtopics.values()).sort((a, b) => a.label.localeCompare(b.label))
  };
}

function addResetOption(map, value, label, detail) {
  const cleanValue = String(value || "").trim();
  const cleanLabel = String(label || cleanValue).trim();
  if (!cleanValue || !cleanLabel) return;
  const key = cleanValue.toLowerCase();
  const existing = map.get(key);
  if (existing) {
    if (!existing.detail.includes(detail)) existing.detail = `${existing.detail}; ${detail}`;
    return;
  }
  map.set(key, { value: cleanValue, label: cleanLabel, detail: detail || "Saved progress" });
}

async function findManagedStudent(studentId) {
  const students = await loadManagedStudents();
  const student = students.find(item => item.id === studentId);
  if (!student) throw new Error("Student profile was not found.");
  return student;
}

function openModal() {
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.classList.remove("hidden");
  const firstInput = modal.querySelector("input");
  window.setTimeout(() => firstInput && firstInput.focus(), 0);

  if (!state.enabled) {
    showMessage("Firebase is currently disabled. Add your config in assets/firebase-config.js, then set enabled to true.");
  } else if (state.user) {
    showMessage(state.activeStudent?.name
      ? `${state.activeStudent.name} is active. Progress sync is ${state.syncStatus}.`
      : "Create or choose a student profile before practice.");
  } else {
    showMessage("");
  }
}

function closeModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.add("hidden");
}

function showMessage(message) {
  document.querySelectorAll("[data-auth-message], [data-auth-gate-message]").forEach(messageEl => {
    messageEl.textContent = message || "";
  });
}

function notifyAuthState() {
  window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: getPublicState() }));
}

function getPublicState() {
  return {
    enabled: state.enabled,
    user: state.user,
    profile: state.profile,
    role: state.user ? "guardian" : "",
    activeStudent: state.activeStudent,
    sessionMode: state.sessionMode,
    parentMode: !!state.user && state.sessionMode !== "student",
    studentMode: state.sessionMode === "student" && !!state.activeStudent,
    syncStatus: state.syncStatus,
    signedIn: !!state.user
  };
}

function suggestLoginName(button) {
  const scope = button?.closest("[data-grownup-tools], [data-auth-gate-grownup-tools]") || document;
  const input = scope.querySelector("[data-student-login-name]");
  if (!input) return;
  input.value = makeFunLoginName();
}

function makeFunLoginName() {
  const adjectives = ["spark", "brave", "clever", "sunny", "quick", "story", "bright", "mighty"];
  const nouns = ["reader", "writer", "wizard", "scout", "pilot", "ranger", "thinker", "scribe"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(10 + Math.random() * 90);
  return `${adjective}-${noun}-${number}`;
}

function normalizeLoginName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function saveActiveStudent(student) {
  try {
    localStorage.setItem("grammarQuestActiveStudentId", student.id);
    localStorage.setItem("grammarQuestActiveStudentName", student.name);
    localStorage.setItem("grammarQuestActiveStudentLogin", student.loginName || "");
    localStorage.setItem("grammarQuestActiveStudentOwner", student.ownerUid || "");
  } catch (error) {
    // Optional local state.
  }
}

function clearActiveStudentStorage() {
  try {
    localStorage.removeItem("grammarQuestActiveStudentId");
    localStorage.removeItem("grammarQuestActiveStudentName");
    localStorage.removeItem("grammarQuestActiveStudentLogin");
    localStorage.removeItem("grammarQuestActiveStudentOwner");
  } catch (error) {
    // Optional local state.
  }
}

function loadActiveStudent() {
  try {
    const id = localStorage.getItem("grammarQuestActiveStudentId") || "";
    if (!id) return null;
    return {
      id,
      name: localStorage.getItem("grammarQuestActiveStudentName") || "Student",
      loginName: localStorage.getItem("grammarQuestActiveStudentLogin") || "",
      ownerUid: localStorage.getItem("grammarQuestActiveStudentOwner") || ""
    };
  } catch (error) {
    return null;
  }
}

function saveSessionMode(mode) {
  try {
    if (mode) localStorage.setItem("grammarQuestSessionMode", mode);
    else localStorage.removeItem("grammarQuestSessionMode");
  } catch (error) {
    // Optional local state.
  }
}

function loadSessionMode() {
  try {
    return localStorage.getItem("grammarQuestSessionMode") || "";
  } catch (error) {
    return "";
  }
}

function authErrorMessage(error) {
  const code = error && error.code ? error.code : "";
  if (code === "auth/popup-closed-by-user") return "Sign-in was closed before it finished.";
  if (code === "auth/account-exists-with-different-credential") return "An account already exists with this email using a different sign-in method.";
  if (code === "auth/email-already-in-use") return "That email already has an account. Try signing in instead.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") return "Email or password was not recognized.";
  if (code === "auth/weak-password") return "Use a password with at least 6 characters.";
  if (code === "permission-denied" || /missing or insufficient permissions/i.test(error?.message || "")) {
    return "Firebase rules blocked that action. Publish the latest Firestore rules, then try again.";
  }
  return error && error.message ? error.message : "Something went wrong. Try again.";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text || "");
  return div.innerHTML;
}
