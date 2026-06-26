#!/bin/bash

set -e

ENVIRONMENT=${1:-"staging"}

if [ "$ENVIRONMENT" != "production" ] && [ "$ENVIRONMENT" != "staging" ]; then
  echo "Usage: ./deploy.sh [staging|production]"
  exit 1
fi

echo "Deploying to Railway ($ENVIRONMENT)..."

if ! command -v railway &> /dev/null; then
  echo "Railway CLI not found. Install from: https://railway.app/docs/cli/quick-start"
  exit 1
fi

echo "Building Docker image..."
cd backend
docker build -t freematch-backend:latest .
cd ..

echo "Logging in to Railway..."
railway login

echo "Setting environment to $ENVIRONMENT..."
railway environment $ENVIRONMENT

echo "Deploying backend..."
railway up --service backend

echo "Deployment complete!"
echo "View logs: railway logs"
