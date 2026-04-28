const firebaseSettings = window.GQ_FIREBASE_CONFIG || {};
const progressStore = window.GrammarQuestProgress;
const AUTH_STATE_EVENT = "grammarquest:auth-state";
const ACTIVE_STUDENT_EVENT = "grammarquest:active-student";
const PARENT_BROWSE_EVENT = "grammarquest:parent-browse";
const LOGIN_PERSONALITIES = [
  "adventurous", "artistic", "brave", "bright", "calm", "careful", "cheerful", "clever", "confident", "considerate",
  "creative", "curious", "determined", "eager", "encouraging", "energetic", "friendly", "generous", "gentle", "graceful",
  "grateful", "happy", "helpful", "honest", "hopeful", "imaginative", "inventive", "joyful", "kind", "lively",
  "loyal", "mindful", "patient", "playful", "polite", "positive", "resourceful", "respectful", "responsible", "smart",
  "thoughtful", "trustworthy", "warm", "wise", "witty", "amazing", "awesome", "bold", "bubbly", "charming",
  "compassionate", "cooperative", "courageous", "daring", "dependable", "diligent", "focused", "forgiving", "funny", "hardworking",
  "humble", "inspiring", "jolly", "motivated", "observant", "optimistic", "organized", "original", "peaceful", "persistent",
  "practical", "proud", "quick", "radiant", "reliable", "resilient", "sincere", "spirited", "steady", "strong",
  "sunny", "supportive", "talented", "tenacious", "thankful", "vibrant", "welcoming", "wonderful", "zesty", "adaptable",
  "balanced", "capable", "collaborative", "committed", "fair", "flexible", "genuine", "insightful", "neat", "proactive"
];
const LOGIN_BIRDS = [
  "albatross", "avocet", "bald eagle", "barn owl", "bee hummingbird", "belted kingfisher", "black swan", "blue jay", "bluebird", "bobolink",
  "booby", "bowerbird", "budgie", "canary", "cardinal", "cassowary", "chickadee", "cockatoo", "condor", "coot",
  "cormorant", "crane", "crow", "cuckoo", "dove", "duck", "egret", "emu", "falcon", "finch",
  "flamingo", "frigatebird", "goldfinch", "goose", "grackle", "great horned owl", "green heron", "grouse", "hawk", "heron",
  "hoopoe", "hornbill", "hummingbird", "ibis", "jay", "junco", "kakapo", "kestrel", "kiwi", "loon",
  "lorikeet", "macaw", "magpie", "mallard", "meadowlark", "mockingbird", "nightingale", "oriole", "osprey", "ostrich",
  "owl", "parakeet", "parrot", "peacock", "pelican", "penguin", "phoebe", "pigeon", "puffin", "quail",
  "raven", "red tailed hawk", "roadrunner", "robin", "sandpiper", "scarlet tanager", "seagull", "secretary bird", "snowy owl", "sparrow",
  "spoonbill", "starling", "stork", "swallow", "swan", "swift", "tanager", "toucan", "turkey", "vulture",
  "warbler", "waxwing", "weaverbird", "whippoorwill", "wood duck", "woodpecker", "wren", "yellow warbler", "zebra finch", "kinglet"
];
const LOGIN_OCEAN_ANIMALS = [
  "abalone", "anchovy", "angelfish", "arctic cod", "barracuda", "beluga whale", "blue tang", "blue whale", "box jellyfish", "butterflyfish",
  "clownfish", "cod", "conch", "coral", "crab", "cuttlefish", "dolphin", "dugong", "eel", "elephant seal",
  "flounder", "flying fish", "giant clam", "giant squid", "great white shark", "green sea turtle", "grouper", "hammerhead shark", "harbor seal", "herring",
  "horseshoe crab", "humpback whale", "jellyfish", "kelp crab", "krill", "lanternfish", "leopard seal", "lionfish", "lobster", "mackerel",
  "manatee", "manta ray", "marlin", "monk seal", "moray eel", "narwhal", "nautilus", "octopus", "orca", "oyster",
  "parrotfish", "penguin", "pufferfish", "ray", "reef shark", "sailfish", "salmon", "sand dollar", "sardine", "sea anemone",
  "sea cucumber", "sea dragon", "sea horse", "sea lion", "sea otter", "sea slug", "sea snail", "sea sponge", "sea star", "sea turtle",
  "seal", "shark", "shrimp", "skate", "squid", "stingray", "swordfish", "tarpon", "tiger shark", "tuna",
  "urchin", "vaquita", "walrus", "whale shark", "yellowfin tuna", "zebra shark", "pilot whale", "porpoise", "rockfish", "sunfish",
  "triggerfish", "wrasse", "mussel", "clam", "plankton", "remora", "sawfish", "scallop", "snapper", "wahoo"
];
const LOGIN_LANDMARKS = [
  "statue of liberty", "golden gate bridge", "empire state building", "mount rushmore", "grand canyon", "the white house", "gateway arch", "times square",
  "united states capitol", "space needle", "hollywood sign", "niagara falls", "cn tower", "banff national park", "chichen itza", "teotihuacan",
  "machu picchu", "christ the redeemer", "moai statues", "iguazu falls", "salar de uyuni", "angel falls", "galapagos islands", "sugarloaf mountain",
  "torres del paine", "perito moreno glacier", "eiffel tower", "louvre museum", "notre-dame cathedral", "palace of versailles", "arc de triomphe",
  "mont saint-michel", "colosseum", "leaning tower of pisa", "pantheon", "trevi fountain", "st. mark's basilica", "pompeii", "big ben", "stonehenge",
  "tower bridge", "buckingham palace", "edinburgh castle", "giant's causeway", "la sagrada familia", "alhambra", "neuschwanstein castle",
  "brandenburg gate", "cologne cathedral", "acropolis of athens", "santorini caldera", "st. basil's cathedral", "the kremlin and red square",
  "hermitage museum", "st. peter's basilica", "sistine chapel", "the little mermaid statue", "matterhorn", "blue lagoon", "szechenyi chain bridge",
  "prague astronomical clock", "great wall of china", "forbidden city", "terracotta army", "potala palace", "taj mahal", "golden temple",
  "mount everest", "mount fuji", "fushimi inari shrine", "tokyo tower", "angkor wat", "petronas twin towers", "burj khalifa", "burj al arab",
  "sheikh zayed grand mosque", "petra", "hagia sophia", "blue mosque", "cappadocia fairy chimneys", "western wall", "dome of the rock",
  "shwedagon pagoda", "borobudur", "pyramids of giza", "great sphinx of giza", "luxor temple", "valley of the kings", "mount kilimanjaro",
  "serengeti national park", "victoria falls", "table mountain", "robben island", "rock-hewn churches of lalibela", "sydney opera house",
  "sydney harbour bridge", "uluru ayers rock", "great barrier reef", "milford sound", "hobbiton movie set"
];

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

