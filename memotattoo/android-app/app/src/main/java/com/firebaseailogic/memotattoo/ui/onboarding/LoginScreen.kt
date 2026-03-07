package com.firebaseailogic.memotattoo.ui.onboarding

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.firebaseailogic.memotattoo.data.FirebaseManager
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import androidx.compose.foundation.Image
import androidx.compose.ui.res.painterResource
import com.firebaseailogic.memotattoo.R

@Composable
fun LoginScreen(navController: NavController) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

    val couroutineScope = rememberCoroutineScope()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.logo),
            contentDescription = "MemoTattoo Logo",
            modifier = Modifier
                .size(140.dp)
                .padding(bottom = 24.dp)
        )
        
        Text(
            text = "MemoTattoo",
            style = MaterialTheme.typography.displayMedium,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        OutlinedTextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            singleLine = true
        )

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
            singleLine = true
        )

        if (errorMessage.isNotEmpty()) {
            Text(
                text = errorMessage,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }

        Button(
            onClick = {
                isLoading = true
                FirebaseManager.auth.signInWithEmailAndPassword(email, password)
                    .addOnCompleteListener { task ->
                        if (task.isSuccessful) {
                            couroutineScope.launch {
                                try {
                                    val uid = task.result.user?.uid ?: throw Exception("User not authenticated")
                                    val userRef = FirebaseManager.firestore.collection("Users").document(uid)
                                    val userSnap = userRef.get().await()
                                    
                                    val authEmail = task.result.user?.email ?: ""
                                    
                                    if (!userSnap.exists()) {
                                        val userData = hashMapOf(
                                            "uid" to uid,
                                            "email" to authEmail,
                                            "energy_bolts" to 3,
                                            "interests" to listOf("General"),
                                            "isBanned" to false,
                                            "isPro" to false
                                        )
                                        userRef.set(userData).await()
                                    } else if (!userSnap.contains("email") || userSnap.getString("email").isNullOrEmpty()) {
                                        userRef.update("email", authEmail).await()
                                    }
                                    
                                    navController.navigate("daily_mission") {
                                        popUpTo("login") { inclusive = true }
                                    }
                                } catch (e: Exception) {
                                    errorMessage = e.message ?: "Failed to verify profile."
                                    isLoading = false
                                }
                            }
                        } else {
                            errorMessage = task.exception?.message ?: "Login failed"
                            isLoading = false
                        }
                    }
            },
            enabled = email.isNotEmpty() && password.isNotEmpty() && !isLoading,
            modifier = Modifier
                .fillMaxWidth()
                .height(56.dp),
            shape = RoundedCornerShape(12.dp)
        ) {
            Text(if (isLoading) "Signing in..." else "Sign In")
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        TextButton(
            onClick = {
                if(email.trim().isEmpty() || password.trim().isEmpty()) {
                    errorMessage = "Please enter an email and password."
                    return@TextButton
                }

                isLoading = true
                FirebaseManager.auth.createUserWithEmailAndPassword(email.trim(), password.trim())
                    .addOnCompleteListener { task ->
                        if (task.isSuccessful) {
                            couroutineScope.launch {
                                try {
                                    val uid = task.result.user?.uid ?: throw Exception("User not authenticated")
                                    val userData = hashMapOf(
                                        "uid" to uid,
                                        "email" to (task.result.user?.email ?: ""),
                                        "energy_bolts" to 3,
                                        "interests" to listOf("General"),
                                        "isBanned" to false,
                                        "isPro" to false
                                    )
                                    FirebaseManager.firestore.collection("Users").document(uid).set(userData).await()
                                    
                                    navController.navigate("daily_mission") {
                                        popUpTo("login") { inclusive = true }
                                    }
                                } catch (e: Exception) {
                                    errorMessage = e.message ?: "Failed to construct profile."
                                    isLoading = false
                                }
                            }
                        } else {
                            errorMessage = task.exception?.message ?: "Signup failed"
                            isLoading = false
                        }
                    }
            },
            enabled = email.isNotEmpty() && password.isNotEmpty() && !isLoading
        ) {
            Text("Create Account")
        }
    }
}
