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
const ANDROID_PACKAGE = config.ANDROID_PACKAGE_NAME;
const ANDROID_APP_NAME = config.ANDROID_APP_NAME || 'MemoTattoo Android';
const WEB_APP_NAME = config.WEB_APP_NAME || 'MemoTattoo Web Admin';

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

async function createAndroidApp(accessToken) {
  console.log(`📱 Registering Android App: ${ANDROID_APP_NAME} (${ANDROID_PACKAGE})...`);
  
  const url = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/androidApps`;
  const payload = {
    packageName: ANDROID_PACKAGE,
    displayName: ANDROID_APP_NAME
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
    const data = await response.json();
    console.log(`✅ Android App registered correctly.`);
    return data.appId;
  } else {
    const error = await response.json();
    if (error.error && error.error.status === 'ALREADY_EXISTS') {
      console.log('✅ Android App already exists.');
    } else {
      console.error(`❌ Failed to register Android App: ${JSON.stringify(error)}`);
    }
  }
}

async function createWebApp(accessToken) {
  console.log(`🌐 Registering Web App: ${WEB_APP_NAME}...`);
  
  const url = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`;
  const payload = {
    displayName: WEB_APP_NAME
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
    const data = await response.json();
    console.log(`✅ Web App registered correctly.`);
    return data.appId;
  } else {
    const error = await response.json();
    if (error.error && error.error.status === 'ALREADY_EXISTS') {
      console.log('✅ Web App already exists.');
    } else {
      console.error(`❌ Failed to register Web App: ${JSON.stringify(error)}`);
    }
  }
}

async function listApps(accessToken, platform) {
  const url = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/${platform}Apps`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Goog-User-Project': PROJECT_ID
    }
  });
  if (response.ok) {
    const data = await response.json();
    return data.apps || [];
  }
  return [];
}

async function setupApps() {
  console.log(`🚀 Automated App Registration for: ${PROJECT_ID}`);
  try {
    const accessToken = await getAccessToken();
    
    // Check Android
    const androidApps = await listApps(accessToken, 'android');
    const existingAndroid = androidApps.find(a => a.packageName === ANDROID_PACKAGE);
    if (existingAndroid) {
      console.log('✅ Android App already exists.');
    } else {
      await createAndroidApp(accessToken);
    }

    // Check Web
    const webApps = await listApps(accessToken, 'web');
    const existingWeb = webApps.find(a => a.displayName === WEB_APP_NAME);
    if (existingWeb) {
      console.log('✅ Web App already exists.');
    } else {
      await createWebApp(accessToken);
    }

    console.log('\n✨ App setup complete.');
  } catch (error) {
    console.error('💥 Fatal error during App registration:', error);
    process.exit(1);
  }
}

setupApps();
