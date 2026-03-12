import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration
const configPath = path.join(__dirname, '../sync-config.json');
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

const PROJECT_ID = config.PROJECT_ID || 'ai-logic-demos';
const ADMIN_EMAIL = config.ADMIN_EMAIL;
const ADMIN_PASSWORD = config.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Error: ADMIN_EMAIL or ADMIN_PASSWORD not found in sync-config.json');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID
});

const db = admin.firestore();
const auth = admin.auth();

async function createAdminUser() {
  console.log(`🔐 Creating/Updating Admin User: ${ADMIN_EMAIL}...`);
  try {
    let user;
    try {
      user = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log('✅ Admin user already exists in Auth.');
      // Update password just in case
      await auth.updateUser(user.uid, { password: ADMIN_PASSWORD });
      console.log('✅ Admin password updated.');
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        user = await auth.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          emailVerified: true
        });
        console.log(`✅ Admin user created with UID: ${user.uid}`);
      } else {
        throw e;
      }
    }
    return user;
  } catch (error) {
    console.error('❌ Error in Auth setup:', error.message);
    throw error;
  }
}

async function createAdminFirestoreDoc() {
  console.log(`📂 Registering ${ADMIN_EMAIL} in Firestore Admins collection...`);
  try {
    await db.collection('Admins').doc(ADMIN_EMAIL).set({
      email: ADMIN_EMAIL,
      role: 'super-admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✅ Admin record created in Firestore.');
  } catch (error) {
    console.error('❌ Error in Firestore admin registration:', error.message);
    throw error;
  }
}

async function setupAdmins() {
  console.log('🚀 Automated Admin Initialization...');
  try {
    await createAdminUser();
    await createAdminFirestoreDoc();
    console.log('\n✨ Admin setup complete.');
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error during Admin setup:', error);
    process.exit(1);
  }
}

setupAdmins();
