import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { readFileSync, existsSync } from 'fs';

async function run() {
  if (!existsSync('./service-account.json')) {
    console.error("No service-account.json found.");
    return;
  }
  const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
  initializeApp({ credential: cert(sa), storageBucket: 'ai-logic-demos.firebasestorage.app' });
  const [files] = await getStorage().bucket().getFiles({ prefix: 'flashcard-drafts/' });
  if (files.length > 0) {
    console.log(`gs://ai-logic-demos.firebasestorage.app/${files[0].name}`);
  } else {
    console.log("No files found");
  }
}
run();
