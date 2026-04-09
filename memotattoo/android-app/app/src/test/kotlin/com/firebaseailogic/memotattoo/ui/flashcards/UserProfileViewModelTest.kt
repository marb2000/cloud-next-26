package com.firebaseailogic.memotattoo.ui.flashcards

import com.firebaseailogic.memotattoo.data.IUserRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import io.mockk.coEvery
import io.mockk.mockk
import io.mockk.verify
import io.mockk.coVerify
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
class UserProfileViewModelTest {

    private lateinit var viewModel: UserProfileViewModel
    private val auth = mockk<FirebaseAuth>(relaxed = true)
    private val repository = mockk<IUserRepository>(relaxed = true)
    private val testDispatcher = UnconfinedTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        coEvery { repository.getUserProfile(any()) } returns flowOf(null)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `test user banned signs out`() {
        val mockProfile = UserProfile(
            uid = "123",
            email = "test@test.com",
            energyBolts = 10,
            isBanned = true,
            isPro = false,
            imagesGeneratedThisMonth = 0
        )
        coEvery { repository.getUserProfile("123") } returns flowOf(mockProfile)
        
        val mockUser = mockk<FirebaseUser>()
        io.mockk.every { mockUser.uid } returns "123"
        io.mockk.every { auth.currentUser } returns mockUser
        
        val listenerSlot = io.mockk.slot<FirebaseAuth.AuthStateListener>()
        io.mockk.every { auth.addAuthStateListener(capture(listenerSlot)) } answers {
            listenerSlot.captured.onAuthStateChanged(auth)
        }
        
        viewModel = UserProfileViewModel(auth, repository)
        
        verify { auth.signOut() }
        assert(viewModel.userProfile.value == null)
    }

    @Test
    fun `test subscription expired downgrades`() {
        val now = System.currentTimeMillis()
        val mockProfile = UserProfile(
            uid = "123",
            email = "test@test.com",
            energyBolts = 10,
            isBanned = false,
            isPro = true,
            cancelAtPeriodEnd = true,
            currentPeriodEnd = now - 1000, // In the past
            imagesGeneratedThisMonth = 0
        )
        coEvery { repository.getUserProfile("123") } returns flowOf(mockProfile)
        
        val mockUser = mockk<FirebaseUser>()
        io.mockk.every { mockUser.uid } returns "123"
        io.mockk.every { auth.currentUser } returns mockUser
        
        val listenerSlot = io.mockk.slot<FirebaseAuth.AuthStateListener>()
        io.mockk.every { auth.addAuthStateListener(capture(listenerSlot)) } answers {
            listenerSlot.captured.onAuthStateChanged(auth)
        }
        
        viewModel = UserProfileViewModel(auth, repository)
        
        coVerify { repository.downgradeToFree("123") }
    }
}
