#!/bin/bash

# Automatically set JAVA_HOME if not set, using Android Studio's embedded JDK if present
if [ -z "$JAVA_HOME" ]; then
  if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
    echo "☕️ Automatically configured Java home using Android Studio's embedded JDK:"
    echo "   $JAVA_HOME"
  fi
fi

# Automatically set ANDROID_HOME if not set, using default macOS Android SDK path if present
if [ -z "$ANDROID_HOME" ]; then
  if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
    echo "🤖 Automatically configured Android SDK home:"
    echo "   $ANDROID_HOME"
  fi
fi

# Automatically start emulator if no connected devices/emulators are running
ADB="$ANDROID_HOME/platform-tools/adb"
EMULATOR="$ANDROID_HOME/emulator/emulator"

if [ -f "$ADB" ]; then
  RUNNING_DEVICES=$("$ADB" devices | grep -v "List of devices" | grep "device")
  if [ -z "$RUNNING_DEVICES" ]; then
    echo "⚠️ No running devices or emulators detected."
    if [ -f "$EMULATOR" ]; then
      AVD_LIST=$("$EMULATOR" -list-avds)
      if [ ! -z "$AVD_LIST" ]; then
        FIRST_AVD=$(echo "$AVD_LIST" | head -n 1)
        echo "🚀 Starting configured emulator: $FIRST_AVD..."
        "$EMULATOR" -avd "$FIRST_AVD" > /dev/null 2>&1 &
        
        echo "⏳ Waiting for emulator to connect (adb wait-for-device)..."
        "$ADB" wait-for-device
        echo "✅ Emulator connected! Waiting 5 seconds for system initialization..."
        sleep 5
      else
        echo "❌ No Android Virtual Devices (AVD) found. Please open Android Studio to configure an emulator."
      fi
    fi
  fi
fi

# Navigate to the Android app directory
cd "$(dirname "$0")/../android-app" || exit

# Build and deploy the debug APK to the connected emulator/device
echo "Building and deploying MemoTattoo Android app..."
./gradlew installDebug

if [ $? -eq 0 ]; then
  echo "✅ Successfully deployed the app!"
  if [ -f "$ADB" ]; then
    echo "🚀 Launching MemoTattoo on the emulator..."
    "$ADB" shell am start -n com.firebaseailogic.memotattoo/com.firebaseailogic.memotattoo.MainActivity
  fi
else
  echo "❌ Deployment failed. Please check the logs."
  exit 1
fi
