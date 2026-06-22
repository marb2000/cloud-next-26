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

async function fetchLogs() {
  const token = await getAccessToken();
  const url = `https://logging.googleapis.com/v2/entries:list`;
  
  const payload = {
    resourceNames: [`projects/${PROJECT_ID}`],
    filter: 'resource.type="cloud_run_revision" AND resource.labels.service_name="testactivitylog"',
    orderBy: 'timestamp desc',
    pageSize: 10
  };

  console.log(`🔍 Fetching Cloud Run logs from Stackdriver Logging API...`);
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
    console.log('Logs:');
    if (data.entries) {
      for (const entry of data.entries) {
        console.log(`[${entry.timestamp}] ${entry.severity || 'INFO'}: ${entry.textPayload || JSON.stringify(entry.jsonPayload)}`);
      }
    } else {
      console.log('No logs found.');
    }
  } else {
    console.error('Failed to fetch logs:', await response.text());
  }
}

fetchLogs();
