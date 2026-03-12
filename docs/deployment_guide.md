# 🚢 MemoTattoo Deployment Guide (New Project)

Welcome! This guide will walk you through setting up the MemoTattoo ecosystem from scratch on a **MacOS** machine.

---

## 💻 System Requirements

Before you begin, ensure you have the following installed:

1.  **Node.js (v18+)**: [Download here](https://nodejs.org/).
2.  **Firebase CLI**: 
    ```bash
    npm install -g firebase-tools
    ```
3.  **Java Development Kit (JDK 17)**: Required for Android builds.
4.  **Android Studio**: To build and deploy the mobile app.
5.  **Google Cloud SDK (Optional)**: Useful for advanced project management.

---

## 🏁 Phase 1: Firebase Project Initialization

1.  **Create Project**: Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Enable Blaze Plan**: Go to **Project Settings > Usage and billing**. You **MUST** be on the Pay-as-you-go (Blaze) plan to use Firebase AI Logic with Vertex AI and Cloud Storage features.

---

## 🛠 Phase 2: Configuration & Master Setup

We have a "Master Setup Script" that automates almost everything: Auth, Firestore, Storage, AI Logic, and App registration.

### 1. Configure the Setup Tool
Edit `memotattoo/backend/scripts/sync-config.json` with your project details:

```json
{
  "PROJECT_ID": "your-project-id",
  "LOCATION": "us-central1",
  "ADMIN_EMAIL": "admin@yourdomain.com",
  "ADMIN_PASSWORD": "secure-password-here",
  "ANDROID_PACKAGE_NAME": "com.firebaseailogic.memotattoo",
  "ANDROID_APP_NAME": "MemoTattoo App",
  "WEB_APP_NAME": "MemoTattoo Console"
}
```

### 2. Run the Initialization
Open your terminal and run:

```bash
cd memotattoo/backend/scripts
./setup-all.sh
```

**What this script does:**
*   **Step 1-4**: Configures Auth, AI Logic (Vertex AI), Storage, and Firestore.
*   **Step 5**: Registers your Android and Web apps in Firebase.
*   **Step 6**: Creates your initial Admin account.
*   **Step 7**: Automatically downloads `google-services.json` (Android) and `firebase-config.json` (Web).
*   **Step 8-10**: Provisions AI Prompt Templates, sets up CORS, and deploys Cloud Functions.

---

## 📱 Phase 3: Running & Building the Apps

### Android App
The setup script already placed `google-services.json` in the correct folder. 

1.  **🚀 Recommended (Script)**: Use our automation script to build and deploy to a running emulator:
    ```bash
    cd memotattoo
    ./scripts/deploy-android.sh
    ```
2.  **Alternatively (Manual)**: Open `memotattoo/android-app` in **Android Studio**, wait for Gradle sync, and hit the **Run** button.

### Web Admin Console
You can run the console locally for development or build it for production hosting.

1.  **🚀 Recommended (Local Dev)**: Run the project directly from VS Code or Antigravity for a live-reloading experience:
    ```bash
    cd memotattoo/admin-console
    npm install
    npm start
    ```
2.  **Alternatively (Production Build)**: If you need a static build:
    ```bash
    cd memotattoo/admin-console
    npm install
    npm run build
    ```
3.  **Firebase Hosting (Optional)**: If you want to host it on the web:
    ```bash
    cd memotattoo/backend
    firebase deploy --only hosting
    ```

---

## 🎉 Success!
Your MemoTattoo instance is live. Check the `docs/getting_started.md` for a fun tour of your new AI-powered platform!
