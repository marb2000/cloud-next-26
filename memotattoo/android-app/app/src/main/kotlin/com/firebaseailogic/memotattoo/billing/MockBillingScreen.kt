package com.firebaseailogic.memotattoo.billing

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.firebaseailogic.memotattoo.data.FirebaseManager
import com.firebaseailogic.memotattoo.ui.theme.MemoGradientBrush
import com.firebaseailogic.memotattoo.ui.theme.Shapes
import com.google.firebase.firestore.FieldValue
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

@Composable
fun MockBillingScreen(
    navController: NavController,
    userProfileViewModel: com.firebaseailogic.memotattoo.ui.flashcards.UserProfileViewModel =
        androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val userProfile by userProfileViewModel.userProfile.collectAsState()
    val isPro = userProfile?.isPro == true
    val coroutineScope = rememberCoroutineScope()
    var isProcessing by remember { mutableStateOf(false) }
    var showSubscribeDialog by remember { mutableStateOf(false) }
    var showBuyBoltsDialog by remember { mutableStateOf(false) }

    val dateFormat = remember { SimpleDateFormat("MMM dd, yyyy", Locale.getDefault()) }
    val formattedDate = userProfile?.currentPeriodEnd?.let { dateFormat.format(Date(it)) } ?: "billing ends"

    Scaffold(
        topBar = {
            @OptIn(ExperimentalMaterial3Api::class)
            TopAppBar(
                title = { },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(paddingValues)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier
                    .size(64.dp)
                    .padding(bottom = 8.dp)
            )
            Text(
                text = if (isPro) "Scholar Active" else "Level Up to Scholar",
                style = MaterialTheme.typography.displaySmall.copy(fontWeight = FontWeight.ExtraBold),
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
                    Text("• AI Gen: 3 Bolts/ea", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                    Text("• Slow recharge", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    // Buy Bolts Button below Free Tier
                    OutlinedButton(
                        onClick = { showBuyBoltsDialog = true },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) { Text("Buy 20 Bolts for $1.99", style = MaterialTheme.typography.labelMedium) }
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
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    // Subscription Button below Pro Tier
                    if (isPro) {
                        if (userProfile?.cancelAtPeriodEnd == true) {
                            Button(
                                onClick = {
                                    FirebaseManager.auth.currentUser?.uid?.let { uid ->
                                        FirebaseManager.firestore
                                            .collection("Users")
                                            .document(uid)
                                            .update("cancelAtPeriodEnd", false)
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                                shape = RoundedCornerShape(12.dp)
                            ) { Text("Resume", style = MaterialTheme.typography.labelMedium) }
                            
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Active until $formattedDate.",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.error,
                                textAlign = TextAlign.Center
                            )
                        } else {
                            Button(
                                onClick = {
                                    FirebaseManager.auth.currentUser?.uid?.let { uid ->
                                        FirebaseManager.firestore
                                            .collection("Users")
                                            .document(uid)
                                            .update(
                                                mapOf(
                                                    "cancelAtPeriodEnd" to true,
                                                    "canceledOn" to System.currentTimeMillis()
                                                )
                                            )
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                shape = RoundedCornerShape(12.dp)
                            ) { Text("Cancel", style = MaterialTheme.typography.labelMedium) }
                        }
                    } else {
                        Button(
                            onClick = { showSubscribeDialog = true },
                            modifier = Modifier.fillMaxWidth().height(48.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                            shape = RoundedCornerShape(12.dp)
                        ) { Text("Subscribe", style = MaterialTheme.typography.labelMedium) }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        if (showSubscribeDialog) {
            AlertDialog(
                onDismissRequest = { if (!isProcessing) showSubscribeDialog = false },
                title = { Text("Confirm Subscription") },
                text = { Text("You will be charged $4.99 immediately, and this subscription will automatically renew every 30 days until canceled. Do you wish to proceed?") },
                confirmButton = {
                    TextButton(onClick = {
                        coroutineScope.launch {
                            isProcessing = true
                            try {
                                FirebaseManager.auth.currentUser?.uid?.let { uid ->
                                    val currentPeriodEnd = System.currentTimeMillis() + (30L * 24 * 60 * 60 * 1000)
                                    FirebaseManager.firestore
                                        .collection("Users")
                                        .document(uid)
                                        .update(
                                            mapOf(
                                                "isPro" to true,
                                                "energy_bolts" to FieldValue.increment(50),
                                                "cancelAtPeriodEnd" to false,
                                                "currentPeriodEnd" to currentPeriodEnd,
                                                "subscribedOn" to System.currentTimeMillis()
                                            )
                                        ).await()
                                }
                                showSubscribeDialog = false
                            } finally {
                                isProcessing = false
                            }
                        }
                    }, enabled = !isProcessing) {
                        if (isProcessing) CircularProgressIndicator(modifier = Modifier.size(16.dp)) else Text("Subscribe")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showSubscribeDialog = false }, enabled = !isProcessing) {
                        Text("Cancel")
                    }
                }
            )
        }
        
        if (showBuyBoltsDialog) {
            AlertDialog(
                onDismissRequest = { if (!isProcessing) showBuyBoltsDialog = false },
                title = { Text("Confirm Purchase") },
                text = { Text("You will be charged $1.99 immediately for 20 Energy Bolts. This is a one-time purchase. Do you wish to proceed?") },
                confirmButton = {
                    TextButton(onClick = {
                        coroutineScope.launch {
                            isProcessing = true
                            try {
                                FirebaseManager.auth.currentUser?.uid?.let { uid ->
                                    FirebaseManager.firestore
                                        .collection("Users")
                                        .document(uid)
                                        .update("energy_bolts", FieldValue.increment(20))
                                        .await()
                                }
                                showBuyBoltsDialog = false
                            } finally {
                                isProcessing = false
                            }
                        }
                    }, enabled = !isProcessing) {
                        if (isProcessing) CircularProgressIndicator(modifier = Modifier.size(16.dp)) else Text("Purchase")
                    }
                },
                dismissButton = {
                    TextButton(onClick = { showBuyBoltsDialog = false }, enabled = !isProcessing) {
                        Text("Cancel")
                    }
                }
            )
        }


        
        // Action Costs Explainer Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = Shapes.medium
        ) {
            Column(
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    "What are Energy Bolts? ⚡",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(bottom = 8.dp),
                    textAlign = TextAlign.Center
                )
                Text(
                    "• Playing half a Deck: 1 Bolt",
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center
                )
                Text(
                    "• Others play your Public Deck: +1 Bolt",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center
                )
                Text(
                    "• Daily Recharge (Free): Restore up to 3 Bolts the next calendar day, provided you open the app and play a game.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.secondary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
        }
    } // End Column
} // End Scaffold
}
