package com.firebaseailogic.memotattoo.ui.flashcards

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.firebaseailogic.memotattoo.ai.AILogic
import com.firebaseailogic.memotattoo.ai.IAILogic
import com.firebaseailogic.memotattoo.data.FirebaseManager
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
import android.util.Base64

class CreateDeckViewModel(
    private val auth: FirebaseAuth,
    private val firestore: FirebaseFirestore,
    private val storage: FirebaseStorage,
    private val aiLogic: IAILogic
) : ViewModel() {

    constructor() : this(
        auth = FirebaseManager.auth,
        firestore = FirebaseManager.firestore,
        storage = FirebaseManager.storage,
        aiLogic = AILogic
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
                val doc = firestore.collection("FlashcardDecks").document(draftId).get().await()
                if (doc.exists()) {
                    @Suppress("UNCHECKED_CAST")
                    val contentBase = doc.get("contentBase") as? Map<String, Any>
                    val title = contentBase?.get("title") as? String ?: doc.getString("title") ?: ""
                    val topic = doc.getString("topic") ?: ""
                    
                    @Suppress("UNCHECKED_CAST")
                    val rootItems = doc.get("items") as? List<Map<String, Any>> ?: emptyList()
                    @Suppress("UNCHECKED_CAST")
                    val baseItems = contentBase?.get("items") as? List<Map<String, Any>> ?: emptyList()
                    val items = if (baseItems.isNotEmpty()) baseItems else rootItems

                    val artDir = doc.getString("artDirection") ?: ""
                    val artRef = doc.getString("artReferenceImage")
                    
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
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val uid = auth.currentUser?.uid ?: throw Exception("Not logged in")
                val userDoc = firestore.collection("Users").document(uid).get().await()
                val energyBolts = userDoc.getLong("energy_bolts") ?: 0
                
                if (energyBolts < 1) {
                    throw Exception("Insufficient bolts. Please top up.")
                }

                val count = countStr.toIntOrNull() ?: 5
                val result = aiLogic.generateTopic(topic, count)

                // Deduct bolt
                firestore.collection("Users").document(uid).update("energy_bolts", energyBolts - 1).await()

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
                _errorMessage.value = "Failed to brainstorm: ${e.message}"
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

    fun generateImage(index: Int, isPro: Boolean, energyBolts: Int, generatedThisMonth: Int) {
        val state = _uiState.value
        val concept = state.concepts.getOrNull(index) ?: return
        if (concept.isGeneratingImage) return

        // Update state to show loading for THIS concept
        _uiState.update {
            val updated = it.concepts.toMutableList()
            updated[index] = updated[index].copy(isGeneratingImage = true)
            it.copy(concepts = updated)
        }

        viewModelScope.launch {
            try {
                if (isPro) {
                    if (generatedThisMonth >= 100) throw Exception("Monthly limit reached")
                    if (energyBolts < 1) throw Exception("Insufficient bolts")
                } else {
                    if (energyBolts < 3) throw Exception("Insufficient bolts")
                }

                var url = aiLogic.generateConceptImage(
                    title = state.title,
                    term = concept.term,
                    definition = concept.definition,
                    artDirection = state.globalArtDirection
                )

                if (url.startsWith("data:image/jpeg;base64,")) {
                    val b64 = url.substringAfter("base64,")
                    val bytes = Base64.decode(b64, Base64.DEFAULT)
                    val storageRef = storage.reference.child("drafts/${UUID.randomUUID()}.jpg")
                    storageRef.putBytes(bytes).await()
                    url = storageRef.downloadUrl.await().toString()
                }

                // Deduct bolts and increment monthly count
                auth.currentUser?.uid?.let { uid ->
                    val boltsToDeduct = if (isPro) 1 else 3
                    firestore.collection("Users").document(uid).update(
                        mapOf(
                            "energy_bolts" to (energyBolts - boltsToDeduct),
                            "imagesGeneratedThisMonth" to com.google.firebase.firestore.FieldValue.increment(1)
                        )
                    ).await()
                }

                _uiState.update {
                    val updated = it.concepts.toMutableList()
                    updated[index] = updated[index].copy(imageUrl = url, isGeneratingImage = false)
                    it.copy(concepts = updated)
                }
            } catch (e: Exception) {
                android.util.Log.e("CreateDeckViewModel", "Image generation failed", e)
                _uiState.update {
                    val updated = it.concepts.toMutableList()
                    updated[index] = updated[index].copy(isGeneratingImage = false)
                    it.copy(concepts = updated)
                }
            }
        }
    }

    fun saveDraft(onComplete: () -> Unit) {
        saveOrPublish(isPublic = false, status = "draft", onComplete = onComplete)
    }

    fun publish(isPublic: Boolean, onComplete: () -> Unit) {
        val status = if (isPublic) "pending" else "private"
        saveOrPublish(isPublic = isPublic, status = status, onComplete = onComplete)
    }

    private fun saveOrPublish(isPublic: Boolean, status: String, onComplete: () -> Unit) {
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
                    "isPublic" to isPublic,
                    "status" to status,
                    "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                    "items" to itemsList,
                    "artDirection" to state.globalArtDirection,
                    "artReferenceImage" to (state.globalArtImageUri ?: "")
                )
                
                val docRef = if (state.draftId != null) {
                    firestore.collection("FlashcardDecks").document(state.draftId!!)
                } else {
                    firestore.collection("FlashcardDecks").document()
                }
                
                docRef.set(deckData).await()
                onComplete()
            } catch (e: Exception) {
                _errorMessage.value = "Failed to save: ${e.message}"
            }
        }
    }
}
