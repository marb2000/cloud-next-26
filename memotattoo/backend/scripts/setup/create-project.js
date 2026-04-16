import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '../sync-config.json');
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const PROJECT_ID = config.PROJECT_ID || process.env.PROJECT_ID;

if (!PROJECT_ID) {
  console.error('❌ Error: PROJECT_ID not found in sync-config.json or environment');
  process.exit(1);
}

async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
    quotaProjectID: PROJECT_ID
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function createGCPProject(accessToken) {
  console.log(`🔨 Creating Google Cloud Project: ${PROJECT_ID}...`);
  const url = 'https://cloudresourcemanager.googleapis.com/v1/projects';
  const payload = {
    projectId: PROJECT_ID,
    name: PROJECT_ID
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    const data = await response.json();
    console.log(`✅ GCP Project creation initiated. Operation: ${data.name}`);
    await pollOperation(accessToken, data.name);
    console.log(`✅ GCP Project created successfully.`);
    return true;
  } else {
    const error = await response.json();
    if (error.error && error.error.status === 'ALREADY_EXISTS') {
      console.log('✅ GCP Project already exists.');
      return true;
    } else {
      console.error(`❌ Failed to create GCP Project: ${JSON.stringify(error)}`);
      return false;
    }
  }
}

async function pollOperation(accessToken, operationName) {
  const url = `https://cloudresourcemanager.googleapis.com/v1/${operationName}`;
  while (true) {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const data = await response.json();
    if (data.done) {
      if (data.error) {
        throw new Error(`Operation failed: ${data.error.message}`);
      }
      return data.response;
    }
    console.log('⏳ Waiting for operation to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function addFirebaseToProject(accessToken) {
  console.log(`🔥 Adding Firebase to Project: ${PROJECT_ID}...`);
  const url = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}:addFirebase`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PROJECT_ID
    },
    body: JSON.stringify({})
  });

  if (response.ok) {
    console.log(`✅ Firebase enabled on project.`);
    return true;
  } else {
    const error = await response.json();
    if (error.error && error.error.status === 'ALREADY_EXISTS') {
      console.log('✅ Firebase already enabled on this project.');
      return true;
    } else {
      console.error(`❌ Failed to enable Firebase: ${JSON.stringify(error)}`);
      return false;
    }
  }
}

async function main() {
  try {
    const accessToken = await getAccessToken();
    
    // 1. Create GCP Project
    const created = await createGCPProject(accessToken);
    if (!created) {
      console.error('❌ Aborting: Could not verify or create GCP project.');
      process.exit(1);
    }

    // 2. Add Firebase
    await addFirebaseToProject(accessToken);

    console.log('\n✨ Firebase project setup complete.');
  } catch (error) {
    console.error('💥 Fatal error during project creation:', error);
    process.exit(1);
  }
}

main();
