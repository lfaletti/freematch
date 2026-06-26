#!/bin/bash

set -e

ENVIRONMENT=${1:-"staging"}

if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ]; then
  echo "Usage: ./deploy-fly.sh [staging|production]"
  exit 1
fi

if ! command -v flyctl &> /dev/null; then
  echo "Fly CLI not found. Install from: https://fly.io/docs/getting-started/installing-flyctl/"
  exit 1
fi

echo "Preparing deployment to Fly.io ($ENVIRONMENT)..."

if [ "$ENVIRONMENT" = "production" ]; then
  FLY_APP="freematch-prod"
else
  FLY_APP="REDACTED_RW_ENV"
fi

echo "Deploying to Fly app: $FLY_APP"

# Build and deploy
flyctl deploy --app $FLY_APP

echo "Deployment complete!"
echo "View dashboard: https://fly.io/apps/$FLY_APP"
echo "View logs: flyctl logs --app $FLY_APP"
