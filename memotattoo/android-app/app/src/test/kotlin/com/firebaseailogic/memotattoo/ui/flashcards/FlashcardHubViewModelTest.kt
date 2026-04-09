package com.firebaseailogic.memotattoo.ui.flashcards

import com.firebaseailogic.memotattoo.data.IFlashcardRepository
import com.firebaseailogic.memotattoo.data.Resource
import com.google.firebase.auth.FirebaseAuth
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class FlashcardHubViewModelTest {

    private lateinit var viewModel: FlashcardHubViewModel
    private val auth = mockk<FirebaseAuth>(relaxed = true)
    private val repository = mockk<IFlashcardRepository>(relaxed = true)
    private val testDispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        
        // Mock default flow behavior to avoid NPE or hangs during init
        coEvery { repository.getMyDecks(any()) } returns flowOf(Resource.Success(emptyList()))
        coEvery { repository.getPublicDecks(any(), any()) } returns flowOf(Resource.Success(emptyList()))
        coEvery { repository.getBestScores(any()) } returns emptyMap()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `test updateSearch updates state`() {
        viewModel = FlashcardHubViewModel(auth, repository)
        viewModel.updateSearch("Query")
        assert(viewModel.searchQuery.value == "Query")
    }

    @Test
    fun `test startListeningForDecks updates state on success`() {
        // Mocking FlashcardDeckSummary is not needed if it's a data class, just use real instance if possible.
        // Assuming FlashcardDeckSummary has a constructor taking id and title.
        // Let's use a mock if we are not sure about the constructor.
        val mockDeck = mockk<FlashcardDeckSummary>(relaxed = true)
        io.mockk.every { mockDeck.id } returns "1"
        io.mockk.every { mockDeck.isPublic } returns false
        io.mockk.every { mockDeck.copy(bestScore = any()) } returns mockDeck
        
        coEvery { repository.getMyDecks(any()) } returns flowOf(Resource.Success(listOf(mockDeck)))
        
        viewModel = FlashcardHubViewModel(auth, repository)
        
        val state = viewModel.myDecks.value
        assert(state.size == 1)
        assert(state[0].id == "1")
    }
}
