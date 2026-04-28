const firebaseSettings = window.GQ_FIREBASE_CONFIG || {};
const progressStore = window.GrammarQuestProgress;
const AUTH_STATE_EVENT = "grammarquest:auth-state";
const ACTIVE_STUDENT_EVENT = "grammarquest:active-student";

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
    <form data-create-student-form>
      <label>
        <span>Student Name</span>
        <input type="text" name="studentName" autocomplete="off" placeholder="Raaga" required>
      </label>
      <label>
        <span>Fun Login Name</span>
        <input type="text" name="loginName" autocomplete="off" data-student-login-name required>
      </label>
      <button class="btn btn-secondary" type="button" data-suggest-login-name>Suggest Name</button>
      <button class="btn btn-primary" type="submit">Create Student</button>
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
    const studentButton = event.target.closest("[data-student-id]");
    const clearStudentButton = event.target.closest("[data-clear-student-session]");
    const deleteStudentButton = event.target.closest("[data-delete-student-id]");
    const resetStudentButton = event.target.closest("[data-reset-student-id]");

    if (openButton) openModal();
    if (closeButton || event.target.id === "auth-modal") closeModal();
    if (signOutButton) await signOut();
    if (providerButton) await signInWithProvider(providerButton.dataset.authProvider);
    if (authTab) activateAuthTab(authTab.dataset.authTab);
    if (signupButton) await signInWithEmail(event, "signup");
    if (suggestButton) suggestLoginName(suggestButton);
    if (studentButton) await handleSelectStudentById(studentButton.dataset.studentId);
    if (clearStudentButton) await clearActiveStudent();
    if (deleteStudentButton) await handleDeleteStudent(deleteStudentButton.dataset.deleteStudentId);
    if (resetStudentButton) await handleResetStudent(resetStudentButton.dataset.resetStudentId);
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

async function resetStudentProgress(studentId, scope) {
  await readyPromise;
  requireGrownup();
  const normalizedScope = String(scope || "").trim().toLowerCase();
  const { db, firestoreModule } = state.firebase;
  const ref = managedStudentRef(db, firestoreModule, studentId);
  const snapshot = await firestoreModule.getDoc(ref);
  if (!snapshot.exists()) throw new Error("Student profile was not found.");
  const data = snapshot.data();
  if (data.ownerUid !== state.user.uid) throw new Error("This student is not connected to the signed-in grownup.");

  const current = progressStore?.normalizeReports ? data.progress || {} : data.progress || {};
  const next = normalizedScope === "all"
    ? progressStore?.getDefaultProgress?.() || {}
    : resetProgressScope(current, normalizedScope);

  await firestoreModule.updateDoc(ref, {
    progress: next,
    updatedAt: firestoreModule.serverTimestamp()
  });
}

function resetProgressScope(progress, scope) {
  const base = progressStore?.normalizeReports
    ? progressStore.mergeProgress(progressStore.getDefaultProgress(), progress)
    : Object.assign({}, progress);
  const matches = value => String(value || "").trim().toLowerCase() === scope;
  const sessions = Array.isArray(base.reports?.sessions) ? base.reports.sessions : [];
  const removedSessionIds = new Set();

  base.reports = Object.assign({}, base.reports, {
    sessions: sessions.filter(session => {
      const shouldRemove = matches(session.topicTitle) || matches(session.subtopicTitle) || matches(session.topicId) || matches(session.subtopicId);
      if (shouldRemove && session.id) removedSessionIds.add(session.id);
      return !shouldRemove;
    })
  });

  if (base.mastery) {
    Object.keys(base.mastery).forEach(groupKey => {
      const group = base.mastery[groupKey] || {};
      Object.keys(group).forEach(itemKey => {
        const item = group[itemKey] || {};
        if (matches(item.label) || matches(itemKey)) delete group[itemKey];
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
  if (!window.confirm("Delete this student profile and its progress? This cannot be undone.")) return;
  try {
    await deleteManagedStudent(studentId);
    showMessage("Student profile deleted.");
    await renderStudentProfiles();
  } catch (error) {
    showMessage(authErrorMessage(error));
  }
}

async function handleResetStudent(studentId) {
  const scope = window.prompt("Reset progress for what? Type ALL, a topic title, or a subtopic title.", "ALL");
  if (!scope) return;
  try {
    await resetStudentProgress(studentId, scope);
    showMessage(`Progress reset for ${scope}.`);
    await renderStudentProfiles();
  } catch (error) {
    showMessage(authErrorMessage(error));
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

  renderAuthGate({ signedIn, studentMode, parentMode });
  renderReportAccess({ parentMode, studentMode });
  if (!parentMode) removeParentDashboard();

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
    <div class="parent-dashboard-header">
      <div>
        <div class="quest-kicker">Parent / Teacher</div>
        <h2>Student Management</h2>
        <p>Manage student profiles, launch practice, review reports, and reset progress.</p>
      </div>
      <a class="btn btn-primary" href="${reportsHref()}">View Reports</a>
    </div>
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

function removeParentDashboard() {
  document.querySelectorAll("[data-parent-dashboard]").forEach(item => item.remove());
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
          <button class="btn btn-secondary" type="button" data-student-id="${escapeHtml(student.id)}">Launch Practice</button>
          <button class="btn btn-secondary" type="button" data-reset-student-id="${escapeHtml(student.id)}">Reset Progress</button>
          <button class="btn btn-secondary" type="button" data-delete-student-id="${escapeHtml(student.id)}">Delete</button>
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
