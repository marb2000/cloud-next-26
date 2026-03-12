#!/bin/bash

# Master Setup Script for MemoTattoo Project
# This script orchestrates the full backend initialization.

# Load configuration
if [ ! -f sync-config.json ]; then
    echo "❌ Error: sync-config.json not found!"
    exit 1
fi

PROJECT_ID=$(grep -o '"PROJECT_ID": "[^"]*' sync-config.json | cut -d'"' -f4)

echo "🛠 Starting Full Project Setup..."
echo "📍 Project: $PROJECT_ID"

# 1. Setup Authentication (Identity Toolkit + Providers)
echo -e "\n--- Step 1: Authentication ---"
node setup/setup-auth.js

# 2. Setup AI Logic (Vertex AI + Gemini APIs)
echo -e "\n--- Step 2: AI Logic Services ---"
node setup/setup-ai-logic.js

# 3. Setup Cloud Storage (Bucket + Rules)
echo -e "\n--- Step 3: Cloud Storage ---"
node setup/setup-storage.js

# 4. Setup Firestore (Database + Rules)
echo -e "\n--- Step 4: Firestore Database ---"
node setup/setup-firestore.js

# 5. Create Firebase Apps (Android + Web)
echo -e "\n--- Step 5: Firebase Apps ---"
node setup/setup-apps.js

# 6. Create Admin User
echo -e "\n--- Step 6: Admin Initialization ---"
node setup/setup-admins.js

# 7. Download Config Files
echo -e "\n--- Step 7: Configuration Retrieval ---"
node setup/download-config.js

# 8. Sync Prompts (AI Logic Templates)
echo -e "\n--- Step 8: Prompt Templates ---"
(cd setup && ./deploy-prompts.sh)

# 9. Setup CORS (Storage)
echo -e "\n--- Step 9: CORS Setup ---"
node setup/setCors.js

# 10. Deploy Cloud Functions
echo -e "\n--- Step 10: Cloud Functions ---"
(cd setup/functions && npm install)
(cd setup && npx firebase deploy --only functions --project "$PROJECT_ID")

echo -e "\n✨ Full project setup finished!"
echo "Check the deployment_guide.md and walkthrough.md for manual steps (like Google Auth)."
