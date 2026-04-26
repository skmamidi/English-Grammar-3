# Firebase Login Setup

This app is wired for Firebase Auth and Firestore, but Firebase is disabled by default so the current local-only progress still works.

## 1. Create the Firebase Project

1. Go to the Firebase console and create a project.
2. Add a Web app.
3. Copy the `firebaseConfig` object from the Firebase app settings.
4. Open `assets/firebase-config.js`.
5. Replace the placeholder values in `firebaseConfig`.
6. Set `enabled: true`.

## 2. Enable Sign-In Providers

In Firebase Console:

1. Open **Authentication**.
2. Click **Get started** if needed.
3. Go to **Sign-in method**.
4. Enable **Email/Password**.
5. Enable **Google**.
6. Enable **Apple** only after completing the Apple Developer setup below.
7. In **Authentication > Settings > Authorized domains**, make sure your deployed domain is listed. Localhost is usually already allowed for development.

## 3. Create Firestore

1. Open **Firestore Database**.
2. Create a database.
3. Start in production mode.
4. Pick a region near your users.

Use these Firestore Security Rules:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/private/{documentId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

The app saves progress at:

```txt
users/{uid}/private/questProgress
```

## 4. Configure Apple Sign In

Apple login requires an Apple Developer Program account.

1. In Apple Developer, enable **Sign in with Apple** for your app/site.
2. Create a Services ID for the web login.
3. Add this Firebase return URL:

```txt
https://YOUR_FIREBASE_PROJECT_ID.firebaseapp.com/__/auth/handler
```

4. Create a Sign in with Apple private key.
5. In Firebase Authentication > Sign-in method > Apple, enter the Services ID, Team ID, Key ID, and private key.
6. If you send Firebase emails later, configure Apple's private email relay for Firebase's sender domain.

## 5. Local Testing

Because Firebase Auth uses browser APIs and remote SDK modules, test through a local web server:

```sh
python3 -m http.server 8000
```

Then open:

```txt
http://127.0.0.1:8000/
```

With `enabled: false`, the button should say **Local progress**. After adding Firebase config and setting `enabled: true`, it should change to **Sign in**.

## 6. Rollback

Fastest rollback:

1. Set `enabled: false` in `assets/firebase-config.js`.
2. The app returns to local-only progress.

Full rollback:

1. Remove these script tags from the HTML files:

```html
<script src=".../assets/firebase-config.js"></script>
<script src=".../assets/progress-store.js"></script>
<script type="module" src=".../assets/auth-service.js"></script>
```

2. Remove the auth styles from `assets/styles.css`.
3. Revert `assets/quiz-engine.js` to direct `localStorage` access.
