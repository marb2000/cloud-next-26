package com.firebaseailogic.memotattoo.ui.flashcards

import android.util.Base64
import android.util.Log
import com.firebaseailogic.memotattoo.ai.IAILogic
import com.firebaseailogic.memotattoo.data.IFlashcardRepository
import com.firebaseailogic.memotattoo.data.IUserRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageReference
import com.google.firebase.storage.UploadTask
import com.google.android.gms.tasks.Tasks
import android.net.Uri
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import java.util.UUID
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class CreateDeckViewModelTest {
    
    private val auth: FirebaseAuth = mockk(relaxed = true)
    private val firestore: FirebaseFirestore = mockk(relaxed = true)
    private val storage: FirebaseStorage = mockk(relaxed = true)
    private val aiLogic: IAILogic = mockk(relaxed = true)
    private val repository: IFlashcardRepository = mockk(relaxed = true)
    private val userRepository: IUserRepository = mockk(relaxed = true)
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        
        // Mock Log
        mockkStatic(Log::class)
        every { Log.d(any<String>(), any<String>()) } returns 0
        every { Log.i(any<String>(), any<String>()) } returns 0
        every { Log.w(any<String>(), any<String>()) } returns 0
        every { Log.e(any<String>(), any<String>(), any()) } returns 0

        // Mock Base64
        mockkStatic(Base64::class)
        every { Base64.decode(any<String>(), any<Int>()) } answers {
            java.util.Base64.getDecoder().decode(invocation.args[0] as String)
        }

        // Mock UUID
        mockkStatic(UUID::class)
        every { UUID.randomUUID() } returns UUID.nameUUIDFromBytes("test".toByteArray())

        // Mock StorageReference
        val rootRef = mockk<StorageReference>(relaxed = true)
        val mockUri = mockk<Uri>()
        every { mockUri.toString() } returns "http://download.url"
        every { storage.reference } returns rootRef
        every { rootRef.child(any()) } returns rootRef
        
        // Mock UploadTask
        val uploadTask: UploadTask = mockk()
        every { uploadTask.addOnCompleteListener(any()) } answers {
            val listener = invocation.args[0] as com.google.android.gms.tasks.OnCompleteListener<UploadTask.TaskSnapshot>
            listener.onComplete(uploadTask)
            uploadTask
        }
        every { rootRef.putBytes(any()) } returns uploadTask
        every { rootRef.downloadUrl } returns Tasks.forResult(mockUri)

        // Mock repository.uploadImage
        coEvery { repository.uploadImage(any()) } returns "http://download.url"
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    private fun createViewModel() = CreateDeckViewModel(auth, firestore, aiLogic, repository, userRepository)

    @Test
    fun `generateImage updates state and calls repository`() = runTest {
        val viewModel = createViewModel()
        viewModel.addConcept("T1", "D1")
        
        val user: FirebaseUser = mockk()
        every { user.uid } returns "test_user"
        every { auth.currentUser } returns user
        
        coEvery { userRepository.consumeBolts("test_user", 1) } returns true
        coEvery { aiLogic.generateConceptImage(any(), any(), any(), any()) } returns "data:image/jpeg;base64,VEVTVA=="

        viewModel.generateImage(index = 0, isPro = true, generatedThisMonth = 0)
        
        runCurrent()
        advanceUntilIdle()
        
        assertEquals("http://download.url", viewModel.uiState.value.concepts[0].imageUrl)
        assertFalse(viewModel.uiState.value.concepts[0].isGeneratingImage)
        coVerify { userRepository.incrementImageCount("test_user") }
    }

    @Test
    fun `brainstorm success updates state correctly`() = runTest {
        val viewModel = createViewModel()
        val user: FirebaseUser = mockk()
        every { user.uid } returns "test_user"
        every { auth.currentUser } returns user
        
        coEvery { userRepository.consumeBolts("test_user", 1) } returns true

        val mockResult = mapOf(
            "title" to "Mock Topic",
            "items" to listOf(
                mapOf("term" to "Term 1", "definition" to "Def 1")
            )
        )
        coEvery { aiLogic.generateTopic(any(), any()) } returns mockResult

        viewModel.updateTopic("input")
        viewModel.updateNumberOfItems("50")
        
        viewModel.brainstorm()
        advanceUntilIdle()

        coVerify { aiLogic.generateTopic("input", 50) }
        assertEquals("Mock Topic", viewModel.uiState.value.title)
        assertEquals(1, viewModel.uiState.value.concepts.size)
    }

    @Test
    fun `publishDeck calls repository with correct data`() = runTest {
        val viewModel = createViewModel()
        val user: FirebaseUser = mockk()
        every { user.uid } returns "test_user"
        every { user.email } returns "test@example.com"
        every { auth.currentUser } returns user

        viewModel.updateTitle("Test Deck")
        viewModel.addConcept("T1", "D1")
        
        viewModel.publish(isPublic = true) {}
        advanceUntilIdle()

        coVerify { repository.saveDeck(null, any()) }
    }
}
