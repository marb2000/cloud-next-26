package com.firebaseailogic.memotattoo.ui.flashcards

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.Alignment
import androidx.compose.foundation.clickable
import androidx.compose.ui.layout.ContentScale
import androidx.navigation.NavController
import coil.compose.AsyncImage
import com.firebaseailogic.memotattoo.ai.AILogic
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.firebaseailogic.memotattoo.ui.components.FullScreenImageViewer
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

data class DraftState(
        var step: Int = 1,
        var topic: String = "",
        var numberOfItems: String = "5",
        var title: String = "",
        var concepts: MutableList<ConceptDraft> = mutableListOf(),
        var globalArtDirection: String = "",
        var globalArtImageUri: String? = null,
        var draftId: String? = null
)

data class ConceptDraft(
        var term: String = "",
        var definition: String = "",
        var imageUrl: String? = null,
        var isGeneratingImage: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateDeckScreen(
        navController: NavController,
        draftId: String? = null,
        userProfileViewModel: com.firebaseailogic.memotattoo.ui.flashcards.UserProfileViewModel =
                androidx.lifecycle.viewmodel.compose.viewModel()
) {
    var draftState by remember { mutableStateOf(DraftState(draftId = draftId)) }
    var isLoading by remember { mutableStateOf(draftId != null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var fullScreenImageUrl by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

    LaunchedEffect(draftId) {
        if (draftId != null) {
            try {
                val doc = FirebaseManager.firestore.collection("FlashcardDecks").document(draftId).get().await()
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
                    
                    draftState = DraftState(
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
            } catch (e: Exception) {
                errorMessage = "Failed to load draft: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    val userProfile by userProfileViewModel.userProfile.collectAsState()
    val energyBolts = userProfile?.energyBolts ?: 0

    Scaffold(
            topBar = {
                TopAppBar(
                        title = { Text("Create Flashcard Deck") },
                        navigationIcon = {
                            IconButton(onClick = { navController.popBackStack() }) {
                                Icon(
                                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                        contentDescription = "Back"
                                )
                            }
                        },
                        actions = {
                            var isSavingDraft by remember { mutableStateOf(false) }
                            TextButton(
                                onClick = {
                                    if (isSavingDraft) return@TextButton
                                    isSavingDraft = true
                                    coroutineScope.launch {
                                        try {
                                            val uid = FirebaseManager.auth.currentUser?.uid ?: return@launch
                                            val itemsList = draftState.concepts.map { concept ->
                                                mapOf(
                                                    "term" to concept.term,
                                                    "definition" to concept.definition,
                                                    "imageArt" to (concept.imageUrl ?: "")
                                                )
                                            }
                                            val deckData = hashMapOf(
                                                "title" to draftState.title.ifEmpty { "Untitled Draft" },
                                                "contentBase" to mapOf(
                                                    "title" to draftState.title.ifEmpty { "Untitled Draft" },
                                                    "items" to itemsList
                                                ),
                                                "topic" to draftState.topic,
                                                "language" to "en",
                                                "authorId" to uid,
                                                "owner_id" to uid,
                                                "owner_email" to (FirebaseManager.auth.currentUser?.email ?: ""),
                                                "isPublic" to false,
                                                "status" to "draft", 
                                                "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                                                "items" to itemsList,
                                                "artDirection" to draftState.globalArtDirection,
                                                "artReferenceImage" to (draftState.globalArtImageUri ?: "")
                                            )
                                            
                                            val docRef = if (draftState.draftId != null) {
                                                FirebaseManager.firestore.collection("FlashcardDecks").document(draftState.draftId!!)
                                            } else {
                                                FirebaseManager.firestore.collection("FlashcardDecks").document()
                                            }
                                            
                                            docRef.set(deckData).await()
                                            draftState = draftState.copy(draftId = docRef.id)
                                            navController.popBackStack()
                                        } catch (e: Exception) {
                                            errorMessage = "Failed to save: ${e.message}"
                                        } finally {
                                            isSavingDraft = false
                                        }
                                    }
                                },
                                enabled = !isSavingDraft
                            ) {
                                if (isSavingDraft) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = MaterialTheme.colorScheme.primary, strokeWidth = 2.dp)
                                } else {
                                    Text("Save Draft", color = MaterialTheme.colorScheme.primary)
                                }
                            }
                        },
                        colors =
                                TopAppBarDefaults.topAppBarColors(
                                        containerColor = MaterialTheme.colorScheme.background
                                )
                )
            }
    ) { paddingValues ->
        Column(
                modifier =
                        Modifier.fillMaxSize()
                                .background(MaterialTheme.colorScheme.background)
                                .padding(paddingValues)
                                .padding(horizontal = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Step Indicator
            Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                        text = "Step ${draftState.step} of 5",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                )
                Text(
                        text =
                                when (draftState.step) {
                                    1 -> "Topic"
                                    2 -> "Content"
                                    3 -> "Art Direction"
                                    4 -> "Images"
                                    else -> ""
                                },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            if (errorMessage != null) {
                Card(
                        colors =
                                CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.errorContainer
                                ),
                        modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                            text = errorMessage!!,
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(12.dp)
                    )
                }
            }

            // Step Content Area
            Box(modifier = Modifier.weight(1f)) {
                when (draftState.step) {
                    1 -> Step1Topic(draftState) { draftState = it }
                    2 -> Step2Content(draftState) { draftState = it }
                    3 -> Step3ArtDirection(draftState, onImageClick = { url -> fullScreenImageUrl = url }) { draftState = it }
                    4 -> Step4Images(draftState, energyBolts, userProfile, { navController.navigate("billing") }, onImageClick = { url -> fullScreenImageUrl = url }) { draftState = it }
                    5 -> {
                        var isPublishing by remember { mutableStateOf(false) }
                        Step5Publish(
                                state = draftState,
                                isPublishing = isPublishing,
                                onPublish = { isPublic ->
                                    if (isPublishing) return@Step5Publish


                                    isPublishing = true
                                    coroutineScope.launch {
                                        try {
                                            val uid = FirebaseManager.auth.currentUser?.uid ?: throw Exception("Not logged in")
                                            val itemsList = draftState.concepts.map { concept ->
                                                mapOf(
                                                    "term" to concept.term,
                                                    "definition" to concept.definition,
                                                    "imageArt" to (concept.imageUrl ?: "")
                                                )
                                            }
                                            val deckData = hashMapOf(
                                                    "title" to draftState.title,
                                                    "contentBase" to mapOf(
                                                        "title" to draftState.title,
                                                        "items" to itemsList
                                                    ),
                                                    "topic" to draftState.topic,
                                                    "language" to "en",
                                                    "authorId" to uid,
                                                    "owner_id" to uid,
                                                    "owner_email" to (FirebaseManager.auth.currentUser?.email ?: ""),
                                                    "isPublic" to isPublic,
                                                    "status" to if (isPublic) "pending" else "private",
                                                    "createdAt" to com.google.firebase.firestore.FieldValue.serverTimestamp(),
                                                    "items" to itemsList,
                                                    "artDirection" to draftState.globalArtDirection,
                                                    "artReferenceImage" to (draftState.globalArtImageUri ?: "")
                                            )
                                            val docRef = if (draftState.draftId != null) {
                                                FirebaseManager.firestore.collection("FlashcardDecks").document(draftState.draftId!!)
                                            } else {
                                                FirebaseManager.firestore.collection("FlashcardDecks").document()
                                            }
                                            docRef.set(deckData).await()
                                            navController.popBackStack()
                                        } catch (e: Exception) {
                                            errorMessage = "Publish Failed: ${e.message}"
                                        } finally {
                                            isPublishing = false
                                        }
                                    }
                                }
                        )
                    }
                }
            }

            // Footer Navigation
            Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (draftState.step > 1) {
                    OutlinedButton(
                            onClick = { draftState = draftState.copy(step = draftState.step - 1) },
                            modifier = Modifier.weight(1f).padding(end = 8.dp)
                    ) { Text("Back") }
                } else {
                    Spacer(modifier = Modifier.weight(1f).padding(end = 8.dp))
                }

                if (draftState.step < 5) {
                    Button(
                            onClick = {
                                if (draftState.step == 1) {
                                    if (draftState.topic.isBlank()) {
                                        errorMessage = "Please enter a topic."
                                        return@Button
                                    }
                                    isLoading = true
                                    errorMessage = null
                                    coroutineScope.launch {
                                        try {
                                            if (FirebaseManager.auth.currentUser?.uid == null) {
                                                return@launch
                                            }

                                            if (energyBolts < 1) {
                                                navController.navigate("billing")
                                                return@launch
                                            }

                                            val count = draftState.numberOfItems.toIntOrNull() ?: 5
                                            val result =
                                                    AILogic.generateTopic(draftState.topic, count)

                                            // Deduct bolt
                                            FirebaseManager.auth.currentUser?.uid?.let { currentUid ->
                                                val userRef =
                                                        FirebaseManager.firestore
                                                                .collection("Users")
                                                                .document(currentUid)
                                                if (energyBolts >= 1) {
                                                    userRef.update("energy_bolts", energyBolts - 1)
                                                            .await()
                                                } else {
                                                    throw Exception("Insufficient bolts")
                                                }
                                            }

                                            val newTitle =
                                                    result["title"] as? String
                                                            ?: "${draftState.topic} Essentials"
                                            @Suppress("UNCHECKED_CAST")
                                            val itemsList =
                                                    result["items"] as? List<Map<String, String>>
                                                            ?: emptyList()
                                            val parsedConcepts =
                                                    itemsList.map {
                                                        ConceptDraft(
                                                                it["term"] ?: "",
                                                                it["definition"] ?: ""
                                                        )
                                                    }

                                            draftState =
                                                    draftState.copy(
                                                            title = newTitle,
                                                            concepts =
                                                                    parsedConcepts.toMutableList(),
                                                            step = 2
                                                    )
                                        } catch (e: Exception) {
                                            errorMessage = "Failed to brainstorm: ${e.message}"
                                        } finally {
                                            isLoading = false
                                        }
                                    }
                                } else {
                                    draftState = draftState.copy(step = draftState.step + 1)
                                }
                            },
                            modifier = Modifier.weight(1f).padding(start = 8.dp),
                            enabled = !isLoading
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                    modifier = Modifier.size(20.dp),
                                    color = MaterialTheme.colorScheme.onPrimary
                            )
                        } else {
                            Text(if (draftState.step == 1) "Brainstorm" else "Next")
                        }
                    }
                } else {
                    Spacer(modifier = Modifier.weight(1f).padding(start = 8.dp))
                }
            }
        }
    }

    // Mount Full Screen Viewer if needed
    fullScreenImageUrl?.let { url ->
        FullScreenImageViewer(
            imageUrl = url,
            onDismiss = { fullScreenImageUrl = null }
        )
    }
}

@Composable
fun Step1Topic(state: DraftState, onStateChange: (DraftState) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
                "What do you want to learn?",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
        )
        OutlinedTextField(
                value = state.topic,
                onValueChange = { onStateChange(state.copy(topic = it)) },
                label = { Text("Subject (e.g., Solar System)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
        )
        OutlinedTextField(
                value = state.numberOfItems,
                onValueChange = { onStateChange(state.copy(numberOfItems = it)) },
                label = { Text("Number of Items") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
        )
    }
}

@Composable
fun Step2Content(state: DraftState, onStateChange: (DraftState) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        OutlinedTextField(
                value = state.title,
                onValueChange = { onStateChange(state.copy(title = it)) },
                label = { Text("Deck Title") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
        )

        Text("Proposed Flashcards (${state.concepts.size})", fontWeight = FontWeight.Bold)

        LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f)
        ) {
            itemsIndexed(state.concepts) { index, concept ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                                horizontalArrangement = Arrangement.SpaceBetween,
                                modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                    "Card ${index + 1}",
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.primary
                            )
                        }
                        OutlinedTextField(
                                value = concept.term,
                                onValueChange = { newTerm ->
                                    val updated = state.concepts.toMutableList()
                                    updated[index] = concept.copy(term = newTerm)
                                    onStateChange(state.copy(concepts = updated))
                                },
                                label = { Text("Term") },
                                modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                                value = concept.definition,
                                onValueChange = { newDef ->
                                    val updated = state.concepts.toMutableList()
                                    updated[index] = concept.copy(definition = newDef)
                                    onStateChange(state.copy(concepts = updated))
                                },
                                label = { Text("Definition") },
                                modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
            item {
                var isBrainstormingMore by remember { mutableStateOf(false) }
                val coroutineScope = rememberCoroutineScope()
                OutlinedButton(
                        onClick = {
                            if (isBrainstormingMore) return@OutlinedButton
                            isBrainstormingMore = true
                            coroutineScope.launch {
                                try {
                                    val existingTerms =
                                            state.concepts.joinToString(", ") { it.term }
                                    val newItems =
                                            AILogic.brainstormMore(state.topic, existingTerms)
                                    val parsedNewConcepts =
                                            newItems.map {
                                                ConceptDraft(
                                                        it["term"] ?: "",
                                                        it["definition"] ?: ""
                                                )
                                            }
                                    val updatedConcepts =
                                            state.concepts.toMutableList().apply {
                                                addAll(parsedNewConcepts)
                                            }
                                    onStateChange(state.copy(concepts = updatedConcepts))
                                } catch (e: Exception) {
                                    // Ignore or show toast
                                } finally {
                                    isBrainstormingMore = false
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        enabled = !isBrainstormingMore
                ) {
                    if (isBrainstormingMore) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp))
                    } else {
                        Icon(Icons.Default.Add, contentDescription = "Add")
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Brainstorm More Items")
                    }
                }
            }
        }
    }
}

