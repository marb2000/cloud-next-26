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

async function initializeDatabase(accessToken) {
  console.log('📂 Initializing Firestore database ((default))...');
  
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases?databaseId=(default)`;
  const payload = {
    type: 'FIRESTORE_NATIVE',
    locationId: 'us-central1'
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PROJECT_ID
    },
    body: JSON.stringify(payload)
  });

  if (response.ok) {
    console.log('✅ Firestore database initialized successfully.');
  } else {
    const error = await response.json();
    if (error.error && error.error.status === 'ALREADY_EXISTS') {
      console.log('✅ Firestore database already exists.');
    } else {
      console.error(`❌ Failed to initialize Firestore: ${JSON.stringify(error)}`);
    }
  }
}

async function deployFirestoreRules(accessToken) {
  console.log('🛡️ Deploying Firestore security rules...');
  const rulesFile = path.join(__dirname, './rules/firestore.rules');
  if (!fs.existsSync(rulesFile)) {
    console.error(`❌ Error: firestore.rules not found at ${rulesFile}`);
    return;
  }
  const rulesContent = fs.readFileSync(rulesFile, 'utf-8');

  // 1. Create Ruleset
  const rulesetUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`;
  const rulesetPayload = {
    source: {
      files: [
        {
          name: 'firestore.rules',
          content: rulesContent
        }
      ]
    }
  };

  const rsResponse = await fetch(rulesetUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PROJECT_ID
    },
    body: JSON.stringify(rulesetPayload)
  });

  if (!rsResponse.ok) {
    const error = await rsResponse.text();
    console.error(`❌ Failed to create ruleset: ${error}`);
    return;
  }

  const rulesetData = await rsResponse.json();
  const rulesetName = rulesetData.name;
  console.log(`✅ Ruleset created: ${rulesetName}`);

  // 2. Create/Update Release
  const releaseName = `projects/${PROJECT_ID}/releases/cloud.firestore`;
  const releaseUrl = `https://firebaserules.googleapis.com/v1/${releaseName}?updateMask=rulesetName`;
  
  const patchResponse = await fetch(releaseUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PROJECT_ID
    },
    body: JSON.stringify({
      name: releaseName,
      rulesetName: rulesetName
    })
  });

  if (patchResponse.ok) {
    console.log('✅ Firestore rules deployed successfully.');
  } else {
    // If patch fails (e.g. doesn't exist), try POST
    const createReleaseUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`;
    const postResponse = await fetch(createReleaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Goog-User-Project': PROJECT_ID
      },
      body: JSON.stringify({
        name: releaseName,
        rulesetName: rulesetName
      })
    });

    if (postResponse.ok) {
      console.log('✅ Firestore rules release created successfully.');
    } else {
      const error = await postResponse.text();
      console.error(`❌ Failed to deploy rules: ${error}`);
    }
  }
}

async function setupFirestore() {
  console.log(`🚀 Automated Firestore Setup for: ${PROJECT_ID}`);
  try {
    const accessToken = await getAccessToken();
    await enableService(accessToken, 'firestore.googleapis.com');
    await enableService(accessToken, 'firebaserules.googleapis.com');
    await initializeDatabase(accessToken);
    await deployFirestoreRules(accessToken);
    console.log('\n✨ Firestore setup complete.');
  } catch (error) {
    console.error('💥 Fatal error during Firestore setup:', error);
    process.exit(1);
  }
}

setupFirestore();
