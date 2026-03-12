#!/bin/bash
# setup_appcheck_debug.sh
# This script generates a shared App Check debug token and saves it to local config files.

# 1. Generate a random UUID
DEBUG_TOKEN=$(uuidgen)
echo "Generated Debug Token: $DEBUG_TOKEN"

# 2. Add to Android local.properties
ANDROID_LOCAL_PROPS="memotattoo/android-app/local.properties"
if [ -f "$ANDROID_LOCAL_PROPS" ]; then
    sed -i '' '/APPCHECK_DEBUG_TOKEN/d' "$ANDROID_LOCAL_PROPS"
    echo "APPCHECK_DEBUG_TOKEN=$DEBUG_TOKEN" >> "$ANDROID_LOCAL_PROPS"
    echo "✓ Added to $ANDROID_LOCAL_PROPS"
fi

# 3. Add to Web environment
WEB_CONFIG="memotattoo/admin-console/public/appcheck-config.json"
echo "{\"APPCHECK_DEBUG_TOKEN\": \"$DEBUG_TOKEN\"}" > "$WEB_CONFIG"
echo "✓ Added to $WEB_CONFIG"

echo ""
echo "--------------------------------------------------------"
echo "IMPORTANT: MANUALLY REGISTER THIS TOKEN IN FIREBASE CONSOLE"
echo "1. Go to Firebase Console > App Check > Apps"
echo "2. For each app, Manage debug tokens > Add debug token"
echo "3. Token: $DEBUG_TOKEN"
echo "--------------------------------------------------------"
