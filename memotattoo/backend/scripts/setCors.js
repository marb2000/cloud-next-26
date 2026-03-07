const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "ai-logic-demos",
  storageBucket: "ai-logic-demos.firebasestorage.app"
});

async function setCors() {
  try {
    const bucket = admin.storage().bucket();
    await bucket.setCorsConfiguration([
      {
        origin: ["*"],
        method: ["GET", "OPTIONS", "HEAD"],
        maxAgeSeconds: 3600
      }
    ]);
    console.log("CORS set successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error setting CORS:", error.message);
    process.exit(1);
  }
}

setCors();
