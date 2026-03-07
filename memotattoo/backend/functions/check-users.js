const admin = require('firebase-admin');
const app = admin.initializeApp();
const db = admin.firestore();

async function check() {
  console.log("Checking Users collection...");
  const snapshot = await db.collection('Users').get();
  console.log(`Found ${snapshot.size} users.`);
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });

  console.log("Checking Admins collection...");
  const adminSnap = await db.collection('Admins').get();
  console.log(`Found ${adminSnap.size} admins.`);
  adminSnap.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}

check().catch(console.error);
