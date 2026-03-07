import { initializeApp } from "firebase/app";
import { getAI, GoogleAIBackend, getTemplateGenerativeModel } from "firebase/ai";

const firebaseConfig = {
  apiKey: "AIzaSyAyfIbcQZ8ufeK8WrgwIuiRhEv-1AvjNrI",
  authDomain: "ai-logic-demos.firebaseapp.com",
  projectId: "ai-logic-demos",
  appId: "1:861083271982:web:af1fe516276b354aeeb0bf",
};

const app = initializeApp(firebaseConfig);
const ai = getAI(app, { backend: new GoogleAIBackend() });
const templateModel = getTemplateGenerativeModel(ai);

async function run() {
  try {
    const inputs = {
      image_data: {
        inlineData: {
          mimeType: "image/jpeg",
          data: "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBAQFBAYFBQYJBgUGCQsIBgYICwwKCgsKCgwQDAwMDAwMEAwODxAPDgwTExQUExMcGxsbHCAgICAgICAgICD/"
        }
      },
      modification_prompt: "make it blue"
    };
    const res = await templateModel.generateContent('memotattoo-refine-image-inline', inputs);
    console.log("Success", res.text());
  } catch(e) {
    console.error("Error:", e);
  }
}
run();
