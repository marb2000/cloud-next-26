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
    val isPro = userProfile?.isPro == true

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = if (isPro) "You exist in the Pro Tier" else "Level Up to Scholar",
            style = MaterialTheme.typography.displaySmall,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(bottom = 24.dp)
        )

        // Comparison Table
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Free Tier
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(16.dp)),
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Explorer",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Text("Free", style = MaterialTheme.typography.bodyMedium)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("• 3 Bolts max cap", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                    Text("• Slow recharge", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                    Text("• No AI Generators", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                }
            }

            // Pro Tier
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(16.dp)),
                color = if (isPro) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.secondaryContainer
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Scholar",
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                        fontWeight = FontWeight.Bold
                    )
                    Text("$4.99/mo", style = MaterialTheme.typography.bodyMedium)
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("• 15 Bolts max cap", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                    Text("• 100 AI Images/mo", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                    Text("• Priority play", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        if (isPro) {
            Button(
                onClick = {
                    FirebaseManager.auth.currentUser?.uid?.let { uid ->
                        FirebaseManager.firestore
                            .collection("Users")
                            .document(uid)
                            .update("isPro", false)
                    }
                    navController.popBackStack()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                shape = RoundedCornerShape(12.dp)
            ) { Text("Cancel Subscription") }
        } else {
            Button(
                onClick = {
                    FirebaseManager.auth.currentUser?.uid?.let { uid ->
                        FirebaseManager.firestore
                            .collection("Users")
                            .document(uid)
                            .update(
                                mapOf(
                                    "isPro" to true,
                                    "energy_bolts" to FieldValue.increment(50)
                                )
                            )
                    }
                    navController.popBackStack()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                shape = RoundedCornerShape(12.dp)
            ) { Text("Subscribe for $4.99/mo") }
        }

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedButton(
            onClick = {
                FirebaseManager.auth.currentUser?.uid?.let { uid ->
                    FirebaseManager.firestore
                        .collection("Users")
                        .document(uid)
                        .update("energy_bolts", FieldValue.increment(20))
                }
                navController.popBackStack()
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(12.dp)
        ) { Text("Buy 20 Bolts for $1.99") }

        Spacer(modifier = Modifier.height(24.dp))

        TextButton(onClick = { navController.popBackStack() }) {
            Text("Back entirely", color = MaterialTheme.colorScheme.onBackground)
        }
    }
}
