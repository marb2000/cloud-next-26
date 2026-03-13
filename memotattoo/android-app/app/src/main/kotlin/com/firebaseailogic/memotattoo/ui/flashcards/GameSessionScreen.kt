package com.firebaseailogic.memotattoo.ui.flashcards

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil3.compose.AsyncImage
import com.firebaseailogic.memotattoo.ui.components.AutoResizeText
import com.firebaseailogic.memotattoo.ui.components.FullScreenImageViewer
import com.firebaseailogic.memotattoo.ui.theme.MemoGradientBrush
import com.firebaseailogic.memotattoo.ui.theme.Shapes

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameSessionScreen(
    navController: NavController,
    deckId: String,
    viewModel: GameSessionViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val listState = rememberLazyListState()
    var inputText by remember { mutableStateOf("") }
    var fullScreenImageUrl by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(deckId) {
        viewModel.initSession(deckId)
    }

    LaunchedEffect(uiState.messages.size) {
        if (uiState.messages.isNotEmpty()) {
            listState.animateScrollToItem(uiState.messages.size - 1)
        }
    }

    // Save score when game ends
    LaunchedEffect(uiState.isGameOver) {
        if (uiState.isGameOver) {
            viewModel.saveScore(deckId)
        }
    }

    if (uiState.isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }

    if (uiState.isGameOver || (uiState.sessionTotalItems > 0 && uiState.remainingCount == 0 && uiState.currentConcept == null)) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "Game Over",
                    style = MaterialTheme.typography.displayMedium.copy(fontWeight = FontWeight.ExtraBold),
                    color = MaterialTheme.colorScheme.primary
                )
                Surface(
                    shape = Shapes.large,
                    modifier = Modifier.padding(top = 16.dp).clip(Shapes.large).background(MemoGradientBrush)
                ) {
                    Text(
                        "Final Score: ${uiState.score}",
                        style = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.Bold),
                        color = Color.White,
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
                    )
                }
                Text(
                    "Terms Guessed: ${uiState.termsGuessed}",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 16.dp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(32.dp))
                Button(
                    onClick = { navController.popBackStack() },
                    shape = Shapes.medium
                ) {
                    Text("Return to Hub", modifier = Modifier.padding(8.dp))
                }
            }
        }
        return
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)
        ) {
            // Top Bar
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = uiState.deckTitle,
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                        )
                        Text(
                            "Score: ${uiState.score}",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { viewModel.quit() }) {
                        Icon(imageVector = Icons.Filled.Close, contentDescription = "Quit Game")
                    }
                },
                actions = {
                    Text(
                        text = "Time: ${uiState.timeRemaining}s",
                        modifier = Modifier.padding(end = 16.dp),
                        style = MaterialTheme.typography.titleMedium,
                        color = if (uiState.timeRemaining <= 10) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            )

            // Visual Context
            val imageUrl = (uiState.currentConcept?.get("imageArt") as? String) ?: (uiState.currentConcept?.get("image") as? String)
            if (!imageUrl.isNullOrBlank()) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(16.dp).height(200.dp).clip(Shapes.large).background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    AsyncImage(
                        model = imageUrl,
                        contentDescription = "Concept Image",
                        modifier = Modifier.fillMaxSize().clickable { fullScreenImageUrl = imageUrl },
                        contentScale = ContentScale.Crop
                    )
                }
            }

            // Chat List
            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 16.dp),
                contentPadding = PaddingValues(top = 16.dp, bottom = 16.dp)
            ) {
                items(uiState.messages) { message ->
                    ChatBubble(message)
                    Spacer(modifier = Modifier.height(8.dp))
                }
                if (uiState.isSubmitting) {
                    item {
                        Text(
                            "Game Master is typing...",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(start = 8.dp)
                        )
                    }
                }
            }

            // Input Area
            Row(
                modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = inputText,
                    onValueChange = { inputText = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("Your guess...") },
                    singleLine = true,
                    enabled = !uiState.isSubmitting,
                    shape = RoundedCornerShape(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        if (inputText.isBlank()) return@IconButton
                        val userMsg = inputText
                        inputText = ""
                        viewModel.submitGuess(userMsg)
                    },
                    enabled = !uiState.isSubmitting && inputText.isNotBlank(),
                    colors = IconButtonDefaults.iconButtonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Send,
                        contentDescription = "Send",
                        tint = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }
        }

        // Overlays
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            // Time's Up Overlay
            AnimatedVisibility(
                visible = uiState.timeUpAnimTrigger != null,
                enter = fadeIn(animationSpec = tween(300)) + slideInVertically(initialOffsetY = { -it }),
                exit = fadeOut(animationSpec = tween(300)) + slideOutVertically(targetOffsetY = { it })
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
                        Text("⏰ Time's Up!", style = MaterialTheme.typography.displayMedium, color = MaterialTheme.colorScheme.onErrorContainer)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "The word was: ${uiState.timeUpAnimTrigger ?: ""}",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // Points Overlay
            AnimatedVisibility(
                visible = uiState.pointsAnimTrigger != null,
                enter = fadeIn(animationSpec = tween(300)) + slideInVertically(initialOffsetY = { it }),
                exit = fadeOut(animationSpec = tween(300)) + slideOutVertically(targetOffsetY = { -it })
            ) {
                Surface(
                    shape = RoundedCornerShape(24.dp),
                    color = MaterialTheme.colorScheme.tertiaryContainer,
                    shadowElevation = 12.dp,
                    modifier = Modifier.padding(16.dp)
                ) {
                    Text(
                        "+${uiState.pointsAnimTrigger} Points!",
                        modifier = Modifier.padding(horizontal = 32.dp, vertical = 24.dp),
                        style = MaterialTheme.typography.displayLarge.copy(fontWeight = FontWeight.Bold),
                        color = MaterialTheme.colorScheme.onTertiaryContainer
                    )
                }
            }
        }
    }

    if (fullScreenImageUrl != null) {
        FullScreenImageViewer(imageUrl = fullScreenImageUrl!!) { fullScreenImageUrl = null }
    }
}

@Composable
fun ChatBubble(message: ChatMessage) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (message.isUser) Arrangement.End else Arrangement.Start
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .clip(Shapes.medium)
                .then(
                    if (message.isUser) Modifier.background(MemoGradientBrush)
                    else Modifier.background(MaterialTheme.colorScheme.surfaceVariant)
                )
                .padding(14.dp)
        ) {
            Text(
                text = message.text,
                color = if (message.isUser) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyLarge
            )
        }
    }
}
