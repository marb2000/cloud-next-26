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
    quotaProjectID: PROJECT_ID
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function listReleases() {
  const token = await getAccessToken();
  const url = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (response.ok) {
    const data = await response.json();
    console.log('Releases:', JSON.stringify(data, null, 2));
    if (data.releases) {
      for (const rel of data.releases) {
        const rulesetUrl = `https://firebaserules.googleapis.com/v1/${rel.rulesetName}`;
        const rsResponse = await fetch(rulesetUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (rsResponse.ok) {
          const rsData = await rsResponse.json();
          console.log(`\nRuleset for ${rel.name}:`);
          console.log(JSON.stringify(rsData.source, null, 2));
        }
      }
    }
  } else {
    console.error('Failed to list releases:', await response.text());
  }
}

listReleases();
