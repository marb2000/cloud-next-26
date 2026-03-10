package com.firebaseailogic.memotattoo.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

val MemoPrimary = Color(0xFFA855F7) // Tailwind Purple 500
val MemoPrimaryDark = Color(0xFF7E22CE) // Tailwind Purple 700

val MemoTeal = Color(0xFF2DD4BF) // Tailwind Teal 400
val MemoTealDark = Color(0xFF0F766E) // Tailwind Teal 700

val MemoAmber = Color(0xFFF59E0B) // Tailwind Amber 500
val MemoPink = Color(0xFFEC4899) // Built-in Pink 500
val MemoYellow = Color(0xFFEAB308) // Built-in Yellow 500

val MemoDarkBackground = Color(0xFF0F172A) // Tailwind Slate 900
val MemoDarkBackgroundVeryDark = Color(0xFF020617) // Tailwind Slate 950
val MemoSurface = Color(0xFF1E293B) // Tailwind Slate 800
val MemoSurfaceLight = Color(0xFF334155) // Tailwind Slate 700

// Fun Gradients
val MemoGradientBrush = Brush.horizontalGradient(
    colors = listOf(MemoPrimary, MemoTeal)
)