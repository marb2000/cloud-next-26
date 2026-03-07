import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAI, GoogleAIBackend, getTemplateGenerativeModel } from 'firebase/ai';

const firebaseConfig = {
  apiKey: "AIzaSyAyfIbcQZ8ufeK8WrgwIuiRhEv-1AvjNrI",
  authDomain: "ai-logic-demos.firebaseapp.com",
  projectId: "ai-logic-demos",
  storageBucket: "ai-logic-demos.firebasestorage.app",
  messagingSenderId: "861083271982",
  appId: "1:861083271982:web:af1fe516276b354aeeb0bf",
  measurementId: "G-49KXEKL7VR"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

// Initialize Firebase AI Logic with the standard Gemini Developer API backend
export const ai = getAI(app, { backend: new GoogleAIBackend() });
export const templateModel = getTemplateGenerativeModel(ai);
