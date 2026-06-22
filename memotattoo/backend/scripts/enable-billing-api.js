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
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    quotaProjectId: PROJECT_ID
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function enableService(serviceName) {
  const accessToken = await getAccessToken();
  console.log(`🔧 Enabling service: ${serviceName}...`);
  const url = `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/${serviceName}:enable`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Goog-User-Project': PROJECT_ID
    }
  });
  if (response.ok) {
    console.log(`✅ ${serviceName} enabled.`);
  } else {
    const error = await response.text();
    console.warn(`⚠️ Warning enabling ${serviceName}: ${error}`);
  }
}

enableService('cloudbilling.googleapis.com');
