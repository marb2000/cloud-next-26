package com.firebaseailogic.memotattoo.ui.flashcards

import androidx.compose.runtime.mutableStateListOf
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.firebaseailogic.memotattoo.ai.AILogic
import com.firebaseailogic.memotattoo.data.IFlashcardRepository
import com.firebaseailogic.memotattoo.data.IUserRepository
import com.google.firebase.ai.Chat
import com.google.firebase.ai.type.FunctionResponsePart
import com.google.firebase.ai.type.content
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

data class ChatMessage(val isUser: Boolean, val text: String, val isSystem: Boolean = false)

data class GameSessionUiState(
    val deckTitle: String = "Loading...",
    val score: Int = 0,
    val termsGuessed: Int = 0,
    val currentConcept: Map<String, Any>? = null,
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = true,
    val isGameOver: Boolean = false,
    val isSubmitting: Boolean = false,
    val timeRemaining: Int = 60,
    val isTimerRunning: Boolean = false,
    val hasPaidForSession: Boolean = false,
    val sessionTotalItems: Int = 0,
    val remainingCount: Int = 0,
    val pointsAnimTrigger: Int? = null,
    val timeUpAnimTrigger: String? = null
)

class GameSessionViewModel(
    private val flashcardRepository: IFlashcardRepository,
    private val userRepository: IUserRepository,
    private val auth: FirebaseAuth,
    private val aiLogic: com.firebaseailogic.memotattoo.ai.IAILogic
) : ViewModel() {

    constructor() : this(
        flashcardRepository = com.firebaseailogic.memotattoo.data.FlashcardRepository(),
        userRepository = com.firebaseailogic.memotattoo.data.UserRepository(),
        auth = com.firebaseailogic.memotattoo.data.FirebaseManager.auth,
        aiLogic = com.firebaseailogic.memotattoo.ai.AILogic
    )

    private val _uiState = MutableStateFlow(GameSessionUiState())
    val uiState = _uiState.asStateFlow()

    private var chat: Chat? = null
    private val _messages = mutableStateListOf<ChatMessage>()
    private var remainingConcepts = mutableListOf<Map<String, Any>>()
    private var timerJob: Job? = null
    private var deckOwnerId: String? = null

    fun initSession(deckId: String) {
        viewModelScope.launch {
            try {
                val deck = flashcardRepository.getDeck(deckId) ?: throw Exception("Deck not found")
                deckOwnerId = deck["owner_id"] as? String

                @Suppress("UNCHECKED_CAST")
                val contentBase = deck["contentBase"] as? Map<String, Any>
                @Suppress("UNCHECKED_CAST")
                val loadedItems = (deck["items"] as? List<Map<String, Any>>)
                    ?: (contentBase?.get("items") as? List<Map<String, Any>>)
                    ?: emptyList()

                val title = deck["topic"]?.toString() ?: deck["title"]?.toString() ?: "Unknown Topic"
                
                remainingConcepts = loadedItems.shuffled().toMutableList()
                val totalItems = loadedItems.size

                _uiState.update { it.copy(
                    deckTitle = title,
                    sessionTotalItems = totalItems,
                    remainingCount = remainingConcepts.size,
                    isLoading = false
                ) }

                if (remainingConcepts.isNotEmpty()) {
                    nextRound()
                }

                chat = aiLogic.startGameSession(title)
                startInitialChat(title)
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, isGameOver = true) }
            }
        }
    }

    private fun startInitialChat(deckTitle: String) {
        val concept = _uiState.value.currentConcept ?: return
        val term = concept["term"]?.toString() ?: concept["original"]?.toString() ?: ""
        val definition = concept["definition"]?.toString() ?: concept["translation"]?.toString() ?: ""
        val imageSource = (concept["imageArt"] as? String) ?: (concept["image"] as? String) ?: ""

        val seedText = if (imageSource.isNotBlank()) {
            "Start the game. The first target term is '$term' and its definition is '$definition'. Start the round by asking what word you are thinking of. Keep it brief."
        } else {
            "Start the game. We are playing a game guessing concepts from '$deckTitle'. The first target term is '$term' and its definition is '$definition'. There is NO image. You must start the round by giving the user the definition: '$definition', and asking them what word fits it. Keep it brief."
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                if (chat != null) {
                    val response = chat?.sendMessage(seedText)
                    addMessage(ChatMessage(false, response?.text ?: "Welcome!"))
                }
                startTimer()
            } catch (e: Exception) {
                addMessage(ChatMessage(false, "Error starting chat: ${e.message}"))
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private fun nextRound() {
        if (remainingConcepts.isEmpty()) {
            _uiState.update { it.copy(isGameOver = true, currentConcept = null) }
            return
        }

        val next = remainingConcepts.removeAt(0)
        _uiState.update { it.copy(
            currentConcept = next,
            remainingCount = remainingConcepts.size,
            timeRemaining = 60,
            isTimerRunning = true
        ) }
        
        checkEconomy()
    }

    private fun checkEconomy() {
        val state = _uiState.value
        if (state.hasPaidForSession) return

        val playedCount = state.sessionTotalItems - state.remainingCount
        if (state.sessionTotalItems > 0 && playedCount >= (state.sessionTotalItems / 2)) {
            viewModelScope.launch {
                val uid = auth.currentUser?.uid ?: return@launch
                val success = userRepository.consumeBolts(uid, 1)
                if (success) {
                    _uiState.update { it.copy(hasPaidForSession = true) }
                    // Reward creator if applicable
                    deckOwnerId?.let { ownerId ->
                        if (ownerId != uid) {
                            userRepository.incrementBolts(ownerId, 1)
                        }
                    }
                } else {
                    // Logic for billing navigation would happen in UI via a SideEffect observing state
                }
            }
        }
    }

    fun submitGuess(guess: String) {
        if (guess.isBlank() || _uiState.value.isSubmitting) return
        
        addMessage(ChatMessage(true, guess))
        viewModelScope.launch {
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                var response: com.google.firebase.ai.type.GenerateContentResponse? = null
                if (chat != null) {
                    response = chat?.sendMessage(guess)
                }

                if (chat != null) {
                    if (response != null && response.functionCalls.isNotEmpty()) {
                        handleFunctionCalls(response)
                    } else {
                        addMessage(ChatMessage(false, response?.text ?: "No response"))
                    }
                }
            } catch (e: Exception) {
                addMessage(ChatMessage(false, "Error: ${e.message}"))
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    private suspend fun handleFunctionCalls(response: com.google.firebase.ai.type.GenerateContentResponse) {
        val hasGameAction = response.functionCalls.any { it.name == "add_points" || it.name == "next_concept" }
        if (hasGameAction) {
            stopTimer()
        }

        val functionResponses = response.functionCalls.map { call ->
            when (call.name) {
                "add_points" -> {
                    val points = (call.args["points"] as? JsonPrimitive)?.content?.toIntOrNull() ?: 0
                    _uiState.update { it.copy(
                        score = it.score + points,
                        termsGuessed = if (points > 0) it.termsGuessed + 1 else it.termsGuessed,
                        pointsAnimTrigger = points
                    ) }
                    viewModelScope.launch {
                        delay(2500L)
                        _uiState.update { it.copy(pointsAnimTrigger = null) }
                    }
                    FunctionResponsePart("add_points", JsonObject(mapOf("status" to JsonPrimitive("points_added"))))
                }
                "next_concept" -> {
                    _messages.clear()
                    nextRound()
                    val concept = _uiState.value.currentConcept
                    if (concept != null) {
                        val term = (concept["term"] ?: concept["original"]).toString()
                        val def = (concept["definition"] ?: concept["translation"]).toString()
                        val img = (concept["imageArt"] ?: concept["image"])?.toString() ?: ""
                        FunctionResponsePart("next_concept", JsonObject(mapOf(
                            "status" to JsonPrimitive("advanced"),
                            "nextTargetTerm" to JsonPrimitive(term),
                            "nextDefinition" to JsonPrimitive(def),
                            "imageSource" to JsonPrimitive(if (img.isNotBlank()) "true" else "false")
                        )))
                    } else {
                        FunctionResponsePart("next_concept", JsonObject(mapOf("status" to JsonPrimitive("game_over"))))
                    }
                }
                else -> FunctionResponsePart(call.name, JsonObject(mapOf("status" to JsonPrimitive("unknown"))))
            }
        }

        val finalResponse = chat?.sendMessage(content("function") {
            functionResponses.forEach { part(it) }
        })
        addMessage(ChatMessage(false, finalResponse?.text ?: ""))
        if (hasGameAction && !_uiState.value.isGameOver) {
            startTimer()
        }
    }

    private fun addMessage(msg: ChatMessage) {
        _messages.add(msg)
        _uiState.update { it.copy(messages = _messages.toList()) }
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            _uiState.update { it.copy(isTimerRunning = true) }
            while (_uiState.value.timeRemaining > 0) {
                delay(1000L)
                _uiState.update { it.copy(timeRemaining = it.timeRemaining - 1) }
            }
            handleTimeUp()
        }
    }

    private fun stopTimer() {
        timerJob?.cancel()
        _uiState.update { it.copy(isTimerRunning = false) }
    }

    private suspend fun handleTimeUp() {
        stopTimer()
        val concept = _uiState.value.currentConcept ?: return
        val term = (concept["term"] ?: concept["original"]).toString()
        
        _uiState.update { it.copy(timeUpAnimTrigger = term) }
        delay(3000L)
        _uiState.update { it.copy(timeUpAnimTrigger = null) }
        
        _messages.clear()
        nextRound()
        
        val newConcept = _uiState.value.currentConcept
        if (newConcept != null) {
            val nTerm = (newConcept["term"] ?: newConcept["original"]).toString()
            val nDef = (newConcept["definition"] ?: newConcept["translation"]).toString()
            val img = (newConcept["imageArt"] ?: newConcept["image"])?.toString() ?: ""
            
            val prompt = if (img.isNotBlank()) {
                "The timer ran out. We advanced to the next concept. New target term is '$nTerm' and its definition is '$nDef'. Start this round now!"
            } else {
                "The timer ran out. We advanced to the next concept. New target term is '$nTerm' and its definition is '$nDef'. There is NO image. Start this round by giving the user the definition: '$nDef', and asking them what word fits it."
            }
            
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                if (chat != null) {
                    val response = chat?.sendMessage(prompt)
                    addMessage(ChatMessage(false, response?.text ?: "Let's guess the next one!"))
                }
                startTimer()
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
            }
        }
    }

    fun quit() {
        _uiState.update { it.copy(isGameOver = true) }
        stopTimer()
    }

    fun saveScore(deckId: String) {
        val uid = auth.currentUser?.uid ?: return
        val currentScore = _uiState.value.score
        viewModelScope.launch {
            flashcardRepository.saveScore(uid, deckId, currentScore)
        }
    }
}
