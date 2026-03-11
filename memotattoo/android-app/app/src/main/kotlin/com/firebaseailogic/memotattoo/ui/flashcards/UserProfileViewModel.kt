package com.firebaseailogic.memotattoo.ui.flashcards

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.firebaseailogic.memotattoo.data.IUserRepository
import com.firebaseailogic.memotattoo.data.UserRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

data class UserProfile(
        val uid: String,
        val email: String,
        val energyBolts: Int,
        val isBanned: Boolean,
        val isPro: Boolean,
        val imagesGeneratedThisMonth: Int,
        val cancelAtPeriodEnd: Boolean = false,
        val currentPeriodEnd: Long? = null
)

class UserProfileViewModel(
    private val auth: FirebaseAuth = FirebaseManager.auth,
    private val repository: IUserRepository = UserRepository()
) : ViewModel() {
    private val _userProfile = MutableStateFlow<UserProfile?>(null)
    val userProfile: StateFlow<UserProfile?> = _userProfile.asStateFlow()

    init {
        viewModelScope.launch {
            auth.addAuthStateListener { firebaseAuth ->
                val user = firebaseAuth.currentUser
                if (user != null) {
                    startListening(user.uid)
                } else {
                    _userProfile.value = null
                }
            }
        }
    }

    private fun startListening(uid: String) {
        viewModelScope.launch {
            repository.getUserProfile(uid).collectLatest { profile ->
                if (profile == null) {
                    _userProfile.value = null
                    return@collectLatest
                }

                // Handle automatic demotion
                val now = System.currentTimeMillis()
                if (profile.isPro && profile.cancelAtPeriodEnd && profile.currentPeriodEnd != null && now > profile.currentPeriodEnd) {
                    repository.downgradeToFree(uid)
                    return@collectLatest
                }

                if (profile.isBanned) {
                    auth.signOut()
                    _userProfile.value = null
                } else {
                    _userProfile.value = profile
                }
            }
        }
    }
}
