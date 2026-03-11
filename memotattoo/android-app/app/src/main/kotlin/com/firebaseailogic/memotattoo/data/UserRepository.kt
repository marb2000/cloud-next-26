package com.firebaseailogic.memotattoo.data

import com.firebaseailogic.memotattoo.ui.flashcards.UserProfile
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

interface IUserRepository {
    fun getUserProfile(uid: String): Flow<UserProfile?>
    suspend fun consumeBolts(uid: String, amount: Int): Boolean
    suspend fun incrementBolts(uid: String, amount: Int)
    suspend fun incrementImageCount(uid: String)
    suspend fun downgradeToFree(uid: String)
}

class UserRepository(
    private val firestore: FirebaseFirestore = FirebaseManager.firestore
) : IUserRepository {

    override fun getUserProfile(uid: String): Flow<UserProfile?> = callbackFlow {
        val listener = firestore.collection("Users").document(uid)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    close(error)
                    return@addSnapshotListener
                }
                if (snapshot != null && snapshot.exists()) {
                    val profile = UserProfile(
                        uid = uid,
                        email = snapshot.getString("email") ?: "",
                        energyBolts = snapshot.getLong("energy_bolts")?.toInt() ?: 0,
                        isBanned = snapshot.getBoolean("isBanned") ?: false,
                        isPro = snapshot.getBoolean("isPro") ?: false,
                        imagesGeneratedThisMonth = snapshot.getLong("imagesGeneratedThisMonth")?.toInt() ?: 0,
                        cancelAtPeriodEnd = snapshot.getBoolean("cancelAtPeriodEnd") ?: false,
                        currentPeriodEnd = snapshot.getLong("currentPeriodEnd")
                    )
                    trySend(profile)
                } else {
                    trySend(null)
                }
            }
        awaitClose { listener.remove() }
    }

    override suspend fun consumeBolts(uid: String, amount: Int): Boolean {
        try {
            val userRef = firestore.collection("Users").document(uid)
            val snapshot = userRef.get().await()
            val currentBolts = snapshot.getLong("energy_bolts") ?: 0
            if (currentBolts < amount) return false
            
            userRef.update("energy_bolts", currentBolts - amount).await()
            return true
        } catch (e: Exception) {
            return false
        }
    }

    override suspend fun incrementBolts(uid: String, amount: Int) {
        firestore.collection("Users").document(uid)
            .update("energy_bolts", com.google.firebase.firestore.FieldValue.increment(amount.toLong()))
            .await()
    }

    override suspend fun incrementImageCount(uid: String) {
        firestore.collection("Users").document(uid)
            .update("imagesGeneratedThisMonth", com.google.firebase.firestore.FieldValue.increment(1))
            .await()
    }

    override suspend fun downgradeToFree(uid: String) {
        firestore.collection("Users").document(uid).update(
            mapOf(
                "isPro" to false,
                "cancelAtPeriodEnd" to false,
                "currentPeriodEnd" to null
            )
        ).await()
    }
}
