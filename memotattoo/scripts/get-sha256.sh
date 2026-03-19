#!/bin/bash
# get-sha256.sh
# Retrieves the SHA-256 fingerprint for the debug build variant.

# Identify the root of the android-app
if [ -d "android-app" ]; then
    ANDROID_DIR="android-app"
elif [ -d "memotattoo/android-app" ]; then
    ANDROID_DIR="memotattoo/android-app"
else
    echo "❌ Error: Could not find android-app directory."
    exit 1
fi

echo "🔍 Fetching Android SHA-256 fingerprints in $ANDROID_DIR..."

cd "$ANDROID_DIR"
# Run signingReport for the app module specifically to be fast
./gradlew :app:signingReport | awk '
    /Variant: debug/ { found=1; next }
    /----------/ { found=0 }
    found && /SHA-256/ { print $0 }
'
cd - > /dev/null
