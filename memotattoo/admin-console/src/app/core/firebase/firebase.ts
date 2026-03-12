import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAI, GoogleAIBackend, getTemplateGenerativeModel } from 'firebase/ai';

const firebaseConfig = {
  "projectId": "ai-logic-demos",
  "appId": "1:861083271982:web:8128d34be86880bdeeb0bf",
  "storageBucket": "ai-logic-demos.firebasestorage.app",
  "apiKey": "AIzaSyAyfIbcQZ8ufeK8WrgwIuiRhEv-1AvjNrI",
  "authDomain": "ai-logic-demos.firebaseapp.com",
  "messagingSenderId": "861083271982",
  "measurementId": "G-1QFETFNRLC",
  "projectNumber": "861083271982",
  "version": "2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

// Initialize Firebase AI Logic with the standard Gemini Developer API backend
export const ai = getAI(app, { backend: new GoogleAIBackend() });
export const templateModel = getTemplateGenerativeModel(ai);
