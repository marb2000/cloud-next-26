package com.firebaseailogic.memotattoo.data

import com.firebaseailogic.memotattoo.ui.flashcards.FlashcardDeckSummary
import com.firebaseailogic.memotattoo.ui.flashcards.UserProfile
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOf


class MockUserRepository : IUserRepository {
    override fun getUserProfile(uid: String): Flow<UserProfile?> {
        return flowOf(UserProfile(uid, "demo@example.com", 100, false, true, 0))
    }
    override suspend fun incrementBolts(uid: String, amount: Int) {}
    override suspend fun consumeBolts(uid: String, amount: Int): Boolean = true
    override suspend fun incrementImageCount(uid: String) {}
    override suspend fun downgradeToFree(uid: String) {}
}

class MockFlashcardRepository : IFlashcardRepository {
    override fun getPublicDecks(searchQuery: String?, limit: Long): Flow<Resource<List<FlashcardDeckSummary>>> = flowOf(
        Resource.Success(listOf(
            FlashcardDeckSummary("public_deck_1", "Public: Geography", "World Capitals", "FlashcardDeck", false, "published", true, "another_user", 0)
        ))
    )
    override fun getMyDecks(uid: String): Flow<Resource<List<FlashcardDeckSummary>>> = flowOf(
        Resource.Success(listOf(
            FlashcardDeckSummary("demo_deck_1", "Demo Deck: Anatomy", "Anatomy and Physiology", "FlashcardDeck", false, "active", false, uid, 50),
            FlashcardDeckSummary("demo_deck_2", "Demo Deck: History", "World History", "FlashcardDeck", false, "active", false, uid, 0)
        ))
    )
    override suspend fun getBestScores(uid: String): Map<String, Int> = mapOf("demo_deck_1" to 50)
    override suspend fun getDeck(deckId: String): Map<String, Any>? {
        return mapOf(
            "id" to deckId,
            "topic" to "Demo Deck",
            "owner_id" to "test_user",
            "items" to listOf(
                mapOf("term" to "Heart", "definition" to "Pumps blood", "imageArt" to ""),
                mapOf("term" to "Brain", "definition" to "Thinking organ", "imageArt" to "")
            )
        )
    }
    override suspend fun saveDeck(deckId: String?, data: Map<String, Any>): String = "new_deck_id"
    override suspend fun deleteDeck(deckId: String) {}
    override suspend fun updateDeckStatus(deckId: String, status: String) {}
    override suspend fun uploadImage(bytes: ByteArray): String = "https://example.com/mock.jpg"
    override suspend fun saveScore(uid: String, deckId: String, score: Int) {}
}

class MockAILogic : com.firebaseailogic.memotattoo.ai.IAILogic {
    override suspend fun generateTopic(topic: String, numConcepts: Int): Map<String, Any> = mapOf("title" to topic, "items" to emptyList<Map<String, String>>())
    override suspend fun brainstormMore(topic: String, currentConcepts: List<com.firebaseailogic.memotattoo.ui.flashcards.ConceptDraft>, numConcepts: Int): List<com.firebaseailogic.memotattoo.ui.flashcards.ConceptDraft> = emptyList()
    override suspend fun generateConceptImage(title: String, term: String, definition: String, artDirection: String?): String = ""
    override fun startGameSession(
        deckTitle: String,
        onAddPoints: (Int) -> Unit,
        onNextConcept: (String) -> Map<String, Any>
    ): com.google.firebase.ai.Chat? = null
}
