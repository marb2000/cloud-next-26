package com.firebaseailogic.memotattoo.ui.flashcards

import com.firebaseailogic.memotattoo.ai.IAILogic
import com.firebaseailogic.memotattoo.data.IFlashcardRepository
import com.firebaseailogic.memotattoo.data.IUserRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import android.util.Log
import com.google.firebase.firestore.FirebaseFirestore
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CreateDeckViewModelTest {

    private lateinit var viewModel: CreateDeckViewModel
    private val auth = mockk<FirebaseAuth>(relaxed = true)
    private val firestore = mockk<FirebaseFirestore>(relaxed = true)
    private val aiLogic = mockk<IAILogic>(relaxed = true)
    private val repository = mockk<IFlashcardRepository>(relaxed = true)
    private val userRepository = mockk<IUserRepository>(relaxed = true)
    private val testDispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        
        mockkStatic(Log::class)
        every { Log.d(any(), any()) } returns 0
        every { Log.e(any(), any(), any()) } returns 0
        
        val mockUser = mockk<FirebaseUser>()
        every { mockUser.uid } returns "123"
        every { auth.currentUser } returns mockUser
        
        viewModel = CreateDeckViewModel(
            auth = auth,
            firestore = firestore,
            aiLogic = aiLogic,
            repository = repository,
            userRepository = userRepository
        )
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `test updateTopic updates state`() {
        viewModel.updateTopic("New Topic")
        assert(viewModel.uiState.value.topic == "New Topic")
    }

    @Test
    fun `test brainstorm requires topic`() {
        viewModel.updateTopic("")
        viewModel.brainstorm()
        assert(viewModel.errorMessage.value == "Please enter a topic.")
    }

    @Test
    fun `test brainstorm consumes bolts and calls AI`() {
        viewModel.updateTopic("Valid Topic")
        coEvery { userRepository.consumeBolts(any(), any()) } returns true
        coEvery { aiLogic.generateTopic(any(), any()) } returns mapOf(
            "title" to "Generated Title",
            "items" to listOf(mapOf("term" to "T1", "definition" to "D1"))
        )

        viewModel.brainstorm()

        assert(viewModel.uiState.value.title == "Generated Title")
        assert(viewModel.uiState.value.concepts.size == 1)
        assert(viewModel.uiState.value.step == 2)
    }
}