window.GrammarQuestAvatar = {
  render: renderStudentAvatarSvg
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
        <input type="text" name="loginName" autocomplete="username" required>
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
        <input type="text" name="studentName" autocomplete="off" required>
      </label>
      <label class="student-field student-field-login">
        <span>Fun Login Name</span>
        <input type="text" name="loginName" autocomplete="off" data-student-login-name required>
      </label>
      <div class="login-name-builder" aria-label="Fun login name builder">
        <label class="login-builder-field">
          <span>Personality</span>
          <select name="favoritePersonality" data-login-part="personality">${renderOptionList(LOGIN_PERSONALITIES, "creative")}</select>
          <span class="login-ignore-option">
            <input type="checkbox" data-login-ignore="personality">
            <span>Ignore in suggested name</span>
          </span>
        </label>
        <label class="login-builder-field">
          <span>Favorite Bird</span>
          <select name="favoriteBird" data-login-part="bird">${renderOptionList(LOGIN_BIRDS, "blue jay")}</select>
          <span class="login-ignore-option">
            <input type="checkbox" data-login-ignore="bird">
            <span>Ignore in suggested name</span>
          </span>
        </label>
        <label class="login-builder-field">
          <span>Favorite Ocean Animal</span>
          <select name="favoriteOceanAnimal" data-login-part="ocean">${renderOptionList(LOGIN_OCEAN_ANIMALS, "dolphin")}</select>
          <span class="login-ignore-option">
            <input type="checkbox" data-login-ignore="ocean">
            <span>Ignore in suggested name</span>
          </span>
        </label>
        <label class="login-builder-field">
          <span>Favorite Landmark</span>
          <select name="favoriteCharacter" data-login-part="character">${renderOptionList(LOGIN_LANDMARKS, "statue of liberty")}</select>
          <span class="login-ignore-option">
            <input type="checkbox" data-login-ignore="character">
            <span>Ignore in suggested name</span>
          </span>
        </label>
      </div>
      <div class="student-avatar-preview" data-student-avatar-preview>
        ${renderStudentAvatarSvg({ bird: "blue jay", ocean: "dolphin", character: "statue of liberty", studentName: "Student" })}
      </div>
      <label class="student-field student-field-grade">
        <span>Default Grade</span>
        <select name="defaultGrade" autocomplete="off">
          ${renderGradeOptions("4")}
        </select>
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
    if (suggestButton) await suggestLoginName(suggestButton);
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

  document.addEventListener("change", async event => {
    const gradeSelect = event.target.closest("[data-student-default-grade-id]");
    const loginPartSelect = event.target.closest("[data-login-part]");
    const loginIgnoreToggle = event.target.closest("[data-login-ignore]");
    if (gradeSelect) {
      await handleDefaultGradeChange(gradeSelect.dataset.studentDefaultGradeId, gradeSelect.value);
    }
    if (loginPartSelect) {
      updateAvatarPreview(loginPartSelect);
      await suggestLoginName(loginPartSelect);
    }
    if (loginIgnoreToggle) {
      await suggestLoginName(loginIgnoreToggle);
    }
  });

  document.addEventListener("input", event => {
    if (event.target.matches('[name="studentName"]')) {
      updateAvatarPreview(event.target);
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

async function createManagedStudent({ studentName, loginName, defaultGrade, avatarParts }) {
  await readyPromise;
  requireGrownup();

  const cleanName = String(studentName || "").trim();
  const normalizedLogin = normalizeLoginName(loginName);
  const normalizedGrade = normalizeDefaultGrade(defaultGrade);
  const normalizedAvatarParts = { ...normalizeAvatarParts(avatarParts), studentName: cleanName };
  if (!cleanName) throw new Error("Enter a student name.");
  if (!normalizedLogin) throw new Error("Enter a login name.");
  const existingStudents = await loadManagedStudents();
  if (existingStudents.some(student => normalizeStudentName(student.name) === normalizeStudentName(cleanName))) {
    throw new Error("That student name already exists in this parent account. Use a unique student name.");
  }

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
      defaultGrade: normalizedGrade,
      avatarParts: normalizedAvatarParts,
      createdAt: firestoreModule.serverTimestamp()
    });
    transaction.set(studentRef, {
      ownerUid: state.user.uid,
      studentId,
      studentName: cleanName,
      loginName: normalizedLogin,
      defaultGrade: normalizedGrade,
      avatarParts: normalizedAvatarParts,
      progress: progressStore?.getDefaultProgress?.() || {},
      createdAt: firestoreModule.serverTimestamp(),
      updatedAt: firestoreModule.serverTimestamp()
    });
  });
  return {
    id: studentId,
    name: cleanName,
    loginName: normalizedLogin,
    defaultGrade: normalizedGrade,
    avatarParts: normalizedAvatarParts,
    avatarSvg: renderStudentAvatarSvg({ ...normalizedAvatarParts, studentName: cleanName }),
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
    defaultGrade: student.defaultGrade || "4",
    avatarParts: normalizeAvatarParts({ ...student.avatarParts, studentName: student.name }),
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
    defaultGrade: normalizeDefaultGrade(studentData.defaultGrade || loginData.defaultGrade || "4"),
    avatarParts: normalizeAvatarParts({ ...(studentData.avatarParts || loginData.avatarParts), studentName: studentData.studentName || loginData.studentName || "Student" }),
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
      defaultGrade: normalizeDefaultGrade(data.defaultGrade || "4"),
      avatarParts: normalizeAvatarParts(data.avatarParts),
      avatarSvg: renderStudentAvatarSvg({ ...data.avatarParts, studentName: data.studentName || "Student" }),
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

async function updateManagedStudentDefaultGrade(studentId, defaultGrade) {
  await readyPromise;
  requireGrownup();
  const normalizedGrade = normalizeDefaultGrade(defaultGrade);
  const student = await findManagedStudent(studentId);
  const { db, firestoreModule } = state.firebase;
  const batch = firestoreModule.writeBatch(db);
  batch.update(managedStudentRef(db, firestoreModule, studentId), {
    defaultGrade: normalizedGrade,
    updatedAt: firestoreModule.serverTimestamp()
  });
  if (student.loginName) {
    batch.set(firestoreModule.doc(db, loginCollection(), student.loginName), {
      defaultGrade: normalizedGrade,
      updatedAt: firestoreModule.serverTimestamp()
    }, { merge: true });
  }
  await batch.commit();
  return normalizedGrade;
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
      loginName: formData.get("loginName"),
      defaultGrade: formData.get("defaultGrade"),
      avatarParts: {
        bird: formData.get("favoriteBird"),
        ocean: formData.get("favoriteOceanAnimal"),
        character: formData.get("favoriteCharacter"),
        studentName: formData.get("studentName")
      }
    });
    showMessage(`${student.name} is ready. Default grade: ${displayDefaultGrade(student.defaultGrade)}.`);
    const createForm = form || document.querySelector("[data-create-student-form]");
    if (createForm) {
      createForm.reset();
      updateAvatarPreview(createForm);
    }
    await renderStudentProfiles();
  } catch (error) {
    showMessage(error.message);
  }
}

