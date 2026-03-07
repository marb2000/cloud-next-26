const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyAyfIbcQZ8ufeK8WrgwIuiRhEv-1AvjNrI",
  authDomain: "ai-logic-demos.firebaseapp.com",
  projectId: "ai-logic-demos",
  storageBucket: "ai-logic-demos.firebasestorage.app",
  messagingSenderId: "861083271982",
  appId: "1:861083271982:web:af1fe516276b354aeeb0bf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = "admin@memotattoo.com";
const password = "memotattoo123";

async function bootstrapAdmin() {
  try {
    let userCredential;
    try {
      // Try creating
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Created brand new admin user Auth identity.");
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        // Fallback login
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User already existed in Auth. Signed in to set document.");
      } else {
        throw e;
      }
    }

    // Now write the Firestore document using the Client SDK
    await setDoc(doc(db, "Admins", email), {
      role: "Super Admin",
      assignedAt: new Date().toISOString()
    });

    console.log(`\n🎉 SUCCESS! You are now fully elevated!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}\n`);
    console.log(`Next Step: Login at localhost:4200 using these credentials!`);

    process.exit(0);
  } catch (error) {
    console.error("Failed to inject Admin Document:", error.message);
    process.exit(1);
  }
}

bootstrapAdmin();
