const { initializeApp } = require('firebase-admin/app');
const { getVertexAI } = require('firebase-admin/vertexai');

initializeApp();

async function run() {
  const vertex = getVertexAI();
  const model = vertex.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });

  const result = await model.generateContent("A simple test image of an apple.");
  console.log("TEXT:");
  console.dir(result.response.text(), { depth: null });
  console.log("CANDIDATES:");
  console.dir(result.response.candidates, { depth: null });
}

run().catch(console.error);
