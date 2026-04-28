/*
 * Firebase setup lives here so the app can be rolled back or disabled quickly.
 *
 * This file is safe to serve publicly. Firebase web config identifies your
 * project, but Firestore Security Rules are what protect user data.
 */
window.GQ_FIREBASE_CONFIG = {
  enabled: true,
  firebaseConfig: {
    apiKey: "AIzaSyBF6k1xBfv80UDnDT8vkHtL2v07UVtt670",
    authDomain: "elementary-grammar-quest.firebaseapp.com",
    projectId: "elementary-grammar-quest",
    storageBucket: "elementary-grammar-quest.firebasestorage.app",
    messagingSenderId: "98472448613",
    appId: "1:98472448613:web:0f818332faa9c264e5ec8c",
    measurementId: "G-4R8TLVEZJ7"
  },
  authProviders: {
    email: true,
    google: true,
    apple: false
  },
  firestore: {
    userCollection: "users",
    managedStudentCollection: "managedStudents",
    loginCollection: "studentLoginNames",
    progressDocument: "questProgress"
  }
};
