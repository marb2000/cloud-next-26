import java.util.Properties
import java.io.FileInputStream

/*
This build script is related to the `gradle/libs.versions.toml` file in the following way:

1. The `libs.versions.toml` file is the "catalog" of dependencies. It defines all the libraries and plugins that the project can use, along with their versions.

2. When you sync the project, Gradle reads the `libs.versions.toml` file and generates a special `libs` object. This object acts as a bridge, making the dependencies from the catalog available to this build script in a type-safe way.

3. In this file, you "shop" for items from the catalog. For example, when you write `implementation(libs.androidx.core.ktx)`, you are using the `libs` object to add the `androidx-core-ktx` library (which is defined in `libs.versions.toml`) to your app's dependencies.

This workflow separates the *declaration* of dependencies from their *application*, which makes the project easier to manage.
*/
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.google.services)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    id("idea")
}

android {
    namespace = "com.firebaseailogic.memotattoo"
    compileSdk = 36

    defaultConfig {
        // This is the unique identifier for your app on the Google Play Store.
        applicationId = "com.firebaseailogic.memotattoo"

        // minSdk is the minimum API level that your app can run on. It's a hard floor.
        // If a device's Android version is below this, the user can't install your app.
        // You set this as low as practical to maximize the number of devices your app can reach.
        minSdk = 34

        // targetSdk is the API level that you have tested your app against. 
        // It tells the Android OS that you've designed your app to work with the features and behaviors of this Android version.
        // You should always set this to a recent Android version to ensure your app is modern and secure.
        targetSdk = 36

        // IMPORTANT: If you use a feature from a newer API (e.g., API 36) in your code,
        // your app will crash if it runs on a device with an older Android version (e.g., API 34).
        // To prevent this, you must use a runtime check in your application code:
        //
        // if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.SOME_NEW_API) {
        //     // Safe to use the new API here
        // } else {
        //     // Provide a fallback for older versions
        // }
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        
        // Default empty string for APPCHECK_DEBUG_TOKEN, overridden in debug build type
        buildConfigField("String", "APPCHECK_DEBUG_TOKEN", "\"\"")
    }

    buildTypes {
        debug {
            // Read App Check debug token from local.properties if it exists
            val appCheckToken = project.rootProject.file("local.properties")
                .let { if (it.exists()) Properties().apply { load(FileInputStream(it)) } else null }
                ?.getProperty("APPCHECK_DEBUG_TOKEN") ?: ""
            
            buildConfigField("String", "APPCHECK_DEBUG_TOKEN", "\"$appCheckToken\"")
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        // This sets the Java version for your app's source code. 
        // It ensures your app is compatible with older Android versions.
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "META-INF/LICENSE.md"
            excludes += "META-INF/LICENSE-notice.md"
        }
    }

    sourceSets {
        getByName("main") {
            kotlin.srcDir("build/generated/ksp/debug/kotlin")
        }
    }
}

idea {
    module {
        generatedSourceDirs.add(file("build/generated/ksp/debug/kotlin"))
    }
}

dependencies {

    implementation(libs.bundles.androidx.core)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.bundles.compose.ui)
    
    // Navigation & Image Loading
    implementation(libs.androidx.navigation.compose)
    implementation(libs.coil.compose)
    implementation(libs.coil.network.okhttp)
    
    // Firebase AI Logic & Auth Ecosystem
    implementation(platform(libs.firebase.bom))
    implementation(libs.bundles.firebase)
    implementation(libs.firebase.ai.ondevice)
    implementation(libs.kotlinx.serialization.json)
    ksp(libs.firebase.ai.ksp)
    
    testImplementation(libs.bundles.test.unit)
    androidTestImplementation(libs.bundles.test.android)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    debugImplementation(libs.androidx.ui.tooling)
    debugImplementation(libs.androidx.ui.test.manifest)
}