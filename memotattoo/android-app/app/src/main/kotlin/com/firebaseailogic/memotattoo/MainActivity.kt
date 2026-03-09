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

                val startDest = if (com.firebaseailogic.memotattoo.data.FirebaseManager.auth.currentUser != null) "daily_mission" else "login"

                NavHost(navController = navController, startDestination = startDest) {
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
                    composable(
                        "create_deck?draftId={draftId}",
                        arguments = listOf(androidx.navigation.navArgument("draftId") { nullable = true; defaultValue = null })
                    ) { backStackEntry ->
                        val draftId = backStackEntry.arguments?.getString("draftId")
                        com.firebaseailogic.memotattoo.ui.flashcards.CreateDeckScreen(
                                navController = navController,
                                draftId = draftId,
                                userProfileViewModel = userProfileViewModel
                        )
                    }
                    composable("billing") {
                        MockBillingScreen(
                                navController = navController,
                                userProfileViewModel = userProfileViewModel
                        )
                    }
                    composable("settings") {
                        com.firebaseailogic.memotattoo.ui.flashcards.SettingsScreen(
                                navController = navController,
                                userProfileViewModel = userProfileViewModel
                        )
                    }
                }
            }
        }
    }
}
