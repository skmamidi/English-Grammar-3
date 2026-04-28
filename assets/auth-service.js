const firebaseSettings = window.GQ_FIREBASE_CONFIG || {};
const progressStore = window.GrammarQuestProgress;
const AUTH_STATE_EVENT = "grammarquest:auth-state";

const state = {
  enabled: Boolean(firebaseSettings.enabled),
  user: null,
  profile: null,
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
  createStudentInvite,
  linkStudentWithCode,
  loadGuardianStudents,
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
  const headers = document.querySelectorAll(".app-header .container");
  headers.forEach(header => {
    if (header.querySelector("[data-auth-root]")) return;
    const root = document.createElement("div");
    root.className = "auth-widget";
    root.setAttribute("data-auth-root", "");
    header.appendChild(root);
  });

  if (document.getElementById("auth-modal")) return;

  const providers = firebaseSettings.authProviders || {};
  const googleButton = providers.google === false ? "" : '<button class="btn btn-primary" type="button" data-auth-provider="google">Continue with Google</button>';
  const appleButton = providers.apple === false ? "" : '<button class="btn btn-secondary" type="button" data-auth-provider="apple">Continue with Apple</button>';
  const emailForm = providers.email === false ? "" : `
      <form class="auth-form" data-auth-email-form>
        <label>
          <span>Email</span>
          <input type="email" name="email" autocomplete="email" required>
        </label>
        <label>
          <span>Password</span>
          <input type="password" name="password" autocomplete="current-password" minlength="6" required>
        </label>
        <label>
          <span>Account Type</span>
          <select name="role" data-auth-role-select>
            <option value="student">Student</option>
            <option value="guardian">Parent / Teacher</option>
          </select>
        </label>
        <div class="auth-form-actions">
          <button class="btn btn-primary" type="submit" data-auth-email-action="signin">Sign In</button>
          <button class="btn btn-secondary" type="button" data-auth-email-action="signup">Create Account</button>
        </div>
      </form>`;

  const modal = document.createElement("div");
  modal.id = "auth-modal";
  modal.className = "auth-modal hidden";
  modal.innerHTML = `
    <div class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button class="auth-close" type="button" data-auth-close aria-label="Close sign in">x</button>
      <div class="quest-kicker">Cloud Progress</div>
      <h2 id="auth-title">Sign in to save progress</h2>
      <p class="auth-copy">Students save practice history. Parents and teachers can link students to view progress reports.</p>
      <div class="auth-actions">
        ${googleButton}
        ${appleButton}
      </div>
      ${emailForm}
      <div class="auth-tools hidden" data-auth-student-tools>
        <h3>Student Sharing</h3>
        <p>Generate a code for a parent or teacher. They can use it to view your reports.</p>
        <button class="btn btn-secondary" type="button" data-create-invite>Generate Link Code</button>
        <div class="auth-code hidden" data-invite-code></div>
      </div>
      <form class="auth-tools hidden" data-auth-guardian-tools>
        <h3>Link a Student</h3>
        <label>
          <span>Student Code</span>
          <input type="text" name="inviteCode" autocomplete="off" placeholder="ABC123">
        </label>
        <button class="btn btn-secondary" type="submit">Link Student</button>
      </form>
      <p class="auth-message" data-auth-message></p>
    </div>
  `;
  document.body.appendChild(modal);
  state.modal = modal;
}

