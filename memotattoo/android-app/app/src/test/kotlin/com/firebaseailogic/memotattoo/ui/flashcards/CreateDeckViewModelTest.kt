package com.firebaseailogic.memotattoo.ui.flashcards

import android.util.Base64
import android.util.Log
import com.firebaseailogic.memotattoo.ai.IAILogic
import com.firebaseailogic.memotattoo.ui.flashcards.CreateDeckViewModel
import com.firebaseailogic.memotattoo.ui.flashcards.ConceptDraft
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.FieldValue
import com.google.firebase.storage.FirebaseStorage
import com.google.firebase.storage.StorageReference
import com.google.firebase.storage.UploadTask
import com.google.android.gms.tasks.Task
import com.google.android.gms.tasks.Tasks
import android.net.Uri
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import kotlinx.coroutines.tasks.await
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
    private var errorMessageSeen: String? = null
    
    private val auth: FirebaseAuth = mockk(relaxed = true)
    private val firestore: FirebaseFirestore = mockk(relaxed = true)
    private val storage: FirebaseStorage = mockk(relaxed = true)
    private val aiLogic: IAILogic = mockk(relaxed = true)
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        
        // Mock Log
        mockkStatic(Log::class)
        every { Log.d(any<String>(), any<String>()) } returns 0
        every { Log.i(any<String>(), any<String>()) } returns 0
        every { Log.w(any<String>(), any<String>()) } returns 0
        every { Log.e(any<String>(), any<String>()) } returns 0
        every { Log.e(any<String>(), any<String>(), any<Throwable>()) } answers {
            val msg = invocation.args[1] as String
            val e = invocation.args[2] as? Throwable
            println("ERROR [CreateDeckViewModel]: $msg - $e")
            errorMessageSeen = msg
            0
        }

        // Mock Base64
        mockkStatic(Base64::class)
        every { Base64.decode(any<String>(), any<Int>()) } answers {
            java.util.Base64.getDecoder().decode(invocation.args[0] as String)
        }

        // Mock UUID
        mockkStatic(UUID::class)
        every { UUID.randomUUID() } returns UUID.nameUUIDFromBytes("test".toByteArray())

        // Mock Uri
        mockkStatic(Uri::class)
        val mockUri = mockk<Uri>()
        every { mockUri.toString() } returns "http://download.url"
        every { Uri.parse(any()) } returns mockUri

        // Mock StorageReference
        val rootRef = mockk<StorageReference>(relaxed = true)
        every { storage.reference } returns rootRef
        every { rootRef.child(any()) } returns rootRef
        
        // Mock UploadTask
        val uploadTask: UploadTask = mockk()
        every { uploadTask.isSuccessful } returns true
        every { uploadTask.isComplete } returns true
        every { uploadTask.isCanceled } returns false
        every { uploadTask.exception } returns null
        every { uploadTask.getResult() } returns mockk<UploadTask.TaskSnapshot>()
        every { uploadTask.snapshot } returns mockk<UploadTask.TaskSnapshot>()
        every { uploadTask.addOnCompleteListener(any()) } answers {
            val listener = invocation.args[0] as com.google.android.gms.tasks.OnCompleteListener<UploadTask.TaskSnapshot>
            listener.onComplete(uploadTask)
            uploadTask
        }
        every { rootRef.putBytes(any()) } returns uploadTask

        // Mock downloadUrl Task
        val urlTask = Tasks.forResult(mockUri)
        every { rootRef.downloadUrl } returns urlTask

        // Mock FieldValue
        mockkStatic(FieldValue::class)
        every { FieldValue.increment(any<Long>()) } returns mockk<FieldValue>()
        every { FieldValue.serverTimestamp() } returns mockk<FieldValue>()

        // Mock Firestore updates
        every { firestore.collection(any<String>()).document(any<String>()).update(any<Map<String, Any>>()) } returns Tasks.forResult(null)
        every { firestore.collection(any<String>()).document(any<String>()).update(any<String>(), any()) } returns Tasks.forResult(null)
        every { firestore.collection(any<String>()).document(any<String>()).update(any<String>(), any(), any(), any()) } returns Tasks.forResult(null)
        every { firestore.collection(any<String>()).document(any<String>()).update(any<String>(), any(), *anyVararg<Any>()) } returns Tasks.forResult(null)
        
        // Mock Firestore DocumentReference set and get
        every { firestore.collection(any<String>()).document(any<String>()).set(any()) } returns Tasks.forResult(null)
        every { firestore.collection(any<String>()).document().set(any()) } returns Tasks.forResult(null)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    private fun createViewModel() = CreateDeckViewModel(auth, firestore, storage, aiLogic)

    @Test
    fun `generateImage updates only the targeted concept and handles transitions`() = runTest {
        val viewModel = createViewModel()
        
        // Setup initial concepts
        viewModel.addConcept("T1", "D1")
        viewModel.addConcept("T2", "D2")
        
        val user: FirebaseUser = mockk()
        every { user.uid } returns "test_user"
        every { auth.currentUser } returns user
        
        coEvery { aiLogic.generateConceptImage(any(), any(), any(), any()) } coAnswers {
            kotlinx.coroutines.delay(50) // Ensure it stays in loading state for runCurrent()
            "data:image/jpeg;base64,VEVTVA=="
        }

        // Trigger generation for first concept
        viewModel.generateImage(index = 0, isPro = true, energyBolts = 10, generatedThisMonth = 0)
        
        // Should be in generating state for index 0 immediately
        assertTrue("Concept 0 should be generating image", viewModel.uiState.value.concepts[0].isGeneratingImage)
        assertFalse("Concept 1 should NOT be generating image", viewModel.uiState.value.concepts[1].isGeneratingImage)

        runCurrent()
        advanceUntilIdle()
        
        assertEquals("URL should be updated", "http://download.url", viewModel.uiState.value.concepts[0].imageUrl)
        assertFalse("Concept 0 should NOT be generating image anymore", viewModel.uiState.value.concepts[0].isGeneratingImage)
    }

    @Test
    fun `simultaneous generateImage calls are handled atomically`() = runTest {
        val viewModel = createViewModel()
        viewModel.addConcept("T1", "D1")
        viewModel.addConcept("T2", "D2")

        val user: FirebaseUser = mockk()
        every { user.uid } returns "test_user"
        every { auth.currentUser } returns user
        
        // Mock delayed responses - T2 will finish before T1
        coEvery { aiLogic.generateConceptImage(any(), "T1", any(), any()) } coAnswers {
            kotlinx.coroutines.delay(100)
            "data:image/jpeg;base64,VEVTVDE="
        }
        coEvery { aiLogic.generateConceptImage(any(), "T2", any(), any()) } coAnswers {
            kotlinx.coroutines.delay(50)
            "data:image/jpeg;base64,VEVTVDI="
        }

        // Launch both
        viewModel.generateImage(0, isPro = true, energyBolts = 10, generatedThisMonth = 0)
        viewModel.generateImage(1, isPro = true, energyBolts = 10, generatedThisMonth = 0)

        runCurrent()
        assertTrue(viewModel.uiState.value.concepts[0].isGeneratingImage)
        assertTrue(viewModel.uiState.value.concepts[1].isGeneratingImage)

        advanceTimeBy(60) // T2 should be done
        assertFalse(viewModel.uiState.value.concepts[1].isGeneratingImage)
        assertTrue(viewModel.uiState.value.concepts[0].isGeneratingImage)

        advanceUntilIdle()
        assertFalse(viewModel.uiState.value.concepts[0].isGeneratingImage)
        
        assertEquals("http://download.url", viewModel.uiState.value.concepts[0].imageUrl)
        assertEquals("http://download.url", viewModel.uiState.value.concepts[1].imageUrl)
    }

    @Test
    fun `generateImage handles errors gracefully and resets loading state`() = runTest {
        val viewModel = createViewModel()
        viewModel.addConcept("T1", "D1")

        val user: FirebaseUser = mockk()
        every { user.uid } returns "test_user"
        every { auth.currentUser } returns user

        coEvery { aiLogic.generateConceptImage(any(), any(), any(), any()) } throws Exception("API Error")

        viewModel.generateImage(0, isPro = true, energyBolts = 10, generatedThisMonth = 0)
        
        runCurrent()
        advanceUntilIdle()

        assertFalse("Concept 0 should NOT be generating image anymore", viewModel.uiState.value.concepts[0].isGeneratingImage)
        assertNull("URL should be null on failure", viewModel.uiState.value.concepts[0].imageUrl)
    }

    @Test
    fun `generateTopic success updates state correctly`() = runTest {
        val viewModel = createViewModel()
        val user: FirebaseUser = mockk()
        every { user.uid } returns "test_user"
        every { auth.currentUser } returns user
        
        val doc: DocumentSnapshot = mockk()
        every { doc.exists() } returns true
        every { doc.getLong("energy_bolts") } returns 10L
        every { firestore.collection("Users").document("test_user").get() } returns Tasks.forResult(doc)
        every { firestore.collection("Users").document("test_user").update("energy_bolts", any()) } returns Tasks.forResult(null)

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
        assertEquals("Term 1", viewModel.uiState.value.concepts[0].term)
        assertFalse(viewModel.isLoading.value)
    }

    @Test
    fun `brainstormMore success adds concepts`() = runTest {
        val viewModel = createViewModel()
        viewModel.updateTopic("Existing Topic")
        
        val newConcepts = listOf(ConceptDraft("New Term", "New Def"))
        coEvery { aiLogic.brainstormMore("Existing Topic", any(), 5) } returns newConcepts

        viewModel.brainstormMore()
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.concepts.any { it.term == "New Term" })
    }
}