@Composable
fun Step3ArtDirection(state: DraftState, onImageClick: (String) -> Unit, onStateChange: (DraftState) -> Unit) {
    val launcher =
            androidx.activity.compose.rememberLauncherForActivityResult(
                    contract =
                            androidx.activity.result.contract.ActivityResultContracts.GetContent()
            ) { uri: android.net.Uri? ->
                if (uri != null) {
                    onStateChange(state.copy(globalArtImageUri = uri.toString()))
                }
            }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
                "Global Art Direction",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
        )
        Text(
                "Provide a prompt or reference image to globally style all flashcards in this deck.",
                style = MaterialTheme.typography.bodyMedium
        )

        OutlinedTextField(
                value = state.globalArtDirection,
                onValueChange = { onStateChange(state.copy(globalArtDirection = it)) },
                label = { Text("Style Description (Optional)") },
                modifier = Modifier.fillMaxWidth().height(120.dp),
                maxLines = 5
        )

        if (state.globalArtImageUri != null) {
            AsyncImage(
                    model = state.globalArtImageUri,
                    contentDescription = "Reference Image",
                    modifier = Modifier.fillMaxWidth().height(200.dp).clickable { onImageClick(state.globalArtImageUri!!) }
            )
        }

        OutlinedButton(
                onClick = { launcher.launch("image/*") },
                modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                    if (state.globalArtImageUri != null) "Change Reference Image"
                    else "Upload Reference Image"
            )
        }
    }
}

