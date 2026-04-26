/*
 * Firebase setup lives here so the app can be rolled back or disabled quickly.
 *
 * 1. Create a Firebase web app.
 * 2. Replace the placeholder firebaseConfig values below.
 * 3. Set enabled to true.
 *
 * This file is safe to serve publicly. Firebase web config identifies your
 * project, but Firestore Security Rules are what protect user data.
 */
window.GQ_FIREBASE_CONFIG = {
  enabled: false,
  firebaseConfig: {
    apiKey: "PASTE_API_KEY_HERE",
    authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
    projectId: "PASTE_PROJECT_ID",
    storageBucket: "PASTE_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "PASTE_SENDER_ID",
    appId: "PASTE_APP_ID"
  },
  authProviders: {
    email: true,
    google: true,
    apple: true
  },
  firestore: {
    userCollection: "users",
    progressDocument: "questProgress"
  }
};
