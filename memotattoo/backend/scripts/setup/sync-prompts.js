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

// Override with command line arguments or environment variables
const PROJECT_ID = process.argv[2] || config.PROJECT_ID || process.env.PROJECT_ID;
const LOCATION = process.argv[3] || config.LOCATION || process.env.LOCATION;
const PROMPTS_DIR_REL = process.argv[4] || config.PROMPTS_DIR || process.env.PROMPTS_DIR || '../prompts';
const PROMPTS_DIR = path.resolve(__dirname, PROMPTS_DIR_REL);

if (!PROJECT_ID || !LOCATION) {
  console.error('❌ Error: PROJECT_ID and LOCATION must be provided via sync-config.json, CLI arguments, or environment variables.');
  console.log('Usage: node sync-prompts.js [PROJECT_ID] [LOCATION] [PROMPTS_DIR]');
  process.exit(1);
}

const BASE_URL = `https://firebasevertexai.googleapis.com/v1beta/projects/${PROJECT_ID}/locations/${LOCATION}/templates`;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getAccessToken() {
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
    quotaProjectID: PROJECT_ID
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token;
}

async function listRemoteTemplates(accessToken) {
  const response = await fetch(BASE_URL, {
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'X-Goog-User-Project': PROJECT_ID
    }
  });
  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to list templates: ${error}`);
    return [];
  }
  const data = await response.json();
  return data.templates || [];
}

async function syncPrompts() {
  console.log('🚀 Starting AI Logic Prompt Synchronization...');
  console.log(`📍 Project: ${PROJECT_ID}`);
  console.log(`🌍 Location: ${LOCATION}`);
  console.log(`📂 Prompts Dir: ${PROMPTS_DIR}`);
  
  try {
    const accessToken = await getAccessToken();
    const remoteTemplates = await listRemoteTemplates(accessToken);
    const remoteIds = remoteTemplates.map(t => t.name.split('/').pop());

    if (!fs.existsSync(PROMPTS_DIR)) {
       console.error(`❌ Error: Prompts directory not found at ${PROMPTS_DIR}`);
       process.exit(1);
    }
    const localFiles = fs.readdirSync(PROMPTS_DIR).filter(f => f.endsWith('.prompt'));

    for (const file of localFiles) {
      const templateId = file.replace('.prompt', '');
      const filePath = path.join(PROMPTS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      const isNew = !remoteIds.includes(templateId);
      console.log(`Syncing [${templateId}] (${isNew ? 'New' : 'Update'})...`);

      const payload = {
        template_string: content,
        display_name: templateId
      };

      const url = `${BASE_URL}/${templateId}?allow_missing=true`;
      
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
        console.log(`✅ [${templateId}] Synced successfully.`);
      } else {
        const error = await response.text();
        console.error(`❌ [${templateId}] Failed to sync: ${error}`);
      }

      await sleep(6000);
    }

    // Specific deletion of the old template with typo as requested by user
    const oldTemplateId = 'memotattoo-generatate-topic-v1';
    if (remoteIds.includes(oldTemplateId)) {
      console.log(`\n🗑️ Deleting old template [${oldTemplateId}]...`);
      const url = `${BASE_URL}/${oldTemplateId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Goog-User-Project': PROJECT_ID
        }
      });
      if (response.ok) {
        console.log(`✅ [${oldTemplateId}] Deleted successfully.`);
      } else {
        const error = await response.text();
        console.error(`❌ [${oldTemplateId}] Failed to delete: ${error}`);
      }
    }

    console.log('\n✨ Sync complete.');

  } catch (error) {
    console.error('💥 Fatal error during sync:', error);
    process.exit(1);
  }
}

syncPrompts();
