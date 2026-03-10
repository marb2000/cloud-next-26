const admin = require('firebase-admin');
const fs = require('fs');

async function checkDecks() {
  const serviceAccountPath = './backend/functions/serviceAccountKey.json';
  if (fs.existsSync(serviceAccountPath)) {
    console.log("Found serviceAccountKey.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath)
    });
  } else {
    console.log("Fallback to application default credentials");
    admin.initializeApp();
  }

  const db = admin.firestore();
  try {
    const snapshot = await db.collection('FlashcardDecks')
                             .orderBy('createdAt', 'desc')
                             .limit(5)
                             .get();

    console.log(`Found ${snapshot.size} decks.`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`--- Deck ${doc.id} ---`);
      console.log(`Title: ${data.title}`);
      console.log(`Status: ${data.status}`);
      console.log(`Art Direction: '${data.artDirection}'`);
      console.log(`Art Ref Image: '${data.artReferenceImage}'`);
    });
  } catch (e) {
    console.error("Error fetching decks:", e);
  }
}

checkDecks();
