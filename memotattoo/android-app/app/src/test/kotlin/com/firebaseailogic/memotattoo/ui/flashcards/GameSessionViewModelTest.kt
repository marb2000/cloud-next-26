package com.firebaseailogic.memotattoo.ui.flashcards

import android.app.Application
import android.net.ConnectivityManager
import com.firebaseailogic.memotattoo.ai.IAILogic
import com.firebaseailogic.memotattoo.data.IFlashcardRepository
import com.firebaseailogic.memotattoo.data.IUserRepository
import com.google.firebase.ai.ondevice.FirebaseAIOnDevice
import com.google.firebase.ai.ondevice.OnDeviceModelStatus
import com.google.firebase.auth.FirebaseAuth
import io.mockk.mockkObject
import io.mockk.unmockkObject
import io.mockk.every
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class GameSessionViewModelTest {

    private lateinit var viewModel: GameSessionViewModel
    private val application = mockk<Application>(relaxed = true)
    private val flashcardRepository = mockk<IFlashcardRepository>(relaxed = true)
    private val userRepository = mockk<IUserRepository>(relaxed = true)
    private val auth = mockk<FirebaseAuth>(relaxed = true)
    private val aiLogic = mockk<IAILogic>(relaxed = true)
    private val testDispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        mockkObject(FirebaseAIOnDevice)
        coEvery { FirebaseAIOnDevice.checkStatus() } returns OnDeviceModelStatus.AVAILABLE
        
        val connectivityManager = mockk<ConnectivityManager>(relaxed = true)
        every { application.getSystemService(android.content.Context.CONNECTIVITY_SERVICE) } returns connectivityManager
        every { connectivityManager.activeNetwork } returns null
        
        viewModel = GameSessionViewModel(
            application = application,
            flashcardRepository = flashcardRepository,
            userRepository = userRepository,
            auth = auth,
            aiLogic = aiLogic
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkObject(FirebaseAIOnDevice)
    }

    @Test
    fun `test initial state`() {
        val state = viewModel.uiState.value
        assert(state.isLoading)
        assert(state.score == 0)
        assert(!state.isGameOver)
    }

    @Test
    fun `test initSession success`() {
        val sampleDeck = mapOf(
            "title" to "Test Deck",
            "items" to listOf(
                mapOf("term" to "Term 1", "definition" to "Def 1"),
                mapOf("term" to "Term 2", "definition" to "Def 2")
            )
        )
        coEvery { flashcardRepository.getDeck("deck123") } returns sampleDeck

        viewModel.initSession("deck123")

        val state = viewModel.uiState.value
        assert(!state.isLoading)
        assert(state.deckTitle == "Test Deck")
        assert(state.sessionTotalItems == 2)
    }

    @Test
    fun `test initSession failure`() {
        coEvery { flashcardRepository.getDeck("deck123") } throws RuntimeException("Network error")

        viewModel.initSession("deck123")

        val state = viewModel.uiState.value
        assert(!state.isLoading)
        assert(state.isGameOver)
    }
}
