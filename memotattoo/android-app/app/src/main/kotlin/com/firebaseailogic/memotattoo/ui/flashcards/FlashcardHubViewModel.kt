package com.firebaseailogic.memotattoo.ui.flashcards

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class FlashcardHubViewModel(
    private val auth: FirebaseAuth = FirebaseManager.auth,
    private val firestore: FirebaseFirestore = FirebaseManager.firestore
) : ViewModel() {
    
    private var decksListener: com.google.firebase.firestore.ListenerRegistration? = null

    private val _myDecks = MutableStateFlow<List<FlashcardDeckSummary>>(emptyList())
    val myDecks: StateFlow<List<FlashcardDeckSummary>> = _myDecks.asStateFlow()

    private val _publicDecks = MutableStateFlow<List<FlashcardDeckSummary>>(emptyList())
    val publicDecks: StateFlow<List<FlashcardDeckSummary>> = _publicDecks.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    init {
        startListeningForDecks()
    }

    private fun startListeningForDecks() {
        val currentUid = auth.currentUser?.uid ?: return
        _isLoading.value = true
        
        decksListener = firestore.collection("FlashcardDecks")
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    error.printStackTrace()
                    _isLoading.value = false
                    return@addSnapshotListener
                }
                
                if (snapshot != null) {
                    viewModelScope.launch {
                        try {
                            // Still need scores, but can be done once or also listened to.
                            // For now, let's keep score fetch as is but inside the listener or separate.
                            // Optimized: fetch scores once and associate.
                            val userScoresRef = firestore
                                .collection("Users")
                                .document(currentUid)
                                .collection("User_Scores")
                            val scoresSnap = userScoresRef.get().await()
                            val scoreMap = scoresSnap.documents.associate {
                                it.id to (it.getLong("bestScore")?.toInt() ?: 0)
                            }

                            val loadedDecks = snapshot.documents.map { doc ->
                                @Suppress("UNCHECKED_CAST")
                                val contentBase = doc.get("contentBase") as? Map<String, Any>
                                FlashcardDeckSummary(
                                    id = doc.id,
                                    title = contentBase?.get("title") as? String ?: "Unknown Deck",
                                    description = doc.getString("topic") ?: "Custom flashcard deck.",
                                    type = "FlashcardDeck",
                                    status = doc.getString("status") ?: "draft",
                                    isPublic = doc.getBoolean("isPublic") ?: (doc.getString("status") == "published"),
                                    ownerId = doc.getString("owner_id") ?: "",
                                    bestScore = scoreMap[doc.id] ?: 0
                                )
                            }

                            _myDecks.value = loadedDecks.filter { it.ownerId == currentUid && !it.isPublic }
                            _publicDecks.value = loadedDecks.filter { it.isPublic }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        } finally {
                            _isLoading.value = false
                        }
                    }
                }
            }
    }

    fun publishDeck(deck: FlashcardDeckSummary) {
        firestore.collection("FlashcardDecks")
            .document(deck.id)
            .update(mapOf("status" to "published", "isPublic" to true))
    }

    fun unpublishDeck(deck: FlashcardDeckSummary) {
        firestore.collection("FlashcardDecks")
            .document(deck.id)
            .update(mapOf("status" to "private", "isPublic" to false))
    }

    fun deleteDeck(deckId: String) {
        firestore.collection("FlashcardDecks")
            .document(deckId)
            .delete()
    }

    override fun onCleared() {
        super.onCleared()
        decksListener?.remove()
    }
}
