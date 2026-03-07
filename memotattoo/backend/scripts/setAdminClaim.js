const admin = require("firebase-admin");

// Initialize the app with default credentials
// Make sure you have run `gcloud auth application-default login` or set GOOGLE_APPLICATION_CREDENTIALS
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "ai-logic-demos"
});

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Please provide an user email address: node setAdminClaim.js <email>");
  process.exit(1);
}

const email = args[0];

async function setAdminClaim(userEmail) {
  try {
    const user = await admin.auth().getUserByEmail(userEmail);
    // Set custom user claims on this UID.
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Successfully elevated ${userEmail} (UID: ${user.uid}) to Admin status.`);
    process.exit(0);
  } catch (error) {
    console.error("Error setting custom claim:", error.message);
    process.exit(1);
  }
}

setAdminClaim(email);
