package com.firebaseailogic.memotattoo.data

import com.google.firebase.Firebase
import com.google.firebase.appcheck.appCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import com.google.firebase.auth.auth
import com.google.firebase.firestore.firestore
import com.google.firebase.storage.storage

object FirebaseManager {
    val auth = Firebase.auth
    val firestore = Firebase.firestore
    val storage = Firebase.storage

    fun initializeAppCheck() {
        Firebase.appCheck.installAppCheckProviderFactory(
            PlayIntegrityAppCheckProviderFactory.getInstance()
        )
    }
}
