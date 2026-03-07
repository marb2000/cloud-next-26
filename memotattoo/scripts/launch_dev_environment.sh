#!/bin/bash

# Exit on any error
set -e

echo "============================================"
echo "🚀 Starting MemoTattoo Launch Sequence"
echo "============================================"

# Make the root robust against where the script was invoked from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
ANDROID_DIR="$ROOT_DIR/android-app"
ADMIN_DIR="$ROOT_DIR/admin-console"

echo "1. Validating ADB Status and Emulator..."
if ! adb get-state 1>/dev/null 2>&1; then
    echo "Starting standard API Emulator Headless..."
    # Spin up an emulator detached and quiet to not block the script
    emulator -avd Medium_Phone_API_36.1 -no-snapshot-load -no-boot-anim &
    
    echo "Waiting for Android OS to boot... (This can take up to 2 minutes)"
    adb wait-for-device
    while [[ $(adb shell getprop sys.boot_completed | tr -d '\r') != "1" ]]; do
        sleep 2
    done
    echo "✅ Android Emulator connected & fully booted!"
else
    echo "✅ Active device found via ADB."
fi

echo "2. Building & Deploying the Android Application..."
cd "$ANDROID_DIR"

echo "Cleaning up previous installations on Emulator..."
adb uninstall com.firebaseailogic.memotattoo || true

./gradlew installDebug || { echo "❌ Failed to build/install Android app"; exit 1; }

echo "✅ Android app successfully installed on Emulator."

# Launch the Android app on the active emulator over ADB explicitly specifying the Native Intent
echo "3. Booting MemoTattoo on the Android Emulator..."
adb shell am start -n "com.firebaseailogic.memotattoo/com.firebaseailogic.memotattoo.MainActivity" -a android.intent.action.MAIN -c android.intent.category.LAUNCHER

echo "4. Starting the Angular Admin Console..."
cd "$ADMIN_DIR"

echo "Cleaning up tied dev servers..."
PORT_PID=$(lsof -t -i:4200 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
    echo "Killing orphaned server occupying port 4200..."
    kill -9 $PORT_PID || true
fi

echo "Access the Admin web console at: http://localhost:4200"

# Note: This will capture the terminal process to keep the dev server running.
npx ng serve --open
