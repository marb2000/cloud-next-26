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
const BUCKET_NAME = `${PROJECT_ID}.firebasestorage.app`; // Modern Firebase Storage bucket

if (!PROJECT_ID) {
  console.error('❌ Error: PROJECT_ID not found in sync-config.json');
  process.exit(1);
}

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

async function initializeStorageBucket(accessToken) {
  console.log(`🪣 Ensuring Storage bucket exists: ${BUCKET_NAME}...`);
  // 1. Try to create the bucket via Cloud Storage API
  const createUrl = `https://storage.googleapis.com/storage/v1/b?project=${PROJECT_ID}`;
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PROJECT_ID
    },
    body: JSON.stringify({
      name: BUCKET_NAME,
      location: 'US-CENTRAL1',
      storageClass: 'STANDARD'
    })
  });

  if (createResponse.ok) {
    console.log(`✅ Bucket ${BUCKET_NAME} created via Cloud Storage API.`);
  } else {
    const error = await createResponse.json();
    if (error.error && error.error.code === 409) {
      console.log(`✅ Bucket ${BUCKET_NAME} already exists in GCP.`);
    } else {
      console.warn(`⚠️ Warning creating bucket: ${JSON.stringify(error)}`);
    }
  }

  // 2. Link the bucket to Firebase if not already linked
  console.log(`🔗 Linking bucket ${BUCKET_NAME} to Firebase...`);
  const linkUrl = `https://firebasestorage.googleapis.com/v1beta/projects/${PROJECT_ID}/buckets/${BUCKET_NAME}:addFirebase`;
  const linkResponse = await fetch(linkUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Goog-User-Project': PROJECT_ID
    }
  });

  if (linkResponse.ok) {
    console.log(`✅ Bucket ${BUCKET_NAME} linked to Firebase successfully.`);
  } else {
    const error = await linkResponse.json();
    if (error.error && error.error.status === 'ALREADY_EXISTS') {
      console.log(`✅ Bucket ${BUCKET_NAME} is already linked to Firebase.`);
    } else {
      console.warn(`⚠️ Warning linking bucket: ${JSON.stringify(error)}`);
    }
  }
}

async function deployStorageRules(accessToken) {
  console.log('🛡️ Deploying Cloud Storage security rules...');
  const rulesFile = path.join(__dirname, './rules/storage.rules');
  if (!fs.existsSync(rulesFile)) {
    console.error(`❌ Error: storage.rules not found at ${rulesFile}`);
    return;
  }
  const rulesContent = fs.readFileSync(rulesFile, 'utf-8');

  // 1. Create Ruleset
  const rulesetUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`;
  const rulesetPayload = {
    source: {
      files: [
        {
          name: 'storage.rules',
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

  // 2. Deploy to Release
  // The release name for storage is: "firebase.storage/{BUCKET_NAME}"
  const releaseName = `firebase.storage/${BUCKET_NAME}`;
  const fullReleaseName = `projects/${PROJECT_ID}/releases/${releaseName}`;
  
  console.log(`🚀 Releasing ruleset to: ${fullReleaseName}...`);
  
  // Use PATCH with updateMask to create or update the release
  // The resource name must be encoded if it contains slashes beyond the base path
  const patchUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/${encodeURIComponent(releaseName)}?updateMask=rulesetName`;
  const patchResponse = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PROJECT_ID
    },
    body: JSON.stringify({
      name: fullReleaseName,
      rulesetName: rulesetName
    })
  });

  if (patchResponse.ok) {
    console.log(`✅ Storage rules deployed successfully to ${BUCKET_NAME}.`);
  } else {
    // If PATCH fails, try POST to projects/*/releases
    const releaseBaseUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases`;
    const postResponse = await fetch(releaseBaseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Goog-User-Project': PROJECT_ID
      },
      body: JSON.stringify({
        name: fullReleaseName,
        rulesetName: rulesetName
      })
    });

    if (postResponse.ok) {
      console.log(`✅ Storage rules created successfully for ${BUCKET_NAME}.`);
    } else {
      const error = await postResponse.text();
      console.error(`❌ Failed to deploy rules: ${error}`);
    }
  }
}

async function setupStorage() {
  console.log(`🚀 Automated Cloud Storage Setup for: ${PROJECT_ID}`);
  try {
    const accessToken = await getAccessToken();
    await enableService(accessToken, 'firebasestorage.googleapis.com');
    await enableService(accessToken, 'firebaserules.googleapis.com');
    await enableService(accessToken, 'storage-component.googleapis.com');
    await initializeStorageBucket(accessToken);
    await deployStorageRules(accessToken);
    console.log('\n✨ Cloud Storage setup complete.');
  } catch (error) {
    console.error('💥 Fatal error during Storage setup:', error);
    process.exit(1);
  }
}

setupStorage();
