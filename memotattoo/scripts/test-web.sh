#!/bin/bash

# Navigate to the admin-console directory
cd "$(dirname "$0")/../admin-console" || exit

echo "🚀 Running MemoTattoo Web Unit Tests..."
# Use --watch=false to ensure it runs once and exits
npm test -- --watch=false

if [ $? -eq 0 ]; then
  echo "✅ Web Tests Passed!"
else
  echo "❌ Web Tests Failed."
  exit 1
fi
