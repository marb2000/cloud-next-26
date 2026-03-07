import { initializeApp } from "firebase/app";
import { getAI, GoogleAIBackend, getTemplateGenerativeModel } from "firebase/ai";
import fetch from "node-fetch";
global.fetch = fetch;

const firebaseConfig = {
  apiKey: "AIzaSyAyfIbcQZ8ufeK8WrgwIuiRhEv-1AvjNrI",
  projectId: "ai-logic-demos",
};

const app = initializeApp(firebaseConfig);
const ai = getAI(app, { backend: new GoogleAIBackend() });
const templateModel = getTemplateGenerativeModel(ai);

async function run() {
  try {
    const inputs = {
      existing_image: "https://firebasestorage.googleapis.com/v0/b/ai-logic-demos.firebasestorage.app/o/flashcard-drafts%2Fsomeimage.jpg?alt=media",
      modification_prompt: "make it blue"
    };
    const res = await templateModel.generateContent('memotattoo-refine-image-v1', inputs);
    console.log("Success");
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
