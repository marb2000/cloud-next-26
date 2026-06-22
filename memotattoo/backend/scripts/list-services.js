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

async function listServices() {
  const token = await getAccessToken();
  const url = `https://serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services?filter=state:ENABLED`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Goog-User-Project': PROJECT_ID
    }
  });

  if (response.ok) {
    const data = await response.json();
    console.log('Enabled services:');
    if (data.services) {
      for (const service of data.services) {
        console.log(`- ${service.config.name}`);
      }
    }
  } else {
    console.error('Failed to list services:', await response.text());
  }
}

listServices();
