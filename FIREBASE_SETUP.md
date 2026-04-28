# Firebase Setup: Grownup Accounts and Managed Student Profiles

Firebase is disabled by default. The app still works with local browser progress until you add a Firebase project and set `enabled: true` in `assets/firebase-config.js`.

## What This Implements

Students do **not** register directly with Firebase.

- Parents and teachers create normal grownup Firebase accounts.
- Grownups create managed student profiles.
- Each student profile gets a fun, unique app login name such as `spark-reader-27`.
- Students use that screen name inside the app to start a student session.
- Cloud writes are protected by the signed-in grownup account.
- Reports show all student profiles owned by the grownup.

This avoids collecting student email addresses or asking younger kids to manage real accounts.

## Cloud Data Model

```txt
users/{grownupUid}
  role: "guardian"
  displayName
  email

managedStudents/{studentId}
  ownerUid: grownupUid
  studentId
  studentName
  loginName
  progress
  createdAt
  updatedAt

studentLoginNames/{loginName}
  ownerUid: grownupUid
  studentId
  loginName
  studentName
  createdAt
```

`studentLoginNames` is used only to reserve unique screen names. Student progress lives on `managedStudents/{studentId}`.

## 1. Create the Firebase Project

1. Open the [Firebase console](https://console.firebase.google.com/).
2. Create a project.
3. Google Analytics is optional.
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

Only grownups authenticate with Firebase. Student screen-name sessions are app-level profiles under the grownup account.

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

    function isSelf(uid) {
      return signedIn() && request.auth.uid == uid;
    }

    function isGrownup() {
      return signedIn()
        && exists(/databases/$(database)/documents/users/$(request.auth.uid))
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "guardian";
    }

    function ownsStudent(studentId) {
      return isGrownup()
        && exists(/databases/$(database)/documents/managedStudents/$(studentId))
        && get(/databases/$(database)/documents/managedStudents/$(studentId)).data.ownerUid == request.auth.uid;
    }

    match /users/{uid} {
      allow create: if isSelf(uid)
        && request.resource.data.role == "guardian";
      allow read, update: if isSelf(uid);
      allow delete: if false;
    }

    match /managedStudents/{studentId} {
      allow read: if signedIn() && resource.data.ownerUid == request.auth.uid;
      allow create: if isGrownup()
        && request.resource.data.ownerUid == request.auth.uid
        && request.resource.data.studentId == studentId;
      allow update: if ownsStudent(studentId)
        && request.resource.data.ownerUid == request.auth.uid
        && request.resource.data.studentId == studentId;
      allow delete: if ownsStudent(studentId);
    }

    match /studentLoginNames/{loginName} {
      allow get: if signedIn();
      allow list: if false;
      allow create: if isGrownup()
        && request.resource.data.ownerUid == request.auth.uid
        && request.resource.data.loginName == loginName;
      allow update: if false;
      allow delete: if signedIn() && resource.data.ownerUid == request.auth.uid;
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
2. Paste Firebase config into `assets/firebase-config.js`.
3. Set `enabled: true`.
4. Create or sign in to a grownup account.
5. Open the auth panel.
6. Create a student profile.
7. Use the suggested fun login name or enter your own.
8. Start a student session with that login name.
9. Complete a quiz.
10. Open `reports.html`.
11. Confirm the student appears with progress and question-level evidence.

## 7. What Codex Can Help With

I can help with:

- Updating the app code.
- Adjusting Firestore rules.
- Testing local rendering and local progress behavior.
- Debugging Firebase console errors once you paste config.
- Reviewing deployed behavior once you share the deployed URL or error messages.

I need you to do:

- Create the Firebase project.
- Paste the Firebase config into `assets/firebase-config.js`.
- Enable Auth providers.
- Create Firestore.
- Publish the Firestore rules.
- Configure Apple Developer settings if you want Apple login.
- Add your production domain under Firebase Authorized Domains.

## 8. Rollback

Fast rollback:

1. Set `enabled: false` in `assets/firebase-config.js`.
2. The app returns to local-only progress.

Full rollback:

1. Remove Firebase script tags from HTML files.
2. Remove `assets/auth-service.js`.
3. Revert `assets/progress-store.js` cloud adapter calls.
4. Revert reports to local-only loading.
