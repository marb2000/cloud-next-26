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

const PROJECT_ID = config.PROJECT_ID;
const APPCHECK_DEBUG_TOKEN = config.APPCHECK_DEBUG_TOKEN;

async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
    quotaProjectID: PROJECT_ID
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function getAppIds(accessToken) {
  const androidUrl = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/androidApps`;
  const webUrl = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/webApps`;
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'X-Goog-User-Project': PROJECT_ID
  };

  const [androidRes, webRes] = await Promise.all([
    fetch(androidUrl, { headers }),
    fetch(webUrl, { headers })
  ]);

  const androidData = await androidRes.json();
  const webData = await webRes.json();

  // Find the right apps
  const androidAppId = androidData.apps?.find(a => a.packageName === config.ANDROID_PACKAGE_NAME)?.appId;
  const webAppId = webData.apps?.find(a => a.displayName === (config.WEB_APP_NAME || 'MemoTattoo Web Admin'))?.appId;

  return { androidAppId, webAppId };
}

async function registerDebugToken(accessToken, appId, platform) {
  if (!appId) {
    console.warn(`⚠️ Skipping App Check for ${platform}: App ID not found.`);
    return;
  }
  
  console.log(`🔐 Registering App Check Debug Token for ${platform}...`);
  const url = `https://firebaseappcheck.googleapis.com/v1beta/projects/${PROJECT_ID}/apps/${appId}/debugTokens`;
  
  const payload = {
    displayName: `MemoTattoo Debug Token (${platform})`,
    token: APPCHECK_DEBUG_TOKEN
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
    console.log(`✅ App Check registered for ${platform}.`);
  } else {
    const error = await response.json();
    console.error(`❌ Failed to register App Check for ${platform}:`, JSON.stringify(error));
  }
}

async function configurePlayIntegrity(accessToken, appId) {
  if (!appId) return;
  console.log(`🛡️  Configuring Play Integrity for Android...`);
  const url = `https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT_ID}/apps/${appId}/playIntegrityConfig?updateMask=tokenTtl`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PROJECT_ID
    },
    body: JSON.stringify({ tokenTtl: "3600s" }) // Default TTL, enables the provider
  });

  if (response.ok) {
    console.log(`✅ Play Integrity configured correctly.`);
  } else {
    const error = await response.json();
    console.error(`❌ Failed to configure Play Integrity:`, JSON.stringify(error));
  }
}

async function configureRecaptchaV3(accessToken, appId, secretKey) {
  if (!appId || !secretKey) return;
  console.log(`🛡️  Configuring reCAPTCHA v3 for Web...`);
  const url = `https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT_ID}/apps/${appId}/recaptchaV3Config?updateMask=siteSecret,tokenTtl`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PROJECT_ID
    },
    body: JSON.stringify({
      siteSecret: secretKey,
      tokenTtl: "3600s"
    })
  });

  if (response.ok) {
    console.log(`✅ reCAPTCHA v3 configured correctly.`);
  } else {
    const error = await response.json();
    console.error(`❌ Failed to configure reCAPTCHA v3:`, JSON.stringify(error));
  }
}

async function registerSha256(accessToken, appId) {
  if (!appId) return;
  console.log(`🔑 Registering SHA-256 fingerprint for Android...`);
  
  // Hardcoded based on signingReport output
  const SHA256 = "94:E1:4C:9A:98:6C:20:EC:D9:90:72:86:6B:54:AF:E0:AC:DC:8A:8D:3B:77:DB:B7:4C:FB:00:A3:51:C7:D7:E4";
  
  const url = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}/androidApps/${appId}/sha`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Goog-User-Project': PROJECT_ID
    },
    body: JSON.stringify({
      shaHash: SHA256,
      certType: "SHA_256"
    })
  });

  if (response.ok) {
    console.log(`✅ SHA-256 fingerprint registered correctly.`);
  } else {
    const error = await response.json();
    if (error.error && error.error.status === 'ALREADY_EXISTS') {
      console.log('✅ SHA-256 fingerprint already exists.');
    } else {
      console.error(`❌ Failed to register SHA-256:`, JSON.stringify(error));
    }
  }
}

async function main() {
  if (!APPCHECK_DEBUG_TOKEN && !config.RECAPTCHA_SECRET_KEY) {
    console.log('⏩ Skipping App Check registration: No token or secret in config.');
    return;
  }

  try {
    const accessToken = await getAccessToken();
    const { androidAppId, webAppId } = await getAppIds(accessToken);
    
    // 1. Debug Tokens
    await registerDebugToken(accessToken, androidAppId, 'Android');
    await registerDebugToken(accessToken, webAppId, 'Web');

    // 2. Production Providers
    await configurePlayIntegrity(accessToken, androidAppId);
    await configureRecaptchaV3(accessToken, webAppId, config.RECAPTCHA_SECRET_KEY);

    // 3. Android Fingerprint
    await registerSha256(accessToken, androidAppId);

  } catch (error) {
    console.error('💥 Error during App Check registration:', error);
  }
}

main();
