import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration to get PROJECT_ID
const configPath = path.join(__dirname, '../sync-config.json');
if (!existsSync(configPath)) {
    console.error('❌ Error: sync-config.json not found');
    process.exit(1);
}
const config = JSON.parse(readFileSync(configPath, 'utf-8'));
const PROJECT_ID = config.PROJECT_ID;

async function backfill() {
    console.log(`🚀 Starting backfill of publishedAt for project: ${PROJECT_ID}`);
    
    // Use application default credentials or service account if available
    // For this context, we assume ADC is configured as per previous setup steps
    initializeApp({
        projectId: PROJECT_ID
    });

    const db = getFirestore();
    const decksRef = db.collection('FlashcardDecks');
    
    // Find decks missing publishedAt
    const snapshot = await decksRef.get();
    console.log(`Found ${snapshot.size} total decks.`);
    
    let updatedCount = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const data = doc.data();
        if (!data.publishedAt) {
            console.log(`🔧 Backfilling deck: ${doc.id} (${data.topic || 'Untitled'})`);
            // Use createdAt if available, otherwise use a default or current time
            const timestamp = data.createdAt || data.updatedAt || new Date();
            batch.update(doc.ref, { publishedAt: timestamp });
            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        await batch.commit();
        console.log(`✅ Successfully backfilled ${updatedCount} decks.`);
    } else {
        console.log('✨ No decks needed backfilling.');
    }
}

backfill().catch(err => {
    console.error('💥 Backfill failed:', err);
    process.exit(1);
});
