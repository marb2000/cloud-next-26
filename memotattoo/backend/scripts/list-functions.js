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

async function listCloudRunServices() {
  const token = await getAccessToken();
  
  // We check multiple regions that might contain functions: us-central1 and us-east1
  const regions = ['us-central1', 'us-east1'];
  const allServices = [];

  for (const region of regions) {
    const url = `https://${region}-run.googleapis.com/apis/serving.knative.dev/v1/namespaces/${PROJECT_ID}/services`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data.items) {
        for (const item of data.items) {
          allServices.push({
            name: item.metadata.name,
            region: region,
            url: item.status.url,
            created: item.metadata.creationTimestamp
          });
        }
      }
    } else {
      console.warn(`⚠️ Could not list services in region ${region}:`, await response.text());
    }
  }

  return allServices;
}

async function main() {
  console.log(`🔍 Listing deployed Cloud Functions (Cloud Run services) for project: ${PROJECT_ID}...`);
  try {
    const services = await listCloudRunServices();
    if (services.length > 0) {
      console.log('\nDeployed Functions:');
      for (const svc of services) {
        console.log(`- Name: ${svc.name}`);
        console.log(`  Region: ${svc.region}`);
        console.log(`  URL: ${svc.url}`);
        console.log(`  Created: ${svc.created}`);
        console.log('');
      }
    } else {
      console.log('No functions found.');
    }
  } catch (error) {
    console.error('Error listing functions:', error);
  }
}

main();
