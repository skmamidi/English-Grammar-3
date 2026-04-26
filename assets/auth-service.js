const firebaseSettings = window.GQ_FIREBASE_CONFIG || {};
const progressStore = window.GrammarQuestProgress;
const state = {
  enabled: Boolean(firebaseSettings.enabled),
  user: null,
  syncStatus: firebaseSettings.enabled ? "idle" : "local",
  firebase: null,
  modal: null
};

document.addEventListener("DOMContentLoaded", initAuthUi);

async function initAuthUi() {
  injectAuthShell();
  wireModalEvents();
  renderAuthUi();

  if (!state.enabled) return;

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
    authModule.onAuthStateChanged(auth, handleAuthState);
  } catch (error) {
    console.error("Firebase failed to initialize:", error);
    state.syncStatus = "error";
    renderAuthUi("Firebase could not start. Check your config and network.");
  }
}

function injectAuthShell() {
  const headers = document.querySelectorAll(".app-header .container");
  headers.forEach((header) => {
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
      <button class="auth-close" type="button" data-auth-close aria-label="Close sign in">×</button>
      <div class="quest-kicker">Cloud Progress</div>
      <h2 id="auth-title">Sign in to save your quest</h2>
      <p class="auth-copy">Keep streaks, gems, and badges available across browsers and devices.</p>
      <div class="auth-actions">
        ${googleButton}
        ${appleButton}
      </div>
      ${emailForm}
      <p class="auth-message" data-auth-message></p>
    </div>
  `;
  document.body.appendChild(modal);
  state.modal = modal;
}

function wireModalEvents() {
  document.addEventListener("click", async (event) => {
    const openButton = event.target.closest("[data-auth-open]");
    const closeButton = event.target.closest("[data-auth-close]");
    const signOutButton = event.target.closest("[data-auth-signout]");
    const providerButton = event.target.closest("[data-auth-provider]");
    const signupButton = event.target.closest("[data-auth-email-action='signup']");

    if (openButton) openModal();
    if (closeButton || event.target.id === "auth-modal") closeModal();
    if (signOutButton) await signOut();
    if (providerButton) await signInWithProvider(providerButton.dataset.authProvider);
    if (signupButton) await signInWithEmail(event, "signup");
  });

  document.addEventListener("submit", async (event) => {
    if (!event.target.matches("[data-auth-email-form]")) return;
    await signInWithEmail(event, "signin");
  });

  window.addEventListener(progressStore.SYNC_STATUS_EVENT, (event) => {
    state.syncStatus = event.detail.status;
    renderAuthUi();
  });
}

async function handleAuthState(user) {
  state.user = user;

  if (!user) {
    progressStore.setCloudAdapter(null);
    state.syncStatus = "local";
    renderAuthUi();
    return;
  }

  progressStore.setCloudAdapter({
    load: () => loadCloudProgress(user.uid),
    save: (progress) => saveCloudProgress(user.uid, progress)
  });
  await progressStore.syncFromCloud();
  closeModal();
  renderAuthUi();
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
  const { auth, authModule } = state.firebase;

  try {
    showMessage(mode === "signup" ? "Creating account..." : "Signing in...");
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

async function loadCloudProgress(uid) {
  const { db, firestoreModule } = state.firebase;
  const ref = progressDocRef(db, firestoreModule, uid);
  const snapshot = await firestoreModule.getDoc(ref);
  return snapshot.exists() ? snapshot.data().progress : null;
}

async function saveCloudProgress(uid, progress) {
  const { db, firestoreModule } = state.firebase;
  const ref = progressDocRef(db, firestoreModule, uid);
  await firestoreModule.setDoc(ref, {
    progress,
    updatedAt: firestoreModule.serverTimestamp()
  }, { merge: true });
}

function progressDocRef(db, firestoreModule, uid) {
  const collectionName = firebaseSettings.firestore?.userCollection || "users";
  const docName = firebaseSettings.firestore?.progressDocument || "questProgress";
  return firestoreModule.doc(db, collectionName, uid, "private", docName);
}

function renderAuthUi(message) {
  document.querySelectorAll("[data-auth-root]").forEach((root) => {
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
      root.innerHTML = `
        <div class="auth-signed-in">
          <button class="auth-pill" type="button" data-auth-open>
            <span class="auth-dot auth-dot-online"></span>
            ${escapeHtml(displayName(state.user))}
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

  if (message) showMessage(message);
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
    showMessage(`Signed in as ${displayName(state.user)}. Progress sync is ${state.syncStatus}.`);
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

function displayName(user) {
  return user.displayName || user.email || "Signed in";
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
