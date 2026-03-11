package com.firebaseailogic.memotattoo.ui.flashcards

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.*
import com.google.android.gms.tasks.Tasks
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class FlashcardHubViewModelTest {
    private val auth: FirebaseAuth = mockk(relaxed = true)
    private val firestore: FirebaseFirestore = mockk(relaxed = true)
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

    private fun createViewModel() = FlashcardHubViewModel(auth, firestore)

    @Test
    fun `viewModel starts listening for decks on init`() = runTest {
        val collection: CollectionReference = mockk(relaxed = true)
        every { firestore.collection("FlashcardDecks") } returns collection
        
        createViewModel()
        
        verify { collection.addSnapshotListener(any()) }
    }

    @Test
    fun `snapshot listener updates myDecks and publicDecks`() = runTest {
        val collection: CollectionReference = mockk(relaxed = true)
        val registration: ListenerRegistration = mockk(relaxed = true)
        val capturedListener = slot<EventListener<QuerySnapshot>>()
        
        every { firestore.collection("FlashcardDecks") } returns collection
        every { collection.addSnapshotListener(capture(capturedListener)) } returns registration
        
        // Mock User_Scores fetch (which happens inside the listener)
        val userDoc: DocumentReference = mockk(relaxed = true)
        val userScoresCol: CollectionReference = mockk(relaxed = true)
        val scoresSnap: QuerySnapshot = mockk(relaxed = true)
        every { firestore.collection("Users").document("test_user") } returns userDoc
        every { userDoc.collection("User_Scores") } returns userScoresCol
        every { userScoresCol.get() } returns Tasks.forResult(scoresSnap)
        every { scoresSnap.documents } returns emptyList()

        val viewModel = createViewModel()
        
        // Prepare mock snapshot
        val snapshot: QuerySnapshot = mockk(relaxed = true)
        val doc1: QueryDocumentSnapshot = mockk(relaxed = true)
        every { doc1.id } returns "id1"
        every { doc1.get("contentBase") } returns mapOf("title" to "Title 1")
        every { doc1.getString("owner_id") } returns "test_user"
        every { doc1.getBoolean("isPublic") } returns false
        
        val doc2: QueryDocumentSnapshot = mockk(relaxed = true)
        every { doc2.id } returns "id2"
        every { doc2.get("contentBase") } returns mapOf("title" to "Title 2")
        every { doc2.getString("owner_id") } returns "other_user"
        every { doc2.getBoolean("isPublic") } returns true

        every { snapshot.documents } returns listOf(doc1, doc2)
        
        // Trigger listener
        capturedListener.captured.onEvent(snapshot, null)
        
        advanceUntilIdle()
        
        assertEquals(1, viewModel.myDecks.value.size)
        assertEquals("Title 1", viewModel.myDecks.value[0].title)
        assertEquals(1, viewModel.publicDecks.value.size)
        assertEquals("Title 2", viewModel.publicDecks.value[0].title)
    }
}
