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

async function grantRunInvokerRole() {
  const token = await getAccessToken();
  const getUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT_ID}:getIamPolicy`;
  const setUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT_ID}:setIamPolicy`;

  console.log(`🔍 Fetching current IAM policy for project: ${PROJECT_ID}...`);
  const getResponse = await fetch(getUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });

  if (!getResponse.ok) {
    console.error('❌ Failed to fetch IAM policy:', await getResponse.text());
    return;
  }

  const policy = await getResponse.json();
  const targetRole = 'roles/run.invoker';
  const targetMember = 'serviceAccount:service-861083271982@gcp-sa-firebasevertexai.iam.gserviceaccount.com';

  console.log(`⚙️ Modifying IAM policy bindings for ${targetRole}...`);
  
  if (!policy.bindings) {
    policy.bindings = [];
  }

  let binding = policy.bindings.find(b => b.role === targetRole);
  if (binding) {
    if (binding.members.includes(targetMember)) {
      console.log(`ℹ️ Member "${targetMember}" already has "${targetRole}".`);
      return;
    } else {
      binding.members.push(targetMember);
    }
  } else {
    policy.bindings.push({
      role: targetRole,
      members: [targetMember]
    });
  }

  console.log(`📤 Updating IAM policy...`);
  const setResponse = await fetch(setUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      policy: {
        bindings: policy.bindings,
        etag: policy.etag
      }
    })
  });

  if (setResponse.ok) {
    console.log(`✅ Successfully granted role "${targetRole}" to "${targetMember}".`);
  } else {
    console.error('❌ Failed to update IAM policy:', await setResponse.text());
  }
}

grantRunInvokerRole();