async function handleDefaultGradeChange(studentId, defaultGrade) {
  try {
    const normalizedGrade = await updateManagedStudentDefaultGrade(studentId, defaultGrade);
    showParentNotice(`Default grade updated to ${displayDefaultGrade(normalizedGrade)}.`, "success");
    await renderStudentProfiles();
  } catch (error) {
    showParentNotice(authErrorMessage(error), "error");
    await renderStudentProfiles();
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
  return `${rootRelativePath()}reports.html`;
}

function appHomeHref() {
  return `${rootRelativePath()}index.html`;
}

function rootRelativePath() {
  const path = window.location.pathname || "";
  if (!path.includes("/topics/")) return "";
  const afterTopics = path.split("/topics/")[1] || "";
  const depth = afterTopics.split("/").filter(Boolean).length;
  return "../".repeat(Math.max(1, depth));
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
  document.querySelectorAll('a.topic-card[href], a.subtopic-item[href], a.back-link[href], a[href*="topics/"][href$="index.html"]').forEach(link => {
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
        <div class="student-profile-avatar">
          ${renderStudentAvatarSvg({ ...student.avatarParts, studentName: student.name })}
        </div>
        <div>
          <strong>${escapeHtml(student.name)}</strong>
          <span>${escapeHtml(student.loginName)}</span>
          <span>Default grade: ${escapeHtml(displayDefaultGrade(student.defaultGrade))}</span>
        </div>
        <label class="student-grade-control">
          <span>Default Grade</span>
          <select data-student-default-grade-id="${escapeHtml(student.id)}">
            ${renderGradeOptions(student.defaultGrade)}
          </select>
        </label>
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

async function suggestLoginName(button) {
  const scope = button?.closest("[data-create-student-form], [data-grownup-tools], [data-auth-gate-grownup-tools]") || document;
  const input = scope.querySelector("[data-student-login-name]");
  if (!input) return;
  const parts = getLoginPartsFromScope(scope);
  const baseName = buildLoginNameBase(parts);
  input.value = await getAvailableLoginSuggestion(baseName);
}

function updateAvatarPreview(control) {
  const scope = control?.closest("[data-create-student-form]") || document;
  const preview = scope.querySelector("[data-student-avatar-preview]");
  if (!preview) return;
  preview.innerHTML = renderStudentAvatarSvg(getLoginPartsFromScope(scope));
}

function getLoginPartsFromScope(scope) {
  const avatarParts = normalizeAvatarParts({
    bird: scope.querySelector('[data-login-part="bird"]')?.value,
    ocean: scope.querySelector('[data-login-part="ocean"]')?.value,
    character: scope.querySelector('[data-login-part="character"]')?.value,
    studentName: scope.querySelector('[name="studentName"]')?.value
  });
  return {
    ...avatarParts,
    personality: normalizeChoice(scope.querySelector('[data-login-part="personality"]')?.value, LOGIN_PERSONALITIES, "creative"),
    ignoredLoginParts: getIgnoredLoginParts(scope)
  };
}

function getIgnoredLoginParts(scope) {
  return Array.from(scope.querySelectorAll("[data-login-ignore]:checked"))
    .map(input => input.dataset.loginIgnore)
    .filter(Boolean);
}

function buildLoginNameBase(parts) {
  const ignored = new Set(parts.ignoredLoginParts || []);
  const values = [
    ["personality", parts.personality],
    ["bird", parts.bird],
    ["ocean", parts.ocean],
    ["character", parts.character]
  ]
    .filter(([key, value]) => !ignored.has(key) && value)
    .map(([, value]) => value);
  return normalizeLoginName(values.join("-")) || "student";
}

async function getAvailableLoginSuggestion(baseName) {
  const cleanBase = normalizeLoginName(baseName) || "student";
  for (let suffix = 0; suffix < 1000; suffix += 1) {
    const candidate = suffix ? `${cleanBase}-${suffix}` : cleanBase;
    if (!(await loginNameExists(candidate))) return candidate;
  }
  return `${cleanBase}-${Date.now().toString(36)}`;
}

async function loginNameExists(loginName) {
  if (!state.enabled || !state.firebase) return false;
  const normalized = normalizeLoginName(loginName);
  if (!normalized) return false;
  const { db, firestoreModule } = state.firebase;
  const snapshot = await firestoreModule.getDoc(firestoreModule.doc(db, loginCollection(), normalized));
  return snapshot.exists();
}

function renderOptionList(options, selectedValue) {
  const selected = String(selectedValue || "").toLowerCase();
  return options.map(option => `
    <option value="${escapeHtml(option)}" ${option.toLowerCase() === selected ? "selected" : ""}>${escapeHtml(titleCaseDisplay(option))}</option>
  `).join("");
}

function renderGradeOptions(selectedGrade) {
  const selected = normalizeDefaultGrade(selectedGrade);
  return ["3", "4", "5", "6"].map(grade => `
    <option value="${grade}" ${grade === selected ? "selected" : ""}>${displayDefaultGrade(grade)}</option>
  `).join("");
}

function normalizeDefaultGrade(value) {
  const grade = String(value || "").trim();
  return ["3", "4", "5", "6"].includes(grade) ? grade : "4";
}

function displayDefaultGrade(value) {
  return `Grade ${normalizeDefaultGrade(value)}`;
}

function normalizeAvatarParts(parts) {
  const source = parts || {};
  return {
    bird: normalizeChoice(source.bird, LOGIN_BIRDS, "blue jay"),
    ocean: normalizeChoice(source.ocean, LOGIN_OCEAN_ANIMALS, "dolphin"),
    character: normalizeChoice(source.character, LOGIN_LANDMARKS, "statue of liberty"),
    studentName: String(source.studentName || "").trim()
  };
}

function normalizeChoice(value, options, fallback) {
  const clean = String(value || "").trim().toLowerCase();
  return options.includes(clean) ? clean : fallback;
}

function renderStudentAvatarSvg(parts) {
  const avatar = normalizeAvatarParts(parts);
  const birdColor = colorFromText(avatar.bird, ["#2563eb", "#16a34a", "#f97316", "#db2777", "#7c3aed", "#0891b2"]);
  const birdAccent = colorFromText(`${avatar.bird}-accent`, ["#fde68a", "#bfdbfe", "#fecaca", "#bbf7d0", "#ddd6fe", "#fed7aa"]);
  const oceanColor = colorFromText(avatar.ocean, ["#0ea5e9", "#14b8a6", "#6366f1", "#06b6d4", "#0284c7", "#10b981"]);
  const landmarkColor = colorFromText(avatar.character, ["#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#22c55e", "#3b82f6"]);
  const landmarkAccent = colorFromText(`${avatar.character}-landmark`, ["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#ede9fe", "#cffafe"]);
  const animal = getOceanAnimalShape(avatar.ocean, oceanColor);
  const bird = getBirdShape(avatar.bird, birdColor, birdAccent);
  const landmark = getLandmarkShape(avatar.character, landmarkColor, landmarkAccent);
  const studentInitial = getStudentInitial(avatar.studentName);
  const title = `${titleCaseDisplay(avatar.bird)}, ${titleCaseDisplay(avatar.ocean)}, and ${titleCaseDisplay(avatar.character)} avatar for ${avatar.studentName || "Student"}`;

  return `
    <svg class="student-avatar-svg" viewBox="0 0 180 180" role="img" aria-label="${escapeHtml(title)}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sea-${slugForSvg(title)}" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#e0f2fe"/>
          <stop offset="0.52" stop-color="#a7f3d0"/>
          <stop offset="1" stop-color="#bfdbfe"/>
        </linearGradient>
        <radialGradient id="sun-${slugForSvg(title)}" cx="32%" cy="22%" r="52%">
          <stop offset="0" stop-color="#fff7ed"/>
          <stop offset="1" stop-color="#fef3c7" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="180" height="180" rx="36" fill="url(#sea-${slugForSvg(title)})"/>
      <circle cx="56" cy="38" r="44" fill="url(#sun-${slugForSvg(title)})"/>
      <path d="M0 121 C28 108 46 137 75 123 S125 106 180 124 L180 180 L0 180 Z" fill="#0ea5e9" opacity=".26"/>
      <path d="M0 142 C34 128 58 156 91 141 S138 126 180 145 L180 180 L0 180 Z" fill="#0284c7" opacity=".24"/>
      <path d="M18 137 C26 132 35 132 43 137 M118 132 C126 127 136 127 144 132" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".8"/>
      ${animal}
      ${bird}
      <g transform="translate(112 92)">
        <circle cx="31" cy="31" r="28" fill="#ffffff" opacity=".93"/>
        <circle cx="31" cy="31" r="22" fill="${landmarkAccent}" opacity=".94"/>
        ${landmark}
        <circle cx="48" cy="48" r="11" fill="${landmarkColor}" stroke="#ffffff" stroke-width="3"/>
        <text x="48" y="53" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="#ffffff">${escapeHtml(studentInitial)}</text>
      </g>
      <g opacity=".82">
        <circle cx="35" cy="76" r="5" fill="#ffffff"/>
        <circle cx="151" cy="58" r="4" fill="#ffffff"/>
        <circle cx="32" cy="108" r="3" fill="#ffffff"/>
        <path d="M149 23 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z" fill="#ffffff" opacity=".9"/>
      </g>
    </svg>
  `;
}

const LANDMARK_SVG_TYPES = {
  "statue of liberty": "statue",
  "golden gate bridge": "suspensionBridge",
  "empire state building": "skyscraper",
  "mount rushmore": "mountainFaces",
  "grand canyon": "canyon",
  "the white house": "whiteHouse",
  "gateway arch": "arch",
  "times square": "billboards",
  "united states capitol": "capitol",
  "space needle": "needle",
  "hollywood sign": "sign",
  "niagara falls": "falls",
  "cn tower": "tower",
  "banff national park": "mountains",
  "chichen itza": "steppedPyramid",
  "teotihuacan": "steppedPyramid",
  "machu picchu": "terraces",
  "christ the redeemer": "crossStatue",
  "moai statues": "heads",
  "iguazu falls": "falls",
  "salar de uyuni": "saltFlat",
  "angel falls": "thinFalls",
  "galapagos islands": "islands",
  "sugarloaf mountain": "singlePeak",
  "torres del paine": "jaggedPeaks",
  "perito moreno glacier": "glacier",
  "eiffel tower": "ironTower",
  "louvre museum": "museumPyramid",
  "notre-dame cathedral": "cathedral",
  "palace of versailles": "palace",
  "arc de triomphe": "triumphArch",
  "mont saint-michel": "islandAbbey",
  "colosseum": "arena",
  "leaning tower of pisa": "leaningTower",
  "pantheon": "domeTemple",
  "trevi fountain": "fountain",
  "st. mark's basilica": "basilica",
  "pompeii": "columns",
  "big ben": "clockTower",
  "stonehenge": "stones",
  "tower bridge": "towerBridge",
  "buckingham palace": "palace",
  "edinburgh castle": "castle",
  "giant's causeway": "basalt",
  "la sagrada familia": "spires",
  "alhambra": "fortress",
  "neuschwanstein castle": "fairyCastle",
  "brandenburg gate": "gate",
  "cologne cathedral": "gothicCathedral",
  "acropolis of athens": "acropolis",
  "santorini caldera": "caldera",
  "st. basil's cathedral": "onionDomes",
  "the kremlin and red square": "squareWalls",
  "hermitage museum": "palace",
  "st. peter's basilica": "basilicaDome",
  "sistine chapel": "chapel",
  "the little mermaid statue": "mermaid",
  "matterhorn": "sharpMountain",
  "blue lagoon": "lagoon",
  "szechenyi chain bridge": "chainBridge",
  "prague astronomical clock": "astronomicalClock",
  "great wall of china": "greatWall",
  "forbidden city": "palaceRoof",
  "terracotta army": "warriors",
  "potala palace": "tieredPalace",
  "taj mahal": "mausoleum",
  "golden temple": "goldTemple",
  "mount everest": "snowMountain",
  "mount fuji": "fuji",
  "fushimi inari shrine": "torii",
  "tokyo tower": "ironTower",
  "angkor wat": "templeTowers",
  "petronas twin towers": "twinTowers",
  "burj khalifa": "needleSkyscraper",
  "burj al arab": "sailHotel",
  "sheikh zayed grand mosque": "mosque",
  "petra": "rockCity",
  "hagia sophia": "domeTemple",
  "blue mosque": "mosque",
  "cappadocia fairy chimneys": "chimneys",
  "western wall": "wallStones",
  "dome of the rock": "goldDome",
  "shwedagon pagoda": "pagoda",
  "borobudur": "buddhistTemple",
  "pyramids of giza": "pyramids",
  "great sphinx of giza": "sphinx",
  "luxor temple": "templeColumns",
  "valley of the kings": "desertTomb",
  "mount kilimanjaro": "snowMountain",
  "serengeti national park": "savanna",
  "victoria falls": "falls",
  "table mountain": "flatMountain",
  "robben island": "islandPrison",
  "rock-hewn churches of lalibela": "carvedChurch",
  "sydney opera house": "operaHouse",
  "sydney harbour bridge": "archBridge",
  "uluru ayers rock": "monolith",
  "great barrier reef": "reef",
  "milford sound": "sound",
  "hobbiton movie set": "roundDoor"
};

function getLandmarkShape(landmarkName, fillColor, accentColor) {
  const type = LANDMARK_SVG_TYPES[landmarkName] || "tower";
  const seed = numericSeed(landmarkName);
  const shade = colorFromText(`${landmarkName}-shade`, ["#334155", "#475569", "#1f2937", "#0f766e", "#7c2d12"]);
  const sun = colorFromText(`${landmarkName}-sun`, ["#facc15", "#fb923c", "#fcd34d", "#fef08a"]);
  const line = `stroke="${shade}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
  const base = `<path d="M10 49 H52" ${line} opacity=".35"/>`;
  const mountain = (extra = "") => `${base}<path d="M7 47 L22 22 L32 39 L42 17 L57 47 Z" fill="${fillColor}"/><path d="M22 22 l5 10 l5 -10 M42 17 l5 12 l5 -12" fill="${accentColor}" opacity=".92"/>${extra}`;
  const bridge = (arch = false) => `${base}<path d="${arch ? "M8 42 C22 22 40 22 54 42" : "M8 36 C22 20 40 20 54 36"}" fill="none" ${line}/><path d="M13 20 V49 M49 20 V49" ${line}/><path d="M8 36 H54" ${line}/><path d="M18 36 V48 M28 36 V48 M38 36 V48 M48 36 V48" ${line} opacity=".55"/>`;
  const dome = (minarets = false) => `${base}<path d="M17 44 H45 V31 C45 20 17 20 17 31 Z" fill="${fillColor}"/><path d="M31 14 C37 20 42 24 42 31 H20 C20 24 25 20 31 14 Z" fill="${accentColor}"/>${minarets ? '<path d="M10 47 V23 M52 47 V23 M10 23 l3 5 h-6 Z M52 23 l3 5 h-6 Z" ' + line + '/>' : ""}`;

  switch (type) {
    case "statue":
      return `${base}<path d="M31 17 L38 47 H24 Z" fill="${fillColor}"/><path d="M25 22 L18 15 M37 22 L45 14" ${line}/><path d="M31 9 l3 7 h-6 Z" fill="${sun}"/><path d="M20 13 l-3 -7 M44 12 l3 -7" ${line}/>`;
    case "suspensionBridge":
    case "chainBridge":
      return bridge(false);
    case "archBridge":
    case "towerBridge":
      return `${bridge(type === "archBridge")}<path d="M10 23 H18 V49 H10 Z M44 23 H52 V49 H44 Z" fill="${fillColor}"/><path d="M13 18 h2 M47 18 h2" ${line}/>`;
    case "skyscraper":
      return `${base}<path d="M21 48 V14 L32 7 L43 14 V48 Z" fill="${fillColor}"/><path d="M27 19 H35 M27 27 H35 M27 35 H35" ${line} opacity=".65"/>`;
    case "needleSkyscraper":
      return `${base}<path d="M31 7 L39 48 H23 Z" fill="${fillColor}"/><path d="M26 26 H36" ${line}/><path d="M31 7 V3" ${line}/>`;
    case "mountainFaces":
      return `${mountain('<circle cx="21" cy="36" r="3" fill="#f8fafc"/><circle cx="33" cy="35" r="3" fill="#f8fafc"/><circle cx="44" cy="35" r="3" fill="#f8fafc"/>')}`;
    case "canyon":
      return `${base}<path d="M9 24 H54 L45 48 H16 Z" fill="${fillColor}"/><path d="M15 30 H48 M20 37 H43" ${line} opacity=".5"/>`;
    case "whiteHouse":
    case "capitol":
      return `${base}<path d="M14 47 V31 H48 V47 Z" fill="${fillColor}"/><path d="M12 31 H50 L31 18 Z" fill="${accentColor}"/><path d="M21 47 V35 M31 47 V35 M41 47 V35" ${line}/>${type === "capitol" ? '<path d="M22 28 C22 14 40 14 40 28" fill="' + accentColor + '"/>' : ""}`;
    case "arch":
    case "triumphArch":
      return `${base}<path d="M16 48 V19 H46 V48 H38 V32 C38 22 24 22 24 32 V48 Z" fill="${fillColor}"/><path d="M20 23 H42 M20 28 H42" ${line} opacity=".5"/>`;
    case "billboards":
      return `${base}<rect x="10" y="14" width="19" height="20" rx="2" fill="${fillColor}"/><rect x="33" y="10" width="19" height="25" rx="2" fill="${accentColor}"/><path d="M14 40 V34 M46 42 V35 M15 22 H24 M38 19 H48" ${line}/>`;
    case "needle":
    case "tower":
      return `${base}<path d="M31 8 V48" ${line}/><ellipse cx="31" cy="20" rx="16" ry="5" fill="${fillColor}"/><path d="M24 48 L31 20 L38 48" fill="none" ${line}/>`;
    case "sign":
      return `${base}<path d="M11 28 H51" ${line}/><path d="M13 27 l4 -8 l4 8 M24 27 v-8 h7 M35 27 l4 -8 l4 8 M46 27 v-8" ${line}/>`;
    case "falls":
    case "thinFalls":
      return `${base}<path d="M14 14 H49 V46 H14 Z" fill="${fillColor}" opacity=".45"/><path d="${type === "thinFalls" ? "M31 15 V48" : "M22 15 V48 M32 15 V48 M42 15 V48"}" stroke="#ffffff" stroke-width="${type === "thinFalls" ? 5 : 6}" stroke-linecap="round"/><path d="M15 47 C23 42 37 52 49 46" fill="none" stroke="${accentColor}" stroke-width="4"/>`;
    case "mountains":
    case "jaggedPeaks":
    case "sharpMountain":
    case "snowMountain":
    case "fuji":
    case "singlePeak":
      return mountain(type === "fuji" ? `<path d="M18 47 C28 39 40 39 49 47" fill="none" stroke="${accentColor}" stroke-width="4"/>` : "");
    case "steppedPyramid":
    case "pyramids":
      return `${base}<path d="M12 48 H50 L31 14 Z" fill="${fillColor}"/><path d="M19 39 H43 M23 31 H39 M27 23 H35" ${line} opacity=".5"/>`;
    case "terraces":
      return `${base}<path d="M10 46 H54 L46 20 L20 25 Z" fill="${fillColor}"/><path d="M15 40 H49 M18 34 H46 M22 28 H42" ${line} opacity=".58"/>`;
    case "crossStatue":
      return `${base}<circle cx="31" cy="15" r="5" fill="${fillColor}"/><path d="M31 20 V48 M16 27 H46" ${line}/>`;
    case "heads":
      return `${base}<path d="M15 45 V22 C15 14 28 14 28 22 V45 Z M35 45 V21 C35 13 49 13 49 21 V45 Z" fill="${fillColor}"/><path d="M19 28 h5 M39 28 h5 M21 37 h4 M41 37 h4" ${line} opacity=".6"/>`;
    case "saltFlat":
    case "lagoon":
      return `${base}<path d="M11 42 C22 35 39 48 51 39" fill="none" stroke="${fillColor}" stroke-width="6"/><circle cx="45" cy="19" r="8" fill="${sun}"/><path d="M14 31 H48" ${line} opacity=".35"/>`;
    case "islands":
      return `${base}<path d="M13 43 C19 31 31 31 36 43 Z M31 45 C39 30 51 32 55 45 Z" fill="${fillColor}"/><path d="M22 31 C20 22 27 19 31 26" fill="none" ${line}/>`;
    case "glacier":
      return `${base}<path d="M13 47 L20 18 L31 47 L40 19 L51 47 Z" fill="${fillColor}"/><path d="M20 18 l4 11 l4 -11 M40 19 l4 10 l4 -10" fill="#ffffff" opacity=".9"/>`;
    case "ironTower":
      return `${base}<path d="M31 8 L47 48 H15 Z M24 27 H38 M20 39 H42" fill="none" ${line}/><path d="M27 17 H35" ${line}/>`;
    case "museumPyramid":
      return `${base}<path d="M13 47 L31 16 L49 47 Z" fill="${fillColor}" opacity=".7"/><path d="M21 47 L31 16 L41 47 M18 38 H44" ${line} opacity=".45"/>`;
    case "cathedral":
    case "gothicCathedral":
      return `${base}<path d="M14 48 V25 L22 12 L30 25 V48 Z M32 48 V25 L40 12 L48 25 V48 Z" fill="${fillColor}"/><path d="M25 48 V36 C25 29 37 29 37 36 V48" fill="${accentColor}"/>`;
    case "palace":
    case "fortress":
    case "castle":
    case "fairyCastle":
      return `${base}<path d="M12 48 V24 H22 V18 H28 V24 H36 V16 H43 V24 H51 V48 Z" fill="${fillColor}"/><path d="M25 48 V37 C25 31 38 31 38 37 V48" fill="${accentColor}"/>`;
    case "islandAbbey":
      return `${base}<path d="M12 48 C20 35 40 35 51 48 Z" fill="${fillColor}"/><path d="M24 38 V20 L31 12 L39 20 V38 Z" fill="${accentColor}"/>`;
    case "arena":
      return `${base}<ellipse cx="31" cy="31" rx="22" ry="13" fill="${fillColor}"/><ellipse cx="31" cy="31" rx="12" ry="6" fill="${accentColor}"/><path d="M14 34 H48" ${line} opacity=".45"/>`;
    case "leaningTower":
      return `${base}<g transform="rotate(-8 31 31)"><path d="M23 48 V14 H39 V48 Z" fill="${fillColor}"/><path d="M21 20 H41 M21 28 H41 M21 36 H41" ${line}/></g>`;
    case "domeTemple":
    case "basilicaDome":
      return dome(false);
    case "fountain":
      return `${base}<path d="M18 35 C20 49 42 49 44 35 Z" fill="${fillColor}"/><path d="M31 15 V35 M20 25 C24 18 28 18 31 25 M42 25 C38 18 34 18 31 25" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>`;
    case "basilica":
      return `${base}<path d="M12 47 V28 H50 V47 Z" fill="${fillColor}"/><path d="M19 28 C19 14 31 14 31 28 C31 14 43 14 43 28" fill="${accentColor}"/><path d="M20 47 V35 M31 47 V35 M42 47 V35" ${line}/>`;
    case "columns":
    case "templeColumns":
    case "acropolis":
      return `${base}<path d="M11 25 H51 L31 14 Z" fill="${accentColor}"/><path d="M17 47 V27 M26 47 V27 M35 47 V27 M44 47 V27" ${line}/>`;
    case "clockTower":
    case "astronomicalClock":
      return `${base}<path d="M21 48 V15 H41 V48 Z" fill="${fillColor}"/><circle cx="31" cy="27" r="8" fill="${accentColor}"/><path d="M31 27 V22 M31 27 L36 30" ${line}/>`;
    case "stones":
    case "basalt":
      return `${base}<path d="M13 47 V25 H23 V47 M29 47 V18 H39 V47 M45 47 V27 H53 V47" fill="none" ${line}/><path d="M12 24 H54" ${line}/>`;
    case "spires":
      return `${base}<path d="M13 48 V25 L18 10 L23 25 V48 M27 48 V20 L32 7 L37 20 V48 M41 48 V25 L46 10 L51 25 V48" fill="${fillColor}"/>`;
    case "gate":
      return `${base}<path d="M12 47 V24 H50 V47 M19 24 V18 H43 V24 M22 47 V32 H40 V47" fill="none" ${line}/>`;
    case "caldera":
      return `${base}<path d="M9 39 C20 21 41 21 54 39" fill="none" stroke="${fillColor}" stroke-width="8"/><path d="M14 43 C25 35 38 49 49 41" fill="none" stroke="#ffffff" stroke-width="4"/>`;
    case "onionDomes":
      return `${base}<path d="M13 48 V30 H49 V48 Z" fill="${fillColor}"/><path d="M18 30 C11 17 28 12 31 27 C34 12 51 17 44 30 Z" fill="${accentColor}"/>`;
    case "squareWalls":
    case "wallStones":
      return `${base}<path d="M12 47 V22 H50 V47 Z" fill="${fillColor}"/><path d="M12 31 H50 M12 39 H50 M22 22 V47 M36 22 V47" ${line} opacity=".55"/>`;
    case "chapel":
      return `${base}<path d="M18 48 V24 L31 13 L44 24 V48 Z" fill="${fillColor}"/><path d="M31 17 V9 M27 13 H35" ${line}/>`;
    case "mermaid":
      return `${base}<path d="M31 16 C39 24 36 35 30 41 C37 39 44 42 49 48 M30 41 C23 39 18 42 13 48" fill="none" ${line}/><circle cx="31" cy="13" r="5" fill="${fillColor}"/>`;
    case "greatWall":
      return `${base}<path d="M8 44 C20 30 35 54 55 31" fill="none" stroke="${fillColor}" stroke-width="9"/><path d="M13 39 h8 M30 44 h8 M46 35 h8" ${line} opacity=".55"/>`;
    case "palaceRoof":
    case "tieredPalace":
      return `${base}<path d="M13 47 V34 H49 V47 Z M17 34 V25 H45 V34 Z M22 25 V17 H40 V25 Z" fill="${fillColor}"/><path d="M10 34 H52 M15 25 H47 M20 17 H42" ${line}/>`;
    case "warriors":
      return `${base}<circle cx="20" cy="23" r="6" fill="${fillColor}"/><circle cx="31" cy="20" r="7" fill="${fillColor}"/><circle cx="43" cy="24" r="6" fill="${fillColor}"/><path d="M16 47 V34 H46 V47" fill="${fillColor}"/>`;
    case "mausoleum":
      return `${base}<path d="M14 47 V31 H48 V47 Z" fill="${fillColor}"/><path d="M21 31 C21 14 41 14 41 31" fill="${accentColor}"/><path d="M9 47 V23 M53 47 V23" ${line}/>`;
    case "goldTemple":
    case "goldDome":
    case "pagoda":
    case "buddhistTemple":
      return `${base}<path d="M14 47 V35 H48 V47 Z M18 35 L31 24 L44 35 Z M21 25 L31 13 L41 25 Z" fill="${type === "goldDome" ? sun : fillColor}"/><path d="M18 35 H44 M21 25 H41" ${line} opacity=".55"/>`;
    case "torii":
      return `${base}<path d="M12 19 H50 M16 25 H46 M20 25 V49 M42 25 V49" ${line}/>`;
    case "templeTowers":
      return `${base}<path d="M13 48 V31 L20 16 L27 31 V48 M27 48 V26 L34 11 L41 26 V48 M41 48 V31 L48 16 L55 31 V48" fill="${fillColor}"/>`;
    case "twinTowers":
      return `${base}<path d="M16 48 V13 H28 V48 Z M35 48 V13 H47 V48 Z" fill="${fillColor}"/><path d="M28 28 H35" ${line}/><path d="M22 13 V8 M41 13 V8" ${line}/>`;
    case "sailHotel":
      return `${base}<path d="M22 48 C25 17 39 9 48 43 C38 36 31 38 22 48 Z" fill="${fillColor}"/><path d="M22 48 V13" ${line}/>`;
    case "mosque":
      return dome(true);
    case "rockCity":
      return `${base}<path d="M13 47 V18 H49 V47 Z" fill="${fillColor}"/><path d="M23 47 V31 C23 24 39 24 39 31 V47 M20 24 H42" ${line} opacity=".65"/>`;
    case "chimneys":
      return `${base}<path d="M15 48 L20 18 H27 L30 48 M35 48 L40 16 H47 L50 48" fill="${fillColor}"/><path d="M18 17 H29 M38 15 H49" ${line}/>`;
    case "desertTomb":
      return `${base}<path d="M10 48 C20 28 42 28 54 48 Z" fill="${fillColor}"/><path d="M27 48 V35 C27 29 37 29 37 35 V48" fill="${accentColor}"/>`;
    case "savanna":
      return `${base}<circle cx="46" cy="18" r="8" fill="${sun}"/><path d="M17 47 C22 31 38 31 43 47 Z" fill="${fillColor}"/><path d="M21 31 C20 22 28 20 31 26" fill="none" ${line}/>`;
    case "flatMountain":
      return `${base}<path d="M10 47 L18 24 H48 L56 47 Z" fill="${fillColor}"/><path d="M19 24 H47" ${line}/>`;
    case "islandPrison":
      return `${base}<path d="M12 47 C19 34 42 34 52 47 Z" fill="${fillColor}"/><path d="M23 40 V25 H40 V40 Z" fill="${accentColor}"/><path d="M27 40 V28 M32 40 V28 M37 40 V28" ${line}/>`;
    case "carvedChurch":
      return `${base}<path d="M15 48 V20 H47 V48 Z" fill="${fillColor}"/><path d="M23 48 V34 C23 27 39 27 39 34 V48 M31 20 V12 M25 16 H37" ${line}/>`;
    case "operaHouse":
      return `${base}<path d="M12 47 C18 27 27 20 32 47 C35 26 45 20 53 47 Z" fill="${fillColor}"/><path d="M20 45 C29 36 38 36 49 45" fill="none" ${line} opacity=".55"/>`;
    case "monolith":
      return `${base}<path d="M15 47 C19 24 32 16 49 31 C52 39 48 45 42 47 Z" fill="${fillColor}"/>`;
    case "reef":
      return `${base}<path d="M17 47 V30 M17 34 C9 30 10 20 19 25 M26 47 V25 M26 30 C34 24 39 31 33 37 M42 47 V31 M42 35 C51 29 55 39 47 43" fill="none" stroke="${fillColor}" stroke-width="5" stroke-linecap="round"/><circle cx="33" cy="17" r="5" fill="${sun}"/>`;
    case "sound":
      return `${mountain('<path d="M15 47 C27 39 38 54 50 43" fill="none" stroke="#ffffff" stroke-width="4"/>')}`;
    case "roundDoor":
      return `${base}<path d="M13 48 C14 28 48 28 49 48 Z" fill="${fillColor}"/><circle cx="31" cy="39" r="10" fill="${accentColor}"/><circle cx="38" cy="39" r="2" fill="${shade}"/>`;
    default:
      return `${base}<path d="M24 48 V15 H38 V48 Z" fill="${fillColor}"/><path d="M20 48 H42" ${line}/>`;
  }
}

function getStudentInitial(name) {
  const clean = String(name || "").trim();
  const match = clean.match(/[A-Za-z0-9]/);
  return (match ? match[0] : "S").toUpperCase();
}

function getBirdShape(birdName, fillColor, accentColor) {
  const traits = getBirdTraits(birdName);
  const beakColor = traits.beakColor || "#f59e0b";
  const legColor = traits.legColor || "#92400e";
  const wing = traits.wing === "barred"
    ? `<path d="M12 39 C24 20 39 23 44 38 C34 35 25 42 12 39 Z" fill="${accentColor}" opacity=".9"/><path d="M21 35 l17 9 M27 29 l15 8" stroke="#ffffff" stroke-width="3" opacity=".55"/>`
    : traits.wing === "spotted"
      ? `<path d="M12 39 C24 20 39 23 44 38 C34 35 25 42 12 39 Z" fill="${accentColor}" opacity=".9"/><circle cx="25" cy="36" r="2.2" fill="#ffffff" opacity=".7"/><circle cx="33" cy="39" r="1.8" fill="#ffffff" opacity=".7"/>`
      : `<path d="M12 39 C24 20 39 23 44 38 C34 35 25 42 12 39 Z" fill="${accentColor}" opacity=".9"/>`;
  const crest = traits.crest
    ? `<path d="${traits.crest === "fan" ? "M35 15 C36 0 50 0 51 15 M41 14 C42 -2 55 4 53 18" : "M32 15 L42 0 L48 16"}" fill="${accentColor}" stroke="${accentColor}" stroke-width="4" stroke-linecap="round"/>`
    : "";
  const neck = traits.neck === "long" ? `<path d="M35 31 C37 12 45 4 56 9 C51 21 50 31 50 42" fill="${fillColor}"/>` : "";
  const bill = traits.beak === "hook"
    ? `<path d="M53 28 C66 20 72 23 65 33 L55 36 Z" fill="${beakColor}"/>`
    : traits.beak === "long"
      ? `<path d="M53 28 L83 20 L56 36 Z" fill="${beakColor}"/>`
      : traits.beak === "flat"
        ? `<path d="M52 28 C65 19 76 22 75 30 C70 36 60 36 53 32 Z" fill="${beakColor}"/>`
        : `<path d="M53 28 L70 22 L55 36 Z" fill="${beakColor}"/>`;
  const tail = traits.tail === "fan"
    ? `<path d="M5 38 L-18 22 L-10 45 L-21 63 L6 48 Z" fill="${fillColor}"/><path d="M-12 28 L2 43 M-13 56 L3 45" stroke="${accentColor}" stroke-width="3" opacity=".75"/>`
    : traits.tail === "fork"
      ? `<path d="M7 39 L-15 25 L-8 42 L-18 57 L8 48 Z" fill="${fillColor}"/>`
      : `<path d="M8 39 L-11 31 L1 49 Z" fill="${fillColor}"/>`;
  const legs = traits.legs === "long"
    ? `<path d="M22 56 L14 78 M35 55 L43 78" stroke="${legColor}" stroke-width="4" stroke-linecap="round"/>`
    : `<path d="M21 56 L17 68 M34 55 L39 68" stroke="${legColor}" stroke-width="4" stroke-linecap="round"/>`;
  const markings = traits.marking === "mask"
    ? `<path d="M38 24 C44 19 52 19 57 25" fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" opacity=".78"/>`
    : traits.marking === "bib"
      ? `<path d="M41 34 C48 38 53 42 55 50 C47 50 40 45 37 38 Z" fill="${accentColor}" opacity=".85"/>`
      : "";

  return `
      <g transform="translate(${traits.x} ${traits.y}) scale(${traits.scale})">
        ${tail}
        <ellipse cx="23" cy="39" rx="${traits.bodyRx}" ry="${traits.bodyRy}" fill="${fillColor}"/>
        ${neck}
        <circle cx="43" cy="28" r="${traits.headR}" fill="${fillColor}"/>
        ${crest}
        ${bill}
        <circle cx="48" cy="24" r="3.2" fill="#0f172a"/>
        ${markings}
        ${wing}
        ${legs}
      </g>
  `;
}

function getBirdTraits(name) {
  const clean = String(name || "");
  const seed = numericSeed(clean);
  const traits = {
    x: 74 + (seed % 9) - 4,
    y: 48 + (seed % 7) - 3,
    scale: 0.92 + ((seed % 5) * 0.035),
    bodyRx: 22 + (seed % 7),
    bodyRy: 15 + (seed % 5),
    headR: 13 + (seed % 5),
    wing: ["plain", "barred", "spotted"][seed % 3],
    tail: ["point", "fan", "fork"][seed % 3],
    beak: "short",
    crest: false,
    neck: "short",
    legs: "short",
    marking: ["none", "mask", "bib"][seed % 3]
  };
  if (/owl|puffin|penguin|kiwi|quail|wren|chickadee|finch|sparrow|kinglet|junco/.test(clean)) {
    traits.bodyRx = 24; traits.bodyRy = 21; traits.headR = 17; traits.beak = "short"; traits.tail = "point";
  }
  if (/hummingbird|kingfisher|sandpiper|ibis|heron|egret|avocet|stork|crane|spoonbill|woodpecker|hoopoe|hornbill/.test(clean)) {
    traits.beak = "long";
  }
  if (/hawk|eagle|falcon|osprey|vulture|condor|kite|secretary|owl/.test(clean)) {
    traits.beak = "hook"; traits.marking = "mask"; traits.wing = "barred";
  }
  if (/duck|goose|swan|mallard|coot|pelican/.test(clean)) {
    traits.beak = "flat"; traits.bodyRx = 29; traits.bodyRy = 18; traits.legColor = "#f97316";
  }
  if (/flamingo|heron|egret|crane|stork|ibis|avocet|sandpiper/.test(clean)) {
    traits.neck = "long"; traits.legs = "long"; traits.bodyRx = 20; traits.bodyRy = 15; traits.y = 42;
  }
  if (/peacock|turkey|cassowary|ostrich|emu/.test(clean)) {
    traits.tail = "fan"; traits.bodyRx = 28; traits.bodyRy = 22; traits.legs = "long"; traits.crest = true;
  }
  if (/cardinal|cockatoo|crest|jay|waxwing|kinglet|hoopoe/.test(clean)) {
    traits.crest = true;
  }
  if (/macaw|parrot|lorikeet|parakeet|toucan|budgie/.test(clean)) {
    traits.beak = /toucan|hornbill/.test(clean) ? "long" : "hook"; traits.wing = "spotted"; traits.tail = "fork";
  }
  return traits;
}

function getOceanAnimalShape(oceanAnimal, fillColor) {
  const traits = getOceanAnimalTraits(oceanAnimal);
  const accent = colorFromText(`${oceanAnimal}-mark`, ["#ecfeff", "#cffafe", "#fef3c7", "#fce7f3", "#dcfce7"]);
  if (traits.type === "turtle") {
    return `<g transform="translate(${traits.x} ${traits.y}) scale(${traits.scale})"><ellipse cx="58" cy="34" rx="45" ry="27" fill="${fillColor}"/><path d="M28 21 C49 42 70 42 91 21 M23 34 H95 M42 12 C48 28 48 43 42 56 M74 12 C68 28 68 43 74 56" stroke="${accent}" stroke-width="4" opacity=".52"/><circle cx="107" cy="29" r="15" fill="${fillColor}"/><circle cx="112" cy="25" r="2.8" fill="#0f172a"/><path d="M18 20 L0 9 M18 48 L0 61 M93 15 L111 1 M91 53 L108 66" stroke="${fillColor}" stroke-width="13" stroke-linecap="round"/></g>`;
  }
  if (traits.type === "cephalopod") {
    const shell = /nautilus/.test(oceanAnimal) ? `<path d="M30 31 C31 9 62 4 76 20 C91 37 77 61 55 60 C37 59 27 47 30 31 Z" fill="${accent}" opacity=".72"/><path d="M48 25 C64 25 68 42 57 48 C47 54 37 44 42 35" fill="none" stroke="${fillColor}" stroke-width="5"/>` : "";
    return `<g transform="translate(${traits.x} ${traits.y}) scale(${traits.scale})">${shell}<ellipse cx="58" cy="34" rx="${traits.bodyRx}" ry="${traits.bodyRy}" fill="${fillColor}"/><circle cx="47" cy="27" r="4" fill="#0f172a"/><circle cx="68" cy="27" r="4" fill="#0f172a"/><path d="M48 44 C55 50 63 50 70 44" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/><path d="M28 58 C15 78 33 82 43 64 M47 62 C39 84 61 84 58 64 M69 62 C81 84 98 75 84 58 M35 59 C20 67 9 56 24 48 M82 58 C102 65 111 50 91 46" fill="none" stroke="${fillColor}" stroke-width="${traits.tentacleWidth}" stroke-linecap="round"/></g>`;
  }
  if (traits.type === "crustacean") {
    return `<g transform="translate(${traits.x} ${traits.y}) scale(${traits.scale})"><ellipse cx="56" cy="32" rx="${traits.bodyRx}" ry="${traits.bodyRy}" fill="${fillColor}"/><circle cx="43" cy="21" r="4" fill="#0f172a"/><circle cx="69" cy="21" r="4" fill="#0f172a"/><path d="M35 38 C47 48 66 48 78 38" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/><path d="M18 26 L2 13 M94 26 L112 13 M20 42 L4 53 M92 42 L108 54" stroke="${fillColor}" stroke-width="${traits.legWidth}" stroke-linecap="round"/><circle cx="0" cy="12" r="${traits.claw}" fill="${fillColor}"/><circle cx="112" cy="12" r="${traits.claw}" fill="${fillColor}"/></g>`;
  }
  if (traits.type === "ray") {
    return `<g transform="translate(${traits.x} ${traits.y}) scale(${traits.scale})"><path d="M15 43 C37 7 89 7 117 43 C88 71 40 72 15 43 Z" fill="${fillColor}"/><path d="M112 43 C129 50 140 62 151 77" fill="none" stroke="${fillColor}" stroke-width="9" stroke-linecap="round"/><circle cx="54" cy="35" r="3.4" fill="#0f172a"/><circle cx="78" cy="35" r="3.4" fill="#0f172a"/><path d="M38 47 C57 55 80 55 99 47" fill="none" stroke="${accent}" stroke-width="4" opacity=".65"/></g>`;
  }
  if (traits.type === "shark") {
    return `<g transform="translate(${traits.x} ${traits.y}) scale(${traits.scale})"><path d="M12 41 C42 5 95 7 130 39 C96 72 42 73 12 41 Z" fill="${fillColor}"/><path d="M78 16 L96 -7 L101 25 Z" fill="${fillColor}"/><path d="M124 39 L156 20 L146 43 L156 66 Z" fill="${fillColor}"/><circle cx="45" cy="33" r="4" fill="#0f172a"/><path d="M39 47 C56 56 80 56 99 47" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/><path d="M102 48 l7 8 l7 -8 l7 8" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/><path d="M55 24 C74 18 96 22 112 34" fill="none" stroke="${accent}" stroke-width="${traits.markWidth}" opacity=".45"/></g>`;
  }
  if (traits.type === "mammal") {
    const horn = /narwhal/.test(oceanAnimal) ? `<path d="M132 25 L157 12" stroke="#f8fafc" stroke-width="5" stroke-linecap="round"/>` : "";
    const spout = /whale/.test(oceanAnimal) ? `<path d="M73 11 C68 -6 87 -6 82 11 M75 11 C74 -3 92 0 87 14" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" opacity=".8"/>` : "";
    return `<g transform="translate(${traits.x} ${traits.y}) scale(${traits.scale})">${spout}<ellipse cx="62" cy="41" rx="${traits.bodyRx}" ry="${traits.bodyRy}" fill="${fillColor}"/><circle cx="108" cy="29" r="${traits.headR}" fill="${fillColor}"/>${horn}<circle cx="116" cy="24" r="3.5" fill="#0f172a"/><path d="M117 34 C124 38 131 38 137 34" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/><path d="M22 41 L0 23 M23 48 L0 66 M54 62 C59 77 79 77 84 62" stroke="${fillColor}" stroke-width="15" stroke-linecap="round"/></g>`;
  }
  if (traits.type === "jelly") {
    return `<g transform="translate(${traits.x} ${traits.y}) scale(${traits.scale})"><path d="M28 38 C30 8 85 8 88 38 C76 47 42 47 28 38 Z" fill="${fillColor}"/><path d="M36 43 C30 63 44 69 40 87 M54 44 C50 63 63 69 58 87 M72 43 C65 62 80 69 76 87" fill="none" stroke="${fillColor}" stroke-width="7" stroke-linecap="round"/><circle cx="48" cy="28" r="3" fill="#0f172a"/><circle cx="66" cy="28" r="3" fill="#0f172a"/><path d="M37 38 C49 31 68 31 82 38" fill="none" stroke="${accent}" stroke-width="4" opacity=".62"/></g>`;
  }
  if (traits.type === "shell") {
    return `<g transform="translate(${traits.x} ${traits.y}) scale(${traits.scale})"><path d="M24 58 C26 22 87 8 112 41 C101 75 49 83 24 58 Z" fill="${fillColor}"/><path d="M38 55 C48 34 67 25 96 38 M53 67 C62 47 80 41 106 48 M29 47 C52 47 75 50 110 61" fill="none" stroke="${accent}" stroke-width="5" opacity=".68"/><circle cx="65" cy="55" r="4" fill="#f8fafc" opacity=".8"/></g>`;
  }
  const stripe = traits.pattern === "stripe" ? `<path d="M56 20 L47 59 M76 18 L67 61 M96 25 L88 55" stroke="${accent}" stroke-width="5" opacity=".68"/>` : "";
  const spot = traits.pattern === "spot" ? `<circle cx="69" cy="34" r="5" fill="${accent}" opacity=".68"/><circle cx="92" cy="45" r="3.5" fill="${accent}" opacity=".68"/>` : "";
  const bill = /swordfish|sailfish|marlin|sawfish/.test(oceanAnimal) ? `<path d="M13 40 L-20 32" stroke="${fillColor}" stroke-width="7" stroke-linecap="round"/>` : "";
  const sail = /sailfish|marlin|sunfish|flying fish/.test(oceanAnimal) ? `<path d="M69 19 C82 -2 106 6 111 21" fill="${fillColor}"/>` : `<path d="M74 20 C82 6 100 5 110 19" fill="${fillColor}"/>`;
  return `<g transform="translate(${traits.x} ${traits.y}) scale(${traits.scale})">${bill}<path d="M12 40 C40 7 92 7 124 39 C92 72 41 74 12 40 Z" fill="${fillColor}"/><path d="M121 39 L153 16 L145 40 L153 65 Z" fill="${fillColor}"/>${sail}<circle cx="45" cy="32" r="4" fill="#0f172a"/><path d="M48 47 C62 54 83 54 98 47" fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round"/>${stripe}${spot}<path d="M29 52 C44 62 68 65 88 57" fill="none" stroke="#ffffff" stroke-width="4" opacity=".45"/></g>`;
}

function getOceanAnimalTraits(name) {
  const clean = String(name || "");
  const seed = numericSeed(clean);
  const traits = {
    type: "fish",
    x: 25 + (seed % 8) - 4,
    y: 88 + (seed % 9) - 4,
    scale: 0.9 + ((seed % 6) * 0.03),
    bodyRx: 38 + (seed % 9),
    bodyRy: 21 + (seed % 7),
    headR: 18 + (seed % 7),
    pattern: ["stripe", "spot", "plain"][seed % 3],
    tentacleWidth: 10 + (seed % 5),
    legWidth: 8 + (seed % 5),
    claw: 8 + (seed % 5),
    markWidth: 3 + (seed % 4)
  };
  if (/turtle/.test(clean)) traits.type = "turtle";
  else if (/octopus|squid|cuttlefish|nautilus/.test(clean)) traits.type = "cephalopod";
  else if (/crab|lobster|shrimp|krill|horseshoe/.test(clean)) traits.type = "crustacean";
  else if (/ray|skate|manta/.test(clean)) traits.type = "ray";
  else if (/shark|sawfish/.test(clean)) traits.type = "shark";
  else if (/seal|walrus|otter|sea lion|manatee|dugong|dolphin|porpoise|whale|orca|narwhal|vaquita/.test(clean)) traits.type = "mammal";
  else if (/jellyfish|anemone/.test(clean)) traits.type = "jelly";
  else if (/abalone|clam|conch|coral|mussel|oyster|sand dollar|scallop|sponge|urchin|snail|slug|star|cucumber/.test(clean)) traits.type = "shell";
  if (/whale|orca/.test(clean)) {
    traits.bodyRx = 56; traits.bodyRy = 27; traits.headR = 20; traits.scale = 0.86;
  }
  if (/eel/.test(clean)) {
    traits.bodyRx = 54; traits.bodyRy = 13; traits.pattern = "stripe";
  }
  if (/clownfish|angelfish|butterflyfish|parrotfish|triggerfish|lionfish|blue tang|wrasse/.test(clean)) {
    traits.pattern = "stripe"; traits.bodyRy = 28;
  }
  if (/pufferfish|sunfish/.test(clean)) {
    traits.bodyRx = 42; traits.bodyRy = 34; traits.pattern = "spot";
  }
  return traits;
}

function colorFromText(text, palette) {
  const hash = numericSeed(text);
  return palette[hash % palette.length];
}

function numericSeed(text) {
  return String(text || "").split("").reduce((sum, char, index) => sum + (char.charCodeAt(0) * (index + 3)), 0);
}

function slugForSvg(text) {
  return normalizeLoginName(text).slice(0, 42) || "avatar";
}

function titleCaseDisplay(value) {
  return String(value || "").replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

function normalizeStudentName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
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
    localStorage.setItem("grammarQuestActiveStudentDefaultGrade", normalizeDefaultGrade(student.defaultGrade));
    localStorage.setItem("grammarQuestActiveStudentAvatarParts", JSON.stringify(normalizeAvatarParts({ ...student.avatarParts, studentName: student.name })));
    localStorage.setItem("grammarQuestGrade", normalizeDefaultGrade(student.defaultGrade));
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
    localStorage.removeItem("grammarQuestActiveStudentDefaultGrade");
    localStorage.removeItem("grammarQuestActiveStudentAvatarParts");
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
      defaultGrade: normalizeDefaultGrade(localStorage.getItem("grammarQuestActiveStudentDefaultGrade") || "4"),
      avatarParts: normalizeAvatarParts({ ...loadStoredAvatarParts(), studentName: localStorage.getItem("grammarQuestActiveStudentName") || "Student" }),
      ownerUid: localStorage.getItem("grammarQuestActiveStudentOwner") || ""
    };
  } catch (error) {
    return null;
  }
}

function loadStoredAvatarParts() {
  try {
    return normalizeAvatarParts(JSON.parse(localStorage.getItem("grammarQuestActiveStudentAvatarParts") || "{}"));
  } catch (error) {
    return normalizeAvatarParts();
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
