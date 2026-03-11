package com.firebaseailogic.memotattoo.ui.flashcards

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
