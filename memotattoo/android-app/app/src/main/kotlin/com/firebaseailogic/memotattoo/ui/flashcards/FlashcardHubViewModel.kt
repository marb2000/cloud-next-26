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

import com.firebaseailogic.memotattoo.data.FlashcardRepository
import com.firebaseailogic.memotattoo.data.IFlashcardRepository
import kotlinx.coroutines.flow.combine

class FlashcardHubViewModel(
    private val auth: FirebaseAuth = FirebaseManager.auth,
    private val repository: IFlashcardRepository = FlashcardRepository()
) : ViewModel() {
    
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
        val currentUid = auth.currentUser?.uid ?: ""
        
        viewModelScope.launch {
            _isLoading.value = true
            try {
                // Combine my decks and public decks with their scores
                combine(
                    repository.getMyDecks(currentUid),
                    repository.getPublicDecks()
                ) { myDecks, publicDecks ->
                    val scores = repository.getBestScores(currentUid)
                    
                    val myWithScores = myDecks.map { it.copy(bestScore = scores[it.id] ?: 0) }
                    val publicWithScores = publicDecks.map { it.copy(bestScore = scores[it.id] ?: 0) }
                    
                    Pair(myWithScores, publicWithScores)
                }.collect { (my, public) ->
                    _myDecks.value = my.filter { !it.isPublic }
                    _publicDecks.value = public
                    _isLoading.value = false
                }
            } catch (e: Exception) {
                e.printStackTrace()
                _isLoading.value = false
            }
        }
    }

    fun publishDeck(deck: FlashcardDeckSummary) {
        viewModelScope.launch {
            repository.updateDeckStatus(deck.id, "published", true)
        }
    }

    fun unpublishDeck(deck: FlashcardDeckSummary) {
        viewModelScope.launch {
            repository.updateDeckStatus(deck.id, "private", false)
        }
    }

    fun deleteDeck(deckId: String) {
        viewModelScope.launch {
            repository.deleteDeck(deckId)
        }
    }
}
