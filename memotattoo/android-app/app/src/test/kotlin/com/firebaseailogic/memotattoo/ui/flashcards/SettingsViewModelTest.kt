package com.firebaseailogic.memotattoo.ui.flashcards
 
import android.app.Application
import com.google.firebase.ai.ondevice.FirebaseAIOnDevice
import com.google.firebase.ai.ondevice.OnDeviceModelStatus
import com.google.firebase.ai.ondevice.DownloadStatus
import io.mockk.mockkObject
import io.mockk.unmockkObject
import io.mockk.every
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
class SettingsViewModelTest {
 
    private lateinit var viewModel: SettingsViewModel
    private val application = mockk<Application>(relaxed = true)
    private val testDispatcher = UnconfinedTestDispatcher()
 
    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        mockkObject(FirebaseAIOnDevice)
    }
 
    @After
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkObject(FirebaseAIOnDevice)
    }
 
    @Test
    fun `test initial state unavailable`() {
        coEvery { FirebaseAIOnDevice.checkStatus() } returns OnDeviceModelStatus.UNAVAILABLE
 
        viewModel = SettingsViewModel(application)
 
        assert(viewModel.uiState.value is AIModelUiStatus.Unavailable)
    }
 
    @Test
    fun `test initial state available`() {
        coEvery { FirebaseAIOnDevice.checkStatus() } returns OnDeviceModelStatus.AVAILABLE
 
        viewModel = SettingsViewModel(application)
 
        assert(viewModel.uiState.value is AIModelUiStatus.Available)
    }
 
    @Test
    fun `test download progress`() {
        coEvery { FirebaseAIOnDevice.checkStatus() } returns OnDeviceModelStatus.DOWNLOADABLE
        
        val started = mockk<DownloadStatus.DownloadStarted>()
        every { started.bytesToDownload } returns 1000L
        
        val progress = mockk<DownloadStatus.DownloadInProgress>()
        every { progress.totalBytesDownloaded } returns 500L
        
        val completed = mockk<DownloadStatus.DownloadCompleted>()
        
        val progressFlow = flowOf(started, progress, completed)
        every { FirebaseAIOnDevice.download() } returns progressFlow
 
        viewModel = SettingsViewModel(application)
        
        assert(viewModel.uiState.value is AIModelUiStatus.Downloadable)
 
        viewModel.startDownload()
 
        assert(viewModel.uiState.value is AIModelUiStatus.Available)
    }
}
