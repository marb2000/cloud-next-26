#!/bin/bash
# register_appcheck_tokens.sh

PROJECT_ID="ai-logic-demos"
SHARED_TOKEN="283506C0-51BB-4F2D-83BE-4684B26E5267"
WEB_APP_ID="1:861083271982:web:8128d34be86880bdeeb0bf"
ANDROID_APP_ID="1:861083271982:android:0110c13be2c629f0eeb0bf"

ACCESS_TOKEN=$(gcloud auth print-access-token)

function register_token {
    local APP_ID=$1
    local NAME=$2
    
    echo "Registering for $NAME ($APP_ID)..."
    
    curl -X POST "https://firebaseappcheck.googleapis.com/v1/projects/$PROJECT_ID/apps/$APP_ID/debugTokens" \
         -H "Authorization: Bearer $ACCESS_TOKEN" \
         -H "Content-Type: application/json" \
         -d "{
               \"displayName\": \"$NAME\",
               \"token\": \"$SHARED_TOKEN\"
             }"
    
    echo -e "\n----------------------------------------"
}

register_token "$WEB_APP_ID" "Shared Team Debug Token (Web)"
register_token "$ANDROID_APP_ID" "Shared Team Debug Token (Android)"
