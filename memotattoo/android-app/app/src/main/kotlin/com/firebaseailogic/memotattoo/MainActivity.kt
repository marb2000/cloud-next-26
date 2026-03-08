package com.firebaseailogic.memotattoo

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.firebaseailogic.memotattoo.billing.MockBillingScreen
import com.firebaseailogic.memotattoo.ui.flashcards.GameSessionScreen
import com.firebaseailogic.memotattoo.ui.theme.MemoTattooTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        com.firebaseailogic.memotattoo.data.FirebaseManager.initializeAppCheck()
        enableEdgeToEdge()
        setContent {
            MemoTattooTheme {
                val navController = rememberNavController()
                val userProfileViewModel:
                        com.firebaseailogic.memotattoo.ui.flashcards.UserProfileViewModel =
                        androidx.lifecycle.viewmodel.compose.viewModel()

                NavHost(navController = navController, startDestination = "login") {
                    composable("login") {
                        com.firebaseailogic.memotattoo.ui.onboarding.LoginScreen(
                                navController = navController
                        )
                    }
                    composable("daily_mission") {
                        com.firebaseailogic.memotattoo.ui.flashcards.FlashcardHubScreen(
                                navController = navController,
                                userProfileViewModel = userProfileViewModel
                        )
                    }
                    composable("challenge/{deckId}") { backStackEntry ->
                        val deckId =
                                backStackEntry.arguments?.getString("deckId") ?: return@composable
                        GameSessionScreen(navController = navController, deckId = deckId)
                    }
                    composable("create_deck") {
                        com.firebaseailogic.memotattoo.ui.flashcards.CreateDeckScreen(
                                navController = navController,
                                userProfileViewModel = userProfileViewModel
                        )
                    }
                    composable("billing") {
                        MockBillingScreen(
                                navController = navController,
                                userProfileViewModel = userProfileViewModel
                        )
                    }
                }
            }
        }
    }
}
