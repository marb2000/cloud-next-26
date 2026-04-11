package com.firebaseailogic.memotattoo.ui.flashcards

import android.util.Base64
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.firebaseailogic.memotattoo.ai.AILogic
import com.firebaseailogic.memotattoo.ai.IAILogic
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.firebaseailogic.memotattoo.data.FlashcardRepository
import com.firebaseailogic.memotattoo.data.IFlashcardRepository
import com.firebaseailogic.memotattoo.data.IUserRepository
import com.firebaseailogic.memotattoo.data.UserRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import java.util.UUID

class CreateDeckViewModel(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
    private val aiLogic: IAILogic,
    private val repository: IFlashcardRepository,
    private val userRepository: IUserRepository
) : ViewModel() {

    constructor() : this(
        auth = FirebaseManager.auth,
        firestore = FirebaseManager.firestore,
        aiLogic = AILogic,
        repository = FlashcardRepository(),
        userRepository = UserRepository()
    )

    private val _uiState = MutableStateFlow(DraftState())
    val uiState: StateFlow<DraftState> = _uiState.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun loadDraft(draftId: String) {
        if (_uiState.value.draftId == draftId) return
        
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val data = repository.getDeck(draftId)
                if (data != null) {
                    @Suppress("UNCHECKED_CAST")
                    val contentBase = data["contentBase"] as? Map<String, Any>
                    val title = contentBase?.get("title") as? String ?: data["title"]?.toString() ?: ""
                    val topic = data["topic"]?.toString() ?: ""
                    
                    @Suppress("UNCHECKED_CAST")
                    val rootItems = data["items"] as? List<Map<String, Any>> ?: emptyList()
                    @Suppress("UNCHECKED_CAST")
                    val baseItems = contentBase?.get("items") as? List<Map<String, Any>> ?: emptyList()
                    val items = if (baseItems.isNotEmpty()) baseItems else rootItems

                    val artDir = data["artDirection"]?.toString() ?: ""
                    val artRef = data["artReferenceImage"]?.toString()
                    
                    val parsedConcepts = items.map { 
                        ConceptDraft(
                            term = it["term"]?.toString() ?: it["original"]?.toString() ?: "",
                            definition = it["definition"]?.toString() ?: it["translation"]?.toString() ?: "",
                            imageUrl = (it["imageArt"]?.toString() ?: it["image"]?.toString())?.takeIf { img -> img.isNotBlank() }
                        ) 
                    }
                    
                    _uiState.update {
                        it.copy(
                            step = if (parsedConcepts.isNotEmpty()) 5 else 1,
                            topic = topic,
                            numberOfItems = parsedConcepts.size.takeIf { it > 0 }?.toString() ?: "5",
                            title = title,
                            concepts = parsedConcepts.toMutableList(),
                            globalArtDirection = artDir,
                            globalArtImageUri = artRef,
                            draftId = draftId
                        )
                    }
                }
            } catch (e: Exception) {
                _errorMessage.value = "Failed to load draft: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateTopic(topic: String) {
        _uiState.update { it.copy(topic = topic) }
    }

    fun updateNumberOfItems(count: String) {
        _uiState.update { it.copy(numberOfItems = count) }
    }

    fun updateTitle(title: String) {
        _uiState.update { it.copy(title = title) }
    }

    fun updateArtDirection(direction: String) {
        _uiState.update { it.copy(globalArtDirection = direction) }
    }

    fun updateArtImage(uri: String?) {
        _uiState.update { it.copy(globalArtImageUri = uri) }
    }

    fun updateConcept(index: Int, term: String, definition: String) {
        _uiState.update {
            val updated = it.concepts.toMutableList()
            if (index in updated.indices) {
                updated[index] = updated[index].copy(term = term, definition = definition)
            }
            it.copy(concepts = updated)
        }
    }

    fun addConcept(term: String = "", definition: String = "") {
        _uiState.update {
            val updated = it.concepts.toMutableList()
            updated.add(ConceptDraft(term, definition))
            it.copy(concepts = updated)
        }
    }

    fun deleteConcept(index: Int) {
        _uiState.update {
            val updated = it.concepts.toMutableList()
            if (index in updated.indices) {
                updated.removeAt(index)
            }
            it.copy(concepts = updated)
        }
    }

    fun setStep(step: Int) {
        _uiState.update { it.copy(step = step) }
    }

    fun setErrorMessage(message: String?) {
        _errorMessage.value = message
    }

    fun brainstorm() {
        val topic = _uiState.value.topic
        val countStr = _uiState.value.numberOfItems
        if (topic.isBlank()) {
            _errorMessage.value = "Please enter a topic."
            return
        }

        viewModelScope.launch {
            android.util.Log.d("AILogic", "Brainstorm started for topic: $topic")
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val uid = auth.currentUser?.uid ?: throw Exception("Not logged in")
                android.util.Log.d("AILogic", "Attempting to consume bolts for uid: $uid")
                
                val success = userRepository.consumeBolts(uid, 1)
                android.util.Log.d("AILogic", "Consume bolts result: $success")
                if (!success) {
                    throw Exception("Insufficient bolts. Please top up.")
                }

                val count = countStr.toIntOrNull() ?: 5
                android.util.Log.d("AILogic", "Calling aiLogic.generateTopic(topic=$topic, count=$count)")
                val result = aiLogic.generateTopic(topic, count)
                android.util.Log.d("AILogic", "aiLogic.generateTopic result received")

                val newTitle = result["title"] as? String ?: "$topic Essentials"
                @Suppress("UNCHECKED_CAST")
                val itemsList = result["items"] as? List<Map<String, String>> ?: emptyList()
                val parsedConcepts = itemsList.map {
                    ConceptDraft(it["term"] ?: "", it["definition"] ?: "")
                }

                _uiState.update {
                    it.copy(
                        title = newTitle,
                        concepts = parsedConcepts.toMutableList(),
                        step = 2
                    )
                }
            } catch (e: Exception) {
                if (e.message?.contains("Insufficient energy bolts") == true || e.message?.contains("Insufficient bolts") == true) {
                    _errorMessage.value = "You don't have enough energy bolts. Please buy more to continue or upgrade to PRO."
                } else {
                    _errorMessage.value = "Failed to brainstorm: ${e.message}"
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun brainstormMore() {
        val topic = _uiState.value.topic
        
        viewModelScope.launch {
            try {
                val parsedNewConcepts = aiLogic.brainstormMore(topic, _uiState.value.concepts, 5)
                _uiState.update { currentState ->
                    val updated = currentState.concepts.toMutableList().apply { addAll(parsedNewConcepts) }
                    currentState.copy(concepts = updated)
                }
            } catch (e: Exception) {
                // Silently fail or log
            }
        }
    }

    fun generateImage(index: Int, isPro: Boolean, generatedThisMonth: Int) {
        val state = _uiState.value
        val concept = state.concepts.getOrNull(index) ?: return
        if (concept.isGeneratingImage) return

        _uiState.update {
            val updated = it.concepts.toMutableList()
            updated[index] = updated[index].copy(isGeneratingImage = true)
            it.copy(concepts = updated)
        }

        viewModelScope.launch {
            try {
                val uid = auth.currentUser?.uid ?: throw Exception("Not logged in")
                val boltsToDeduct = if (isPro) 1 else 3

                if (isPro && generatedThisMonth >= 100) throw Exception("Monthly limit reached")
                
                val success = userRepository.consumeBolts(uid, boltsToDeduct)
                android.util.Log.d("AILogic", "Consume bolts for image: $success")
                if (!success) throw Exception("Insufficient bolts")

                android.util.Log.d("AILogic", "Calling aiLogic.generateConceptImage for ${concept.term}")
                var url = aiLogic.generateConceptImage(
                    title = state.title,
                    term = concept.term,
                    definition = concept.definition,
                    artDirection = state.globalArtDirection
                )

                if (url.startsWith("data:image/jpeg;base64,")) {
                    android.util.Log.d("AILogic", "Image received as base64, uploading to Storage...")
                    val b64 = url.substringAfter("base64,")
                    val bytes = Base64.decode(b64, Base64.DEFAULT)
                    url = repository.uploadImage(bytes)
                    android.util.Log.d("AILogic", "Image uploaded successfully: $url")
                }

                userRepository.incrementImageCount(uid)

                _uiState.update {
                    val updated = it.concepts.toMutableList()
                    updated[index] = updated[index].copy(imageUrl = url, isGeneratingImage = false)
                    it.copy(concepts = updated)
                }
            } catch (e: Exception) {
                android.util.Log.e("CreateDeckViewModel", "Image generation failed", e)
                if (e.message?.contains("Insufficient energy bolts") == true || e.message?.contains("Insufficient bolts") == true) {
                    _errorMessage.value = "You don't have enough energy bolts. Please buy more to continue or upgrade to PRO."
                } else {
                    _errorMessage.value = "Image generation failed: ${e.message}"
                }
                _uiState.update {
                    val updated = it.concepts.toMutableList()
                    updated[index] = updated[index].copy(isGeneratingImage = false)
                    it.copy(concepts = updated)
                }
            }
        }
    }

    fun saveDraft(onComplete: () -> Unit) {
        saveOrPublish(status = "draft", onComplete = onComplete)
    }

    fun publish(isPublic: Boolean, onComplete: () -> Unit) {
        val status = if (isPublic) "pending" else "private"
        saveOrPublish(status = status, onComplete = onComplete)
    }

    private fun saveOrPublish(status: String, onComplete: () -> Unit) {
        val state = _uiState.value
        viewModelScope.launch {
            try {
                val uid = auth.currentUser?.uid ?: throw Exception("Not logged in")
                val itemsList = state.concepts.map { concept ->
                    mapOf(
                        "term" to concept.term,
                        "definition" to concept.definition,
                        "imageArt" to (concept.imageUrl ?: "")
                    )
                }
                val deckData = hashMapOf(
                    "title" to state.title.ifEmpty { "Untitled Draft" },
                    "contentBase" to mapOf(
                        "title" to state.title.ifEmpty { "Untitled Draft" },
                        "items" to itemsList
                    ),
                    "topic" to state.topic,
                    "language" to "en",
                    "authorId" to uid,
                    "owner_id" to uid,
                    "owner_email" to (auth.currentUser?.email ?: ""),
                    "status" to status,
                    "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                    "publishedAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                    "items" to itemsList,
                    "artDirection" to state.globalArtDirection,
                    "artReferenceImage" to (state.globalArtImageUri ?: "")
                )
                
                val docId = repository.saveDeck(state.draftId, deckData)
                _uiState.update { it.copy(draftId = docId) }
                onComplete()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to save: ${e.message}"
            }
        }
    }
}
