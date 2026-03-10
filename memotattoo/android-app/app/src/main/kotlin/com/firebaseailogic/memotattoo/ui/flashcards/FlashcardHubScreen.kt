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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Person
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.firebaseailogic.memotattoo.ui.theme.MemoGradientBrush
import com.firebaseailogic.memotattoo.ui.theme.Shapes
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
    var deckToDelete by remember { mutableStateOf<FlashcardDeckSummary?>(null) }
    
    // Add delete dialog
    if (deckToDelete != null) {
        AlertDialog(
            onDismissRequest = { deckToDelete = null },
            title = { Text("Delete Deck") },
            text = { Text("Are you sure you want to permanently delete '${deckToDelete?.title}'? This action cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        val deckId = deckToDelete?.id
                        deckToDelete = null
                        if (deckId != null) {
                            FirebaseManager.firestore
                                .collection("FlashcardDecks")
                                .document(deckId)
                                .delete()
                                .addOnSuccessListener {
                                    myDecks = myDecks.filter { it.id != deckId }
                                }
                        }
                    }
                ) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { deckToDelete = null }) {
                    Text("Cancel")
                }
            }
        )
    }

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
                        @Suppress("UNCHECKED_CAST")
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

            myDecks = allDecks.filter { it.ownerId == currentUid && !it.isPublic }
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
                        shape = Shapes.large,
                        containerColor = Color.Transparent,
                        elevation = FloatingActionButtonDefaults.elevation(0.dp, 0.dp),
                        modifier = Modifier
                            .background(MemoGradientBrush, shape = Shapes.large)
                ) {
                    Text(
                            "+",
                            style = MaterialTheme.typography.titleLarge,
                            color = Color.White
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
                        style = MaterialTheme.typography.displaySmall.copy(fontWeight = FontWeight.ExtraBold),
                        color = MaterialTheme.colorScheme.primary
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { navController.navigate("settings") }) {
                        Icon(imageVector = Icons.Default.Person, contentDescription = "Settings")
                    }
                    Surface(
                            shape = Shapes.medium,
                            modifier = Modifier.clip(Shapes.medium).background(MemoGradientBrush).clickable { navController.navigate("billing") }
                    ) {
                        Text(
                                text = "⚡ $energyBolts",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                color = Color.White,
                                modifier = Modifier.background(Color.Transparent).padding(horizontal = 16.dp, vertical = 8.dp)
                        )
                    }
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
                Box(modifier = Modifier.weight(1f).fillMaxSize(), contentAlignment = Alignment.Center) {
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
                                onDelete = { deckToDelete = deck },
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
fun DeckCard(deck: FlashcardDeckSummary, onClick: () -> Unit, onEdit: () -> Unit, onDelete: (() -> Unit)? = null, onMakePublic: () -> Unit) {
    Surface(
            modifier =
                    Modifier.fillMaxWidth()
                            .clip(Shapes.large)
                            .clickable(
                                enabled = deck.status != "pending",
                                onClick = onClick
                            ),
            color = MaterialTheme.colorScheme.surfaceVariant,
            shape = Shapes.large,
            shadowElevation = 4.dp
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
                        } else {
                            Spacer(modifier = Modifier.width(8.dp))
                            Badge(
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                            ) {
                                Text("Private", color = MaterialTheme.colorScheme.onPrimaryContainer)
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
                
                // Optional Delete Action
                if (onDelete != null && deck.status != "pending" && !deck.isPublic) {
                    IconButton(onClick = onDelete) {
                        Icon(
                            imageVector = Icons.Default.Delete,
                            contentDescription = "Delete Deck",
                            tint = MaterialTheme.colorScheme.error.copy(alpha = 0.8f)
                        )
                    }
                }
                // Simple indicator
                Box(
                        modifier =
                                Modifier.size(40.dp)
                                        .clip(RoundedCornerShape(20.dp))
                                        .background(
                                                MaterialTheme.colorScheme.primary.copy(
                                                    alpha = if (deck.status == "pending") 0.05f else 0.1f
                                                )
                                        ),
                        contentAlignment = Alignment.Center
                ) { Text(
                        text = "▶", 
                        color = MaterialTheme.colorScheme.primary.copy(
                            alpha = if (deck.status == "pending") 0.3f else 1f
                        )
                    ) 
                }
            }
            // Add Mod actions for decks the user owns that aren't public yet
            if (!deck.isPublic && deck.status != "pending" && deck.type == "FlashcardDeck"
            ) {
                HorizontalDivider(
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.1f)
                )
                Row(modifier = Modifier.fillMaxWidth()) {
                    TextButton(onClick = { onEdit() }, modifier = Modifier.weight(1f)) {
                        Text(if (deck.status == "draft") "Continue Draft" else "Edit Deck", color = MaterialTheme.colorScheme.primary)
                    }
                    if (deck.status != "draft") {
                        TextButton(onClick = { onMakePublic() }, modifier = Modifier.weight(1f)) {
                            Text("Publish", color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
            }
        }
    }
}
