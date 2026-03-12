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
const ANDROID_APP_NAME = config.ANDROID_APP_NAME;
const WEB_APP_NAME = config.WEB_APP_NAME;

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

async function findApp(accessToken, type, name, packageName) {
  const url = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/${type}Apps`;
  console.log(`🔍 Listing ${type} apps: ${url}`);
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Failed to list ${type} apps (Status ${response.status}): ${errorText}`);
    return null;
  }

  const data = await response.json();
  const apps = data.apps || [];
  
  return apps.find(app => (name && app.displayName === name) || (packageName && app.packageName === packageName));
}

async function downloadConfig() {
  console.log(`🚀 Automated Config Download for: ${PROJECT_ID}`);
  try {
    const accessToken = await getAccessToken();

    // 1. Android Config
    console.log('📱 Finding Android App...');
    const androidApp = await findApp(accessToken, 'android', ANDROID_APP_NAME, ANDROID_PACKAGE);
    if (androidApp) {
      console.log(`✅ Found Android App: ${androidApp.appId}`);
      const configUrl = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/androidApps/${androidApp.appId}/config`;
      const configResponse = await fetch(configUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (configResponse.ok) {
        const configData = await configResponse.json();
        const filePath = path.join(__dirname, '../../../android-app/app/google-services.json');
        
        // Android config from Management API is base64 encoded in configFileContents
        if (configData.configFileContents) {
          const decodedConfig = Buffer.from(configData.configFileContents, 'base64').toString('utf-8');
          fs.writeFileSync(filePath, decodedConfig);
        } else {
          fs.writeFileSync(filePath, JSON.stringify(configData, null, 2));
        }
        console.log(`✅ Saved config to ${filePath}`);
      }
    } else {
      console.warn('⚠️ Android App not found.');
    }

    // 2. Web Config
    console.log('🌐 Finding Web App...');
    const webApp = await findApp(accessToken, 'web', WEB_APP_NAME);
    if (webApp) {
      console.log(`✅ Found Web App: ${webApp.appId}`);
      const configUrl = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps/${webApp.appId}/config`;
      const configResponse = await fetch(configUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (configResponse.ok) {
        const configData = await configResponse.json();
        const firebaseTsPath = path.join(__dirname, '../../../admin-console/src/app/core/firebase/firebase.ts');
        if (fs.existsSync(firebaseTsPath)) {
          let content = fs.readFileSync(firebaseTsPath, 'utf-8');
          // Replace the firebaseConfig object
          const newConfigBlock = `const firebaseConfig = ${JSON.stringify(configData, null, 2)};`;
          const regex = /const firebaseConfig = \{[\s\S]*?\};/;
          content = content.replace(regex, newConfigBlock);
          fs.writeFileSync(firebaseTsPath, content);
          console.log(`✅ Updated ${firebaseTsPath}`);
        }
      }
    } else {
      console.warn('⚠️ Web App not found.');
    }

    console.log('\n✨ Config retrieval complete.');
  } catch (error) {
    console.error('💥 Fatal error during config download:', error);
    process.exit(1);
  }
}

downloadConfig();
