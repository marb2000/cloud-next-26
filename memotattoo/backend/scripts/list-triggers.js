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

async function listTriggers() {
  const token = await getAccessToken();
  const url = `https://firebasevertexai.googleapis.com/v1beta/projects/${PROJECT_ID}/locations/global/triggers`;
  console.log(`🔍 Querying triggers from ${url}...`);
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Goog-User-Project': PROJECT_ID
    }
  });

  if (response.ok) {
    const data = await response.json();
    console.log('Triggers:', JSON.stringify(data, null, 2));
  } else {
    console.error('Failed to list triggers:', await response.text());
  }
}

listTriggers();
