#!/bin/bash
# setup-play-integrity.sh
# Enables/Configures the Play Integrity provider for App Check.

echo "🛡️ Configuring Play Integrity for App Check..."

# 1. Load project and app info from google-services.json
GS_JSON="android-app/app/google-services.json"
if [ ! -f "$GS_JSON" ]; then
    echo "❌ Error: Could not find $GS_JSON"
    exit 1
fi

PROJECT_ID=$(grep -E '"project_id":' "$GS_JSON" | awk -F'"' '{print $4}')
# Specifically grab the App ID for the memotattoo package
APP_ID=$(grep -B 5 '"package_name": "com.firebaseailogic.memotattoo"' "$GS_JSON" | grep '"mobilesdk_app_id":' | awk -F'"' '{print $4}')

if [ -z "$PROJECT_ID" ] || [ -z "$APP_ID" ]; then
    echo "❌ Error: Could not parse Project ID or App ID from $GS_JSON"
    exit 1
fi

echo "Project ID: $PROJECT_ID"
echo "App ID: $APP_ID"

# 2. Get Access Token from gcloud
TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null)
if [ -z "$TOKEN" ]; then
    echo "❌ Error: Not logged into gcloud. Run 'gcloud auth login' first."
    exit 1
fi

# 3. Register/Update Play Integrity Provider
# Note: This enables Play Integrity for the specified app.
echo "🔄 Registering Play Integrity provider..."

curl -s -X PATCH \
  "https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT_ID}/apps/${APP_ID}/playIntegrityConfig?updateMask=tokenTtl" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "X-Goog-User-Project: ${PROJECT_ID}" \
  -H "Content-Type: application/json" \
  -d '{ "tokenTtl": "3600s" }' > /tmp/appcheck_response.json

if grep -q "error" /tmp/appcheck_response.json; then
    echo "❌ Error enabling Play Integrity:"
    cat /tmp/appcheck_response.json
    exit 1
else
    echo "✅ Play Integrity provider successfully configured for $APP_ID"
    # echo "Response: $(cat /tmp/appcheck_response.json)"
fi
