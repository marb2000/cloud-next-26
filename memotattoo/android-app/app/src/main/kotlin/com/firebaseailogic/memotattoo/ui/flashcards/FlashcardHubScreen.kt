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
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.testTag
import androidx.navigation.NavController
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.firebaseailogic.memotattoo.ui.theme.MemoGradientBrush
import com.firebaseailogic.memotattoo.ui.theme.Shapes
import kotlinx.coroutines.tasks.await

// FlashcardDeckSummary moved to FlashcardModels.kt

@Composable
fun FlashcardHubScreen(
        navController: NavController,
        userProfileViewModel: com.firebaseailogic.memotattoo.ui.flashcards.UserProfileViewModel =
                androidx.lifecycle.viewmodel.compose.viewModel(),
        flashcardHubViewModel: com.firebaseailogic.memotattoo.ui.flashcards.FlashcardHubViewModel =
                androidx.lifecycle.viewmodel.compose.viewModel(),
        currentUid: String = FirebaseManager.auth.currentUser?.uid ?: ""
) {
    val myDecks by flashcardHubViewModel.myDecks.collectAsState()
    val publicDecks by flashcardHubViewModel.publicDecks.collectAsState()
    val isLoading by flashcardHubViewModel.isLoading.collectAsState()
    var selectedTabIndex by remember { mutableIntStateOf(0) }
    var deckToDelete by remember { mutableStateOf<FlashcardDeckSummary?>(null) }
    var deckForMenu by remember { mutableStateOf<FlashcardDeckSummary?>(null) }
    
    @OptIn(ExperimentalMaterial3Api::class)
    val sheetState = rememberModalBottomSheetState()

    fun publishDeck(deck: FlashcardDeckSummary) {
        flashcardHubViewModel.publishDeck(deck)
    }

    fun unpublishDeck(deck: FlashcardDeckSummary) {
        flashcardHubViewModel.unpublishDeck(deck)
    }
    
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
                            flashcardHubViewModel.deleteDeck(deckId)
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

    // Data loading logic moved to FlashcardHubViewModel

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

            // Search Bar
            val searchQuery by flashcardHubViewModel.searchQuery.collectAsState()
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { flashcardHubViewModel.updateSearch(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                placeholder = { Text("Search decks...") },
                singleLine = true,
                shape = Shapes.medium,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    unfocusedBorderColor = Color.Transparent,
                    focusedBorderColor = MaterialTheme.colorScheme.primary
                )
            )

            SecondaryTabRow(
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
                            currentUid = currentUid,
                            onClick = { navController.navigate("challenge/${deck.id}") },
                            onEdit = { navController.navigate("create_deck?draftId=${deck.id}") },
                            onMenuOpen = { deckForMenu = deck }
                        )
                    }

                    if (selectedTabIndex == 1 && currentList.isNotEmpty()) {
                        item {
                            Box(modifier = Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                Button(
                                    onClick = { flashcardHubViewModel.loadMore() },
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text("Load MoreDecks")
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (deckForMenu != null) {
        val deck = deckForMenu!!
        val isOwner = deck.ownerId == currentUid
        
        @OptIn(ExperimentalMaterial3Api::class)
        ModalBottomSheet(
            onDismissRequest = { deckForMenu = null },
            sheetState = sheetState,
            containerColor = MaterialTheme.colorScheme.surface
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .padding(bottom = 32.dp)
            ) {
                Text(
                    text = deck.title,
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(bottom = 16.dp)
                )
                
                if (isOwner) {
                    ListItem(
                        headlineContent = { Text("Edit Flashcards") },
                        leadingContent = { Icon(Icons.Default.Person, contentDescription = null) },
                        modifier = Modifier
                            .testTag("Action_Edit")
                            .clickable {
                                deckForMenu = null
                                navController.navigate("create_deck?draftId=${deck.id}")
                            }
                    )
                    
                    if (deck.isPublic) {
                        ListItem(
                            headlineContent = { Text("Unpublish (Make Private)") },
                            leadingContent = { Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.alpha(0.5f)) },
                            modifier = Modifier
                                .testTag("Action_Unpublish")
                                .clickable {
                                    deckForMenu = null
                                    unpublishDeck(deck)
                                }
                        )
                    } else if (deck.status != "pending") {
                        ListItem(
                            headlineContent = { Text("Publish to Global Library") },
                            leadingContent = { Icon(Icons.Default.Person, contentDescription = null) },
                            modifier = Modifier
                                .testTag("Action_Publish")
                                .clickable {
                                    deckForMenu = null
                                    publishDeck(deck)
                                }
                        )
                    }
                    
                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
                    
                    ListItem(
                        headlineContent = { Text("Delete Deck", color = MaterialTheme.colorScheme.error) },
                        leadingContent = { Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error) },
                        modifier = Modifier
                            .testTag("Action_Delete")
                            .clickable {
                                deckForMenu = null
                                deckToDelete = deck
                            }
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun DeckCard(
    deck: FlashcardDeckSummary,
    currentUid: String,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onMenuOpen: () -> Unit
) {
    val isOwner = deck.ownerId == currentUid

    Surface(
            modifier =
                    Modifier.fillMaxWidth()
                            .testTag("DeckCard_${deck.id}")
                            .clip(Shapes.large)
                            .padding(horizontal = 4.dp)
                            .combinedClickable(
                                onClick = {
                                    if (deck.status == "draft") onEdit() else onClick()
                                },
                                onLongClick = onMenuOpen
                            ),
            color = MaterialTheme.colorScheme.surfaceVariant,
            shape = Shapes.large,
            shadowElevation = 2.dp
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = deck.title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2
                    )
                    
                    Row(
                        modifier = Modifier.padding(top = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (deck.isPublic) {
                            Badge(
                                containerColor = MaterialTheme.colorScheme.tertiary,
                                modifier = Modifier.testTag("Badge_Public")
                            ) {
                                Text("Public", color = MaterialTheme.colorScheme.onTertiary)
                            }
                        } else if (deck.status == "pending") {
                            Badge(
                                containerColor = MaterialTheme.colorScheme.secondary,
                                modifier = Modifier.testTag("Badge_Moderating")
                            ) {
                                Text("Moderating", color = MaterialTheme.colorScheme.onSecondary)
                            }
                        } else if (deck.status == "draft") {
                            Badge(
                                containerColor = MaterialTheme.colorScheme.surface,
                                modifier = Modifier.testTag("Badge_Draft")
                            ) {
                                Text("Draft", color = MaterialTheme.colorScheme.onSurface)
                            }
                        } else {
                            Badge(
                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                                modifier = Modifier.testTag("Badge_Private")
                            ) {
                                Text("Private", color = MaterialTheme.colorScheme.onPrimaryContainer)
                            }
                        }
                        
                        if (deck.bestScore > 0) {
                            Text(
                                    text = "Score: ${deck.bestScore}",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (isOwner) {
                        IconButton(onClick = onMenuOpen) {
                            Icon(Icons.Default.MoreVert, contentDescription = "Menu")
                        }
                    }
                    
                    if (deck.status != "draft") {
                        Surface(
                            shape = androidx.compose.foundation.shape.CircleShape,
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                            modifier = Modifier
                                .size(40.dp)
                                .testTag("PlayButton")
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = "Play",
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                    } else {
                        Icon(
                            imageVector = Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(32.dp).alpha(0.3f),
                            tint = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }
        }
    }
}
