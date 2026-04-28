# Firebase Student and Parent/Teacher Setup

Firebase is disabled by default. The app still works with local browser progress until you add a Firebase project and set `enabled: true` in `assets/firebase-config.js`.

## What This Implements

The app now uses separate account roles:

- **Student** accounts save quiz progress, mastery, sessions, and reports.
- **Parent / Teacher** accounts link students with a student-generated code and can read linked student reports.
- Parent / Teacher accounts cannot write student progress.

Cloud data is stored as:

```txt
users/{uid}
  role: "student" | "guardian"
  displayName
  email

studentProgress/{studentUid}
  studentUid
  studentName
  progress
  updatedAt

users/{guardianUid}/students/{studentUid}
  studentUid
  studentName
  inviteCode
  linkedAt

studentInvites/{inviteCode}
  studentUid
  studentName
  createdBy
  expiresAt
```

## 1. Create the Firebase Project

1. Open the [Firebase console](https://console.firebase.google.com/).
2. Create a project.
3. Google Analytics is optional for this app.
4. In the project overview, click the Web app icon.
5. Register the app.
6. Copy the generated `firebaseConfig` object.
7. Paste those values into `assets/firebase-config.js`.
8. Set `enabled: true`.

## 2. Enable Authentication

In Firebase Console:

1. Open **Authentication**.
2. Click **Get started**.
3. Open **Sign-in method**.
4. Enable **Email/Password**.
5. Enable **Google** if you want Google login.
6. Enable **Apple** only after the Apple setup below.
7. Open **Authentication > Settings > Authorized domains**.
8. Confirm `localhost` is listed for local testing.
9. Add your deployed site domain when you publish the app.

## 3. Create Firestore

1. Open **Firestore Database**.
2. Create a database.
3. Start in **production mode**.
4. Pick the region closest to your users.

## 4. Publish Firestore Rules

Open **Firestore Database > Rules** and publish:

```txt
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function userDoc(uid) {
      return /databases/$(database)/documents/users/$(uid);
    }

    function isSelf(uid) {
      return signedIn() && request.auth.uid == uid;
    }

    function isStudent(uid) {
      return exists(userDoc(uid)) && get(userDoc(uid)).data.role == "student";
    }

    function isGuardian(uid) {
      return exists(userDoc(uid)) && get(userDoc(uid)).data.role == "guardian";
    }

    function hasGuardianLink(studentUid) {
      return signedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid)/students/$(studentUid));
    }

    match /users/{uid} {
      allow create: if isSelf(uid)
        && request.resource.data.role in ["student", "guardian"];
      allow read, update: if isSelf(uid);
      allow delete: if false;

      match /students/{studentUid} {
        allow read: if isSelf(uid);
        allow create, update: if isSelf(uid)
          && isGuardian(uid)
          && request.resource.data.studentUid == studentUid
          && exists(/databases/$(database)/documents/studentInvites/$(request.resource.data.inviteCode))
          && get(/databases/$(database)/documents/studentInvites/$(request.resource.data.inviteCode)).data.studentUid == studentUid;
        allow delete: if isSelf(uid);
      }
    }

    match /studentProgress/{studentUid} {
      allow read: if isSelf(studentUid) || hasGuardianLink(studentUid);
      allow create, update: if isSelf(studentUid)
        && isStudent(studentUid)
        && request.resource.data.studentUid == studentUid;
      allow delete: if false;
    }

    match /studentInvites/{inviteCode} {
      allow get: if signedIn();
      allow list: if false;
      allow create: if signedIn()
        && request.resource.data.createdBy == request.auth.uid
        && request.resource.data.studentUid == request.auth.uid
        && isStudent(request.auth.uid);
      allow update, delete: if signedIn()
        && resource.data.createdBy == request.auth.uid;
    }
  }
}
```

## 5. Optional Apple Login

Apple login requires an Apple Developer Program account.

1. In Apple Developer, enable **Sign in with Apple**.
2. Create a Services ID for this website.
3. Add this Firebase return URL:

```txt
https://YOUR_FIREBASE_PROJECT_ID.firebaseapp.com/__/auth/handler
```

4. Create a Sign in with Apple private key.
5. In Firebase Authentication > Sign-in method > Apple, enter the Services ID, Team ID, Key ID, and private key.
6. If you send Firebase emails later, configure Apple's private email relay for Firebase's sender domain.

## 6. Local Testing

Run a local server:

```sh
python3 -m http.server 8000
```

Open:

```txt
http://127.0.0.1:8000/
```

Test this sequence:

1. With `enabled: false`, confirm the header says **Local progress**.
2. Set `enabled: true` after adding config.
3. Create a **Student** account.
4. Complete a quiz.
5. Open the sign-in panel and generate a student link code.
6. Sign out.
7. Create a **Parent / Teacher** account.
8. Enter the student code.
9. Open `reports.html`.
10. Confirm the linked student appears with cloud-loaded progress.

## 7. Rollback

Fast rollback:

1. Set `enabled: false` in `assets/firebase-config.js`.
2. The app returns to local-only progress.

Full rollback:

1. Remove Firebase script tags from HTML files.
2. Remove `assets/auth-service.js`.
3. Revert `assets/progress-store.js` cloud adapter calls.
4. Revert reports to local-only loading.
