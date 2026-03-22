#!/bin/bash

# Stop script on error
set -e

# Check commit message
if [ -z "$1" ]; then
  echo "❌ Usage: ./gitpush.sh \"commit message\""
  exit 1
fi

echo "🔄 Pulling latest changes..."
git pull origin main --rebase

echo "📦 Adding changes..."
git add .

# Check if there is anything to commit
if git diff --cached --quiet; then
  echo "⚠️ No changes to commit"
  exit 0
fi

echo "📝 Committing..."
git commit -m "$1"

echo "🚀 Pushing..."
git push

echo "✅ Done. Your code is now on GitHub."
