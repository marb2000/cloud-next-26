@file:OptIn(com.google.firebase.ai.type.PublicPreviewAPI::class)

package com.firebaseailogic.memotattoo.ui.flashcards

import com.google.firebase.ai.type.*


import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.snapshots.SnapshotStateList
import android.app.Application
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.firebaseailogic.memotattoo.data.IFlashcardRepository
import com.firebaseailogic.memotattoo.data.FlashcardRepository
import com.firebaseailogic.memotattoo.data.IUserRepository
import com.firebaseailogic.memotattoo.data.UserRepository
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.firebaseailogic.memotattoo.ai.AILogic
import com.google.firebase.ai.*
import kotlinx.serialization.json.*
import com.google.firebase.ai.ondevice.FirebaseAIOnDevice
import com.google.firebase.ai.ondevice.OnDeviceModelStatus
import com.google.firebase.ai.ondevice.DownloadStatus
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

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
    val timeUpAnimTrigger: String? = null,
    val isOffline: Boolean = false
)

class GameSessionViewModel @JvmOverloads constructor(
    application: Application,
    private val flashcardRepository: IFlashcardRepository = FlashcardRepository(),
    private val userRepository: IUserRepository = UserRepository(),
    private val auth: FirebaseAuth = FirebaseManager.auth,
    private val aiLogic: com.firebaseailogic.memotattoo.ai.IAILogic = AILogic
) : AndroidViewModel(application) {

    private val _uiState = MutableStateFlow(GameSessionUiState())
    val uiState = _uiState.asStateFlow()

    private var chat: Chat? = null
    private val _messages: SnapshotStateList<ChatMessage> = mutableStateListOf<ChatMessage>()
    private var remainingConcepts = mutableListOf<Map<String, Any>>()
    private var timerJob: Job? = null
    private var deckOwnerId: String? = null

    private fun isNetworkAvailable(): Boolean {
        if (com.firebaseailogic.memotattoo.debug.DebugSettings.simulateOffline) {
            return false
        }
        val connectivityManager = getApplication<Application>().getSystemService(android.content.Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(network) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun createGameChat(title: String) {
        chat = aiLogic.startGameSession(deckTitle = title)
    }

    private fun awardPoints(points: Int) {
        _uiState.update { it.copy(
            score = it.score + points,
            termsGuessed = if (points > 0) it.termsGuessed + 1 else it.termsGuessed,
            pointsAnimTrigger = points
        ) }
        viewModelScope.launch {
            delay(2500L)
            _uiState.update { it.copy(pointsAnimTrigger = null) }
        }
    }



    fun initSession(deckId: String) {
        viewModelScope.launch {
            val isOnline = isNetworkAvailable()
            val status = FirebaseAIOnDevice.checkStatus()
            
            if (status == OnDeviceModelStatus.DOWNLOADABLE) {
                launch {
                    FirebaseAIOnDevice.download().collect { }
                }
            }
            
            _uiState.update { it.copy(isOffline = !isOnline) }

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

                createGameChat(title)
                startInitialChat(title)
            } catch (_: Exception) {
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
            "Start the game. The first target term is '$term' and its definition is '$definition'. " +
                    "Start the round by asking what word you are thinking of. Keep it brief."
        } else {
            "Start the game. We are playing a game guessing concepts from '$deckTitle'. " +
                    "The first target term is '$term' and its definition is '$definition'. " +
                    "There is NO image. " +
                    "You must start the round by giving the user the definition: '$definition', " +
                    "and asking them what word fits it. Keep it brief."
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
            _uiState.update { it.copy(isSubmitting = true, isOffline = !isNetworkAvailable()) }
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
                if (!_uiState.value.isGameOver) {
                    startTimer()
                }
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
                    
                    val calledNextConcept = response.functionCalls.any { it.name == "next_concept" }
                    if (!calledNextConcept) {
                        _messages.clear()
                        nextRound()
                        val concept = _uiState.value.currentConcept
                        if (concept != null) {
                            val term = (concept["term"] ?: concept["original"]).toString()
                            val def = (concept["definition"] ?: concept["translation"]).toString()
                            val img = (concept["imageArt"] ?: concept["image"])?.toString() ?: ""
                            FunctionResponsePart("add_points", JsonObject(mapOf(
                                "status" to JsonPrimitive("points_added_and_auto_advanced"),
                                "nextTargetTerm" to JsonPrimitive(term),
                                "nextDefinition" to JsonPrimitive(def),
                                "imageSource" to JsonPrimitive(if (img.isNotBlank()) "true" else "false")
                            )))
                        } else {
                            FunctionResponsePart("add_points", JsonObject(mapOf(
                                "status" to JsonPrimitive("points_added_and_game_over")
                            )))
                        }
                    } else {
                        FunctionResponsePart("add_points", JsonObject(mapOf("status" to JsonPrimitive("points_added"))))
                    }
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
        
        val aiResponseText = finalResponse?.text
        if (!aiResponseText.isNullOrBlank()) {
            addMessage(ChatMessage(false, aiResponseText))
        } else {
            val concept = _uiState.value.currentConcept
            if (concept != null) {
                val def = (concept["definition"] ?: concept["translation"]).toString()
                addMessage(ChatMessage(false, "Next concept! What am I thinking of? Here is the definition: '$def'"))
            } else {
                addMessage(ChatMessage(false, "Let's guess the next one!"))
            }
        }
        
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
            
            val title = _uiState.value.deckTitle
            
            val prompt = if (img.isNotBlank()) {
                "We advanced to the next concept because the timer ran out. New target term is '$nTerm' and its definition is '$nDef'. Start this round now!"
            } else {
                "We advanced to the next concept because the timer ran out. New target term is '$nTerm' and its definition is '$nDef'. There is NO image. Start this round by giving the user the definition: '$nDef', and asking them what word fits it."
            }
            
            _uiState.update { it.copy(isSubmitting = true) }
            try {
                if (chat != null) {
                    val response = chat?.sendMessage(prompt)
                    addMessage(ChatMessage(false, response?.text ?: "Let's guess the next one!"))
                }
            } catch (e: Exception) {
                addMessage(ChatMessage(false, "Error starting next round: ${e.message}"))
            } finally {
                _uiState.update { it.copy(isSubmitting = false) }
                startTimer()
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
