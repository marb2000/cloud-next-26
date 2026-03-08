package com.firebaseailogic.memotattoo.ui.flashcards

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.firebaseailogic.memotattoo.data.FirebaseManager
import kotlinx.coroutines.tasks.await

data class FlashcardDeckSummary(
        val id: String,
        val title: String,
        val description: String,
        val type: String, // "New", "Grammar", "Review", "FlashcardDeck"
        val isCompleted: Boolean = false,
        val status: String = "published", // e.g. "draft", "pending", "published"
        val isPublic: Boolean = false,
        val ownerId: String = "",
        val bestScore: Int = 0
)

@Composable
fun FlashcardHubScreen(
        navController: NavController,
        userProfileViewModel: com.firebaseailogic.memotattoo.ui.flashcards.UserProfileViewModel =
                androidx.lifecycle.viewmodel.compose.viewModel()
) {
    var myDecks by remember { mutableStateOf<List<FlashcardDeckSummary>>(emptyList()) }
    var publicDecks by remember { mutableStateOf<List<FlashcardDeckSummary>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedTabIndex by remember { mutableIntStateOf(0) }

    val userProfile by userProfileViewModel.userProfile.collectAsState()
    val energyBolts = userProfile?.energyBolts ?: 0

    val currentUid = FirebaseManager.auth.currentUser?.uid ?: ""

    LaunchedEffect(Unit) {
        try {
            val userScoresRef =
                    FirebaseManager.firestore
                            .collection("Users")
                            .document(currentUid)
                            .collection("User_Scores")
            val scoresSnap = userScoresRef.get().await()
            val scoreMap =
                    scoresSnap.documents.associate {
                        it.id to (it.getLong("bestScore")?.toInt() ?: 0)
                    }

            val snapshot = FirebaseManager.firestore.collection("FlashcardDecks").get().await()
            val loadedDecks =
                    snapshot.documents.map { doc ->
                        val contentBase = doc.get("contentBase") as? Map<String, Any>
                        FlashcardDeckSummary(
                                id = doc.id,
                                title = contentBase?.get("title") as? String ?: "Unknown Deck",
                                description = doc.getString("topic") ?: "Custom flashcard deck.",
                                type = "FlashcardDeck",
                                status = doc.getString("status") ?: "draft",
                                isPublic = doc.getBoolean("isPublic")
                                                ?: (doc.getString("status") == "published"),
                                ownerId = doc.getString("owner_id") ?: "",
                                bestScore = scoreMap[doc.id] ?: 0
                        )
                    }
            val allDecks = loadedDecks

            myDecks = allDecks.filter { it.ownerId == currentUid }
            publicDecks = allDecks.filter { it.isPublic }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            isLoading = false
        }
    }

    Scaffold(
            floatingActionButton = {
                FloatingActionButton(
                        onClick = { navController.navigate("create_deck") },
                        containerColor = MaterialTheme.colorScheme.primary
                ) {
                    Text(
                            "+",
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.onPrimary
                    )
                }
            }
    ) { paddingValues ->
        Column(
                modifier =
                        Modifier.fillMaxSize()
                                .background(MaterialTheme.colorScheme.background)
                                .padding(paddingValues)
                                .padding(24.dp)
        ) {
            Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp, top = 24.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                        text = "Flashcard Hub",
                        style = MaterialTheme.typography.displaySmall,
                        color = MaterialTheme.colorScheme.primary
                )
                Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.clickable { navController.navigate("billing") }
                ) {
                    Text(
                            text = "⚡ $energyBolts",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }

            TabRow(
                    selectedTabIndex = selectedTabIndex,
                    containerColor = MaterialTheme.colorScheme.background,
                    modifier = Modifier.padding(bottom = 16.dp)
            ) {
                Tab(
                        selected = selectedTabIndex == 0,
                        onClick = { selectedTabIndex = 0 },
                        text = { Text("My Decks") }
                )
                Tab(
                        selected = selectedTabIndex == 1,
                        onClick = { selectedTabIndex = 1 },
                        text = { Text("Public Decks") }
                )
            }

            if (isLoading) {
                Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                val currentList = if (selectedTabIndex == 0) myDecks else publicDecks

                LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.weight(1f)
                ) {
                    items(currentList) { deck ->
                        DeckCard(
                                deck = deck,
                                onClick = { navController.navigate("challenge/${deck.id}") },
                                onEdit = { navController.navigate("create_deck?draftId=${deck.id}") },
                                onMakePublic = {
                                    // Update Firestore document to enter the moderation queue
                                    FirebaseManager.firestore
                                            .collection("FlashcardDecks")
                                            .document(deck.id)
                                            .update(mapOf("status" to "pending"))
                                            .addOnSuccessListener {
                                                // Optimistically update the local list
                                                myDecks =
                                                        myDecks.map {
                                                            if (it.id == deck.id)
                                                                    it.copy(status = "pending")
                                                            else it
                                                        }
                                            }
                                }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DeckCard(deck: FlashcardDeckSummary, onClick: () -> Unit, onEdit: () -> Unit, onMakePublic: () -> Unit) {
    Surface(
            modifier =
                    Modifier.fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .clickable(onClick = onClick),
            color = MaterialTheme.colorScheme.surfaceVariant,
            shadowElevation = 2.dp
    ) {
        Column {
            Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                                text = deck.title,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (deck.isPublic) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Badge(containerColor = MaterialTheme.colorScheme.tertiary) {
                                Text("Public", color = MaterialTheme.colorScheme.onTertiary)
                            }
                        } else if (deck.status == "pending") {
                            Spacer(modifier = Modifier.width(8.dp))
                            Badge(containerColor = MaterialTheme.colorScheme.secondary) {
                                Text("In Review", color = MaterialTheme.colorScheme.onSecondary)
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                            text = deck.description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f)
                    )
                    if (deck.bestScore > 0) {
                        Text(
                                text = "Best Score: ${deck.bestScore}",
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
                // Simple indicator
                Box(
                        modifier =
                                Modifier.size(40.dp)
                                        .clip(RoundedCornerShape(20.dp))
                                        .background(
                                                MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
                                        ),
                        contentAlignment = Alignment.Center
                ) { Text(text = "▶", color = MaterialTheme.colorScheme.primary) }
            }
            // Add Mod actions for decks the user owns that aren't public yet
            if (!deck.isPublic && deck.status != "pending" && deck.type == "FlashcardDeck"
            ) {
                HorizontalDivider(
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f)
                )
                if (deck.status == "draft") {
                    TextButton(onClick = { onEdit() }, modifier = Modifier.fillMaxWidth()) {
                        Text("Continue Editing Draft", color = MaterialTheme.colorScheme.primary)
                    }
                } else {
                    TextButton(onClick = { onMakePublic() }, modifier = Modifier.fillMaxWidth()) {
                        Text("Publish to Global Library", color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}
