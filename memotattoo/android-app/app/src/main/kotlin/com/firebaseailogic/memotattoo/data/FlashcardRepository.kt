package com.firebaseailogic.memotattoo.data

import com.firebaseailogic.memotattoo.ui.flashcards.FlashcardDeckSummary
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

interface IFlashcardRepository {
    fun getPublicDecks(): Flow<List<FlashcardDeckSummary>>
    fun getMyDecks(uid: String): Flow<List<FlashcardDeckSummary>>
    suspend fun saveDeck(deckId: String?, data: Map<String, Any>): String
    suspend fun deleteDeck(deckId: String)
    suspend fun updateDeckStatus(deckId: String, status: String, isPublic: Boolean)
    suspend fun getBestScores(uid: String): Map<String, Int>
    suspend fun getDeck(deckId: String): Map<String, Any>?
    suspend fun uploadImage(bytes: ByteArray): String
    suspend fun saveScore(uid: String, deckId: String, score: Int)
}

class FlashcardRepository(
    private val auth: FirebaseAuth = FirebaseManager.auth,
    private val firestore: FirebaseFirestore = FirebaseManager.firestore
) : IFlashcardRepository {

    override suspend fun getDeck(deckId: String): Map<String, Any>? {
        val doc = firestore.collection("FlashcardDecks").document(deckId).get().await()
        return if (doc.exists()) doc.data else null
    }

    override fun getPublicDecks(): Flow<List<FlashcardDeckSummary>> = callbackFlow {
        val listener = firestore.collection("FlashcardDecks")
            .whereEqualTo("isPublic", true)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val decks = snapshot?.documents?.map { doc ->
                    mapToSummary(doc)
                } ?: emptyList()
                trySend(decks)
            }
        awaitClose { listener.remove() }
    }

    override fun getMyDecks(uid: String): Flow<List<FlashcardDeckSummary>> = callbackFlow {
        val listener = firestore.collection("FlashcardDecks")
            .whereEqualTo("owner_id", uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                val decks = snapshot?.documents?.map { doc ->
                    mapToSummary(doc)
                } ?: emptyList()
                trySend(decks)
            }
        awaitClose { listener.remove() }
    }

    override suspend fun saveDeck(deckId: String?, data: Map<String, Any>): String {
        val docRef = if (deckId != null) {
            firestore.collection("FlashcardDecks").document(deckId)
        } else {
            firestore.collection("FlashcardDecks").document()
        }
        docRef.set(data).await()
        return docRef.id
    }

    override suspend fun deleteDeck(deckId: String) {
        firestore.collection("FlashcardDecks").document(deckId).delete().await()
    }

    override suspend fun updateDeckStatus(deckId: String, status: String, isPublic: Boolean) {
        firestore.collection("FlashcardDecks").document(deckId)
            .update(mapOf("status" to status, "isPublic" to isPublic))
            .await()
    }

    override suspend fun getBestScores(uid: String): Map<String, Int> {
        val scoresSnap = firestore.collection("Users").document(uid)
            .collection("User_Scores").get().await()
        return scoresSnap.documents.associate {
            it.id to (it.getLong("bestScore")?.toInt() ?: 0)
        }
    }

    private fun mapToSummary(doc: com.google.firebase.firestore.DocumentSnapshot): FlashcardDeckSummary {
        @Suppress("UNCHECKED_CAST")
        val contentBase = doc.get("contentBase") as? Map<String, Any>
        return FlashcardDeckSummary(
            id = doc.id,
            title = contentBase?.get("title") as? String ?: doc.getString("title") ?: "Unknown Deck",
            description = doc.getString("topic") ?: "Custom flashcard deck.",
            type = "FlashcardDeck",
            status = doc.getString("status") ?: "draft",
            isPublic = doc.getBoolean("isPublic") ?: (doc.getString("status") == "published"),
            ownerId = doc.getString("owner_id") ?: doc.getString("authorId") ?: "",
            bestScore = 0 // Best score is filled in by the ViewModel merging data
        )
    }
override suspend fun uploadImage(bytes: ByteArray): String {
        val storageRef = FirebaseManager.storage.reference.child("drafts/${java.util.UUID.randomUUID()}.jpg")
        storageRef.putBytes(bytes).await()
        return storageRef.downloadUrl.await().toString()
    }

    override suspend fun saveScore(uid: String, deckId: String, score: Int) {
        val scoreRef = firestore.collection("Users").document(uid)
            .collection("User_Scores").document(deckId)

        val currentBest = scoreRef.get().await().getLong("bestScore") ?: 0L
        if (score > currentBest) {
            scoreRef.set(
                mapOf(
                    "bestScore" to score,
                    "lastPlayed" to com.google.firebase.firestore.FieldValue.serverTimestamp()
                )
            ).await()
        }
    }
}