function wireModalEvents() {
  document.addEventListener("click", async event => {
    const openButton = event.target.closest("[data-auth-open]");
    const closeButton = event.target.closest("[data-auth-close]");
    const signOutButton = event.target.closest("[data-auth-signout]");
    const providerButton = event.target.closest("[data-auth-provider]");
    const signupButton = event.target.closest("[data-auth-email-action='signup']");
    const inviteButton = event.target.closest("[data-create-invite]");

    if (openButton) openModal();
    if (closeButton || event.target.id === "auth-modal") closeModal();
    if (signOutButton) await signOut();
    if (providerButton) await signInWithProvider(providerButton.dataset.authProvider);
    if (signupButton) await signInWithEmail(event, "signup");
    if (inviteButton) await handleCreateInvite();
  });

  document.addEventListener("submit", async event => {
    if (event.target.matches("[data-auth-email-form]")) {
      await signInWithEmail(event, "signin");
      return;
    }
    if (event.target.matches("[data-auth-guardian-tools]")) {
      event.preventDefault();
      const code = String(new FormData(event.target).get("inviteCode") || "").trim();
      await handleLinkStudent(code);
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

  state.profile = await ensureUserProfile(user);

  if (state.profile.role === "student") {
    setActiveStudent(user.uid, state.profile.displayName || displayName(user));
    if (progressStore) {
      progressStore.setCloudAdapter({
        load: () => loadStudentProgress(user.uid),
        save: progress => saveStudentProgress(user.uid, progress)
      });
      await progressStore.syncFromCloud();
    }
  } else if (progressStore) {
    progressStore.setCloudAdapter(null);
  }

  closeModal();
  notifyAuthState();
  renderAuthUi();
}

async function ensureUserProfile(user, roleOverride) {
  const { db, firestoreModule } = state.firebase;
  const ref = userDocRef(db, firestoreModule, user.uid);
  const snapshot = await firestoreModule.getDoc(ref);
  const existing = snapshot.exists() ? snapshot.data() : null;
  const role = normalizeRole(roleOverride || existing?.role || loadPendingRole() || "student");
  const display = existing?.displayName || user.displayName || user.email || (role === "guardian" ? "Parent / Teacher" : "Student");
  const profile = {
    uid: user.uid,
    role,
    displayName: display,
    email: user.email || "",
    updatedAt: firestoreModule.serverTimestamp()
  };

  await firestoreModule.setDoc(ref, Object.assign({
    createdAt: firestoreModule.serverTimestamp()
  }, profile), { merge: true });

  clearPendingRole();
  return Object.assign({}, existing || {}, profile, { updatedAt: existing?.updatedAt || "" });
}

async function signInWithProvider(providerName) {
  if (!state.enabled || !state.firebase) return showMessage("Add Firebase config first, then set enabled to true.");

  const role = selectedRole();
  savePendingRole(role);
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
    showMessage("Opening sign-in...");
    await authModule.signInWithPopup(auth, provider);
  } catch (error) {
    showMessage(authErrorMessage(error));
  }
}

async function signInWithEmail(event, mode) {
  event.preventDefault();
  if (!state.enabled || !state.firebase) return showMessage("Add Firebase config first, then set enabled to true.");

  const form = document.querySelector("[data-auth-email-form]");
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const role = normalizeRole(formData.get("role"));
  const { auth, authModule } = state.firebase;

  try {
    showMessage(mode === "signup" ? "Creating account..." : "Signing in...");
    savePendingRole(role);
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

async function loadStudentProgress(studentUid) {
  if (!state.firebase) return null;
  const { db, firestoreModule } = state.firebase;
  const ref = studentProgressRef(db, firestoreModule, studentUid);
  const snapshot = await firestoreModule.getDoc(ref);
  return snapshot.exists() ? snapshot.data().progress : null;
}

async function saveStudentProgress(studentUid, progress) {
  if (!state.firebase) return;
  const { db, firestoreModule } = state.firebase;
  const ref = studentProgressRef(db, firestoreModule, studentUid);
  const name = getActiveStudentName();
  await firestoreModule.setDoc(ref, {
    studentUid,
    studentName: name,
    progress,
    updatedAt: firestoreModule.serverTimestamp()
  }, { merge: true });
}

async function createStudentInvite() {
  await readyPromise;
  if (!state.enabled || !state.firebase || !state.user) throw new Error("Sign in as a student first.");
  if (state.profile?.role !== "student") throw new Error("Only student accounts can create link codes.");

  const { db, firestoreModule } = state.firebase;
  const code = makeInviteCode();
  const ref = firestoreModule.doc(db, inviteCollection(), code);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  await firestoreModule.setDoc(ref, {
    code,
    studentUid: state.user.uid,
    studentName: state.profile.displayName || displayName(state.user),
    createdBy: state.user.uid,
    createdAt: firestoreModule.serverTimestamp(),
    expiresAt
  });
  return { code, expiresAt };
}

async function linkStudentWithCode(code) {
  await readyPromise;
  if (!state.enabled || !state.firebase || !state.user) throw new Error("Sign in as a parent or teacher first.");
  if (state.profile?.role !== "guardian") throw new Error("Use a parent / teacher account to link students.");

  const normalizedCode = normalizeInviteCode(code);
  if (!normalizedCode) throw new Error("Enter a student code.");

  const { db, firestoreModule } = state.firebase;
  const inviteRef = firestoreModule.doc(db, inviteCollection(), normalizedCode);
  const inviteSnapshot = await firestoreModule.getDoc(inviteRef);
  if (!inviteSnapshot.exists()) throw new Error("That student code was not found.");

  const invite = inviteSnapshot.data();
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    throw new Error("That student code has expired. Ask the student for a new one.");
  }

  const linkRef = guardianStudentRef(db, firestoreModule, state.user.uid, invite.studentUid);
  await firestoreModule.setDoc(linkRef, {
    studentUid: invite.studentUid,
    studentName: invite.studentName || "Student",
    inviteCode: normalizedCode,
    linkedAt: firestoreModule.serverTimestamp()
  }, { merge: true });

  return { studentUid: invite.studentUid, studentName: invite.studentName || "Student" };
}

async function loadGuardianStudents() {
  await readyPromise;
  if (!state.enabled || !state.firebase || !state.user || state.profile?.role !== "guardian") return [];

  const { db, firestoreModule } = state.firebase;
  const linksRef = firestoreModule.collection(db, userCollection(), state.user.uid, "students");
  const snapshot = await firestoreModule.getDocs(linksRef);
  const students = [];

  for (const docSnapshot of snapshot.docs) {
    const link = docSnapshot.data();
    const progress = await loadStudentProgress(link.studentUid);
    students.push({
      id: link.studentUid,
      name: link.studentName || "Student",
      source: "Linked",
      progress: progress || progressStore?.getDefaultProgress?.() || {},
      sessions: progress?.reports?.sessions || []
    });
  }

  return students;
}

async function handleCreateInvite() {
  try {
    showMessage("Creating student code...");
    const invite = await createStudentInvite();
    const target = document.querySelector("[data-invite-code]");
    if (target) {
      target.classList.remove("hidden");
      target.textContent = invite.code;
    }
    showMessage("Share this code with a parent or teacher.");
  } catch (error) {
    showMessage(error.message);
  }
}

async function handleLinkStudent(code) {
  try {
    showMessage("Linking student...");
    const linked = await linkStudentWithCode(code);
    showMessage(`${linked.studentName} is linked. Open Reports to view progress.`);
    window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: getPublicState() }));
  } catch (error) {
    showMessage(error.message);
  }
}

