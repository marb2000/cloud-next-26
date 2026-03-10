package com.firebaseailogic.memotattoo.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = MemoPrimary,
    secondary = MemoTeal,
    tertiary = MemoAmber,
    background = MemoDarkBackground,
    surface = MemoSurface,
    onPrimary = Color.White,
    onBackground = Color(0xFFF8FAFC),
    onSurface = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = MemoPrimaryDark,
    secondary = MemoTealDark,
    tertiary = MemoAmber,
    background = Color(0xFFF8FAFC),
    surface = Color.White,
    onPrimary = Color.White,
    onBackground = MemoDarkBackground,
    onSurface = MemoDarkBackground
)

@Composable
fun MemoTattooTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        shapes = Shapes,
        content = content
    )
}