import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';
import fs from 'fs';

async function run() {
  const auth = new GoogleAuth({
    keyFile: './service-account.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  
  const client = await auth.getClient();
  const accessToken = (await client.getAccessToken()).token;

  // We are creating/updating the Prompt Template in Vertex AI directly
  // The official name of the resource type in Vertex AI for Firebase is "Template"
  const url = `https://firebasevertexai.googleapis.com/v1beta/projects/ai-logic-demos/locations/us-central1/templates/memotattoo-refine-image-v1`;
  
  const payload = {
    "template": {
      "model": "projects/ai-logic-demos/locations/us-central1/publishers/google/models/gemini-2.5-flash",
      "prompt": {
        "messages": [
          {
            "role": "user",
            "content": "Modify the following reference image strictly based on these instructions:\n{{modification_prompt}}\n\n{{#each inline_images}}\n  {{media type=\"mime_type\" data=\"contents\"}}\n{{/each}}"
          }
        ]
      },
      "parameters": [
        {
          "name": "modification_prompt",
          "type": "STRING"
        },
        {
          "name": "inline_images",
          "type": "ARRAY",
          "items": {
             "type": "OBJECT",
             "properties": {
                "mime_type": { "type": "STRING" },
                "contents": { "type": "STRING" }
             }
          }
        }
      ]
    }
  };

  const response = await fetch(url, {
    method: 'PATCH', // Create or update
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

run();
