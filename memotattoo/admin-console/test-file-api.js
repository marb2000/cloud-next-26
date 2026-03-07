import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, existsSync } from 'fs';
import fetch from "node-fetch";

async function run() {
  if (!existsSync('./service-account.json')) {
    console.error("No service-account.json found.");
    return;
  }
  
  const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
  initializeApp({ credential: cert(sa), storageBucket: 'ai-logic-demos.firebasestorage.app' });
  
  const bucket = getStorage().bucket();
  const [url] = await bucket.file('flashcard-drafts/someimage.jpg').getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60, 
  });
  
  console.log("Got signed URL:", url);
  
}
run();
