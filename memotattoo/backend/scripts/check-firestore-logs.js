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

async function checkFirestoreLogs() {
  const token = await getAccessToken();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  
  const payload = {
    structuredQuery: {
      from: [{ collectionId: 'ActivityLogs' }],
      orderBy: [{ field: { fieldPath: 'timestamp' }, direction: 'DESCENDING' }],
      limit: 10
    }
  };

  console.log(`🔍 Querying Firestore ActivityLogs collection in project ${PROJECT_ID}...`);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    const data = await response.json();
    console.log('Activity Logs in Firestore:');
    if (Array.isArray(data) && data.length > 0) {
      for (const item of data) {
        if (item.document) {
          const fields = item.document.fields;
          const action = fields.action?.stringValue || 'N/A';
          const description = fields.description?.stringValue || 'N/A';
          const timestamp = fields.timestamp?.stringValue || 'N/A';
          console.log(`- [${timestamp}] ${action}: ${description}`);
        }
      }
    } else {
      console.log('No logs found or empty query response.', JSON.stringify(data));
    }
  } else {
    console.error('Failed to query Firestore:', await response.text());
  }
}

checkFirestoreLogs();
