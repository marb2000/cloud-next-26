package com.firebaseailogic.memotattoo.ui.flashcards

import android.util.Log
import com.firebaseailogic.memotattoo.data.IUserRepository
import io.mockk.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.*
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import com.firebaseailogic.memotattoo.ui.flashcards.UserProfile
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser

@OptIn(ExperimentalCoroutinesApi::class)
class UserProfileViewModelTest {

    private val auth: FirebaseAuth = mockk(relaxed = true)
    private val repository: IUserRepository = mockk(relaxed = true)
    private val testDispatcher = StandardTestDispatcher()

    private val userFlow = MutableStateFlow<UserProfile?>(null)

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        
        // Mock Log
        mockkStatic(Log::class)
        every { Log.d(any<String>(), any<String>()) } returns 0
        every { Log.w(any<String>(), any<String>()) } returns 0
        every { Log.w(any<String>(), any<String>(), any<Throwable>()) } returns 0

        every { repository.getUserProfile(any<String>()) } returns userFlow
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkAll()
    }

    private fun createViewModel() = UserProfileViewModel(auth, repository)

    @Test
    fun `initial state is null`() = runTest {
        val viewModel = createViewModel()
        assertNull(viewModel.userProfile.value)
    }

    @Test
    fun `when user is logged in, profile is fetched from repository`() = runTest {
        val authListenerSlot = slot<FirebaseAuth.AuthStateListener>()
        every { auth.addAuthStateListener(capture(authListenerSlot)) } returns Unit
        
        val currentUser: FirebaseUser = mockk()
        every { currentUser.uid } returns "test_uid"
        every { auth.currentUser } returns currentUser

        val viewModel = createViewModel()
        runCurrent()
        
        // Trigger auth listener
        authListenerSlot.captured.onAuthStateChanged(auth)
        
        val profile = UserProfile(
            uid = "test_uid",
            email = "test@example.com",
            energyBolts = 10,
            isBanned = false,
            isPro = true,
            imagesGeneratedThisMonth = 5
        )

        // Trigger repository flow
        userFlow.value = profile
        advanceUntilIdle()

        val state = viewModel.userProfile.value
        assertNotNull(state)
        assertEquals("test@example.com", state?.email)
        assertEquals(10, state?.energyBolts)
        assertEquals(true, state?.isPro)
    }

    @Test
    fun `when user is pro and period ended after cancellation, automatic demotion is triggered`() = runTest {
        val authListenerSlot = slot<FirebaseAuth.AuthStateListener>()
        every { auth.addAuthStateListener(capture(authListenerSlot)) } returns Unit
        
        val currentUser: FirebaseUser = mockk()
        every { currentUser.uid } returns "test_uid"
        every { auth.currentUser } returns currentUser

        val viewModel = createViewModel()
        runCurrent()
        authListenerSlot.captured.onAuthStateChanged(auth)
        
        val profile = UserProfile(
            uid = "test_uid",
            email = "test@example.com",
            energyBolts = 10,
            isBanned = false,
            isPro = true,
            imagesGeneratedThisMonth = 5,
            cancelAtPeriodEnd = true,
            currentPeriodEnd = System.currentTimeMillis() - 1000L // Ended 1 second ago
        )

        userFlow.value = profile
        advanceUntilIdle()

        // Verify that demotion was called on repository
        coVerify { repository.downgradeToFree("test_uid") }
    }
}
