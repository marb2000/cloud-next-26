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
  const url = `https://us-central1-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${PROJECT_ID}/services`;
  
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
  const testService = services.find(s => s.metadata.name.toLowerCase().includes('testactivitylog'));
  
  if (!testService) {
    console.error('❌ Could not find "testactivitylog" Cloud Run service.');
    return;
  }

  console.log(`Service Name: ${testService.metadata.name}`);
  const container = testService.spec.template.spec.containers[0];
  console.log('Environment variables in container:');
  if (container.env) {
    for (const envVar of container.env) {
      console.log(`- ${envVar.name}: ${envVar.value}`);
    }
  } else {
    console.log('No env vars configured.');
  }
}

main();
