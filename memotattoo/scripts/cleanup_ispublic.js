const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function cleanupIsPublic() {
  const decksRef = db.collection('FlashcardDecks');
  const snapshot = await decksRef.get();
  
  if (snapshot.empty) {
    console.log('No decks found.');
    return;
  }

  let count = 0;
  let batch = db.batch();
  let batchCount = 0;
  const batchSize = 500;

  for (const doc of snapshot.docs) {
    if (doc.data().hasOwnProperty('isPublic')) {
      batch.update(doc.ref, {
        isPublic: admin.firestore.FieldValue.delete()
      });
      count++;
      batchCount++;
    }

    if (batchCount === batchSize) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
      console.log(`Committed ${count} updates...`);
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`Successfully removed 'isPublic' field from ${count} documents.`);
}

cleanupIsPublic().catch(console.error);
