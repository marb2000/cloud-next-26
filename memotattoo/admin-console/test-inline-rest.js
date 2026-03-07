import { GoogleAuth } from 'google-auth-library';
import fetch from 'node-fetch';

async function run() {
  const auth = new GoogleAuth({
    keyFile: './service-account.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });
  
  const client = await auth.getClient();
  const accessToken = (await client.getAccessToken()).token;

  // Let's call the generateContent API directly to test the schema
  const url = `https://firebasevertexai.googleapis.com/v1beta/projects/ai-logic-demos/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent`;
  
  const payload = {
    contents: [{
      role: 'user',
      parts: [
        { text: 'What is this image?' },
        { 
          inlineData: {
             mimeType: 'image/jpeg',
             data: '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBAQFBAYFBQYJBgUGCQsIBgYICwwKCgsKCgwQDAwMDAwMEAwODxAPDgwTExQUExMcGxsbHCAgICAgICAgICD/'
          }
        }
      ]
    }]
  };

  const response = await fetch(url, {
    method: 'POST',
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
