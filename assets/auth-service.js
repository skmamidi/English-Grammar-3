const firebaseSettings = window.GQ_FIREBASE_CONFIG || {};
const progressStore = window.GrammarQuestProgress;
const AUTH_STATE_EVENT = "grammarquest:auth-state";
const ACTIVE_STUDENT_EVENT = "grammarquest:active-student";

const state = {
  enabled: Boolean(firebaseSettings.enabled),
  user: null,
  profile: null,
  activeStudent: loadActiveStudent(),
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
      <h1 data-auth-gate-title>Grownup sign in</h1>
      <p data-auth-gate-copy>Sign in to choose a student profile and start practice.</p>
      <div data-auth-gate-signin>
        ${renderSignInPanel()}
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
    <form data-select-student-form>
      <label>
        <span>Student Login Name</span>
        <input type="text" name="loginName" autocomplete="off" placeholder="spark-reader-27" required>
      </label>
      <button class="btn btn-secondary" type="submit">Start Student Session</button>
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
    const signupButton = event.target.closest("[data-auth-email-action='signup']");
    const suggestButton = event.target.closest("[data-suggest-login-name]");
    const studentButton = event.target.closest("[data-student-id]");
    const clearStudentButton = event.target.closest("[data-clear-student-session]");

    if (openButton) openModal();
    if (closeButton || event.target.id === "auth-modal") closeModal();
    if (signOutButton) await signOut();
    if (providerButton) await signInWithProvider(providerButton.dataset.authProvider);
    if (signupButton) await signInWithEmail(event, "signup");
    if (suggestButton) suggestLoginName(suggestButton);
    if (studentButton) await handleSelectStudentById(studentButton.dataset.studentId);
    if (clearStudentButton) await clearActiveStudent();
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
    if (progressStore) progressStore.setCloudAdapter(null);
    state.syncStatus = "local";
    notifyAuthState();
    renderAuthUi();
    return;
  }

  state.profile = await ensureGrownupProfile(user);
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
  if (!state.firebase) return;
  await state.firebase.authModule.signOut(state.firebase.auth);
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
  return selectManagedStudent(studentId);
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
    loginName: student.loginName
  };
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
      source: "Managed",
      progress,
      sessions: progress?.reports?.sessions || []
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

async function loadStudentProgress(studentId) {
  await readyPromise;
  if (!state.enabled || !state.firebase || !state.user || !studentId) return null;
  const { db, firestoreModule } = state.firebase;
  const snapshot = await firestoreModule.getDoc(managedStudentRef(db, firestoreModule, studentId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (data.ownerUid !== state.user.uid) throw new Error("This student is not connected to the signed-in grownup.");
  return data.progress || null;
}

async function saveStudentProgress(studentId, progress) {
  if (!state.firebase || !state.user || !studentId) return;
  const { db, firestoreModule } = state.firebase;
  const ref = managedStudentRef(db, firestoreModule, studentId);
  await firestoreModule.setDoc(ref, {
    ownerUid: state.user.uid,
    studentId,
    studentName: state.activeStudent?.name || "Student",
    loginName: state.activeStudent?.loginName || "",
    progress,
    updatedAt: firestoreModule.serverTimestamp()
  }, { merge: true });
}

async function refreshActiveStudentAdapter() {
  if (!progressStore) return;
  if (!state.user || !state.activeStudent?.id) {
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
  try {
    localStorage.removeItem("grammarQuestActiveStudentId");
    localStorage.removeItem("grammarQuestActiveStudentName");
    localStorage.removeItem("grammarQuestActiveStudentLogin");
  } catch (error) {
    // Optional local state.
  }
  await refreshActiveStudentAdapter();
  notifyAuthState();
  renderAuthUi("Parent mode is active. Reports are available.");
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
  const signedIn = state.enabled && state.user;
  const studentMode = signedIn && !!state.activeStudent?.id;
  const parentMode = signedIn && !studentMode;

  renderAuthGate({ signedIn, studentMode, parentMode });
  renderReportAccess({ parentMode, studentMode });

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

    if (state.user) {
      const studentLabel = state.activeStudent?.name ? `Student: ${state.activeStudent.name}` : "Parent mode";
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
        Grownup sign in
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
  const toolsWrap = document.querySelector("[data-auth-gate-tools]");
  const tools = document.querySelector("[data-auth-gate-grownup-tools]");
  const reportsPage = isReportsPage();
  const shouldLock = state.enabled && (!signedIn || (reportsPage && studentMode) || (!studentMode && !reportsPage));

  document.body.classList.toggle("auth-pending", false);
  document.body.classList.toggle("auth-locked", shouldLock);
  if (gate) gate.classList.toggle("hidden", !shouldLock);
  if (!gate) return;

  if (!signedIn) {
    if (title) title.textContent = "Grownup sign in";
    if (copy) copy.textContent = "Sign in to choose a student profile and start practice.";
    if (signInPanel) signInPanel.classList.remove("hidden");
    if (toolsWrap) toolsWrap.classList.add("hidden");
    return;
  }

  if (studentMode && reportsPage) {
    if (title) title.textContent = "Reports are protected";
    if (copy) copy.textContent = "Reports are only available in parent mode.";
    if (signInPanel) signInPanel.classList.add("hidden");
    if (toolsWrap) toolsWrap.classList.remove("hidden");
    if (tools) {
      tools.innerHTML = '<button class="btn btn-primary" type="button" data-clear-student-session>Return to parent mode</button>';
    }
    return;
  }

  if (parentMode) {
    if (title) title.textContent = "Choose a student";
    if (copy) copy.textContent = "Create or choose a student profile before practice starts.";
    if (signInPanel) signInPanel.classList.add("hidden");
    if (toolsWrap) toolsWrap.classList.remove("hidden");
    if (tools) {
      tools.innerHTML = `
        <h2>Student profiles</h2>
        ${renderStudentTools(false)}
        <div class="student-profile-list" data-student-profile-list></div>
      `;
    }
    renderStudentProfiles();
  }
}

function renderReportAccess({ parentMode, studentMode }) {
  tagReportLinks();
  document.querySelectorAll("[data-parent-report-link]").forEach(link => {
    link.classList.toggle("hidden", state.enabled && !parentMode);
    link.setAttribute("aria-hidden", state.enabled && !parentMode ? "true" : "false");
  });

  if (!isReportsPage() || !state.enabled) return;
}

function tagReportLinks() {
  document.querySelectorAll('a[href$="reports.html"]').forEach(link => {
    link.setAttribute("data-parent-report-link", "");
  });
}

function isReportsPage() {
  return /(^|\/)reports\.html$/.test(window.location.pathname);
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
      <button class="student-profile-chip ${state.activeStudent?.id === student.id ? "active" : ""}" type="button" data-student-id="${escapeHtml(student.id)}">
        <strong>${escapeHtml(student.name)}</strong>
        <span>${escapeHtml(student.loginName)}</span>
      </button>
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
      loginName: localStorage.getItem("grammarQuestActiveStudentLogin") || ""
    };
  } catch (error) {
    return null;
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
