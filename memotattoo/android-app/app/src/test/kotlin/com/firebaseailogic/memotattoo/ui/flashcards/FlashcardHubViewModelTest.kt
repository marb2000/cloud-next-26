package com.firebaseailogic.memotattoo.ui.flashcards

import com.firebaseailogic.memotattoo.data.IFlashcardRepository
import com.firebaseailogic.memotattoo.ui.flashcards.FlashcardDeckSummary
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.firebaseailogic.memotattoo.data.Resource
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class FlashcardHubViewModelTest {
    private val auth: FirebaseAuth = mockk(relaxed = true)
    private val repository: IFlashcardRepository = mockk(relaxed = true)
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        val user: FirebaseUser = mockk()
        every { user.uid } returns "test_user"
        every { auth.currentUser } returns user
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    private fun createViewModel() = FlashcardHubViewModel(auth, repository)

    @Test
    fun `viewModel starts listening for decks on init`() = runTest {
        val myDecks = listOf(
            FlashcardDeckSummary(
                id = "id1", 
                title = "Title 1", 
                description = "Topic", 
                type = "FlashcardDeck", 
                isCompleted = false,
                status = "draft", 
                isPublic = false, 
                ownerId = "test_user", 
                bestScore = 0
            )
        )
        val publicDecks = listOf(
            FlashcardDeckSummary(
                id = "id2", 
                title = "Title 2", 
                description = "Topic", 
                type = "FlashcardDeck", 
                isCompleted = false,
                status = "published", 
                isPublic = true, 
                ownerId = "other_user", 
                bestScore = 0
            )
        )
        
        every { repository.getMyDecks("test_user") } returns flowOf(Resource.Success(myDecks))
        every { repository.getPublicDecks(null) } returns flowOf(Resource.Success(publicDecks))
        coEvery { repository.getBestScores("test_user") } returns mapOf("id1" to 10)

        val viewModel = createViewModel()
        advanceUntilIdle()
        
        assertEquals(1, viewModel.myDecks.value.size)
        assertEquals("Title 1", viewModel.myDecks.value[0].title)
        assertEquals(10, viewModel.myDecks.value[0].bestScore)
        assertEquals(1, viewModel.publicDecks.value.size)
    }

    @Test
    fun `publishDeck calls repository`() = runTest {
        val viewModel = createViewModel()
        val deck = FlashcardDeckSummary(
            id = "id1", 
            title = "Title 1", 
            description = "Topic", 
            type = "FlashcardDeck", 
            status = "draft", 
            isPublic = false, 
            ownerId = "test_user", 
            bestScore = 0
        )
        
        viewModel.publishDeck(deck)
        advanceUntilIdle()
        
        coVerify { repository.updateDeckStatus("id1", "published") }
    }

    @Test
    fun `unpublishDeck calls repository`() = runTest {
        val viewModel = createViewModel()
        val deck = FlashcardDeckSummary(
            id = "id1", 
            title = "Title 1", 
            description = "Topic", 
            type = "FlashcardDeck", 
            status = "published", 
            isPublic = true, 
            ownerId = "test_user", 
            bestScore = 0
        )
        
        viewModel.unpublishDeck(deck)
        advanceUntilIdle()
        
        coVerify { repository.updateDeckStatus("id1", "private") }
    }
}
