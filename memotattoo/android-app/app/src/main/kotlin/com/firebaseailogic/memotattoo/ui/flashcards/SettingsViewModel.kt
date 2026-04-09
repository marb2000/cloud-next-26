package com.firebaseailogic.memotattoo.ui.flashcards
 
import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.ai.ondevice.FirebaseAIOnDevice
import com.google.firebase.ai.ondevice.OnDeviceModelStatus
import com.google.firebase.ai.ondevice.DownloadStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
 
sealed class AIModelUiStatus {
    object Unavailable : AIModelUiStatus()
    object Downloadable : AIModelUiStatus()
    data class Downloading(val progress: Float) : AIModelUiStatus()
    object Available : AIModelUiStatus()
}
 
class SettingsViewModel(application: Application) : AndroidViewModel(application) {
 
    private val _uiState = MutableStateFlow<AIModelUiStatus>(AIModelUiStatus.Unavailable)
    val uiState = _uiState.asStateFlow()
    private var totalBytesToDownload: Long = 0L
 
    init {
        checkStatus()
    }
 
    fun checkStatus() {
        viewModelScope.launch {
            val status = FirebaseAIOnDevice.checkStatus()
            when (status) {
                OnDeviceModelStatus.UNAVAILABLE -> _uiState.value = AIModelUiStatus.Unavailable
                OnDeviceModelStatus.DOWNLOADABLE -> _uiState.value = AIModelUiStatus.Downloadable
                OnDeviceModelStatus.AVAILABLE -> _uiState.value = AIModelUiStatus.Available
                OnDeviceModelStatus.DOWNLOADING -> {
                    _uiState.value = AIModelUiStatus.Downloading(0f)
                    observeDownload()
                }
            }
        }
    }
 
    fun startDownload() {
        viewModelScope.launch {
            observeDownload()
        }
    }
 
    private suspend fun observeDownload() {
        FirebaseAIOnDevice.download().collect { status ->
            when (status) {
                is DownloadStatus.DownloadStarted -> {
                    totalBytesToDownload = status.bytesToDownload
                    _uiState.update { AIModelUiStatus.Downloading(0f) }
                }
                is DownloadStatus.DownloadInProgress -> {
                    val progress = if (totalBytesToDownload > 0) {
                        status.totalBytesDownloaded.toFloat() / totalBytesToDownload.toFloat()
                    } else {
                        0f
                    }
                    _uiState.update { AIModelUiStatus.Downloading(progress) }
                }
                is DownloadStatus.DownloadCompleted -> {
                    _uiState.update { AIModelUiStatus.Available }
                }
                is DownloadStatus.DownloadFailed -> {
                    _uiState.update { AIModelUiStatus.Downloadable } // Fallback to downloadable on failure
                }
            }
        }
    }
}
