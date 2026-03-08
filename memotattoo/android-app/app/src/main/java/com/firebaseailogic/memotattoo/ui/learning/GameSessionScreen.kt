package com.firebaseailogic.memotattoo.ui.learning

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.firebaseailogic.memotattoo.ai.AILogic
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.google.firebase.ai.Chat
import com.google.firebase.ai.type.FunctionResponsePart
import com.google.firebase.ai.type.content
import com.google.firebase.firestore.FieldValue
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

data class ChatMessage(val isUser: Boolean, val text: String, val isSystem: Boolean = false)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameSessionScreen(
        navController: NavController,
        deckId: String,
        userProfileViewModel: com.firebaseailogic.memotattoo.ui.learning.UserProfileViewModel =
                androidx.lifecycle.viewmodel.compose.viewModel()
) {
        var isLoading by remember { mutableStateOf(true) }
        var score by remember { mutableIntStateOf(0) }
        var currentConcept by remember { mutableStateOf<Map<String, Any>?>(null) }
        var remainingConcepts = remember { mutableStateListOf<Map<String, Any>>() }
        var isGameOver by remember { mutableStateOf(false) }
        var termsGuessed by remember { mutableIntStateOf(0) }
        var deckOwnerId by remember { mutableStateOf<String?>(null) }
        var hasPaidForSession by remember { mutableStateOf(false) }
        var sessionTotalItems by remember { mutableIntStateOf(0) }

        val userProfile by userProfileViewModel.userProfile.collectAsState()
        val energyBolts = userProfile?.energyBolts ?: 0

        val chat = remember { mutableStateOf<Chat?>(null) }
        val messages = remember { mutableStateListOf<ChatMessage>() }
        var inputText by remember { mutableStateOf("") }
        var isSubmitting by remember { mutableStateOf(false) }

        var timeRemaining by remember { mutableIntStateOf(60) }
        var isTimerRunning by remember { mutableStateOf(false) }

        val listState = rememberLazyListState()
        var pointsAnimTrigger by remember { mutableStateOf<Int?>(null) }
        var timeUpAnimTrigger by remember { mutableStateOf<String?>(null) }

        val coroutineScope = rememberCoroutineScope()

        LaunchedEffect(messages.size) {
                if (messages.isNotEmpty()) {
                        listState.animateScrollToItem(messages.size - 1)
                }
        }

        LaunchedEffect(pointsAnimTrigger) {
                if (pointsAnimTrigger != null) {
                        kotlinx.coroutines.delay(2500L)
                        pointsAnimTrigger = null
                }
        }

        LaunchedEffect(currentConcept, isTimerRunning) {
                if (currentConcept != null && isTimerRunning) {
                        while (timeRemaining > 0) {
                                kotlinx.coroutines.delay(1000L)
                                timeRemaining -= 1
                        }
                        if (timeRemaining == 0 && !isSubmitting) {
                                isTimerRunning = false
                                coroutineScope.launch {
                                        val expiredTerm =
                                                currentConcept?.get("term")
                                                        ?: currentConcept?.get("original") ?: ""
                                        
                                        timeUpAnimTrigger = expiredTerm.toString()
                                        kotlinx.coroutines.delay(3000L)
                                        timeUpAnimTrigger = null
                                        messages.clear()

                                        if (remainingConcepts.isNotEmpty()) {
                                                currentConcept = remainingConcepts.removeAt(0)

                                                val playedCount = sessionTotalItems - remainingConcepts.size
                                                if (!hasPaidForSession &&
                                                                sessionTotalItems > 0 &&
                                                                playedCount >= (sessionTotalItems / 2)
                                                ) {
                                                        hasPaidForSession = true
                                                        val uid = FirebaseManager.auth.currentUser?.uid
                                                        if (uid != null) {
                                                                try {
                                                                        if (energyBolts >= 1) {
                                                                                FirebaseManager.firestore
                                                                                        .collection("Users")
                                                                                        .document(uid)
                                                                                        .update(
                                                                                                "energy_bolts",
                                                                                                energyBolts -
                                                                                                        1
                                                                                        )
                                                                                        .await()
                                                                        } else {
                                                                                navController.navigate(
                                                                                        "billing"
                                                                                )
                                                                        }
                                                                        if (deckOwnerId != null &&
                                                                                        deckOwnerId != uid
                                                                        ) {
                                                                                val creatorRef =
                                                                                        FirebaseManager
                                                                                                .firestore
                                                                                                .collection(
                                                                                                        "Users"
                                                                                                )
                                                                                                .document(
                                                                                                        deckOwnerId!!
                                                                                                )
                                                                                val creatorSnap =
                                                                                        creatorRef
                                                                                                .get()
                                                                                                .await()
                                                                                if (creatorSnap.exists()) {
                                                                                        val creatorBolts =
                                                                                                creatorSnap
                                                                                                        .getLong(
                                                                                                                "energy_bolts"
                                                                                                        )
                                                                                                        ?: 0L
                                                                                        creatorRef
                                                                                                .update(
                                                                                                        "energy_bolts",
                                                                                                        creatorBolts +
                                                                                                                1
                                                                                                )
                                                                                                .await()
                                                                                }
                                                                        }
                                                                } catch (e: Exception) {
                                                                        e.printStackTrace()
                                                                }
                                                        }
                                                }

                                                val newTerm =
                                                        currentConcept?.get("term")
                                                                ?: currentConcept?.get("original") ?: ""
                                                val newDef =
                                                        currentConcept?.get("definition")
                                                                ?: currentConcept?.get("translation") ?: ""
                                                isSubmitting = true
                                                try {
                                                        val advanceResponse =
                                                                chat.value?.sendMessage(
                                                                        "The timer ran out. We advanced to the next concept. New target term is '$newTerm' and its definition is '$newDef'. Start this round now!"
                                                                )
                                                        messages.add(
                                                                ChatMessage(
                                                                        false,
                                                                        advanceResponse?.text
                                                                                ?: "Let's guess the next one!"
                                                                )
                                                        )
                                                        timeRemaining = 60
                                                        isTimerRunning = true
                                                } catch (e: Exception) {
                                                        e.printStackTrace()
                                                } finally {
                                                        isSubmitting = false
                                                }
                                        } else {
                                                currentConcept = null
                                                isTimerRunning = false
                                        }
                                }
                        }
                }
        }

        LaunchedEffect(deckId) {
                try {
                        val docSnap =
                                FirebaseManager.firestore
                                        .collection("FlashcardDecks")
                                        .document(deckId)
                                        .get()
                                        .await()
                        @Suppress("UNCHECKED_CAST")
                        val contentBase = docSnap.get("contentBase") as? Map<String, Any>
                        @Suppress("UNCHECKED_CAST")
                        val loadedItems =
                                contentBase?.get("items") as? List<Map<String, Any>> ?: emptyList()
                        deckOwnerId = docSnap.getString("owner_id")
                        val title = docSnap.getString("title") ?: "Unknown Topic"

                        remainingConcepts.addAll(loadedItems.shuffled())
                        sessionTotalItems = loadedItems.size

                        if (remainingConcepts.isNotEmpty()) {
                                currentConcept = remainingConcepts.removeAt(0)
                        }

                        chat.value = AILogic.startGameSession(deckTitle = title)

                        // Seed the chat with the first concept silently as a system prompt, so
                        // Gemini starts
                        // the game
                        val term =
                                currentConcept?.get("term") ?: currentConcept?.get("original") ?: ""
                        val definition =
                                currentConcept?.get("definition")
                                        ?: currentConcept?.get("translation") ?: ""

                        val seedText =
                                "Start the game. The first target term is '$term' and its definition is '$definition'. Start the round by asking what word you are thinking of. Keep it brief."

                        coroutineScope.launch {
                                isSubmitting = true
                                try {
                                        val response = chat.value?.sendMessage(seedText)
                                        messages.add(
                                                ChatMessage(
                                                        isUser = false,
                                                        text = response?.text
                                                                        ?: "Welcome to the game!"
                                                )
                                        )
                                        timeRemaining = 60
                                        isTimerRunning = true
                                } catch (e: Exception) {
                                        messages.add(
                                                ChatMessage(
                                                        isUser = false,
                                                        text = "Error starting chat: ${e.message}"
                                                )
                                        )
                                } finally {
                                        isSubmitting = false
                                }
                        }

                        isLoading = false
                } catch (e: Exception) {
                        e.printStackTrace()
                        navController.popBackStack()
                }
        }

        if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                }
                return
        }

        if ((currentConcept == null && remainingConcepts.isEmpty() && !isLoading) || isGameOver) {
                LaunchedEffect(Unit) {
                        try {
                                val uid = FirebaseManager.auth.currentUser?.uid
                                if (uid != null) {
                                        val scoreRef =
                                                FirebaseManager.firestore
                                                        .collection("Users")
                                                        .document(uid)
                                                        .collection("User_Scores")
                                                        .document(deckId)

                                        val currentBest =
                                                scoreRef.get().await().getLong("bestScore") ?: 0L
                                        if (score > currentBest) {
                                                scoreRef.set(
                                                                mapOf(
                                                                        "bestScore" to score,
                                                                        "lastPlayed" to
                                                                                FieldValue
                                                                                        .serverTimestamp()
                                                                )
                                                        )
                                                        .await()
                                        }
                                }
                        } catch (e: Exception) {
                                e.printStackTrace()
                        }
                }

                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                        if (isGameOver) "Game Over" else "Deck Complete!",
                                        style = MaterialTheme.typography.displaySmall
                                )
                                Text(
                                        "Final Score: $score",
                                        style = MaterialTheme.typography.titleLarge,
                                        modifier = Modifier.padding(top = 8.dp)
                                )
                                Text(
                                        "Terms Guessed: $termsGuessed",
                                        style = MaterialTheme.typography.titleMedium,
                                        modifier = Modifier.padding(top = 4.dp),
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Spacer(modifier = Modifier.height(32.dp))
                                Button(onClick = { navController.popBackStack() }) {
                                        Text("Return to Hub")
                                }
                        }
                }
                return
        }

        Box(modifier = Modifier.fillMaxSize()) {
                Column(
                        modifier =
                                Modifier.fillMaxSize()
                                        .background(MaterialTheme.colorScheme.background)
                ) {
                        // Top Bar
                        TopAppBar(
                                title = { Text("Score: $score") },
                                navigationIcon = {
                                        IconButton(onClick = { isGameOver = true }) {
                                                Icon(
                                                        imageVector = Icons.Filled.Close,
                                                        contentDescription = "Quit Game"
                                                )
                                        }
                                },
                                actions = {
                                        Text(
                                                text = "Time: ${timeRemaining}s",
                                                modifier = Modifier.padding(end = 16.dp),
                                                style = MaterialTheme.typography.titleMedium,
                                                color =
                                                        if (timeRemaining <= 10)
                                                                MaterialTheme.colorScheme.error
                                                        else
                                                                MaterialTheme.colorScheme
                                                                        .onSurfaceVariant
                                        )
                                },
                                colors =
                                        TopAppBarDefaults.topAppBarColors(
                                                containerColor =
                                                        MaterialTheme.colorScheme.surfaceVariant
                                        )
                        )

                        // Visual Context
                        Box(
                                modifier =
                                        Modifier.fillMaxWidth()
                                                .padding(16.dp)
                                                .height(200.dp)
                                                .clip(RoundedCornerShape(12.dp))
                                                .background(
                                                        MaterialTheme.colorScheme.surfaceVariant
                                                ),
                                contentAlignment = Alignment.Center
                        ) {
                                if (currentConcept != null) {
                                        // Read from either "imageArt" (Web App schema) or "image"
                                        // (Android
                                        // App schema)
                                        val imageUrl =
                                                (currentConcept?.get("imageArt") as? String)
                                                        ?: (currentConcept?.get("image") as? String)

                                        if (!imageUrl.isNullOrBlank()) {
                                                AsyncImage(
                                                        model = imageUrl,
                                                        contentDescription = "Concept Image",
                                                        modifier = Modifier.fillMaxSize(),
                                                        contentScale = ContentScale.Crop
                                                )
                                        } else {
                                                Column(
                                                        horizontalAlignment =
                                                                Alignment.CenterHorizontally
                                                ) {
                                                        Text(
                                                                "🖼️",
                                                                style =
                                                                        MaterialTheme.typography
                                                                                .displayMedium
                                                        )
                                                        Spacer(modifier = Modifier.height(8.dp))
                                                        Text(
                                                                "Concept Image Pending",
                                                                style =
                                                                        MaterialTheme.typography
                                                                                .titleMedium
                                                        )
                                                }
                                        }
                                }
                        }

                        // Chat List
                        LazyColumn(
                                state = listState,
                                modifier =
                                        Modifier.weight(1f)
                                                .fillMaxWidth()
                                                .padding(horizontal = 16.dp),
                                contentPadding = PaddingValues(bottom = 16.dp),
                                reverseLayout = false
                        ) {
                                items(messages) { message ->
                                        ChatBubble(message)
                                        Spacer(modifier = Modifier.height(8.dp))
                                }
                                if (isSubmitting) {
                                        item {
                                                Text(
                                                        "Game Master is typing...",
                                                        style = MaterialTheme.typography.bodySmall,
                                                        color =
                                                                MaterialTheme.colorScheme
                                                                        .onSurfaceVariant
                                                )
                                        }
                                }
                        }

                        // Input Area
                        Row(
                                modifier =
                                        Modifier.fillMaxWidth()
                                                .background(MaterialTheme.colorScheme.surface)
                                                .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                        ) {
                                OutlinedTextField(
                                        value = inputText,
                                        onValueChange = { inputText = it },
                                        modifier = Modifier.weight(1f),
                                        placeholder = { Text("Your guess...") },
                                        singleLine = true,
                                        enabled = !isSubmitting,
                                        shape = RoundedCornerShape(24.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                IconButton(
                                        onClick = {
                                                if (inputText.isBlank()) return@IconButton
                                                val userMsg = inputText
                                                inputText = ""
                                                messages.add(ChatMessage(true, userMsg))
                                                isSubmitting = true

                                                coroutineScope.launch {
                                                        try {
                                                                val response =
                                                                        chat.value?.sendMessage(
                                                                                userMsg
                                                                        )

                                                                // Check for Function Calls
                                                                if (response != null &&
                                                                                response.functionCalls
                                                                                        .isNotEmpty()
                                                                ) {
                                                                        val hasAddPoints =
                                                                                response.functionCalls
                                                                                        .any {
                                                                                                it.name ==
                                                                                                        "add_points"
                                                                                        }
                                                                        val hasNextConcept =
                                                                                response.functionCalls
                                                                                        .any {
                                                                                                it.name ==
                                                                                                        "next_concept"
                                                                                        }
                                                                        if (hasAddPoints ||
                                                                                        hasNextConcept
                                                                        ) {
                                                                                isTimerRunning =
                                                                                        false
                                                                        }

                                                                        val functionResponses =
                                                                                response.functionCalls
                                                                                        .map {
                                                                                                functionCall
                                                                                                ->
                                                                                                if (functionCall
                                                                                                                .name ==
                                                                                                                "add_points"
                                                                                                ) {
                                                                                                        val pointsObj =
                                                                                                                functionCall
                                                                                                                        .args[
                                                                                                                        "points"]
                                                                                                        if (pointsObj is
                                                                                                                        kotlinx.serialization.json.JsonPrimitive
                                                                                                        ) {
                                                                                                                val p =
                                                                                                                        pointsObj
                                                                                                                                .content
                                                                                                                                .toIntOrNull()
                                                                                                                                ?: 0
                                                                                                                score +=
                                                                                                                        p
                                                                                                                pointsAnimTrigger =
                                                                                                                        p
                                                                                                                if (p >
                                                                                                                                0
                                                                                                                )
                                                                                                                        termsGuessed +=
                                                                                                                                1
                                                                                                        }
                                                                                                        FunctionResponsePart(
                                                                                                                "add_points",
                                                                                                                JsonObject(
                                                                                                                        mapOf(
                                                                                                                                "status" to
                                                                                                                                        JsonPrimitive(
                                                                                                                                                "points_added"
                                                                                                                                        )
                                                                                                                        )
                                                                                                                )
                                                                                                        )
                                                                                                } else if (functionCall
                                                                                                                .name ==
                                                                                                                "next_concept"
                                                                                                ) {
                                                                                                        messages.clear()
                                                                                                        if (remainingConcepts
                                                                                                                        .isNotEmpty()
                                                                                                        ) {
                                                                                                                currentConcept =
                                                                                                                        remainingConcepts
                                                                                                                                .removeAt(
                                                                                                                                        0
                                                                                                                                )

                                                                                                                // Handle Economy Billing
                                                                                                                val playedCount =
                                                                                                                        sessionTotalItems -
                                                                                                                                remainingConcepts
                                                                                                                                        .size
                                                                                                                if (!hasPaidForSession &&
                                                                                                                                sessionTotalItems >
                                                                                                                                        0 &&
                                                                                                                                playedCount >=
                                                                                                                                        (sessionTotalItems /
                                                                                                                                                2)
                                                                                                                ) {
                                                                                                                        hasPaidForSession =
                                                                                                                                true
                                                                                                                        val uid =
                                                                                                                                FirebaseManager
                                                                                                                                        .auth
                                                                                                                                        .currentUser
                                                                                                                                        ?.uid
                                                                                                                        if (uid !=
                                                                                                                                        null
                                                                                                                        ) {
                                                                                                                                val userRef =
                                                                                                                                        FirebaseManager
                                                                                                                                                .firestore
                                                                                                                                                .collection(
                                                                                                                                                        "Users"
                                                                                                                                                )
                                                                                                                                                .document(
                                                                                                                                                        uid
                                                                                                                                                )
                                                                                                                                try {
                                                                                                                                        if (energyBolts >=
                                                                                                                                                        1
                                                                                                                                        ) {
                                                                                                                                                userRef.update(
                                                                                                                                                                "energy_bolts",
                                                                                                                                                                energyBolts -
                                                                                                                                                                        1
                                                                                                                                                        )
                                                                                                                                                        .await()
                                                                                                                                        } else {
                                                                                                                                                navController
                                                                                                                                                        .navigate(
                                                                                                                                                                "billing"
                                                                                                                                                        )
                                                                                                                                        }
                                                                                                                                } catch (
                                                                                                                                        e:
                                                                                                                                                Exception) {
                                                                                                                                        e.printStackTrace()
                                                                                                                                }

                                                                                                                                if (deckOwnerId !=
                                                                                                                                                null &&
                                                                                                                                                deckOwnerId !=
                                                                                                                                                        uid
                                                                                                                                ) {
                                                                                                                                        try {
                                                                                                                                                val creatorRef =
                                                                                                                                                        FirebaseManager
                                                                                                                                                                .firestore
                                                                                                                                                                .collection(
                                                                                                                                                                        "Users"
                                                                                                                                                                )
                                                                                                                                                                .document(
                                                                                                                                                                        deckOwnerId!!
                                                                                                                                                                )
                                                                                                                                                val creatorSnap =
                                                                                                                                                        creatorRef
                                                                                                                                                                .get()
                                                                                                                                                                .await()
                                                                                                                                                if (creatorSnap
                                                                                                                                                                .exists()
                                                                                                                                                ) {
                                                                                                                                                        val creatorBolts =
                                                                                                                                                                creatorSnap
                                                                                                                                                                        .getLong(
                                                                                                                                                                                "energy_bolts"
                                                                                                                                                                        )
                                                                                                                                                                        ?: 0L
                                                                                                                                                        creatorRef
                                                                                                                                                                .update(
                                                                                                                                                                        "energy_bolts",
                                                                                                                                                                        creatorBolts +
                                                                                                                                                                                1
                                                                                                                                                                )
                                                                                                                                                                .await()
                                                                                                                                                }
                                                                                                                                        } catch (
                                                                                                                                                e:
                                                                                                                                                        Exception) {
                                                                                                                                                e.printStackTrace()
                                                                                                                                        }
                                                                                                                                }
                                                                                                                        }
                                                                                                                }

                                                                                                                FunctionResponsePart(
                                                                                                                        "next_concept",
                                                                                                                        JsonObject(
                                                                                                                                mapOf(
                                                                                                                                        "status" to
                                                                                                                                                JsonPrimitive(
                                                                                                                                                        "advanced"
                                                                                                                                                ),
                                                                                                                                        "nextTargetTerm" to
                                                                                                                                                JsonPrimitive(
                                                                                                                                                        (currentConcept
                                                                                                                                                                        ?.get(
                                                                                                                                                                                "term"
                                                                                                                                                                        )
                                                                                                                                                                        ?: currentConcept
                                                                                                                                                                                ?.get(
                                                                                                                                                                                        "original"
                                                                                                                                                                                ))
                                                                                                                                                                .toString()
                                                                                                                                                ),
                                                                                                                                        "nextDefinition" to
                                                                                                                                                JsonPrimitive(
                                                                                                                                                        (currentConcept
                                                                                                                                                                        ?.get(
                                                                                                                                                                                "definition"
                                                                                                                                                                        )
                                                                                                                                                                        ?: currentConcept
                                                                                                                                                                                ?.get(
                                                                                                                                                                                        "translation"
                                                                                                                                                                                ))
                                                                                                                                                                .toString()
                                                                                                                                                )
                                                                                                                                )
                                                                                                                        )
                                                                                                                )
                                                                                                        } else {
                                                                                                                currentConcept =
                                                                                                                        null
                                                                                                                FunctionResponsePart(
                                                                                                                        "next_concept",
                                                                                                                        JsonObject(
                                                                                                                                mapOf(
                                                                                                                                        "status" to
                                                                                                                                                JsonPrimitive(
                                                                                                                                                        "game_over"
                                                                                                                                                )
                                                                                                                                )
                                                                                                                        )
                                                                                                                )
                                                                                                        }
                                                                                                } else {
                                                                                                        FunctionResponsePart(
                                                                                                                functionCall
                                                                                                                        .name,
                                                                                                                JsonObject(
                                                                                                                        mapOf(
                                                                                                                                "status" to
                                                                                                                                        JsonPrimitive(
                                                                                                                                                "unknown"
                                                                                                                                        )
                                                                                                                        )
                                                                                                                )
                                                                                                        )
                                                                                                }
                                                                                        }

                                                                        val finalResponse =
                                                                                chat.value
                                                                                        ?.sendMessage(
                                                                                                content(
                                                                                                        "function"
                                                                                                ) {
                                                                                                        functionResponses
                                                                                                                .forEach {
                                                                                                                        part(
                                                                                                                                it
                                                                                                                        )
                                                                                                                }
                                                                                                }
                                                                                        )
                                                                        messages.add(
                                                                                ChatMessage(
                                                                                        false,
                                                                                        finalResponse
                                                                                                ?.text
                                                                                                ?: ""
                                                                                )
                                                                        )
                                                                        if (hasNextConcept &&
                                                                                        currentConcept !=
                                                                                                null
                                                                        ) {
                                                                                timeRemaining = 60
                                                                                isTimerRunning =
                                                                                        true
                                                                        } else if (hasAddPoints) {
                                                                                isTimerRunning =
                                                                                        true
                                                                        }
                                                                } else {
                                                                        messages.add(
                                                                                ChatMessage(
                                                                                        false,
                                                                                        response?.text
                                                                                                ?: "No response."
                                                                                )
                                                                        )
                                                                }
                                                        } catch (e: Exception) {
                                                                e.printStackTrace()
                                                                messages.add(
                                                                        ChatMessage(
                                                                                false,
                                                                                "System Error: ${e.message}"
                                                                        )
                                                                )
                                                        } finally {
                                                                isSubmitting = false
                                                        }
                                                }
                                        },
                                        enabled = !isSubmitting && inputText.isNotBlank(),
                                        colors =
                                                IconButtonDefaults.iconButtonColors(
                                                        containerColor =
                                                                MaterialTheme.colorScheme.primary
                                                )
                                ) {
                                        Icon(
                                                Icons.AutoMirrored.Filled.Send,
                                                contentDescription = "Send",
                                                tint = MaterialTheme.colorScheme.onPrimary
                                        )
                                }
                        } // End Row
                } // End Column

                // Time's Up Overlay
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        AnimatedVisibility(
                                visible = timeUpAnimTrigger != null,
                                enter =
                                        fadeIn(animationSpec = tween(300)) +
                                                slideInVertically(initialOffsetY = { -it }),
                                exit =
                                        fadeOut(animationSpec = tween(300)) +
                                                slideOutVertically(targetOffsetY = { it })
                        ) {
                                Surface(
                                        shape = RoundedCornerShape(24.dp),
                                        color = MaterialTheme.colorScheme.errorContainer,
                                        shadowElevation = 12.dp,
                                        modifier = Modifier.padding(16.dp)
                                ) {
                                        Column(
                                                modifier = Modifier.padding(horizontal = 32.dp, vertical = 24.dp),
                                                horizontalAlignment = Alignment.CenterHorizontally
                                        ) {
                                                Text(
                                                        "⏰ Time's Up!",
                                                        style = MaterialTheme.typography.displayMedium,
                                                        color = MaterialTheme.colorScheme.onErrorContainer
                                                )
                                                Spacer(modifier = Modifier.height(8.dp))
                                                Text(
                                                        "The correct word was: ${timeUpAnimTrigger ?: ""}",
                                                        style = MaterialTheme.typography.titleLarge,
                                                        color = MaterialTheme.colorScheme.onErrorContainer,
                                                        fontWeight = FontWeight.Bold
                                                )
                                        }
                                }
                        }

                        // Points Overlay
                        AnimatedVisibility(
                                visible = pointsAnimTrigger != null,
                                enter =
                                        fadeIn(animationSpec = tween(300)) +
                                                slideInVertically(initialOffsetY = { it }),
                                exit =
                                        fadeOut(animationSpec = tween(300)) +
                                                slideOutVertically(targetOffsetY = { -it })
                        ) {
                                Surface(
                                        shape = RoundedCornerShape(24.dp),
                                        color = MaterialTheme.colorScheme.tertiaryContainer,
                                        shadowElevation = 12.dp,
                                        modifier = Modifier.padding(16.dp)
                                ) {
                                        Text(
                                                "+${pointsAnimTrigger} Points!",
                                                modifier =
                                                        Modifier.padding(
                                                                horizontal = 32.dp,
                                                                vertical = 24.dp
                                                        ),
                                                style =
                                                        MaterialTheme.typography.displayLarge.copy(
                                                                fontWeight = FontWeight.Bold
                                                        ),
                                                color =
                                                        MaterialTheme.colorScheme
                                                                .onTertiaryContainer
                                        )
                                }
                        }
                } // End Overlay Box
        } // End Main Box
} // End GameSessionScreen

@Composable
fun ChatBubble(message: ChatMessage) {
        Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = if (message.isUser) Arrangement.End else Arrangement.Start
        ) {
                Box(
                        modifier =
                                Modifier.widthIn(max = 280.dp)
                                        .clip(
                                                RoundedCornerShape(
                                                        topStart = 16.dp,
                                                        topEnd = 16.dp,
                                                        bottomStart =
                                                                if (message.isUser) 16.dp else 4.dp,
                                                        bottomEnd =
                                                                if (message.isUser) 4.dp else 16.dp
                                                )
                                        )
                                        .background(
                                                if (message.isUser)
                                                        MaterialTheme.colorScheme.primaryContainer
                                                else MaterialTheme.colorScheme.surfaceVariant
                                        )
                                        .padding(12.dp)
                ) {
                        Text(
                                text = message.text,
                                color =
                                        if (message.isUser)
                                                MaterialTheme.colorScheme.onPrimaryContainer
                                        else MaterialTheme.colorScheme.onSurfaceVariant,
                                style = MaterialTheme.typography.bodyLarge
                        )
                }
        }
}
