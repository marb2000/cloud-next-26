import { initializeApp } from "firebase/app";
import { getAI, GoogleAIBackend, getTemplateGenerativeModel } from "firebase/ai";
import fetch from "node-fetch";
global.fetch = fetch;

const firebaseConfig = {
  apiKey: "AIzaSyAyfIbcQZ8ufeK8WrgwIuiRhEv-1AvjNrI",
  authDomain: "ai-logic-demos.firebaseapp.com",
  projectId: "ai-logic-demos",
  storageBucket: "ai-logic-demos.firebasestorage.app",
  messagingSenderId: "861083271982",
  appId: "1:861083271982:web:af1fe516276b354aeeb0bf",
  measurementId: "G-49KXEKL7VR"
};

const app = initializeApp(firebaseConfig);
const ai = getAI(app, { backend: new GoogleAIBackend() });
const templateModel = getTemplateGenerativeModel(ai);

async function run() {
  try {
    const inputs = {
      existing_image: "gs://ai-logic-demos.firebasestorage.app/flashcard-drafts/someimage.jpg",
      modification_prompt: "make it blue"
    };
    const res = await templateModel.generateContent('memotattoo-refine-image-v1', inputs);
    console.log("Success", res.text());
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
