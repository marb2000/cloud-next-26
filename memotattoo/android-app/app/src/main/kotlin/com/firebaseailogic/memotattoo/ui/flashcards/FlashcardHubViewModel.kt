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
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.flatMapLatest
import com.firebaseailogic.memotattoo.data.Resource

class FlashcardHubViewModel(
    private val auth: FirebaseAuth = FirebaseManager.auth,
    private val repository: IFlashcardRepository = FlashcardRepository()
) : ViewModel() {
    
    private val _myDecks = MutableStateFlow<List<FlashcardDeckSummary>>(emptyList())
    val myDecks: StateFlow<List<FlashcardDeckSummary>> = _myDecks.asStateFlow()

    private val _publicDecks = MutableStateFlow<List<FlashcardDeckSummary>>(emptyList())
    val publicDecks: StateFlow<List<FlashcardDeckSummary>> = _publicDecks.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _limit = MutableStateFlow(50L)
    val limit: StateFlow<Long> = _limit.asStateFlow()

    init {
        startListeningForDecks()
    }

    fun updateSearch(viewQuery: String) {
        _searchQuery.value = viewQuery
        _limit.value = 50L // Reset limit on new search
    }

    fun loadMore() {
        _limit.value += 50L
    }

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    private fun startListeningForDecks() {
        val currentUid = auth.currentUser?.uid ?: ""
        
        viewModelScope.launch {
            combine(_searchQuery, _limit) { query, limit -> query to limit }
                .flatMapLatest { (query, limit) ->
                    combine(
                        repository.getMyDecks(currentUid),
                        repository.getPublicDecks(if (query.isEmpty()) null else query, limit)
                    ) { myRes: Resource<List<FlashcardDeckSummary>>, publicRes: Resource<List<FlashcardDeckSummary>> ->
                        val my = if (myRes is Resource.Success) myRes.data else emptyList()
                        val public = if (publicRes is Resource.Success) publicRes.data else emptyList()
                        val loading = myRes is Resource.Loading || publicRes is Resource.Loading
                        val error = when {
                            myRes is Resource.Error -> "My Decks: ${myRes.message}"
                            publicRes is Resource.Error -> "Public Decks: ${publicRes.message}"
                            else -> null
                        }
                        Triple(my, public, loading to error)
                    }
                }.collect { (my, public, loadingError) ->
                _isLoading.value = loadingError.first
                _errorMessage.value = loadingError.second

                val scores = if (currentUid.isNotEmpty()) {
                    repository.getBestScores(currentUid)
                } else {
                    emptyMap()
                }

                _myDecks.value = my
                    .filter { !it.isPublic }
                    .map { it.copy(bestScore = scores[it.id] ?: 0) }
                
                _publicDecks.value = public
                    .map { it.copy(bestScore = scores[it.id] ?: 0) }
            }
        }
    }

    fun publishDeck(deck: FlashcardDeckSummary) {
        viewModelScope.launch {
            repository.updateDeckStatus(deck.id, "pending")
        }
    }

    fun unpublishDeck(deck: FlashcardDeckSummary) {
        viewModelScope.launch {
            repository.updateDeckStatus(deck.id, "private")
        }
    }

    fun deleteDeck(deckId: String) {
        viewModelScope.launch {
            repository.deleteDeck(deckId)
        }
    }
}