@Composable
fun Step4Images(
    state: DraftState, 
    energyBolts: Int, 
    userProfile: com.firebaseailogic.memotattoo.ui.flashcards.UserProfile?, 
    onNavigateToBilling: () -> Unit,
    onImageClick: (String) -> Unit,
    onStateChange: (DraftState) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
                "Flashcard Images",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
        )
        LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            itemsIndexed(state.concepts) { index, concept ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(concept.term, fontWeight = FontWeight.Bold)
                            if (concept.imageUrl != null) {
                                AsyncImage(
                                        model = concept.imageUrl,
                                        contentDescription = concept.term,
                                        modifier =
                                                Modifier.padding(top = 8.dp, bottom = 8.dp)
                                                        .size(80.dp)
                                                        .clickable { onImageClick(concept.imageUrl!!) },
                                        contentScale = ContentScale.Crop
                                )
                            } else {
                                Text("No image", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            var showRedoDialog by remember { mutableStateOf(false) }
                            val coroutineScope = rememberCoroutineScope()
                            val context = androidx.compose.ui.platform.LocalContext.current

                            val generateImage = {
                                if (!concept.isGeneratingImage) {
                                    val startConcepts = state.concepts.toMutableList()
                                    startConcepts[index] = concept.copy(isGeneratingImage = true)
                                    onStateChange(state.copy(concepts = startConcepts))
                                    
                                    coroutineScope.launch {
                                            try {
                                                val isPro = userProfile?.isPro == true
                                                val generated = userProfile?.imagesGeneratedThisMonth ?: 0

                                                if (isPro) {
                                                    if (generated >= 100) {
                                                        android.widget.Toast.makeText(
                                                            context,
                                                            "You have reached your 100 AI Images/mo limit.",
                                                            android.widget.Toast.LENGTH_LONG
                                                        ).show()
                                                        return@launch
                                                    }
                                                    if (energyBolts < 1) {
                                                        onNavigateToBilling()
                                                        return@launch
                                                    }
                                                } else {
                                                    if (energyBolts < 3) {
                                                        onNavigateToBilling()
                                                        return@launch
                                                    }
                                                }

                                                var url =
                                                        AILogic.generateConceptImage(
                                                                title = state.title,
                                                                term = concept.term,
                                                                definition = concept.definition,
                                                                artDirection =
                                                                        state.globalArtDirection
                                                        )

                                                if (url.startsWith("data:image/jpeg;base64,")) {
                                                    val b64 = url.substringAfter("base64,")
                                                    val bytes =
                                                            android.util.Base64.decode(
                                                                    b64,
                                                                    android.util.Base64.DEFAULT
                                                            )
                                                    val storageRef =
                                                            FirebaseManager.storage.reference.child(
                                                                    "drafts/${java.util.UUID.randomUUID()}.jpg"
                                                            )
                                                    storageRef.putBytes(bytes).await()
                                                    url = storageRef.downloadUrl.await().toString()
                                                }

                                                // Deduct bolt
                                                FirebaseManager.auth.currentUser?.uid?.let { uid ->
                                                    val userRef =
                                                            FirebaseManager.firestore
                                                                    .collection("Users")
                                                                    .document(uid)
                                                                    
                                                    val boltsToDeduct = if (isPro) 1 else 3
                                                    if (energyBolts >= boltsToDeduct) {
                                                        userRef.update(
                                                            mapOf(
                                                                "energy_bolts" to (energyBolts - boltsToDeduct),
                                                                "imagesGeneratedThisMonth" to com.google.firebase.firestore.FieldValue.increment(1)
                                                            )
                                                        )
                                                                .await()
                                                    }
                                                }

                                                val updatedConcepts = state.concepts.toMutableList()
                                                updatedConcepts[index] =
                                                        updatedConcepts[index].copy(imageUrl = url)
                                                onStateChange(
                                                        state.copy(concepts = updatedConcepts)
                                                )
                                            } catch (e: Exception) {
                                                // Show error
                                                android.util.Log.e(
                                                        "CreateDeckScreen",
                                                        "Image generation failed",
                                                        e
                                                )
                                            } finally {
                                                val finalConcepts = state.concepts.toMutableList()
                                                finalConcepts[index] = finalConcepts[index].copy(isGeneratingImage = false)
                                                onStateChange(state.copy(concepts = finalConcepts))
                                            }
                                        }
                                    }
                                }

                            if (showRedoDialog) {
                                AlertDialog(
                                    onDismissRequest = { showRedoDialog = false },
                                    title = { Text("Redo Image") },
                                    text = { Text("Generating a new image will replace the current one and the old image will be lost. Do you want to continue?") },
                                    confirmButton = {
                                        TextButton(onClick = {
                                            showRedoDialog = false
                                            generateImage()
                                        }) {
                                            Text("Continue", color = MaterialTheme.colorScheme.error)
                                        }
                                    },
                                    dismissButton = {
                                        TextButton(onClick = { showRedoDialog = false }) {
                                            Text("Cancel")
                                        }
                                    }
                                )
                            }

                            Button(
                                    onClick = {
                                        if (concept.imageUrl != null) {
                                            showRedoDialog = true
                                        } else {
                                            generateImage()
                                        }
                                    },
                                    enabled = !concept.isGeneratingImage
                            ) {
                                if (concept.isGeneratingImage) {
                                    CircularProgressIndicator(
                                            modifier = Modifier.size(20.dp),
                                            color = MaterialTheme.colorScheme.onPrimary
                                    )
                                } else {
                                    Text(if (concept.imageUrl != null) "Redo" else "Generate")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun Step5Publish(state: DraftState, isPublishing: Boolean, onPublish: (Boolean) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
                "Ready to Publish",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
        )

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                        "Deck Summary",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary
                )
                Row { Text("Title: ", fontWeight = FontWeight.Bold); Text(state.title) }
                Row { Text("Topic: ", fontWeight = FontWeight.Bold); Text(state.topic) }
                Row { Text("Cards: ", fontWeight = FontWeight.Bold); Text("${state.concepts.size}") }
                
                val missingImages = state.concepts.count { it.imageUrl == null }
                if (missingImages > 0) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = "Warning",
                            tint = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(end = 4.dp).size(16.dp)
                        )
                        Text(
                                "$missingImages cards are missing images.",
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.error
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
                onClick = { onPublish(false) },
                enabled = !isPublishing,
                modifier = Modifier.fillMaxWidth().height(56.dp)
        ) { 
            if (isPublishing) {
                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary)
            } else {
                Text("Publish to My Decks (Private)") 
            }
        }

        val missingImages = state.concepts.count { it.imageUrl == null }
        OutlinedButton(
                onClick = { onPublish(true) },
                enabled = !isPublishing && missingImages == 0,
                modifier = Modifier.fillMaxWidth().height(56.dp)
        ) { Text("Submit for Public Moderation") }
    }
}
