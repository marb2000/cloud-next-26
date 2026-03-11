package com.firebaseailogic.memotattoo.ui.flashcards

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.*
import androidx.navigation.NavController
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.flow.MutableStateFlow
import org.junit.Before
import org.junit.Rule
import org.junit.Test

class FlashcardHubScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private lateinit var userProfileViewModel: UserProfileViewModel
    private lateinit var flashcardHubViewModel: FlashcardHubViewModel
    private lateinit var navController: NavController

    @Before
    fun setup() {
        userProfileViewModel = mockk(relaxed = true)
        flashcardHubViewModel = mockk(relaxed = true)
        navController = mockk(relaxed = true)
    }

    @Test
    fun flashcardHubScreen_displaysPrivateDeckCorrectly() {
        val testDeck = FlashcardDeckSummary(
            id = "deck_private",
            title = "Secret Ninja Deck",
            description = "Shhh...",
            type = "FlashcardDeck",
            status = "published",
            isPublic = false,
            ownerId = "user123"
        )
        
        every { flashcardHubViewModel.myDecks } returns MutableStateFlow(listOf(testDeck))
        every { flashcardHubViewModel.publicDecks } returns MutableStateFlow(emptyList())
        every { flashcardHubViewModel.isLoading } returns MutableStateFlow(false)
        every { userProfileViewModel.userProfile } returns MutableStateFlow(null)

        composeTestRule.setContent {
            FlashcardHubScreen(
                navController = navController,
                userProfileViewModel = userProfileViewModel,
                flashcardHubViewModel = flashcardHubViewModel,
                currentUid = "user123"
            )
        }

        // Wait for loading to finish (the box with indicator disappears)
        composeTestRule.waitUntil(5000) {
            composeTestRule.onAllNodesWithText("Secret Ninja Deck").fetchSemanticsNodes().isNotEmpty()
        }

        // Verify the deck title and private badge are displayed
        composeTestRule.onRoot().printToLog("MY_UI_TREE_DUMP")
        composeTestRule.onNodeWithText("Secret Ninja Deck").assertExists().assertIsDisplayed()
        composeTestRule.onNodeWithTag("Badge_Private", useUnmergedTree = true).assertExists().assertIsDisplayed()
    }

    @Test
    fun flashcardHubScreen_clickingPlayButton_navigatesToChallenge() {
        val testDeck = FlashcardDeckSummary(
            id = "deck_1",
            title = "Active Deck",
            description = "Ready to play",
            type = "FlashcardDeck",
            status = "published",
            isPublic = true,
            ownerId = "someone"
        )
        
        every { flashcardHubViewModel.myDecks } returns MutableStateFlow(emptyList())
        every { flashcardHubViewModel.publicDecks } returns MutableStateFlow(listOf(testDeck))
        every { flashcardHubViewModel.isLoading } returns MutableStateFlow(false)
        every { userProfileViewModel.userProfile } returns MutableStateFlow(null)

        composeTestRule.setContent {
            FlashcardHubScreen(
                navController = navController,
                userProfileViewModel = userProfileViewModel,
                flashcardHubViewModel = flashcardHubViewModel,
                currentUid = "user123"
            )
        }

        // Click the public tab
        composeTestRule.onNodeWithText("Public Decks").performClick()
        
        // Wait for the Play button to appear (it might take a moment after tab switch)
        composeTestRule.waitUntil(5000) {
            composeTestRule.onAllNodesWithTag("PlayButton", useUnmergedTree = true).fetchSemanticsNodes().isNotEmpty()
        }
        
        // Find and click the play button
        composeTestRule.onNodeWithTag("PlayButton", useUnmergedTree = true).performClick()
        
        // Verify navigation
        verify { navController.navigate("challenge/deck_1") }
    }
}
