import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, '../sync-config.json');
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const PROJECT_ID = config.PROJECT_ID || 'ai-logic-demos';
const BUCKET_NAME = `${PROJECT_ID}.firebasestorage.app`; // Following the pattern from setup-storage.js

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
  storageBucket: BUCKET_NAME
});

async function setCors() {
  console.log(`🌐 Setting CORS for bucket: ${BUCKET_NAME}...`);
  try {
    const bucket = admin.storage().bucket();
    await bucket.setCorsConfiguration([
      {
        origin: ["*"],
        method: ["GET", "OPTIONS", "HEAD"],
        maxAgeSeconds: 3600
      }
    ]);
    console.log("✅ CORS set successfully");
    process.exit(0);
  } catch (error) {
    if (error.message.includes('bucket does not exist')) {
      console.warn(`⚠️ Warning: Bucket ${BUCKET_NAME} does not exist yet. This is expected if the project was just created. Please wait a few minutes and run Step 9 again.`);
      process.exit(0); // Don't fail the whole setup
    } else {
      console.error("❌ Error setting CORS:", error.message);
      process.exit(1);
    }
  }
}

setCors();
