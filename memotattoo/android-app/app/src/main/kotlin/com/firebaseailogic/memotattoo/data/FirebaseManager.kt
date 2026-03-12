package com.firebaseailogic.memotattoo.data

import android.content.Context
import com.google.firebase.Firebase
import com.google.firebase.appcheck.appCheck
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory
import com.google.firebase.auth.auth
import com.google.firebase.firestore.firestore
import com.google.firebase.storage.storage
import com.firebaseailogic.memotattoo.BuildConfig
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory

object FirebaseManager {
    val auth = Firebase.auth
    val firestore = Firebase.firestore
    val storage = Firebase.storage

    fun initializeAppCheck() {
        // Set the debug token for App Check
        if (BuildConfig.DEBUG && BuildConfig.APPCHECK_DEBUG_TOKEN.isNotEmpty()) {
            System.setProperty("com.google.firebase.appcheck.debug.token", BuildConfig.APPCHECK_DEBUG_TOKEN)
        }

        val providerFactory = if (BuildConfig.DEBUG) {
            DebugAppCheckProviderFactory.getInstance()
        } else {
            PlayIntegrityAppCheckProviderFactory.getInstance()
        }
        
        Firebase.appCheck.installAppCheckProviderFactory(providerFactory)
    }
}
