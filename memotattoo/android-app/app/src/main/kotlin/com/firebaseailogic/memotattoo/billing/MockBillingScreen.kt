package com.firebaseailogic.memotattoo.billing

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.google.firebase.firestore.FieldValue

@Composable
fun MockBillingScreen(
        navController: NavController,
        userProfileViewModel: com.firebaseailogic.memotattoo.ui.flashcards.UserProfileViewModel =
                androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val userProfile by userProfileViewModel.userProfile.collectAsState()
    val energyBolts = userProfile?.energyBolts ?: 0

    Column(
            modifier =
                    Modifier.fillMaxSize()
                            .background(MaterialTheme.colorScheme.background)
                            .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
    ) {
        // Balance Header
        Text(
                text = "⚡ $energyBolts Energy Bolts",
                style = MaterialTheme.typography.displayMedium,
                color =
                        if (energyBolts == 0) MaterialTheme.colorScheme.error
                        else MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 16.dp)
        )

        Text(
                text =
                        if (energyBolts == 0)
                                "You've used all your Energy Bolts generating custom Nano Banana AI art."
                        else
                                "Purchase more Energy Bolts to generate custom artwork and play Smart Challenges without waiting for tomorrow's refill.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 32.dp)
        )

        Surface(
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)),
                color = MaterialTheme.colorScheme.secondaryContainer
        ) {
            Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                        text = "Unlock MemoTattoo Pro",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                        text =
                                "Unlimited AI Generations\nNo waiting for daily refills\nCustom Themes unlocked",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                        onClick = {
                            FirebaseManager.auth.currentUser?.uid?.let { uid ->
                                FirebaseManager.firestore
                                        .collection("Users")
                                        .document(uid)
                                        .update("energy_bolts", FieldValue.increment(50))
                            }
                            navController.popBackStack()
                        },
                        modifier = Modifier.fillMaxWidth().height(56.dp).padding(bottom = 12.dp),
                        colors =
                                ButtonDefaults.buttonColors(
                                        containerColor = MaterialTheme.colorScheme.tertiary
                                ),
                        shape = RoundedCornerShape(12.dp)
                ) { Text("+50 Energy Bolts ($4.99 Mock)") }

                Button(
                        onClick = {
                            FirebaseManager.auth.currentUser?.uid?.let { uid ->
                                FirebaseManager.firestore
                                        .collection("Users")
                                        .document(uid)
                                        .update("isPro", true)
                            }
                            navController.popBackStack()
                        },
                        modifier = Modifier.fillMaxWidth().height(56.dp),
                        colors =
                                ButtonDefaults.buttonColors(
                                        containerColor = MaterialTheme.colorScheme.primary
                                ),
                        shape = RoundedCornerShape(12.dp)
                ) { Text("Subscribe for $9.99/mo (Mock purchase)") }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        TextButton(onClick = { navController.popBackStack() }) {
            Text("Wait for tomorrow's refill", color = MaterialTheme.colorScheme.onBackground)
        }
    }
}
