package com.firebaseailogic.memotattoo.ui.flashcards

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.Alignment
import androidx.compose.foundation.clickable
import androidx.compose.ui.layout.ContentScale
import androidx.navigation.NavController
import coil3.compose.AsyncImage
import com.firebaseailogic.memotattoo.ai.AILogic
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.firebaseailogic.memotattoo.ui.components.FullScreenImageViewer
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import androidx.compose.foundation.text.BasicTextField
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import android.net.Uri


@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateDeckScreen(
        navController: NavController,
        draftId: String? = null,
        userProfileViewModel: com.firebaseailogic.memotattoo.ui.flashcards.UserProfileViewModel =
                androidx.lifecycle.viewmodel.compose.viewModel(),
        viewModel: CreateDeckViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val draftState by viewModel.uiState.collectAsState()
    val isViewModelLoading by viewModel.isLoading.collectAsState()
    val viewModelErrorMessage by viewModel.errorMessage.collectAsState()
    var fullScreenImageUrl by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(draftId) {
        if (draftId != null) {
            viewModel.loadDraft(draftId)
        }
    }

    val userProfile by userProfileViewModel.userProfile.collectAsState()

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
                                    viewModel.saveDraft {
                                        isSavingDraft = false
                                        navController.popBackStack()
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

            if (viewModelErrorMessage != null) {
                Card(
                        colors =
                                CardDefaults.cardColors(
                                        containerColor = MaterialTheme.colorScheme.errorContainer
                                ),
                        modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                                text = viewModelErrorMessage!!,
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.weight(1f)
                        )
                        IconButton(onClick = { viewModel.setErrorMessage(null) }) {
                            Icon(Icons.Default.Add, contentDescription = "Clear", modifier = Modifier.size(16.dp)) // Using Add as a placeholder for clear/close if needed, or just remove
                        }
                    }
                }
            }

            // Step Content Area
            Box(modifier = Modifier.weight(1f)) {
                when (draftState.step) {
                    1 -> Step1Topic(
                        state = draftState,
                        onTopicChange = { viewModel.updateTopic(it) },
                        onCountChange = { viewModel.updateNumberOfItems(it) }
                    )
                    2 -> Step2Content(
                        state = draftState,
                        onTitleChange = { viewModel.updateTitle(it) },
                        onConceptChange = { idx, term, def -> viewModel.updateConcept(idx, term, def) },
                        onDeleteItem = { viewModel.deleteConcept(it) },
                        onBrainstormMore = { viewModel.brainstormMore() }
                    )
                    3 -> Step3ArtDirection(
                        state = draftState,
                        onArtDirectionChange = { viewModel.updateArtDirection(it) },
                        onArtImageChange = { viewModel.updateArtImage(it) },
                        onImageClick = { url -> fullScreenImageUrl = url }
                    )
                    4 -> Step4Images(
                        state = draftState,
                        onGenerateImage = { index -> 
                            viewModel.generateImage(
                                index = index,
                                isPro = userProfile?.isPro == true,
                                generatedThisMonth = userProfile?.imagesGeneratedThisMonth ?: 0
                            )
                        },
                        onImageClick = { url -> fullScreenImageUrl = url }
                    )
                    5 -> {
                        var isPublishing by remember { mutableStateOf(false) }
                        Step5Publish(
                                state = draftState,
                                isPublishing = isPublishing,
                                onPublish = { isPublic ->
                                    isPublishing = true
                                    viewModel.publish(isPublic) {
                                        isPublishing = false
                                        navController.popBackStack()
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
                            onClick = { viewModel.setStep(draftState.step - 1) },
                            modifier = Modifier.weight(1f).padding(end = 8.dp)
                    ) { Text("Back") }
                } else {
                    Spacer(modifier = Modifier.weight(1f).padding(end = 8.dp))
                }

                if (draftState.step < 5) {
                    Button(
                            onClick = {
                                if (draftState.step == 1) {
                                    viewModel.brainstorm()
                                } else {
                                    viewModel.setStep(draftState.step + 1)
                                }
                            },
                            modifier = Modifier.weight(1f).padding(start = 8.dp),
                            enabled = !isViewModelLoading
                    ) {
                        if (isViewModelLoading) {
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
fun Step1Topic(
    state: DraftState,
    onTopicChange: (String) -> Unit,
    onCountChange: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
                "What's the topic?",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
        )
        Text(
                "Tell us what you want to learn, and we'll brainstorm the key concepts for you.",
                style = MaterialTheme.typography.bodyMedium
        )

        OutlinedTextField(
                value = state.topic,
                onValueChange = onTopicChange,
                label = { Text("Topic (e.g. Spanish Basics, Anatomy)") },
                modifier = Modifier.fillMaxWidth()
        )

        Text("Number of items", style = MaterialTheme.typography.bodyMedium)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            val options = listOf("5", "10", "15", "20", "25", "50")
            options.forEach { count ->
                FilterChip(
                        selected = state.numberOfItems == count,
                        onClick = { onCountChange(count) },
                        label = { Text(count) },
                        modifier = Modifier.padding(horizontal = 2.dp)
                )
            }
        }
    }
}

@Composable
fun Step2Content(
    state: DraftState,
    onTitleChange: (String) -> Unit,
    onConceptChange: (Int, String, String) -> Unit,
    onDeleteItem: (Int) -> Unit,
    onBrainstormMore: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Refine Content",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
            Badge(containerColor = MaterialTheme.colorScheme.primaryContainer) {
                Text("Items: ${state.concepts.size}", color = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
            }
        }

        OutlinedTextField(
                value = state.title,
                onValueChange = onTitleChange,
                label = { Text("Deck Title") },
                modifier = Modifier.fillMaxWidth()
        )

        LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.weight(1f)
        ) {
            itemsIndexed(state.concepts) { index, concept ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Box(modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(8.dp).padding(end = 40.dp)) {
                            BasicTextField(
                                    value = concept.term,
                                    onValueChange = { onConceptChange(index, it, concept.definition) },
                                    textStyle =
                                            MaterialTheme.typography.bodyLarge.copy(
                                                    fontWeight = FontWeight.Bold,
                                                    color = MaterialTheme.colorScheme.onSurface
                                            ),
                                    modifier = Modifier.fillMaxWidth()
                            )
                            HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    color = MaterialTheme.colorScheme.outlineVariant
                            )
                            BasicTextField(
                                    value = concept.definition,
                                    onValueChange = { onConceptChange(index, concept.term, it) },
                                    textStyle =
                                            MaterialTheme.typography.bodyMedium.copy(
                                                    color =
                                                            MaterialTheme.colorScheme.onSurfaceVariant
                                            ),
                                    modifier = Modifier.fillMaxWidth()
                            )
                        }
                        
                        var showMenu by remember { mutableStateOf(false) }
                        Box(modifier = Modifier.align(Alignment.TopEnd)) {
                            IconButton(onClick = { showMenu = true }) {
                                Icon(
                                    imageVector = Icons.Default.MoreVert,
                                    contentDescription = "More options",
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            DropdownMenu(
                                expanded = showMenu,
                                onDismissRequest = { showMenu = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Delete Item", color = MaterialTheme.colorScheme.error) },
                                    onClick = {
                                        showMenu = false
                                        onDeleteItem(index)
                                    },
                                    leadingIcon = {
                                        Icon(
                                            Icons.Default.Delete,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.error
                                        )
                                    }
                                )
                            }
                        }
                    }
                }
            }
            item {
                TextButton(
                        onClick = onBrainstormMore,
                        modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("Brainstorm 5 more items")
                }
            }
        }
    }
}

@Composable
fun Step3ArtDirection(
    state: DraftState,
    onArtDirectionChange: (String) -> Unit,
    onArtImageChange: (String?) -> Unit,
    onImageClick: (String) -> Unit
) {
    val launcher =
            rememberLauncherForActivityResult(
                    contract = ActivityResultContracts.GetContent()
            ) { uri: Uri? ->
                onArtImageChange(uri?.toString())
            }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
                "Global Art Direction",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
        )
        Text(
                "Provide a prompt or reference image to globally style all flashcards in this deck.",
                style = MaterialTheme.typography.bodyMedium
        )

        OutlinedTextField(
                value = state.globalArtDirection,
                onValueChange = onArtDirectionChange,
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
    onGenerateImage: (Int) -> Unit,
    onImageClick: (String) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Text(
                "Flashcard Images",
                style = MaterialTheme.typography.titleMedium,
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

                            if (showRedoDialog) {
                                AlertDialog(
                                    onDismissRequest = { showRedoDialog = false },
                                    title = { Text("Redo Image") },
                                    text = { Text("Generating a new image will replace the current one and the old image will be lost. Do you want to continue?") },
                                    confirmButton = {
                                        TextButton(onClick = {
                                            showRedoDialog = false
                                            onGenerateImage(index)
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
                                            onGenerateImage(index)
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
                style = MaterialTheme.typography.titleMedium,
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
                Text("Publish as Private") 
            }
        }

        val missingImages = state.concepts.count { it.imageUrl == null }
        OutlinedButton(
                onClick = { onPublish(true) },
                enabled = !isPublishing && missingImages == 0,
                modifier = Modifier.fillMaxWidth().height(56.dp)
        ) { Text("Submit for Moderation") }
    }
}
