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
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
    quotaProjectID: PROJECT_ID
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function deployRules(releaseName, rulesContent) {
  const accessToken = await getAccessToken();
  console.log(`🛡️ Deploying rules for ${releaseName}...`);

  // 1. Create Ruleset
  const rulesetUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`;
  const rulesetPayload = {
    source: {
      files: [
        {
          name: 'vertexai.rules',
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
    console.log(`✅ Rules deployed successfully for ${releaseName}.`);
  } else {
    // Try POST
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
      console.log(`✅ Rules release created successfully for ${releaseName}.`);
    } else {
      const error = await postResponse.text();
      console.error(`❌ Failed to deploy rules for ${releaseName}: ${error}`);
    }
  }
}

const vertexRules = `rules_version = '2';
service firebase.vertexai {
  match /projects/{project}/locations/{location}/templates/{template} {
    allow read: if request.auth != null;
  }
}
`;

async function main() {
  await deployRules(`projects/${PROJECT_ID}/releases/firebase.vertexai`, vertexRules);
}

main();
