const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const functions = require("firebase-functions/v1");
const { getStorage } = require("firebase-admin/storage");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const admin = require("firebase-admin");

admin.initializeApp();

// Nightly Energy Bolt Refill (Play Plan logic)
exports.refillEnergyBolts = onSchedule("every day 00:00", async (event) => {
  const db = getFirestore();
  const batch = db.batch();
  const usersSnapshot = await db.collection("Users").get();

  usersSnapshot.forEach((doc) => {
    // Refill free users up to 3 bolts
    const data = doc.data();
    if (!data.isPro && data.energy_bolts < 3) {
      batch.update(doc.ref, { energy_bolts: 3 });
    }
  });

  await batch.commit();
  console.log("Completed nightly energy bolt refill.");
});

// Moderation: When an Admin deletes a Flashcard from Firestore, purge it from Storage.
exports.onFlashcardDeleted = onDocumentDeleted("Flashcards/{cardId}", async (event) => {
  const snap = event.data;
  if (!snap) return;

  const data = snap.data();
  if (data.imageUrl) {
    // Extract storage path from signed URL assuming default Appspot bucket
    try {
      const bucket = getStorage().bucket();
      // A naive extraction assuming we store images in a particular pattern
      const filePathStart = data.imageUrl.indexOf('/o/') + 3;
      const filePathEnd = data.imageUrl.indexOf('?alt=media');
      if (filePathStart > 2 && filePathEnd > filePathStart) {
        let filePath = data.imageUrl.substring(filePathStart, filePathEnd);
        filePath = decodeURIComponent(filePath);
        await bucket.file(filePath).delete();
        console.log(`Deleted associated image payload from Storage: ${filePath}`);
      }
    } catch (e) {
      console.error("Failed to delete the associated storage bucket image", e);
    }
  }
});

// Admin Sync: When a User profile is deleted from Firestore (via the Admin Console), permanently delete their Auth record.
exports.onUserDeleted = functions.firestore
  .document("Users/{userId}")
  .onDelete(async (snap, context) => {
    const userId = context.params.userId;
    if (!userId) {
      console.error("No userId found in context params.");
      return;
    }

    try {
      await getAuth().deleteUser(userId);
      console.log(`Successfully deleted Auth record for user: ${userId}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`Auth record for user ${userId} was already deleted or did not exist.`);
      } else {
        console.error(`Failed to delete Auth record for user ${userId}:`, error);
      }
    }
  });
