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

async function tryLocation(location) {
  const token = await getAccessToken();
  
  const testUrl = async (domain, version) => {
    const url = `https://${domain}/${version}/projects/${PROJECT_ID}/locations/${location}/triggers/before-generate-content`;
    console.log(`\nTesting ${domain} (${version}) (location: "${location}") with GET: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Goog-User-Project': PROJECT_ID
      }
    });
    
    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text.substring(0, 500)}`);
  };

  const versions = ['v1alpha', 'v1beta', 'v1beta2', 'v1'];
  for (const v of versions) {
    await testUrl('firebasevertexai.googleapis.com', v);
  }
}

async function main() {
  await tryLocation('global');
  await tryLocation('us-central1');
}

main();
