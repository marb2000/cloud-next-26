#!/bin/bash

# Configuration file path
CONFIG_FILE="../sync-config.json"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: $CONFIG_FILE not found in parent directory!"
    exit 1
fi

# Function to read JSON values
get_json_val() {
    python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['$1'])" 2>/dev/null
}

# Read values (using python3 for reliability if jq is missing)
PROJECT_ID=$(get_json_val "PROJECT_ID")
LOCATION=$(get_json_val "LOCATION")
PROMPTS_DIR=$(get_json_val "PROMPTS_DIR")

echo "🚀 Deploying Prompt Templates..."
echo "📍 Project: $PROJECT_ID"
echo "🌍 Location: $LOCATION"

# Call the node script
node sync-prompts.js "$PROJECT_ID" "$LOCATION" "$PROMPTS_DIR"
