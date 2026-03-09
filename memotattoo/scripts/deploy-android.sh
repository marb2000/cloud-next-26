#!/bin/bash

# Navigate to the Android app directory
cd "$(dirname "$0")/../android-app" || exit

# Build and deploy the debug APK to the connected emulator/device
echo "Building and deploying MemoTattoo Android app..."
./gradlew installDebug

if [ $? -eq 0 ]; then
  echo "✅ Successfully deployed the app!"
else
  echo "❌ Deployment failed. Please check the logs."
  exit 1
fi
