import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, './sync-config.json');
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const PROJECT_ID = config.PROJECT_ID || 'ai-logic-demos';

async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
    quotaProjectId: PROJECT_ID
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function registerTrigger(triggerId, payload) {
  const token = await getAccessToken();
  const url = `https://firebasevertexai.googleapis.com/v1beta/projects/${PROJECT_ID}/locations/global/triggers?triggerId=${triggerId}&validateOnly=false`;
  console.log(`📤 Registering trigger "${triggerId}" at: ${url}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PROJECT_ID
    },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    const data = await response.json();
    console.log(`✅ Successfully registered trigger "${triggerId}":`, JSON.stringify(data, null, 2));
  } else {
    console.error(`❌ Failed to register trigger "${triggerId}":`, await response.text());
  }
}

async function main() {
  // 1. before-generate-content
  await registerTrigger('before-generate-content', {
    cloudFunction: {
      id: 'logBeforeCalls',
      locationId: 'us-central1'
    }
  });

  // 2. after-generate-content
  await registerTrigger('after-generate-content', {
    cloudFunction: {
      id: 'myAfterGenerateContentFn',
      locationId: 'us-east1'
    }
  });
}

main();
