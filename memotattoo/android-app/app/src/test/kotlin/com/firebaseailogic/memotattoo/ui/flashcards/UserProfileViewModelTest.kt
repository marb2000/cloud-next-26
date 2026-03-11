package com.firebaseailogic.memotattoo.ui.flashcards

import android.util.Log
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.CollectionReference
import com.google.firebase.firestore.DocumentReference
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.EventListener
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.setMain
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class UserProfileViewModelTest {

    private val auth: FirebaseAuth = mockk(relaxed = true)
    private val firestore: FirebaseFirestore = mockk(relaxed = true)
    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        
        // Mock Log
        mockkStatic(Log::class)
        every { Log.d(any<String>(), any<String>()) } returns 0
        every { Log.w(any<String>(), any<String>()) } returns 0
        every { Log.w(any<String>(), any<String>(), any<Throwable>()) } returns 0
    }

    private fun createViewModel() = UserProfileViewModel(auth, firestore)

    @Test
    fun `initial state is null`() {
        val viewModel = createViewModel()
        assertNull(viewModel.userProfile.value)
    }

    @Test
    fun `when user is logged in, profile is fetched from firestore`() {
        val authListenerSlot = slot<FirebaseAuth.AuthStateListener>()
        every { auth.addAuthStateListener(capture(authListenerSlot)) } returns Unit
        
        val currentUser: FirebaseUser = mockk()
        every { currentUser.uid } returns "test_uid"
        every { auth.currentUser } returns currentUser

        val docRef: DocumentReference = mockk()
        val collectionRef: CollectionReference = mockk()
        every { firestore.collection("Users") } returns collectionRef
        every { collectionRef.document("test_uid") } returns docRef
        
        val snapshotListenerSlot = slot<EventListener<DocumentSnapshot>>()
        every { docRef.addSnapshotListener(capture(snapshotListenerSlot)) } returns mockk<ListenerRegistration>(relaxed = true)

        val viewModel = createViewModel()
        
        // Trigger auth listener
        authListenerSlot.captured.onAuthStateChanged(auth)
        
        val snapshot: DocumentSnapshot = mockk()
        every { snapshot.exists() } returns true
        every { snapshot.getString("email") } returns "test@example.com"
        every { snapshot.getLong("energy_bolts") } returns 10L
        every { snapshot.getBoolean("isBanned") } returns false
        every { snapshot.getBoolean("isPro") } returns true
        every { snapshot.getLong("imagesGeneratedThisMonth") } returns 5L
        every { snapshot.getBoolean("cancelAtPeriodEnd") } returns false
        every { snapshot.getLong("currentPeriodEnd") } returns null

        // Trigger snapshot listener
        snapshotListenerSlot.captured.onEvent(snapshot, null)

        val profile = viewModel.userProfile.value
        assertNotNull(profile)
        assertEquals("test@example.com", profile?.email)
        assertEquals(10, profile?.energyBolts)
        assertEquals(true, profile?.isPro)
    }

    @Test
    fun `when user is pro and period ended after cancellation, automatic demotion is triggered`() {
        val authListenerSlot = slot<FirebaseAuth.AuthStateListener>()
        every { auth.addAuthStateListener(capture(authListenerSlot)) } returns Unit
        
        val currentUser: FirebaseUser = mockk()
        every { currentUser.uid } returns "test_uid"
        every { auth.currentUser } returns currentUser

        val docRef: DocumentReference = mockk()
        val collectionRef: CollectionReference = mockk()
        every { firestore.collection("Users") } returns collectionRef
        every { collectionRef.document("test_uid") } returns docRef
        
        val snapshotListenerSlot = slot<EventListener<DocumentSnapshot>>()
        every { docRef.addSnapshotListener(capture(snapshotListenerSlot)) } returns mockk<ListenerRegistration>(relaxed = true)

        val viewModel = createViewModel()
        authListenerSlot.captured.onAuthStateChanged(auth)
        
        val snapshot: DocumentSnapshot = mockk()
        every { snapshot.exists() } returns true
        every { snapshot.getString("email") } returns "test@example.com"
        every { snapshot.getLong("energy_bolts") } returns 10L
        every { snapshot.getBoolean("isBanned") } returns false
        every { snapshot.getBoolean("isPro") } returns true
        every { snapshot.getLong("imagesGeneratedThisMonth") } returns 5L
        every { snapshot.getBoolean("cancelAtPeriodEnd") } returns true
        every { snapshot.getLong("currentPeriodEnd") } returns System.currentTimeMillis() - 1000L // Ended 1 second ago

        // Mock the update call
        every { docRef.update(any<Map<String, Any?>>()) } returns mockk(relaxed = true)

        snapshotListenerSlot.captured.onEvent(snapshot, null)

        // Verify that demotion update was called
        verify {
            docRef.update(mapOf(
                "isPro" to false,
                "cancelAtPeriodEnd" to false,
                "currentPeriodEnd" to null
            ))
        }
    }
}
