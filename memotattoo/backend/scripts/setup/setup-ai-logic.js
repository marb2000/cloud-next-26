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

const REQUIRED_SERVICES = [
  'cloudresourcemanager.googleapis.com',
  'firebase.googleapis.com',
  'serviceusage.googleapis.com',
  'aiplatform.googleapis.com',
  'firebasevertexai.googleapis.com',
  'firebaseappcheck.googleapis.com',
  'firebaseml.googleapis.com',
  'recaptchaenterprise.googleapis.com',
  'playintegrity.googleapis.com',
  'logging.googleapis.com',
  'monitoring.googleapis.com'
];

async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
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

async function setupAILogic() {
  console.log(`🚀 Automated AI Logic Setup for: ${PROJECT_ID}`);
  try {
    const accessToken = await getAccessToken();
    
    for (const service of REQUIRED_SERVICES) {
      await enableService(accessToken, service);
    }

    console.log('\n✨ AI Logic services enabled successfully.');
    console.log('Note: This mirrors the "Get Started" button in the Firebase Console.');
  } catch (error) {
    console.error('💥 Fatal error during AI Logic setup:', error);
    process.exit(1);
  }
}

setupAILogic();
