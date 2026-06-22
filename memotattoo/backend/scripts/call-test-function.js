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

async function getCloudRunServices() {
  const token = await getAccessToken();
  // Cloud Run services are regional. Default is us-central1
  const url = `https://us-central1-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${PROJECT_ID}/services`;
  console.log(`🔍 Listing Cloud Run services in us-central1: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (response.ok) {
    const data = await response.json();
    return data.items || [];
  } else {
    console.error('Failed to list Cloud Run services:', await response.text());
    return [];
  }
}

async function main() {
  const services = await getCloudRunServices();
  // Find testactivitylog (naming is typically lowercase in Cloud Run)
  const testService = services.find(s => s.metadata.name.toLowerCase().includes('testactivitylog'));
  
  if (!testService) {
    console.error('❌ Could not find "testactivitylog" Cloud Run service. Is it deployed in us-central1?');
    console.log('Available services:', services.map(s => s.metadata.name));
    return;
  }

  const serviceUrl = testService.status.url;
  console.log(`✅ Found service URL: ${serviceUrl}`);

  // Call the function
  console.log('📤 Invoking callable function...');
  const res = await fetch(serviceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data: {} })
  });

  console.log(`Status: ${res.status}`);
  const responseText = await res.text();
  console.log('Response:', responseText);
}

main();
