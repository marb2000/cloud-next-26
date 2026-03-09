package com.firebaseailogic.memotattoo.ui.flashcards

import android.util.Log
import androidx.lifecycle.ViewModel
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

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

class UserProfileViewModel : ViewModel() {
    private val _userProfile = MutableStateFlow<UserProfile?>(null)
    val userProfile: StateFlow<UserProfile?> = _userProfile.asStateFlow()

    private var firestoreListener: ListenerRegistration? = null

    init {
        FirebaseManager.auth.addAuthStateListener { firebaseAuth ->
            val user = firebaseAuth.currentUser
            if (user != null) {
                startListening(user.uid)
            } else {
                stopListening()
                _userProfile.value = null
            }
        }
    }

    private fun startListening(uid: String) {
        stopListening()
        firestoreListener =
                FirebaseManager.firestore.collection("Users").document(uid).addSnapshotListener {
                        snapshot,
                        e ->
                    if (e != null) {
                        Log.w("UserProfileVM", "Listen failed.", e)
                        return@addSnapshotListener
                    }

                    if (snapshot != null && snapshot.exists()) {
                        val profile =
                                UserProfile(
                                        uid = uid,
                                        email = snapshot.getString("email") ?: "",
                                        energyBolts = snapshot.getLong("energy_bolts")?.toInt()
                                                        ?: 0,
                                        isBanned = snapshot.getBoolean("isBanned") ?: false,
                                        isPro = snapshot.getBoolean("isPro") ?: false,
                                        imagesGeneratedThisMonth = snapshot.getLong("imagesGeneratedThisMonth")?.toInt() ?: 0,
                                        cancelAtPeriodEnd = snapshot.getBoolean("cancelAtPeriodEnd") ?: false,
                                        currentPeriodEnd = snapshot.getLong("currentPeriodEnd")
                                )

                        // Handle automatic demotion if subscription period ended after cancellation
                        val now = System.currentTimeMillis()
                        if (profile.isPro && profile.cancelAtPeriodEnd && profile.currentPeriodEnd != null && now > profile.currentPeriodEnd) {
                                // Downgrade to Free
                                FirebaseManager.firestore.collection("Users").document(uid).update(
                                        mapOf(
                                                "isPro" to false,
                                                "cancelAtPeriodEnd" to false,
                                                "currentPeriodEnd" to null
                                        )
                                )
                                // It will trigger snapshot listener again so we can skip this update
                                return@addSnapshotListener
                        }

                        if (profile.isBanned) {
                            FirebaseManager.auth.signOut()
                            _userProfile.value = null
                        } else {
                            _userProfile.value = profile
                        }
                    } else {
                        Log.d("UserProfileVM", "Current data: null")
                        _userProfile.value = null
                    }
                }
    }

    private fun stopListening() {
        firestoreListener?.remove()
        firestoreListener = null
    }

    override fun onCleared() {
        super.onCleared()
        stopListening()
    }
}
