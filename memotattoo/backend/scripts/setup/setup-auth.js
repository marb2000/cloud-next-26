import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, '../sync-config.json');
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const PROJECT_ID = config.PROJECT_ID || process.env.PROJECT_ID;

if (!PROJECT_ID) {
  console.error('❌ Error: PROJECT_ID not found in sync-config.json');
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

async function enableService(accessToken, serviceName) {
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

async function configureAuth(accessToken) {
  console.log('🔐 Enabling Email/Password provider...');
  
  const url = `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/config?updateMask=signIn.email.enabled`;
  const payload = {
    signIn: {
      email: {
        enabled: true
      }
    }
  };

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PROJECT_ID
    },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    console.log('✅ Email/Password provider enabled successfully.');
  } else {
    const error = await response.text();
    console.error(`❌ Failed to enable Email/Password: ${error}`);
  }

  console.log('\n☝️  NOTE ON GOOGLE AUTH:');
  console.log('Due to OAuth Consent Screen requirements, Google Auth must be manually enabled in the Firebase Console:');
  console.log(`1. Visit: https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers`);
  console.log('2. Click "Add new provider" -> "Google"');
  console.log('3. Select your support email and click "Save".');
}

async function setupAuth() {
  console.log(`🚀 Automated Auth Setup for: ${PROJECT_ID}`);
  try {
    const accessToken = await getAccessToken();
    await enableService(accessToken, 'identitytoolkit.googleapis.com');
    await configureAuth(accessToken);
    console.log('\n✨ Auth setup complete.');
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

setupAuth();