function userDocRef(db, firestoreModule, uid) {
  return firestoreModule.doc(db, userCollection(), uid);
}

function studentProgressRef(db, firestoreModule, uid) {
  return firestoreModule.doc(db, progressCollection(), uid);
}

function guardianStudentRef(db, firestoreModule, guardianUid, studentUid) {
  return firestoreModule.doc(db, userCollection(), guardianUid, "students", studentUid);
}

function userCollection() {
  return firebaseSettings.firestore?.userCollection || "users";
}

function progressCollection() {
  return firebaseSettings.firestore?.progressCollection || "studentProgress";
}

function inviteCollection() {
  return firebaseSettings.firestore?.inviteCollection || "studentInvites";
}

function renderAuthUi(message) {
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
      const roleLabel = state.profile?.role === "guardian" ? "Parent / Teacher" : "Student";
      root.innerHTML = `
        <div class="auth-signed-in">
          <button class="auth-pill" type="button" data-auth-open>
            <span class="auth-dot auth-dot-online"></span>
            ${escapeHtml(displayName(state.user))}
            <span class="auth-role-label">${escapeHtml(roleLabel)}</span>
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

  renderRoleTools();
  if (message) showMessage(message);
}

function renderRoleTools() {
  const studentTools = document.querySelector("[data-auth-student-tools]");
  const guardianTools = document.querySelector("[data-auth-guardian-tools]");
  if (studentTools) studentTools.classList.toggle("hidden", !(state.user && state.profile?.role === "student"));
  if (guardianTools) guardianTools.classList.toggle("hidden", !(state.user && state.profile?.role === "guardian"));
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
    const role = state.profile?.role === "guardian" ? "parent / teacher" : "student";
    showMessage(`Signed in as a ${role}. Progress sync is ${state.syncStatus}.`);
  } else {
    showMessage("");
  }
}

function closeModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.classList.add("hidden");
}

function showMessage(message) {
  const messageEl = document.querySelector("[data-auth-message]");
  if (messageEl) messageEl.textContent = message || "";
}

function notifyAuthState() {
  window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT, { detail: getPublicState() }));
}

function getPublicState() {
  return {
    enabled: state.enabled,
    user: state.user,
    profile: state.profile,
    role: state.profile?.role || "",
    syncStatus: state.syncStatus,
    signedIn: !!state.user
  };
}

function displayName(user) {
  return state.profile?.displayName || user.displayName || user.email || "Signed in";
}

function selectedRole() {
  const select = document.querySelector("[data-auth-role-select]");
  return normalizeRole(select && select.value);
}

function normalizeRole(role) {
  return role === "guardian" ? "guardian" : "student";
}

function savePendingRole(role) {
  try {
    sessionStorage.setItem("grammarQuestPendingRole", normalizeRole(role));
  } catch (error) {
    // Session storage is optional; default role still works.
  }
}

function loadPendingRole() {
  try {
    return sessionStorage.getItem("grammarQuestPendingRole") || "";
  } catch (error) {
    return "";
  }
}

function clearPendingRole() {
  try {
    sessionStorage.removeItem("grammarQuestPendingRole");
  } catch (error) {
    // Nothing to clear.
  }
}

function setActiveStudent(uid, name) {
  try {
    localStorage.setItem("grammarQuestActiveStudentId", uid);
    localStorage.setItem("grammarQuestActiveStudentName", name || "Student");
  } catch (error) {
    // Progress still saves without the friendly local labels.
  }
}

function getActiveStudentName() {
  try {
    return localStorage.getItem("grammarQuestActiveStudentName") || state.profile?.displayName || "Student";
  } catch (error) {
    return state.profile?.displayName || "Student";
  }
}

function normalizeInviteCode(code) {
  return String(code || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
}

function makeInviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const cryptoObj = window.crypto || window.msCrypto;
  const values = new Uint8Array(6);
  if (cryptoObj && cryptoObj.getRandomValues) cryptoObj.getRandomValues(values);
  for (let i = 0; i < 6; i++) {
    const value = values[i] || Math.floor(Math.random() * alphabet.length);
    code += alphabet[value % alphabet.length];
  }
  return code;
}

function authErrorMessage(error) {
  const code = error && error.code ? error.code : "";
  if (code === "auth/popup-closed-by-user") return "Sign-in was closed before it finished.";
  if (code === "auth/account-exists-with-different-credential") return "An account already exists with this email using a different sign-in method.";
  if (code === "auth/email-already-in-use") return "That email already has an account. Try signing in instead.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password") return "Email or password was not recognized.";
  if (code === "auth/weak-password") return "Use a password with at least 6 characters.";
  return error && error.message ? error.message : "Something went wrong. Try again.";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text || "");
  return div.innerHTML;
}
