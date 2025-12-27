#!/bin/bash
set -e

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./deploy.sh <environment>"
    echo "Environment: staging | production"
    exit 1
fi

echo "=========================================="
echo "Deploying to $ENVIRONMENT"
echo "=========================================="

# Setup SSH
mkdir -p ~/.ssh
echo "$SSH_KEY" > ~/.ssh/deploy_key
chmod 600 ~/.ssh/deploy_key
ssh-keyscan -H "$SSH_HOST" >> ~/.ssh/known_hosts 2>/dev/null

# Deploy commands
SSH_CMD="ssh -i ~/.ssh/deploy_key $SSH_USER@$SSH_HOST"

echo "1. Pulling latest Docker image..."
$SSH_CMD "docker pull $IMAGE_TAG"

echo "2. Stopping current container..."
$SSH_CMD "docker-compose -f /opt/momtaz-chem/docker-compose.yml down --remove-orphans" || true

echo "3. Updating docker-compose.yml..."
scp -i ~/.ssh/deploy_key docker-compose.yml $SSH_USER@$SSH_HOST:/opt/momtaz-chem/

echo "4. Running database migrations..."
$SSH_CMD "docker run --rm \
    -e DATABASE_URL=$DATABASE_URL \
    $IMAGE_TAG npm run db:push" || {
    echo "Migration failed!"
    exit 1
}

echo "5. Starting new containers..."
$SSH_CMD "cd /opt/momtaz-chem && \
    IMAGE_TAG=$IMAGE_TAG docker-compose up -d"

echo "6. Cleaning up old images..."
$SSH_CMD "docker image prune -f"

echo "=========================================="
echo "Deployment to $ENVIRONMENT completed!"
echo "=========================================="
