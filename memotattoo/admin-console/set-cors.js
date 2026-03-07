// Script to apply CORS to the Firebase Storage Bucket using the cloud storage SDK
import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, existsSync } from 'fs';

async function setCors() {
  if (!existsSync('./service-account.json')) {
    console.error("Please place your Firebase Admin service-account.json in this directory.");
    return;
  }
  
  const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));
  
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: 'ai-logic-demos.firebasestorage.app'
  });

  const bucket = getStorage().bucket();

  await bucket.setCorsConfiguration([
    {
      origin: ['*'],
      method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      maxAgeSeconds: 3600
    }
  ]);

  console.log("CORS configuration successfully applied to bucket!");
}

setCors().catch(console.error);
