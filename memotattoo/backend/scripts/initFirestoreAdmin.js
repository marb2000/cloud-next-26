const admin = require("firebase-admin");

// Initialize the app with default credentials
// Make sure you have run `gcloud auth application-default login` or set GOOGLE_APPLICATION_CREDENTIALS
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "ai-logic-demos" // Using your actual production logic project ID
});

const email = "admin@firebaseailogic.com";

async function createAdminTable() {
  try {
    const db = admin.firestore();

    // Explicitly write an empty record using the admin's email as the key
    await db.collection("Admins").doc(email).set({
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      role: "Super Admin"
    });

    console.log(`Successfully hardcoded Document: Admins/${email} into Firestore!`);
    process.exit(0);
  } catch (error) {
    console.error("Error setting up Firestore Admins table:", error.message);
    process.exit(1);
  }
}

createAdminTable();
