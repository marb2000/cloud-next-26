#!/bin/bash

# Navigate to the Android app directory
cd "$(dirname "$0")/../android-app" || exit

echo "🚀 Running MemoTattoo Android Unit Tests..."
./gradlew testDebugUnitTest

if [ $? -eq 0 ]; then
  echo "✅ Android Tests Passed!"
else
  echo "❌ Android Tests Failed."
  exit 1
fi
